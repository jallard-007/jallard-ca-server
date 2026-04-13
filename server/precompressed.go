package server

import (
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

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
