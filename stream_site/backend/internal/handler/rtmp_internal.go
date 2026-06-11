package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type RTMPInternalHandler struct {
	db *sqlx.DB
}

func NewRTMPInternalHandler(db *sqlx.DB) *RTMPInternalHandler {
	return &RTMPInternalHandler{db: db}
}

func (h *RTMPInternalHandler) Authorize(c *gin.Context) {
	name := c.PostForm("name")
	if name == "" {
		c.String(http.StatusForbidden, "missing stream key")
		return
	}

	var allowed bool
	if err := h.db.Get(&allowed, "SELECT EXISTS(SELECT 1 FROM stream_keys WHERE key = $1 AND is_active = true)", name); err != nil {
		c.String(http.StatusInternalServerError, "db error")
		return
	}
	if !allowed {
		c.String(http.StatusForbidden, "unauthorized")
		return
	}

	c.String(http.StatusOK, "ok")
}

func (h *RTMPInternalHandler) Done(c *gin.Context) {
	c.String(http.StatusOK, "ok")
}
