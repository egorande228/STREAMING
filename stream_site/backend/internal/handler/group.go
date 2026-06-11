package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"stream_site/backend/internal/model"
)

type GroupHandler struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewGroupHandler(db *sqlx.DB, rdb *redis.Client) *GroupHandler {
	return &GroupHandler{db: db, rdb: rdb}
}

func (h *GroupHandler) List(c *gin.Context) {
	ctx := c.Request.Context()
	if cached, err := h.rdb.Get(ctx, "groups:standings:v1").Bytes(); err == nil {
		c.Data(http.StatusOK, "application/json", cached)
		return
	}

	groups, err := h.loadGroupsWithStandings(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	payload := gin.H{"groups": groups}
	data, err := json.Marshal(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_ = h.rdb.Set(ctx, "groups:standings:v1", data, 30*time.Second).Err()
	c.Data(http.StatusOK, "application/json", data)
}

func (h *GroupHandler) Get(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	groups, err := h.loadGroupsWithStandings(c.Request.Context(), &id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(groups) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"group": gin.H{"id": groups[0].ID, "name": groups[0].Name}, "standings": groups[0].Teams})
}

type TeamStanding struct {
	model.Team
	Played int `json:"played"`
	Won    int `json:"won"`
	Drawn  int `json:"drawn"`
	Lost   int `json:"lost"`
	GF     int `json:"gf"`
	GA     int `json:"ga"`
	GD     int `json:"gd"`
	Points int `json:"points"`
}

type GroupWithTeams struct {
	ID    int            `json:"id"`
	Name  string         `json:"name"`
	Teams []TeamStanding `json:"teams"`
}

type groupQueryRow struct {
	ID    int             `db:"id"`
	Name  string          `db:"name"`
	Teams json.RawMessage `db:"teams"`
}

func (h *GroupHandler) loadGroupsWithStandings(ctx context.Context, groupID *int) ([]GroupWithTeams, error) {
	query := `
		WITH team_stats AS (
			SELECT
				g.id AS group_id,
				t.id,
				t.code,
				t.name_en,
				t.name_ru,
				t.flag_url,
				t.group_id AS team_group_id,
				COUNT(m.id) AS played,
				COALESCE(SUM(CASE
					WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 1
					WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 1
					ELSE 0 END), 0) AS won,
				COALESCE(SUM(CASE
					WHEN m.id IS NOT NULL AND m.home_score = m.away_score THEN 1
					ELSE 0 END), 0) AS drawn,
				COALESCE(SUM(CASE
					WHEN m.home_team_id = t.id AND m.home_score < m.away_score THEN 1
					WHEN m.away_team_id = t.id AND m.away_score < m.home_score THEN 1
					ELSE 0 END), 0) AS lost,
				COALESCE(SUM(CASE
					WHEN m.home_team_id = t.id THEN m.home_score
					WHEN m.away_team_id = t.id THEN m.away_score
					ELSE 0 END), 0) AS gf,
				COALESCE(SUM(CASE
					WHEN m.home_team_id = t.id THEN m.away_score
					WHEN m.away_team_id = t.id THEN m.home_score
					ELSE 0 END), 0) AS ga
			FROM groups g
			LEFT JOIN teams t ON t.group_id = g.id
			LEFT JOIN matches m ON (
				(m.home_team_id = t.id OR m.away_team_id = t.id)
				AND m.group_id = g.id
				AND m.stage = 'group'
				AND m.status = 'finished'
			)
			WHERE ($1::int IS NULL OR g.id = $1)
			GROUP BY g.id, t.id
		),
		ranked AS (
			SELECT
				group_id,
				id,
				code,
				name_en,
				name_ru,
				flag_url,
				team_group_id,
				played,
				won,
				drawn,
				lost,
				gf,
				ga,
				(gf - ga) AS gd,
				(won * 3 + drawn) AS points
			FROM team_stats
			WHERE id IS NOT NULL
		)
		SELECT
			g.id,
			g.name,
			COALESCE(
				json_agg(
					json_build_object(
						'id', r.id,
						'code', r.code,
						'name_en', r.name_en,
						'name_ru', r.name_ru,
						'flag_url', r.flag_url,
						'group_id', r.team_group_id,
						'played', r.played,
						'won', r.won,
						'drawn', r.drawn,
						'lost', r.lost,
						'gf', r.gf,
						'ga', r.ga,
						'gd', r.gd,
						'points', r.points
					)
					ORDER BY r.points DESC, r.gd DESC, r.name_en ASC
				) FILTER (WHERE r.id IS NOT NULL),
				'[]'::json
			) AS teams
		FROM groups g
		LEFT JOIN ranked r ON r.group_id = g.id
		WHERE ($1::int IS NULL OR g.id = $1)
		GROUP BY g.id, g.name
		ORDER BY g.name ASC`

	rows := []groupQueryRow{}
	if err := h.db.SelectContext(ctx, &rows, query, groupID); err != nil {
		return nil, err
	}

	result := make([]GroupWithTeams, 0, len(rows))
	for _, row := range rows {
		teams := []TeamStanding{}
		if len(row.Teams) > 0 {
			if err := json.Unmarshal(row.Teams, &teams); err != nil {
				return nil, err
			}
		}
		result = append(result, GroupWithTeams{ID: row.ID, Name: row.Name, Teams: teams})
	}
	return result, nil
}
