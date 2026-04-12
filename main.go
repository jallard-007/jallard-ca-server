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

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("./dist")))

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
