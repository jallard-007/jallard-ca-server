package negotiate_test

import (
	"fmt"
	"testing"

	"github.com/jallard-007/jallard-ca-server/server/negotiate"
)

func TestNegotiate(t *testing.T) {
	tests := []struct {
		acceptEncodings []string
		wantEncoding    string
	}{
		// baseline
		{[]string{}, "br"},
		{[]string{"br"}, "br"},
		{[]string{"gzip"}, "gzip"},
		{[]string{"identity"}, "identity"},
		{[]string{"foobar"}, ""},

		// multiple options
		{[]string{"br, gzip, identity"}, "br"},
		{[]string{"gzip, br, foobar"}, "br"},
		{[]string{"gzip, identity"}, "gzip"},

		// wildcard
		{[]string{"*"}, "br"},
		{[]string{"*, identity"}, "br"},
		{[]string{"identity, *"}, "br"},
		{[]string{"*;q=0, identity"}, "identity"},

		// special cases
		{[]string{"foobar, identity;q=0"}, ""},
		{[]string{""}, ""}, // ?
		{[]string{"identity;q=0"}, ""},
		{[]string{"*;q=0"}, ""},
	}

	for i, tt := range tests {
		t.Run(fmt.Sprintf("%d", i), func(t *testing.T) {
			encoding, _ := negotiate.Encoding(tt.acceptEncodings)
			if encoding != tt.wantEncoding {
				t.Errorf("got %q, wanted %q", encoding, tt.wantEncoding)
			}
		})
	}
}
