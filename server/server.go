package server

import (
	"net/http"
)

type Config struct {
	Port       string
	PbDataHome string
	DistDir    string
}

func RegisterEndpoints(cfg Config) (*http.Server, error) {
	mux := http.NewServeMux()

	h := precompressedHandler(cfg.DistDir)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.NotFound(w, r)
			return
		}
		h.ServeHTTP(w, r)
	})

	bgServer := NewBunnyGardenApiServer()
	mux.Handle("/bunny-garden/api/", http.StripPrefix("/bunny-garden", bgServer.handler))

	msServer := NewMinionSimsApiServer()
	mux.Handle("/minion-sims/api/", http.StripPrefix("/minion-sims", msServer.handler))

	ptServer, err := NewPeriodTrackerApiServer(cfg.PbDataHome)
	if err != nil {
		return nil, err
	}
	mux.Handle("/period-tracker/api/", http.StripPrefix("/period-tracker", ptServer.handler))

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	return server, nil
}
