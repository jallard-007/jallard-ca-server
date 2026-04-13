package server

import (
	"fmt"
	"log/slog"
	"net/http"
	"path/filepath"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"

	_ "github.com/pocketbase/pocketbase/migrations"
)

const PERIOD_TRACKER_SITE_NAME = "period-tracker"

type PeriodTrackerApiServer struct {
	App core.App

	handler http.Handler
}

// NewSite bootstraps a PocketBase instance for the given site name.
// dataRoot is the parent directory (e.g. JALLARD_ROOT/pb_data).
// The site's data will be stored in dataRoot/siteName.
func NewPeriodTrackerApiServer(dataRoot string) (*PeriodTrackerApiServer, error) {
	dataDir := filepath.Join(dataRoot, PERIOD_TRACKER_SITE_NAME)

	app := core.NewBaseApp(core.BaseAppConfig{
		DataDir: dataDir,
		IsDev:   false,
	})

	if err := app.Bootstrap(); err != nil {
		return nil, fmt.Errorf("pb bootstrap %s: %w", PERIOD_TRACKER_SITE_NAME, err)
	}

	if err := app.RunAllMigrations(); err != nil {
		return nil, fmt.Errorf("pb migrations %s: %w", PERIOD_TRACKER_SITE_NAME, err)
	}

	pbRouter, err := apis.NewRouter(app)
	if err != nil {
		return nil, fmt.Errorf("pb router %s: %w", PERIOD_TRACKER_SITE_NAME, err)
	}

	handler, err := pbRouter.BuildMux()
	if err != nil {
		return nil, fmt.Errorf("pb mux %s: %w", PERIOD_TRACKER_SITE_NAME, err)
	}

	slog.Info("pocketbase ready", "site", PERIOD_TRACKER_SITE_NAME, "dataDir", dataDir)

	s := &PeriodTrackerApiServer{
		handler: handler,
	}
	return s, nil
}

// ConfigurePeriodTracker adds custom fields (name, birthday) to the
// users collection and sets the sender email for the period-tracker
// PocketBase instance.
func ConfigurePeriodTracker(app core.App) error {
	// ── Configure mail sender ─────────────────────────────────────
	settings := app.Settings()
	settings.Meta.AppName = "Period Tracker"
	settings.Meta.SenderName = "Period Tracker"
	settings.Meta.SenderAddress = "jallardsites@gmail.com"
	if err := app.Save(settings); err != nil {
		return err
	}

	// ── Add custom fields to users collection ─────────────────────
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	changed := false

	nameField := users.Fields.GetByName("name")
	if nameField == nil {
		users.Fields.Add(&core.TextField{
			Name:        "name",
			Presentable: true,
			Max:         200,
		})
		changed = true
	} else if _, ok := nameField.(*core.TextField); !ok {
		return fmt.Errorf("users.name field exists but is not a TextField (type: %T)", nameField)
	}

	birthdayField := users.Fields.GetByName("birthday")
	if birthdayField == nil {
		users.Fields.Add(&core.TextField{
			Name: "birthday",
			Max:  10, // YYYY-MM-DD
		})
		changed = true
	} else if _, ok := birthdayField.(*core.TextField); !ok {
		return fmt.Errorf("users.birthday field exists but is not a TextField (type: %T)", birthdayField)
	}

	if changed {
		if err := app.Save(users); err != nil {
			return err
		}
		slog.Info("period-tracker users collection configured")
	}

	return nil
}
