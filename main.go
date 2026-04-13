package main

import (
	"context"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"time"

	"github.com/jallard-007/jallard-ca-server/api"
	"github.com/jallard-007/jallard-ca-server/pb"
)

type contextKey int

const servedEncodingKey contextKey = 0

func main() {
	exitCode := realMain()
	if exitCode != 0 {
		os.Exit(exitCode)
	}
}

// responseRecorder captures the status code and bytes written for logging.
type responseRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rr *responseRecorder) WriteHeader(code int) {
	rr.status = code
	rr.ResponseWriter.WriteHeader(code)
}

func (rr *responseRecorder) Write(b []byte) (int, error) {
	n, err := rr.ResponseWriter.Write(b)
	rr.bytes += n
	return n, err
}

// realIP extracts the client IP, preferring reverse-proxy headers when present.
func realIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.SplitN(xff, ",", 2)[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// loggingMiddleware logs each request after it completes.
// It injects a mutable encoding string into the context so that
// precompressedHandler can report which encoding it chose.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		encoding := "identity"
		r = r.WithContext(context.WithValue(r.Context(), servedEncodingKey, &encoding))

		rr := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rr, r)

		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rr.status,
			"bytes", rr.bytes,
			"encoding", encoding,
			"ms", time.Since(start).Milliseconds(),
			"ip", realIP(r),
			"ua", r.UserAgent(),
		)
	})
}

// precompressedHandler serves .br or .gz pre-compressed siblings when the
// client advertises support via Accept-Encoding. Falls back to the original
// file transparently. Already-compressed types (images, audio, etc.) are
// served directly without looking for compressed siblings.
func precompressedHandler(root string) http.Handler {
	fs := http.FileServer(http.Dir(root))

	// MIME types whose content is already compressed — skip sibling lookup.
	alreadyCompressed := map[string]bool{
		"image/png": true, "image/jpeg": true, "image/gif": true,
		"image/webp": true, "image/avif": true,
		"audio/mpeg": true, "audio/ogg": true, "audio/aac": true,
		"audio/flac": true, "audio/wav": true,
		"font/woff2":      true,
		"application/zip": true,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")

		urlPath := r.URL.Path
		if urlPath == "" || urlPath == "/" {
			fs.ServeHTTP(w, r)
			return
		}

		ext := strings.ToLower(filepath.Ext(urlPath))
		mimeType := mime.TypeByExtension(ext)
		baseType := strings.SplitN(mimeType, ";", 2)[0]
		if alreadyCompressed[baseType] {
			fs.ServeHTTP(w, r)
			return
		}

		accept := r.Header.Get("Accept-Encoding")

		type candidate struct {
			ext      string
			encoding string
		}
		candidates := []candidate{
			{".br", "br"},
			{".gz", "gzip"},
		}

		for _, c := range candidates {
			if !strings.Contains(accept, c.encoding) {
				continue
			}
			compressedPath := filepath.Join(root, filepath.FromSlash(urlPath)+c.ext)
			if _, err := os.Stat(compressedPath); err == nil {
				// Report encoding back to the logging middleware.
				if enc, ok := r.Context().Value(servedEncodingKey).(*string); ok {
					*enc = c.encoding
				}
				r2 := r.Clone(r.Context())
				r2.URL.Path = urlPath + c.ext
				w.Header().Set("Content-Encoding", c.encoding)
				w.Header().Set("Content-Type", mimeType)
				w.Header().Add("Vary", "Accept-Encoding")
				fs.ServeHTTP(w, r2)
				return
			}
		}

		fs.ServeHTTP(w, r)
	})
}

func realMain() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	jallardRoot := os.Getenv("JALLARD_ROOT")
	if jallardRoot == "" {
		jallardRoot = "."
	}

	distDir := filepath.Join(jallardRoot, "dist")
	pbDataDir := filepath.Join(jallardRoot, "pb_data")

	port := os.Getenv("JALLARD_PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	h := precompressedHandler(distDir)

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		h.ServeHTTP(w, r)
	})

	// ── PocketBase: period-tracker ────────────────────────────────
	ptSite, err := pb.NewSite("period-tracker", pbDataDir)
	if err != nil {
		slog.Error("pocketbase init failed", "site", "period-tracker", "err", err)
		return 1
	}
	if err := pb.ConfigurePeriodTracker(ptSite); err != nil {
		slog.Error("pocketbase configure failed", "site", "period-tracker", "err", err)
		return 1
	}
	pb.MountOnMux(mux, "period-tracker", ptSite)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: loggingMiddleware(api.NewServer(mux)),
	}

	slog.Info("starting", "port", port, "distDir", distDir, "pbDataDir", pbDataDir)

	done := make(chan struct{})
	var serverErr error

	go func() {
		defer close(done)
		serverErr = server.ListenAndServe()
	}()

	select {
	case <-done:
		slog.Error("server stopped unexpectedly", "err", serverErr)
		return 1
	case <-ctx.Done():
		slog.Info("shutting down")
		shutDownCtx, shutdownStop := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownStop()
		if err := server.Shutdown(shutDownCtx); err != nil {
			slog.Error("shutdown error", "err", err)
			return 1
		}
		slog.Info("stopped")
		return 0
	}
}
