package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	loginWindow      = 15 * time.Minute
	maxLoginAttempts = 5
)

func (h Handler) loginLimited(ctx context.Context, r *http.Request, email string) bool {
	if h.Redis == nil {
		return false
	}

	count, err := h.Redis.Get(ctx, loginLimitKey(r, email)).Int()
	if err != nil {
		return false
	}
	return count >= maxLoginAttempts
}

func (h Handler) recordFailedLogin(ctx context.Context, r *http.Request, email string) {
	if h.Redis == nil {
		return
	}

	key := loginLimitKey(r, email)
	pipe := h.Redis.TxPipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, loginWindow)
	_, _ = pipe.Exec(ctx)
}

func (h Handler) clearLoginLimit(ctx context.Context, r *http.Request, email string) {
	if h.Redis == nil {
		return
	}
	_ = h.Redis.Del(ctx, loginLimitKey(r, email)).Err()
}

func loginLimitKey(r *http.Request, email string) string {
	return fmt.Sprintf("auth:login:%s:%s", strings.ReplaceAll(fmt.Sprint(clientIP(r)), ":", "_"), email)
}
