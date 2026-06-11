// sync — fetch match schedule and teams from football-data.org and upsert into the DB.
//
// Usage:
//
//	go run ./cmd/sync all          — sync teams then matches
//	go run ./cmd/sync teams        — sync teams only
//	go run ./cmd/sync matches      — sync matches only
//
// Required env vars:
//
//	DATABASE_URL         — postgres DSN (same as the main server)
//	FOOTBALL_API_KEY     — your football-data.org API key (free tier: 10 req/min)
//
// Optional:
//
//	FOOTBALL_COMPETITION — competition code (default: WC)
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const baseURL = "https://api.football-data.org/v4"

// ── API response shapes ───────────────────────────────────────────────────────

type apiTeam struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"shortName"`
	TLA       string `json:"tla"`
	Crest     string `json:"crest"`
}

type apiTeamsResponse struct {
	Teams []apiTeam `json:"teams"`
}

type apiScore struct {
	Winner   *string `json:"winner"`
	FullTime struct {
		Home *int `json:"home"`
		Away *int `json:"away"`
	} `json:"fullTime"`
}

type apiMatch struct {
	ID       int      `json:"id"`
	UTCDate  string   `json:"utcDate"`
	Status   string   `json:"status"`
	Stage    string   `json:"stage"`
	Group    *string  `json:"group"`
	HomeTeam apiTeam  `json:"homeTeam"`
	AwayTeam apiTeam  `json:"awayTeam"`
	Score    apiScore `json:"score"`
	Venue    string   `json:"venue"`
}

type apiMatchesResponse struct {
	Matches []apiMatch `json:"matches"`
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

func get(path, apiKey string, out interface{}) error {
	req, err := http.NewRequest("GET", baseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-Auth-Token", apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("football-data.org returned %d for %s", resp.StatusCode, path)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

// mapStatus converts football-data.org status to our DB status values.
func mapStatus(s string) string {
	switch s {
	case "IN_PLAY", "PAUSED", "HALFTIME":
		return "live"
	case "FINISHED":
		return "finished"
	case "POSTPONED", "CANCELLED", "SUSPENDED":
		return "cancelled"
	default: // SCHEDULED, TIMED
		return "scheduled"
	}
}

// mapStage converts football-data.org stage to our short stage names.
func mapStage(s string) string {
	switch s {
	case "GROUP_STAGE":
		return "group"
	case "LAST_16", "ROUND_OF_16":
		return "round_of_16"
	case "QUARTER_FINALS":
		return "quarter_final"
	case "SEMI_FINALS":
		return "semi_final"
	case "THIRD_PLACE":
		return "third_place"
	case "FINAL":
		return "final"
	default:
		return strings.ToLower(s)
	}
}

func normalizeGroupName(group *string) (string, bool) {
	if group == nil {
		return "", false
	}

	name := strings.ToUpper(strings.TrimSpace(*group))
	if name == "" {
		return "", false
	}

	name = strings.TrimPrefix(name, "GROUP_")
	name = strings.TrimPrefix(name, "GROUP ")
	name = strings.TrimPrefix(name, "GROUP")
	name = strings.TrimSpace(name)

	if len(name) != 1 || name[0] < 'A' || name[0] > 'Z' {
		return "", false
	}
	return name, true
}

func ensureGroupID(db *sqlx.DB, groupName string) (*int, error) {
	if groupName == "" {
		return nil, nil
	}

	if _, err := db.Exec(
		`INSERT INTO groups (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
		groupName,
	); err != nil {
		return nil, err
	}

	var id int
	if err := db.Get(&id, "SELECT id FROM groups WHERE name = $1", groupName); err != nil {
		return nil, err
	}
	return &id, nil
}

// ── Sync functions ────────────────────────────────────────────────────────────

func syncTeams(db *sqlx.DB, apiKey, competition string) error {
	log.Println("[sync] fetching teams...")
	var resp apiTeamsResponse
	if err := get("/competitions/"+competition+"/teams", apiKey, &resp); err != nil {
		return fmt.Errorf("fetch teams: %w", err)
	}
	log.Printf("[sync] got %d teams", len(resp.Teams))

	for _, t := range resp.Teams {
		tla := t.TLA
		if tla == "" {
			// derive 3-letter code from name as fallback
			words := strings.Fields(t.Name)
			if len(words) >= 3 {
				tla = strings.ToUpper(string(words[0][0]) + string(words[1][0]) + string(words[2][0]))
			} else if len(t.Name) >= 3 {
				tla = strings.ToUpper(t.Name[:3])
			}
		}

		_, err := db.Exec(`
			INSERT INTO teams (external_id, code, name_en, name_ru, flag_url)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (code) DO UPDATE SET
				external_id = EXCLUDED.external_id,
				name_en     = EXCLUDED.name_en,
				flag_url    = EXCLUDED.flag_url,
				name_ru     = CASE WHEN teams.name_ru = teams.name_en OR teams.name_ru = ''
				                   THEN EXCLUDED.name_en
				                   ELSE teams.name_ru
				              END
		`, t.ID, tla, t.Name, t.Name, t.Crest)
		if err != nil {
			log.Printf("[sync] team %s (%d): %v", t.Name, t.ID, err)
		} else {
			log.Printf("[sync] upserted team %s (%s)", t.Name, tla)
		}
	}

	// Keep legacy/local placeholder teams in DB, but ensure they do not pollute group tables.
	if _, err := db.Exec(`UPDATE teams SET group_id = NULL WHERE external_id IS NULL`); err != nil {
		return fmt.Errorf("cleanup stale team groups: %w", err)
	}
	return nil
}

