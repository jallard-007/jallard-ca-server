package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"time"

	"jallard.com/server/api"
)

func main() {
	exitCode := realMain()
	if exitCode != 0 {
		os.Exit(exitCode)
	}
}

func realMain() int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	noCache := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			next.ServeHTTP(w, r)
		})
	}

	mux := http.NewServeMux()
	fs := http.FileServer(http.Dir("./site"))
	mux.Handle("/bunny-garden/", noCache(fs))
	mux.HandleFunc("/bunny-garden", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		http.ServeFile(w, r, "./site/bunny-garden/index.html")
	})

	srv := api.NewServer(mux)

	port := os.Getenv("JALLARD_PORT")
	if port == "" {
		port = "8027"
	}
	server := &http.Server{Addr: ":" + port, Handler: srv}

	done := make(chan struct{})
	var serverErr error

	fmt.Fprintln(os.Stderr, "Starting...")
	go func() {
		defer close(done)
		serverErr = server.ListenAndServe()
	}()

	select {
	case <-done:
		fmt.Fprintln(os.Stderr, "Server error:", serverErr)
		return 1
	case <-ctx.Done():
		shutDownCtx, shutdownStop := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownStop()
		err := server.Shutdown(shutDownCtx)
		if err != nil {
			fmt.Fprintln(os.Stderr, "Shutdown error:", err)
			return 1
		}
		return 0
	}
}
