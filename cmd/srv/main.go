package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"time"

	"github.com/jallard-007/jallard-ca-server/server"
)

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

		encoding := r.Header.Get("Content-Encoding")
		if encoding == "" {
			encoding = "identity"
		}

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

func loadCfg() (server.Config, error) {
	dataHome := os.Getenv("JALLARD_DATA_HOME")
	if dataHome == "" {
		return server.Config{}, errors.New("JALLARD_DATA_HOME must be set")
	}

	distDir := filepath.Join(dataHome, "dist")
	pbDataDir := filepath.Join(dataHome, "pb_data")

	port := os.Getenv("JALLARD_PORT")
	if port == "" {
		port = "8080"
	}

	cfg := server.Config{
		Port:       port,
		PbDataHome: pbDataDir,
		DistDir:    distDir,
	}

	return cfg, nil
}

func realMain() int {
	cfg, err := loadCfg()
	if err != nil {
		slog.Error("invalid server config", "err", err)
		return 1
	}

	srv, err := server.RegisterEndpoints(cfg)
	if err != nil {
		slog.Error("server setup failed", "err", err)
	}

	srv.Handler = loggingMiddleware(srv.Handler)

	slog.Info("starting", "port", cfg.Port, "distDir", cfg.DistDir, "pbDataDir", cfg.PbDataHome)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	done := make(chan struct{})
	var serverErr error

	go func() {
		defer close(done)
		serverErr = srv.ListenAndServe()
	}()

	select {
	case <-done:
		slog.Error("server stopped unexpectedly", "err", serverErr)
		return 1
	case <-ctx.Done():
		slog.Info("shutting down")
		shutDownCtx, shutdownStop := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownStop()
		if err := srv.Shutdown(shutDownCtx); err != nil {
			slog.Error("shutdown error", "err", err)
			return 1
		}
		slog.Info("stopped")
		return 0
	}
}
