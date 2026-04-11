package precompressed

import (
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/jallard-007/jallard-ca-server/server/negotiate"
)

// PrecompressedHandler serves .br or .gz pre-compressed siblings when the
// client advertises support via Accept-Encoding. Falls back to the original
// file transparently. Already-compressed types (images, audio, etc.) are
// served directly without looking for compressed siblings.
func Handler(fsys fs.FS) http.Handler {
	fs := http.FileServerFS(fsys)

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
		urlPath := r.URL.Path
		if urlPath == "" || urlPath == "/" {
			fs.ServeHTTP(w, r)
			return
		}

		ext := strings.ToLower(filepath.Ext(urlPath))
		mimeType := mime.TypeByExtension(ext)
		baseType, _, _ := strings.Cut(mimeType, ";")
		if alreadyCompressed[baseType] {
			fs.ServeHTTP(w, r)
			return
		}

		acceptEncodings := r.Header["Accept-Encoding"]
		encoding, ext := negotiate.Encoding(acceptEncodings)
		if encoding == "" {
			http.Error(w, "only 'br', 'gzip', and 'indentity' content encodings are supported", http.StatusNotAcceptable)
			return
		}

		p := filepath.FromSlash(urlPath) + ext
		w.Header().Set("Content-Encoding", encoding)
		w.Header().Set("Content-Type", mimeType)
		w.Header().Add("Vary", "Accept-Encoding")
		http.ServeFileFS(w, r, fsys, p)
	})
}
