package health

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"agentic-pmos/apps/api/internal/platform/httpx"
)

type Handler struct {
	DB        *pgxpool.Pool
	Redis     *redis.Client
	StartedAt time.Time
}

type response struct {
	Status    string            `json:"status"`
	StartedAt time.Time         `json:"started_at"`
	Checks    map[string]string `json:"checks,omitempty"`
}

func (h Handler) Liveness(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, response{
		Status:    "ok",
		StartedAt: h.StartedAt,
	})
}

func (h Handler) Readiness(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	checks := map[string]string{
		"postgres": "ok",
		"redis":    "ok",
	}
	status := http.StatusOK

	if err := h.DB.Ping(ctx); err != nil {
		checks["postgres"] = "failed"
		status = http.StatusServiceUnavailable
	}

	if err := h.Redis.Ping(ctx).Err(); err != nil {
		checks["redis"] = "failed"
		status = http.StatusServiceUnavailable
	}

	state := "ready"
	if status != http.StatusOK {
		state = "not_ready"
	}

	httpx.WriteJSON(w, status, response{
		Status:    state,
		StartedAt: h.StartedAt,
		Checks:    checks,
	})
}
