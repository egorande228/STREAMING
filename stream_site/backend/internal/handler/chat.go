package handler

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	wslib "stream_site/backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type ChatHandler struct {
	hub *wslib.Hub
	rdb *redis.Client
}

func NewChatHandler(hub *wslib.Hub, rdb *redis.Client) *ChatHandler {
	return &ChatHandler{hub: hub, rdb: rdb}
}

func (h *ChatHandler) Chat(c *gin.Context) {
	matchID, err := strconv.Atoi(c.Param("matchId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid match id"})
		return
	}

	// Rate limit: max 5 concurrent WS per IP
	ip := c.ClientIP()
	ctx := context.Background()
	wsKey := fmt.Sprintf("ws:conn:%s", ip)
	count, _ := h.rdb.Get(ctx, wsKey).Int()
	if count >= 5 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many connections"})
		return
	}
	h.rdb.SetNX(ctx, wsKey, 0, 10*time.Minute)
	h.rdb.Incr(ctx, wsKey)
	defer h.rdb.Decr(ctx, wsKey)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	username := c.Query("username")
	if username == "" {
		username = "Anonymous"
	}
	if len(username) > 30 {
		username = username[:30]
	}

	wslib.HandleClient(conn, h.hub, matchID, username)
}

func (h *ChatHandler) LiveScores(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Subscribe to live score updates
	pubsub := h.rdb.Subscribe(context.Background(), "live:scores")
	defer pubsub.Close()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	ch := pubsub.Channel()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case msg := <-ch:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-done:
			return
		}
	}
}
