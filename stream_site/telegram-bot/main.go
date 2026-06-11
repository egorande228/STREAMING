package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type TelegramBot struct {
	token   string
	apiBase string
	chatID  string
	apiURL  string
}

type Mirror struct {
	Domain  string `json:"domain"`
	Healthy bool   `json:"is_active"`
}

func NewBot(token, chatID, backendURL string) *TelegramBot {
	return &TelegramBot{
		token:   token,
		apiBase: "https://api.telegram.org/bot" + token,
		chatID:  chatID,
		apiURL:  backendURL,
	}
}

func (b *TelegramBot) getMirrors() ([]Mirror, error) {
	resp, err := http.Get(b.apiURL + "/api/mirrors")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Mirrors []Mirror `json:"mirrors"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result.Mirrors, nil
}

func (b *TelegramBot) sendMessage(text string) error {
	url := fmt.Sprintf("%s/sendMessage", b.apiBase)
	body := fmt.Sprintf(`{"chat_id":"%s","text":"%s","parse_mode":"HTML"}`, b.chatID, text)
	resp, err := http.Post(url, "application/json", strings.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (b *TelegramBot) buildMirrorMessage(mirrors []Mirror) string {
	var lines []string
	lines = append(lines, "🌐 <b>FIFA World Cup 2026 — Live Streams</b>")
	lines = append(lines, "")
	lines = append(lines, "Working mirrors:")
	for _, m := range mirrors {
		if m.Healthy {
			lines = append(lines, fmt.Sprintf("• https://%s", m.Domain))
		}
	}
	lines = append(lines, "")
	lines = append(lines, fmt.Sprintf("Updated: %s UTC", time.Now().UTC().Format("15:04")))
	return strings.Join(lines, "\n")
}

func (b *TelegramBot) handleUpdate(update map[string]interface{}) {
	msg, ok := update["message"].(map[string]interface{})
	if !ok {
		return
	}
	text, _ := msg["text"].(string)
	chatMap, _ := msg["chat"].(map[string]interface{})
	chatID := fmt.Sprintf("%v", chatMap["id"])

	b.chatID = chatID // respond to the requester

	switch strings.TrimSpace(text) {
	case "/mirrors", "/start":
		mirrors, err := b.getMirrors()
		if err != nil {
			b.sendMessage("⚠️ Service temporarily unavailable")
			return
		}
		b.sendMessage(b.buildMirrorMessage(mirrors))
	case "/help":
		b.sendMessage("/mirrors — get current working links\n/start — welcome message")
	}
}

func (b *TelegramBot) runPolling() {
	offset := 0
	client := &http.Client{Timeout: 30 * time.Second}

	for {
		url := fmt.Sprintf("%s/getUpdates?offset=%d&timeout=25", b.apiBase, offset)
		resp, err := client.Get(url)
		if err != nil {
			log.Printf("polling error: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var result struct {
			Result []map[string]interface{} `json:"result"`
		}
		if err := json.Unmarshal(body, &result); err != nil {
			time.Sleep(2 * time.Second)
			continue
		}

		for _, update := range result.Result {
			id := int(update["update_id"].(float64))
			if id >= offset {
				offset = id + 1
			}
			b.handleUpdate(update)
		}
	}
}

func main() {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	chatID := os.Getenv("TELEGRAM_CHANNEL_ID")
	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8080"
	}

	if token == "" {
		log.Fatal("TELEGRAM_BOT_TOKEN not set")
	}

	bot := NewBot(token, chatID, backendURL)
	log.Println("Telegram bot started, polling for updates...")
	bot.runPolling()
}
