package negotiate

import (
	"strconv"
	"strings"
)

type encodings struct {
	Br       float64
	GZip     float64
	Identity float64
}

func initEncodings() encodings {
	return encodings{
		Br:       -1,
		GZip:     -1,
		Identity: -1,
	}
}

func Encoding(acceptEncodings []string) (string, string) {
	if len(acceptEncodings) == 0 {
		return "br", ".br"
	}

	ee := initEncodings()

	var maxQ float64 = 0.0
	for _, v := range acceptEncodings {
		for e := range strings.SplitSeq(v, ",") {
			e = strings.TrimSpace(e)

			encoding, weightStr, found := strings.Cut(e, ";q=")

			var weight float64 = 1.0
			if found {
				var err error
				weight, err = strconv.ParseFloat(weightStr, 64)
				if err != nil {
					continue
				}
				weight = max(min(weight, 1.0), 0.0)
			}

			switch encoding {
			case "br":
				ee.Br = weight
				maxQ = max(maxQ, weight)

			case "gzip":
				ee.GZip = weight
				maxQ = max(maxQ, weight)

			case "identity":
				ee.Identity = weight
				maxQ = max(maxQ, weight)

			case "*":
				if ee.Br == -1 {
					ee.Br = weight
					maxQ = max(maxQ, weight)
				}
				if ee.GZip == -1 {
					ee.GZip = weight
					maxQ = max(maxQ, weight)
				}
				if ee.Identity == -1 {
					ee.Identity = weight
					maxQ = max(maxQ, weight)
				}
			}
		}
	}

	if maxQ == 0.0 {
		return "", ""
	}
	if ee.Br == maxQ {
		return "br", ".br"
	}
	if ee.GZip == maxQ {
		return "gzip", ".gz"
	}
	if ee.Identity == maxQ {
		return "identity", ""
	}

	return "", ""
}
