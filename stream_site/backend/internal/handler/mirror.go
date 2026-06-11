package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"stream_site/backend/internal/model"
	"stream_site/backend/internal/service"
)

type MirrorHandler struct {
	db       *sqlx.DB
	telegram *service.TelegramNotifier
}

func NewMirrorHandler(db *sqlx.DB, telegram *service.TelegramNotifier) *MirrorHandler {
	return &MirrorHandler{db: db, telegram: telegram}
}

func (h *MirrorHandler) GetActiveMirrors() ([]model.Mirror, error) {
	var mirrors []model.Mirror
	err := h.db.Select(&mirrors, "SELECT * FROM mirrors WHERE is_active = true ORDER BY is_primary DESC, id ASC")
	return mirrors, err
}

func (h *MirrorHandler) List(c *gin.Context) {
	mirrors, err := h.GetActiveMirrors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mirrors": mirrors})
}

func (h *MirrorHandler) ListAll(c *gin.Context) {
	var mirrors []model.Mirror
	if err := h.db.Select(&mirrors, "SELECT * FROM mirrors ORDER BY is_primary DESC, id ASC"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mirrors": mirrors})
}

func (h *MirrorHandler) Create(c *gin.Context) {
	var input model.Mirror
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tx, err := h.db.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	if input.IsPrimary {
		if err := demotePrimaries(tx, nil); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	var id int
	err = tx.QueryRow(
		"INSERT INTO mirrors (domain, is_active, is_primary, region, priority) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		input.Domain, input.IsActive, input.IsPrimary, input.Region, input.Priority,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *MirrorHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input model.Mirror
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tx, err := h.db.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	if input.IsPrimary {
		if err := demotePrimaries(tx, &id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	_, err = tx.Exec("UPDATE mirrors SET domain=$1, is_active=$2, is_primary=$3, region=$4, priority=$5 WHERE id=$6",
		input.Domain, input.IsActive, input.IsPrimary, input.Region, input.Priority, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *MirrorHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	h.db.Exec("DELETE FROM mirrors WHERE id = $1", id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Activate promotes the given mirror to primary (demotes previous primary).
// Sends a Telegram alert so operators and channel subscribers are informed immediately.
func (h *MirrorHandler) Activate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Demote all current primaries
	if _, err := tx.Exec("UPDATE mirrors SET is_primary = false WHERE is_primary = true"); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Promote target + ensure it's active
	var domain string
	err = tx.QueryRow(
		"UPDATE mirrors SET is_primary = true, is_active = true WHERE id = $1 RETURNING domain",
		id,
	).Scan(&domain)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "mirror not found"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.telegram.Send(fmt.Sprintf(
		"🚨 MANUAL SWITCH\n✅ New primary mirror: %s\n\n🌐 https://%s",
		domain, domain,
	))

	c.JSON(http.StatusOK, gin.H{"ok": true, "domain": domain})
}

func demotePrimaries(tx *sqlx.Tx, excludeID *int) error {
	if excludeID == nil {
		_, err := tx.Exec("UPDATE mirrors SET is_primary = false WHERE is_primary = true")
		return err
	}

	_, err := tx.Exec("UPDATE mirrors SET is_primary = false WHERE is_primary = true AND id <> $1", *excludeID)
	return err
}
