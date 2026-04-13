package api

import (
	"encoding/json"
	"math/rand"
	"net/http"
)

type Server struct {
	mux *http.ServeMux
}

type FactResponse struct {
	Fact string `json:"fact"`
}

var bunnyFacts = []string{
	"A group of bunnies is called a fluffle!",
	"Happy bunnies do a jump-twist called a 'binky'!",
	"Bunnies can see nearly 360 degrees around them.",
	"A baby bunny is called a kitten or kit.",
	"Bunnies purr when they're happy, just like cats!",
	"A bunny's teeth never stop growing.",
	"Bunnies can hop up to 3 feet high!",
	"Bunnies have over 100 million scent cells.",
	"Bunnies can run up to 35 mph!",
	"Bunnies groom themselves like cats do.",
	"Bunnies can learn to recognize their own names.",
	"A bunny's ears can rotate 270 degrees!",
	"Bunnies sometimes sleep with their eyes open!",
	"The world's longest rabbit was over 4 feet long!",
	"Bunnies do zoomies when they're extra happy!",
}

func NewServer(mux *http.ServeMux) *Server {
	mux.HandleFunc("GET /api/bunny-fact", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fact := bunnyFacts[rand.Intn(len(bunnyFacts))]
		json.NewEncoder(w).Encode(FactResponse{Fact: fact})
	})
	return &Server{mux: mux}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}
