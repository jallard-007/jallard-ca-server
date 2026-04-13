package server

import (
	"net/http"
)

type MinionSimsApiServer struct {
	handler http.Handler
}

func NewMinionSimsApiServer() *MinionSimsApiServer {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	s := &MinionSimsApiServer{
		handler: mux,
	}
	return s
}
