.PHONY: all minion bunny periodt

all: minion bunny periodt

minion:
	cd sites/minion-sims/frontend && npm run build
	rsync --delete -r sites/minion-sims/frontend/dist server/frontend/
	go build -o minion-sims ./cmd/file-srv

bunny:
	cd sites/bunny-garden/frontend && npm run build
	rsync --delete -r sites/bunny-garden/frontend/dist server/frontend/
	go build -o bunny-garden ./cmd/file-srv

periodt:
	cd sites/periodt/frontend && npm run build
	rsync --delete -r sites/periodt/frontend/dist server/frontend/
	go build -o periodt ./cmd/file-srv
