package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

func HandleClient(conn *websocket.Conn, hub *Hub, matchID int, username string) {
	client := &Client{
		MatchID: matchID,
		Send:    make(chan []byte, 256),
	}
	hub.Register(client)

	// Send history on connect
	history := hub.GetHistory(matchID)
	for _, msg := range history {
		conn.SetWriteDeadline(time.Now().Add(writeWait))
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}

	// Read goroutine
	go func() {
		defer func() {
			hub.Unregister(client)
			conn.Close()
		}()
		conn.SetReadLimit(maxMessageSize)
		conn.SetReadDeadline(time.Now().Add(pongWait))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(pongWait))
			return nil
		})
		for {
			_, data, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("ws read error: %v", err)
				}
				break
			}
			var incoming struct {
				Text string `json:"text"`
			}
			if err := json.Unmarshal(data, &incoming); err != nil || len(incoming.Text) == 0 {
				continue
			}
			if len(incoming.Text) > 500 {
				incoming.Text = incoming.Text[:500]
			}
			hub.Publish(matchID, Message{
				MatchID:  matchID,
				Username: username,
				Text:     incoming.Text,
				Type:     "chat",
			})
		}
	}()

	// Write pump
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()
	for {
		select {
		case msg, ok := <-client.Send:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
