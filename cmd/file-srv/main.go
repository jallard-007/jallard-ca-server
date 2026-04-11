package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/jallard-007/jallard-ca-server/server/frontend"
	"github.com/jallard-007/jallard-ca-server/server/precompressed"
	"github.com/spf13/cobra"
)

func main() {
	err := realMain()
	if err != nil {
		log.Println("ERROR:", err)
		os.Exit(1)
	}
}

func realMain() error {
	cmd := cobra.Command{
		Use:   "file-srv",
		Short: "serves embedded files",
	}

	var port uint16
	cmd.Flags().Uint16VarP(&port, "port", "p", 8080, "port to run on")

	cmd.RunE = func(cmd *cobra.Command, args []string) error {
		ctx, stop := signal.NotifyContext(cmd.Context(), syscall.SIGINT, syscall.SIGTERM)
		defer stop()

		fileHandler := precompressed.Handler(frontend.FS)
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				http.NotFound(w, r)
				return
			}
			// Paths with file extensions are static assets — serve normally
			if filepath.Ext(r.URL.Path) != "" {
				fileHandler.ServeHTTP(w, r)
				return
			}
			// Client-side route — serve index.html directly
			http.ServeFileFS(w, r, frontend.FS, "index.html")
		})

		srv := http.Server{
			Addr:    ":" + strconv.FormatUint(uint64(port), 10),
			Handler: handler,
		}

		done := make(chan struct{})
		var serverErr error

		log.Println("listening on", srv.Addr, "...")
		go func() {
			defer close(done)
			serverErr = srv.ListenAndServe()
			stop()
		}()

		<-ctx.Done()
		if serverErr != nil {
			return fmt.Errorf("server: %w", serverErr)
		}
		log.Println("shutting down")

		shutDownCtx, shutdownStop := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownStop()
		if err := srv.Shutdown(shutDownCtx); err != nil {
			return fmt.Errorf("shutting down: %w", err)
		}

		log.Println("stopped")
		return nil
	}

	return cmd.Execute()
}
