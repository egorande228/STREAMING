package config

import (
	"os"
	"testing"
)

func TestLoadRejectsProductionWithoutJWTSecret(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("REDIS_URL", "redis://example")
	t.Setenv("ADMIN_PASSWORD_HASH", "$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu")
	_ = os.Unsetenv("JWT_SECRET")

	if _, err := Load(); err == nil {
		t.Fatal("expected production config without JWT_SECRET to fail")
	}
}

func TestLoadRejectsProductionWithoutAdminPasswordHash(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("REDIS_URL", "redis://example")
	t.Setenv("JWT_SECRET", "super-secret-value")
	_ = os.Unsetenv("ADMIN_PASSWORD_HASH")

	if _, err := Load(); err == nil {
		t.Fatal("expected production config without ADMIN_PASSWORD_HASH to fail")
	}
}

func TestLoadAllowsDevelopmentFallbacks(t *testing.T) {
	t.Setenv("ENV", "development")
	_ = os.Unsetenv("JWT_SECRET")
	_ = os.Unsetenv("ADMIN_PASSWORD_HASH")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected development config to load: %v", err)
	}
	if cfg.JWTSecret == "" {
		t.Fatal("expected development fallback JWT secret to be set")
	}
}
