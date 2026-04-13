package pb

import (
	"fmt"
	"log/slog"

	"github.com/pocketbase/pocketbase/core"
)

// ConfigurePeriodTracker adds custom fields (name, birthday) to the
// users collection and sets the sender email for the period-tracker
// PocketBase instance.
func ConfigurePeriodTracker(site *Site) error {
	app := site.App

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
