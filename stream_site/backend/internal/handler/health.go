package handler

import (
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"stream_site/backend/internal/model"
)

type MirrorRepository interface {
	GetActiveMirrors() ([]model.Mirror, error)
}

type HealthHandler struct {
	mirrors MirrorRepository
}

func NewHealthHandler(mirrors MirrorRepository) *HealthHandler {
	return &HealthHandler{mirrors: mirrors}
}

func (h *HealthHandler) Health(c *gin.Context) {
	mirrors, _ := h.mirrors.GetActiveMirrors()
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"mirrors": mirrors,
	})
}

func (h *HealthHandler) Mirrors(c *gin.Context) {
	mirrors, err := h.mirrors.GetActiveMirrors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	country := strings.ToUpper(strings.TrimSpace(c.GetHeader("CF-IPCountry")))
	region := countryToRegion(country)
	sorted := sortMirrorsByRegion(mirrors, region)

	c.JSON(http.StatusOK, gin.H{
		"mirrors":         sorted,
		"detected_region": region,
	})
}

func sortMirrorsByRegion(mirrors []model.Mirror, preferredRegion string) []model.Mirror {
	out := make([]model.Mirror, len(mirrors))
	copy(out, mirrors)

	weight := func(m model.Mirror) int {
		region := strings.ToLower(strings.TrimSpace(m.Region))
		if preferredRegion != "" && region == preferredRegion {
			return 0
		}
		if region == "" || region == "global" {
			return 1
		}
		return 2
	}

	sort.SliceStable(out, func(i, j int) bool {
		wi, wj := weight(out[i]), weight(out[j])
		if wi != wj {
			return wi < wj
		}
		if out[i].IsPrimary != out[j].IsPrimary {
			return out[i].IsPrimary
		}
		if out[i].Priority != out[j].Priority {
			return out[i].Priority < out[j].Priority
		}
		return out[i].ID < out[j].ID
	})

	return out
}

func countryToRegion(country string) string {
	switch country {
	case "US", "CA", "MX":
		return "us"
	case "AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "MA", "DZ", "TN":
		return "mena"
	case "JP", "KR", "CN", "HK", "TW", "SG", "MY", "TH", "VN", "ID", "IN", "PH", "AU", "NZ":
		return "asia"
	case "RU", "UA", "BY", "KZ", "TR", "GB", "IE", "DE", "FR", "ES", "PT", "IT", "NL", "BE", "PL", "CZ", "SK", "AT", "CH", "SE", "NO", "DK", "FI", "RO", "BG", "GR", "HR", "RS", "SI", "HU", "LT", "LV", "EE", "MD", "GE", "AM", "AZ":
		return "eu"
	default:
		return "global"
	}
}