func syncMatches(db *sqlx.DB, apiKey, competition string) error {
	log.Println("[sync] fetching matches...")
	var resp apiMatchesResponse
	if err := get("/competitions/"+competition+"/matches", apiKey, &resp); err != nil {
		return fmt.Errorf("fetch matches: %w", err)
	}
	log.Printf("[sync] got %d matches", len(resp.Matches))

	for _, m := range resp.Matches {
		scheduledAt, err := time.Parse(time.RFC3339, m.UTCDate)
		if err != nil {
			log.Printf("[sync] match %d bad date %q: %v", m.ID, m.UTCDate, err)
			continue
		}

		status := mapStatus(m.Status)
		stage := mapStage(m.Stage)
		var groupID *int
		if groupName, ok := normalizeGroupName(m.Group); ok {
			gid, err := ensureGroupID(db, groupName)
			if err != nil {
				log.Printf("[sync] match %d group %q resolve error: %v", m.ID, groupName, err)
			} else {
				groupID = gid
			}
		}

		// Resolve team IDs from external_id
		var homeID, awayID *int
		if m.HomeTeam.ID != 0 {
			var id int
			if err := db.Get(&id, "SELECT id FROM teams WHERE external_id = $1", m.HomeTeam.ID); err == nil {
				homeID = &id
			}
		}
		if m.AwayTeam.ID != 0 {
			var id int
			if err := db.Get(&id, "SELECT id FROM teams WHERE external_id = $1", m.AwayTeam.ID); err == nil {
				awayID = &id
			}
		}

		homeScore := 0
		awayScore := 0
		if m.Score.FullTime.Home != nil {
			homeScore = *m.Score.FullTime.Home
		}
		if m.Score.FullTime.Away != nil {
			awayScore = *m.Score.FullTime.Away
		}

		_, err = db.Exec(`
			INSERT INTO matches (external_id, home_team_id, away_team_id, group_id, stage, venue, scheduled_at, status, home_score, away_score)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (external_id) DO UPDATE SET
				home_team_id = EXCLUDED.home_team_id,
				away_team_id = EXCLUDED.away_team_id,
				group_id     = EXCLUDED.group_id,
				stage        = EXCLUDED.stage,
				venue        = EXCLUDED.venue,
				scheduled_at = EXCLUDED.scheduled_at,
				status       = EXCLUDED.status,
				home_score   = EXCLUDED.home_score,
				away_score   = EXCLUDED.away_score,
				updated_at   = NOW()
		`, m.ID, homeID, awayID, groupID, stage, m.Venue, scheduledAt, status, homeScore, awayScore)
		if err != nil {
			log.Printf("[sync] match %d: %v", m.ID, err)
		} else {
			if groupID != nil {
				if homeID != nil {
					if _, err := db.Exec("UPDATE teams SET group_id = $1 WHERE id = $2", *groupID, *homeID); err != nil {
						log.Printf("[sync] team %d group update: %v", *homeID, err)
					}
				}
				if awayID != nil {
					if _, err := db.Exec("UPDATE teams SET group_id = $1 WHERE id = $2", *groupID, *awayID); err != nil {
						log.Printf("[sync] team %d group update: %v", *awayID, err)
					}
				}
			}

			home := m.HomeTeam.Name
			away := m.AwayTeam.Name
			if home == "" {
				home = "TBD"
			}
			if away == "" {
				away = "TBD"
			}
			log.Printf("[sync] upserted match #%d %s vs %s (%s)", m.ID, home, away, scheduledAt.Format("2006-01-02"))
		}
	}
	return nil
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	_ = godotenv.Load()

	apiKey := os.Getenv("FOOTBALL_API_KEY")
	if apiKey == "" {
		log.Fatal("FOOTBALL_API_KEY is required. Get a free key at https://www.football-data.org/client/register")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://stream:stream@localhost:5432/streamdb?sslmode=disable"
	}

	competition := os.Getenv("FOOTBALL_COMPETITION")
	if competition == "" {
		competition = "WC"
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer db.Close()

	cmd := "all"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	switch cmd {
	case "teams":
		if err := syncTeams(db, apiKey, competition); err != nil {
			log.Fatalf("sync teams: %v", err)
		}
	case "matches":
		if err := syncMatches(db, apiKey, competition); err != nil {
			log.Fatalf("sync matches: %v", err)
		}
	case "all":
		if err := syncTeams(db, apiKey, competition); err != nil {
			log.Fatalf("sync teams: %v", err)
		}
		// Brief pause to stay within free-tier rate limit (10 req/min)
		time.Sleep(7 * time.Second)
		if err := syncMatches(db, apiKey, competition); err != nil {
			log.Fatalf("sync matches: %v", err)
		}
	default:
		fmt.Fprintf(os.Stderr, "usage: sync [all|teams|matches]\n")
		os.Exit(1)
	}

	log.Println("[sync] done")
}
