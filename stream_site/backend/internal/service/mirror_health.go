package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

// TelegramNotifier sends messages to a Telegram channel via Bot API.
// Silently does nothing when token/chatID are empty (dev mode).
type TelegramNotifier struct {
	token  string
	chatID string
	client *http.Client
}

func NewTelegramNotifier(token, chatID string) *TelegramNotifier {
	return &TelegramNotifier{
		token:  token,
		chatID: chatID,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (t *TelegramNotifier) Send(text string) {
	if t.token == "" || t.chatID == "" {
		return
	}
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.token)
	payload := struct {
		ChatID    string `json:"chat_id"`
		Text      string `json:"text"`
		ParseMode string `json:"parse_mode"`
	}{
		ChatID:    t.chatID,
		Text:      text,
		ParseMode: "HTML",
	}
	b, err := json.Marshal(payload)
	if err != nil {
		log.Printf("telegram notify: marshal: %v", err)
		return
	}
	resp, err := t.client.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		log.Printf("telegram notify: %v", err)
		return
	}
	resp.Body.Close()
}

// MirrorHealthChecker pings all active mirrors every 15 seconds.
// When a primary mirror becomes unreachable it auto-promotes the next healthy mirror
// and sends a Telegram alert to the configured channel.
type MirrorHealthChecker struct {
	db       *sqlx.DB
	rdb      *redis.Client
	client   *http.Client
	telegram *TelegramNotifier
	instance string

	mu         sync.Mutex
	prevStatus map[int]string // mirrorID → last known status
}

func NewMirrorHealthChecker(db *sqlx.DB, rdb *redis.Client, telegram *TelegramNotifier) *MirrorHealthChecker {
	host, _ := os.Hostname()
	if host == "" {
		host = "unknown"
	}
	return &MirrorHealthChecker{
		db:  db,
		rdb: rdb,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		telegram:   telegram,
		instance:   fmt.Sprintf("%s-%d", host, time.Now().UnixNano()),
		prevStatus: make(map[int]string),
	}
}

func (m *MirrorHealthChecker) Start(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.checkAll(ctx)
		}
	}
}

type mirrorRow struct {
	ID        int    `db:"id"`
	Domain    string `db:"domain"`
	IsPrimary bool   `db:"is_primary"`
}

func (m *MirrorHealthChecker) checkAll(ctx context.Context) {
	isLeader, err := m.acquireLeader(ctx)
	if err != nil {
		log.Printf("mirror health: leader lock failed: %v", err)
		isLeader = false
	}

	var mirrors []mirrorRow
	if err := m.db.Select(&mirrors,
		"SELECT id, domain, is_primary FROM mirrors WHERE is_active = true ORDER BY is_primary DESC, priority ASC",
	); err != nil {
		log.Printf("mirror health: failed to load mirrors: %v", err)
		return
	}

	for _, mirror := range mirrors {
		go m.check(ctx, mirror, isLeader)
	}
}

func (m *MirrorHealthChecker) check(ctx context.Context, mirror mirrorRow, isLeader bool) {
	url := "https://" + mirror.Domain + "/api/health"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		m.handleStatusChange(mirror, "error", isLeader)
		return
	}

	resp, err := m.client.Do(req)
	status := "healthy"
	if err != nil || resp.StatusCode != http.StatusOK {
		status = "unreachable"
	}
	if resp != nil {
		resp.Body.Close()
	}

	m.handleStatusChange(mirror, status, isLeader)
}

func (m *MirrorHealthChecker) handleStatusChange(mirror mirrorRow, newStatus string, isLeader bool) {
	m.mu.Lock()
	prev := m.prevStatus[mirror.ID]
	m.prevStatus[mirror.ID] = newStatus
	m.mu.Unlock()

	m.updateStatus(mirror.ID, newStatus)

	if !isLeader {
		return
	}
	if prev == newStatus {
		return
	}
	if prev == "" && newStatus == "healthy" {
		return
	}

	if newStatus == "unreachable" {
		if mirror.IsPrimary {
			// Primary went down: auto-promote next healthy mirror
			log.Printf("mirror health: PRIMARY %s is unreachable — promoting standby", mirror.Domain)
			promoted := m.promoteNextHealthy(mirror.ID)
			if promoted != "" {
				m.telegram.Send(fmt.Sprintf(
					"🔴 PRIMARY mirror DOWN: %s\n✅ Promoted: %s\n\n🌐 Use: https://%s",
					mirror.Domain, promoted, promoted,
				))
			} else {
				m.telegram.Send(fmt.Sprintf(
					"🔴 PRIMARY mirror DOWN: %s\n⚠️ No healthy standby available — switch manually!",
					mirror.Domain,
				))
			}
		} else {
			// Non-primary went down: just alert
			m.telegram.Send(fmt.Sprintf("⚠️ Mirror DOWN: %s", mirror.Domain))
		}
	} else if newStatus == "healthy" && prev == "unreachable" {
		// Mirror recovered
		m.telegram.Send(fmt.Sprintf("✅ Mirror RECOVERED: %s", mirror.Domain))
	}
}

// promoteNextHealthy demotes current primary and promotes the next healthy non-primary mirror.
// Returns the domain of the newly promoted mirror, or "" if none available.
func (m *MirrorHealthChecker) promoteNextHealthy(downID int) string {
	tx, err := m.db.Beginx()
	if err != nil {
		log.Printf("mirror health: failed to start promote tx: %v", err)
		return ""
	}

	var next struct {
		ID     int    `db:"id"`
		Domain string `db:"domain"`
	}
	err = tx.Get(&next,
		`SELECT id, domain FROM mirrors
		 WHERE is_active = true AND health_status = 'healthy' AND id != $1
		 ORDER BY priority ASC, id ASC LIMIT 1`,
		downID,
	)
	if err != nil {
		_ = tx.Rollback()
		log.Printf("mirror health: no healthy standby available: %v", err)
		return ""
	}

	if _, err = tx.Exec("UPDATE mirrors SET is_primary = false WHERE is_primary = true"); err != nil {
		_ = tx.Rollback()
		log.Printf("mirror health: failed to demote primaries: %v", err)
		return ""
	}
	if _, err = tx.Exec("UPDATE mirrors SET is_primary = true WHERE id = $1", next.ID); err != nil {
		_ = tx.Rollback()
		log.Printf("mirror health: failed to promote mirror %d: %v", next.ID, err)
		return ""
	}
	if err = tx.Commit(); err != nil {
		log.Printf("mirror health: failed to commit promote tx: %v", err)
		return ""
	}

	log.Printf("mirror health: promoted %s (id=%d) as new primary", next.Domain, next.ID)
	return next.Domain
}

func (m *MirrorHealthChecker) updateStatus(id int, status string) {
	_, err := m.db.Exec(
		"UPDATE mirrors SET health_status = $1, last_health_check = NOW() WHERE id = $2",
		status, id,
	)
	if err != nil {
		log.Printf("mirror health: failed to update status for mirror %d: %v", id, err)
	}
}

func (m *MirrorHealthChecker) acquireLeader(ctx context.Context) (bool, error) {
	const leaderKey = "ch:mirror-leader"
	ok, err := m.rdb.SetNX(ctx, leaderKey, m.instance, 25*time.Second).Result()
	if err != nil {
		return false, err
	}
	if ok {
		return true, nil
	}

	current, err := m.rdb.Get(ctx, leaderKey).Result()
	if err != nil {
		return false, err
	}
	if current != m.instance {
		return false, nil
	}

	return true, m.rdb.Expire(ctx, leaderKey, 25*time.Second).Err()
}
