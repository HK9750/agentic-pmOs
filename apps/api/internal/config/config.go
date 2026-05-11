package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"agentic-pmos/apps/api/internal/platform/cache"
)

type Config struct {
	AppEnv          string
	HTTPAddr        string
	WebOrigin       string
	DatabaseURL     string
	Redis           cache.Config
	MigrationsDir   string
	ShutdownTimeout time.Duration
}

func Load() Config {
	return Config{
		AppEnv:      envString("APP_ENV", "local"),
		HTTPAddr:    envString("HTTP_ADDR", ":8080"),
		WebOrigin:   envString("WEB_ORIGIN", "http://localhost:3000"),
		DatabaseURL: envString("DATABASE_URL", "postgres://agentic:agentic@localhost:5432/agentic_pmos?sslmode=disable"),
		Redis: cache.Config{
			Addr:     envString("REDIS_ADDR", "localhost:6380"),
			Password: envString("REDIS_PASSWORD", ""),
			DB:       envInt("REDIS_DB", 0),
		},
		MigrationsDir:   envString("MIGRATIONS_DIR", "migrations"),
		ShutdownTimeout: envDuration("SHUTDOWN_TIMEOUT", 10*time.Second),
	}
}

func (c Config) CookieSecure() bool {
	return c.AppEnv != "local" && c.AppEnv != "test"
}

func (c Config) LogLevel() slog.Level {
	switch strings.ToLower(envString("LOG_LEVEL", "info")) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
