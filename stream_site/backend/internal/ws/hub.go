package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type Message struct {
	MatchID  int    `json:"match_id"`
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Text     string `json:"text"`
	SentAt   string `json:"sent_at"`
	Type     string `json:"type"` // "chat" | "score_update" | "status_update"
}

type ScoreUpdate struct {
	MatchID   int    `json:"match_id"`
	HomeScore int    `json:"home_score"`
	AwayScore int    `json:"away_score"`
	Minute    int    `json:"minute"`
	Status    string `json:"status"`
	Type      string `json:"type"`
}

type Client struct {
	MatchID int
	Send    chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	rooms   map[int]map[*Client]struct{}
	rdb     *redis.Client
	ctx     context.Context
	dropped uint64
}

func NewHub(rdb *redis.Client) *Hub {
	h := &Hub{
		rooms: make(map[int]map[*Client]struct{}),
		rdb:   rdb,
		ctx:   context.Background(),
	}
	go h.subscribeRedis()
	return h
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[c.MatchID] == nil {
		h.rooms[c.MatchID] = make(map[*Client]struct{})
	}
	h.rooms[c.MatchID][c] = struct{}{}
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[c.MatchID]; ok {
		delete(room, c)
		close(c.Send)
	}
}

func (h *Hub) Publish(matchID int, msg Message) {
	msg.SentAt = time.Now().UTC().Format(time.RFC3339)
	b, _ := json.Marshal(msg)

	// Save to Redis history list (keep last 50)
	histKey := "chat:history:" + intToStr(matchID)
	h.rdb.LPush(h.ctx, histKey, b)
	h.rdb.LTrim(h.ctx, histKey, 0, 49)

	// Publish to Redis channel for fan-out across instances
	h.rdb.Publish(h.ctx, "chat:"+intToStr(matchID), b)
}

func (h *Hub) PublishScore(update ScoreUpdate) {
	update.Type = "score_update"
	b, _ := json.Marshal(update)
	h.rdb.Publish(h.ctx, "live:scores", b)
}

func (h *Hub) GetHistory(matchID int) []json.RawMessage {
	histKey := "chat:history:" + intToStr(matchID)
	msgs, err := h.rdb.LRange(h.ctx, histKey, 0, 49).Result()
	if err != nil {
		return nil
	}
	result := make([]json.RawMessage, 0, len(msgs))
	// reverse order (newest first in Redis, send oldest first)
	for i := len(msgs) - 1; i >= 0; i-- {
		result = append(result, json.RawMessage(msgs[i]))
	}
	return result
}

func (h *Hub) subscribeRedis() {
	pubsub := h.rdb.PSubscribe(h.ctx, "chat:*", "live:scores")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		h.broadcast(msg.Channel, []byte(msg.Payload))
	}
}

func (h *Hub) broadcast(channel string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if channel == "live:scores" {
		// Broadcast to all rooms
		for _, room := range h.rooms {
			for c := range room {
				select {
				case c.Send <- data:
				default:
					h.markDropped(channel)
				}
			}
		}
		return
	}

	// Extract matchID from "chat:123"
	if len(channel) > 5 {
		matchID := strToInt(channel[5:])
		if room, ok := h.rooms[matchID]; ok {
			for c := range room {
				select {
				case c.Send <- data:
				default:
					h.markDropped(channel)
				}
			}
		}
	}
}

func (h *Hub) markDropped(channel string) {
	dropped := atomic.AddUint64(&h.dropped, 1)
	if dropped%100 == 0 {
		log.Printf("ws hub: dropped %d messages so far (latest channel=%s)", dropped, channel)
	}
}

func (h *Hub) Metrics(c *gin.Context) {
	activeRooms, activeClients, maxLag := h.snapshotMetrics()
	c.JSON(http.StatusOK, gin.H{
		"ws_active_rooms":   activeRooms,
		"ws_active_clients": activeClients,
		"ws_dropped_total":  atomic.LoadUint64(&h.dropped),
		"ws_max_lag":        maxLag,
	})
}

func (h *Hub) snapshotMetrics() (int, int, int) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	activeRooms := len(h.rooms)
	activeClients := 0
	maxLag := 0
	for _, room := range h.rooms {
		activeClients += len(room)
		for client := range room {
			if lag := len(client.Send); lag > maxLag {
				maxLag = lag
			}
		}
	}
	return activeRooms, activeClients, maxLag
}

func intToStr(i int) string {
	return strconv.Itoa(i)
}

func strToInt(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}
