// Package pb provides helpers for embedding per-site PocketBase instances
// within the main Go server.
package pb

import (
	"fmt"
	"log/slog"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"

	// Register PocketBase system migrations (creates _collections, _superusers, etc.)
	_ "github.com/pocketbase/pocketbase/migrations"
)

// Site represents a single PocketBase instance for one site.
type Site struct {
	App     core.App
	Handler http.Handler
}

// NewSite bootstraps a PocketBase instance for the given site name.
// dataRoot is the parent directory (e.g. JALLARD_ROOT/pb_data).
// The site's data will be stored in dataRoot/siteName.
func NewSite(siteName, dataRoot string) (*Site, error) {
	dataDir := filepath.Join(dataRoot, siteName)

	app := core.NewBaseApp(core.BaseAppConfig{
		DataDir: dataDir,
		IsDev:   false,
	})

	if err := app.Bootstrap(); err != nil {
		return nil, fmt.Errorf("pb bootstrap %s: %w", siteName, err)
	}

	if err := app.RunAllMigrations(); err != nil {
		return nil, fmt.Errorf("pb migrations %s: %w", siteName, err)
	}

	pbRouter, err := apis.NewRouter(app)
	if err != nil {
		return nil, fmt.Errorf("pb router %s: %w", siteName, err)
	}

	handler, err := pbRouter.BuildMux()
	if err != nil {
		return nil, fmt.Errorf("pb mux %s: %w", siteName, err)
	}

	slog.Info("pocketbase ready", "site", siteName, "dataDir", dataDir)

	return &Site{App: app, Handler: handler}, nil
}

// MountOnMux registers a PocketBase site handler on the given mux at
// /api/{siteName}/.
//
// Incoming requests like /api/{siteName}/collections/users/... are
// rewritten to /api/collections/users/... before being forwarded to the
// PocketBase handler.
func MountOnMux(mux *http.ServeMux, siteName string, site *Site) {
	prefix := "/api/" + siteName
	mux.Handle(prefix+"/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Rewrite path: /api/{site}/foo → /api/foo
		r.URL.Path = "/api" + strings.TrimPrefix(r.URL.Path, prefix)
		r.URL.RawPath = ""
		site.Handler.ServeHTTP(w, r)
	}))
}
