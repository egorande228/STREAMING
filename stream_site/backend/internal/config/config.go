package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	RedisURL          string
	JWTSecret         string
	AdminUser         string
	AdminPasswordHash string
	Env               string
	TelegramToken     string
	TelegramChatID    string
	FootballAPIKey    string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://stream:stream@localhost:5432/streamdb?sslmode=disable"),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:         getEnv("JWT_SECRET", "change-me-in-production"),
		AdminUser:         getEnv("ADMIN_USER", "admin"),
		AdminPasswordHash: getEnv("ADMIN_PASSWORD_HASH", ""),
		Env:               getEnv("ENV", "development"),
		TelegramToken:     getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:    getEnv("TELEGRAM_CHANNEL_ID", ""),
		FootballAPIKey:    getEnv("FOOTBALL_API_KEY", ""),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if !strings.EqualFold(c.Env, "production") {
		return nil
	}

	if strings.TrimSpace(c.JWTSecret) == "" || strings.HasPrefix(c.JWTSecret, "change-me") {
		return fmt.Errorf("JWT_SECRET must be set to a non-default value in production")
	}
	if strings.TrimSpace(c.AdminPasswordHash) == "" {
		return fmt.Errorf("ADMIN_PASSWORD_HASH must be set in production for secure admin bootstrap")
	}

	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
