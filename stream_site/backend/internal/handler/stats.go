package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"stream_site/backend/internal/model"
)

type StatsHandler struct {
	db *sqlx.DB
}

func NewStatsHandler(db *sqlx.DB) *StatsHandler {
	return &StatsHandler{db: db}
}

func (h *StatsHandler) GetMatchStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var homeTeamID, awayTeamID *int
	if err := h.db.QueryRow(`SELECT home_team_id, away_team_id FROM matches WHERE id = $1`, id).Scan(&homeTeamID, &awayTeamID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "match not found"})
		return
	}

	stats := &model.MatchStats{
		Events:   []model.MatchEvent{},
		Lineups:  []model.MatchLineup{},
		HomeForm: []model.FormResult{},
		AwayForm: []model.FormResult{},
		H2H:      model.H2HStats{Meetings: []model.H2HMeeting{}},
	}

	_ = h.db.Select(&stats.Events, `SELECT * FROM match_events WHERE match_id = $1 ORDER BY minute ASC`, id)
	if stats.Events == nil {
		stats.Events = []model.MatchEvent{}
	}

	_ = h.db.Select(&stats.Lineups, `SELECT * FROM match_lineups WHERE match_id = $1 ORDER BY team, is_starter DESC, number ASC`, id)
	if stats.Lineups == nil {
		stats.Lineups = []model.MatchLineup{}
	}

	if homeTeamID != nil && awayTeamID != nil {
		type h2hRow struct {
			HomeTeamID  int    `db:"home_team_id"`
			AwayTeamID  int    `db:"away_team_id"`
			HomeScore   int    `db:"home_score"`
			AwayScore   int    `db:"away_score"`
			Stage       string `db:"stage"`
			Status      string `db:"status"`
			ScheduledAt string `db:"scheduled_at"`
		}
		var h2hRows []h2hRow
		_ = h.db.Select(&h2hRows, `
			SELECT home_team_id, away_team_id, home_score, away_score, stage, status,
			       to_char(scheduled_at, 'YYYY-MM-DD') as scheduled_at
			FROM matches
			WHERE status = 'finished'
			  AND ((home_team_id = $1 AND away_team_id = $2) OR (home_team_id = $2 AND away_team_id = $1))
			  AND id != $3
			ORDER BY scheduled_at DESC
			LIMIT 10
		`, *homeTeamID, *awayTeamID, id)

		for _, r := range h2hRows {
			hs, as := r.HomeScore, r.AwayScore
			if r.HomeTeamID == *awayTeamID {
				hs, as = as, hs
			}
			winner := "draw"
			if hs > as {
				winner = "home"
				stats.H2H.HomeWins++
			} else if as > hs {
				winner = "away"
				stats.H2H.AwayWins++
			} else {
				stats.H2H.Draws++
			}
			stats.H2H.HomeGoals += hs
			stats.H2H.AwayGoals += as
			stats.H2H.Total++
			stats.H2H.Meetings = append(stats.H2H.Meetings, model.H2HMeeting{
				ScheduledAt: r.ScheduledAt,
				HomeScore:   hs,
				AwayScore:   as,
				Stage:       r.Stage,
				Status:      r.Status,
				Winner:      winner,
			})
		}
		if stats.H2H.Meetings == nil {
			stats.H2H.Meetings = []model.H2HMeeting{}
		}

		type formRow struct {
			HomeTeamID int    `db:"home_team_id"`
			AwayTeamID int    `db:"away_team_id"`
			HomeScore  int    `db:"home_score"`
			AwayScore  int    `db:"away_score"`
			Stage      string `db:"stage"`
		}
		formQuery := `
			SELECT home_team_id, away_team_id, home_score, away_score, stage
			FROM matches
			WHERE status = 'finished'
			  AND (home_team_id = $1 OR away_team_id = $1)
			  AND id != $2
			ORDER BY scheduled_at DESC LIMIT 5`

		var homeRows []formRow
		_ = h.db.Select(&homeRows, formQuery, *homeTeamID, id)
		for _, r := range homeRows {
			isHome := r.HomeTeamID == *homeTeamID
			my, opp := r.HomeScore, r.AwayScore
			if !isHome {
				my, opp = r.AwayScore, r.HomeScore
			}
			res := "D"
			if my > opp {
				res = "W"
			} else if my < opp {
				res = "L"
			}
			stats.HomeForm = append(stats.HomeForm, model.FormResult{
				Result: res,
				Score:  strconv.Itoa(my) + "-" + strconv.Itoa(opp),
				Stage:  r.Stage,
				IsHome: isHome,
			})
		}
		if stats.HomeForm == nil {
			stats.HomeForm = []model.FormResult{}
		}

		var awayRows []formRow
		_ = h.db.Select(&awayRows, formQuery, *awayTeamID, id)
		for _, r := range awayRows {
			isHome := r.HomeTeamID == *awayTeamID
			my, opp := r.HomeScore, r.AwayScore
			if !isHome {
				my, opp = r.AwayScore, r.HomeScore
			}
			res := "D"
			if my > opp {
				res = "W"
			} else if my < opp {
				res = "L"
			}
			stats.AwayForm = append(stats.AwayForm, model.FormResult{
				Result: res,
				Score:  strconv.Itoa(my) + "-" + strconv.Itoa(opp),
				Stage:  r.Stage,
				IsHome: isHome,
			})
		}
		if stats.AwayForm == nil {
			stats.AwayForm = []model.FormResult{}
		}
	}

	c.JSON(http.StatusOK, stats)
}

func (h *StatsHandler) CreateEvent(c *gin.Context) {
	matchID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input model.MatchEvent
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.MatchID = matchID
	var newID int
	err = h.db.QueryRow(
		`INSERT INTO match_events (match_id, minute, type, team, player_name, detail) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		input.MatchID, input.Minute, input.Type, input.Team, input.PlayerName, input.Detail,
	).Scan(&newID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": newID})
}

func (h *StatsHandler) DeleteEvent(c *gin.Context) {
	eid, _ := strconv.Atoi(c.Param("eid"))
	h.db.Exec("DELETE FROM match_events WHERE id = $1", eid)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *StatsHandler) CreateLineup(c *gin.Context) {
	matchID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input model.MatchLineup
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.MatchID = matchID
	var newID int
	err = h.db.QueryRow(
		`INSERT INTO match_lineups (match_id, team, player_name, number, position, is_starter) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		input.MatchID, input.Team, input.PlayerName, input.Number, input.Position, input.IsStarter,
	).Scan(&newID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": newID})
}

func (h *StatsHandler) DeleteLineup(c *gin.Context) {
	lid, _ := strconv.Atoi(c.Param("lid"))
	h.db.Exec("DELETE FROM match_lineups WHERE id = $1", lid)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
