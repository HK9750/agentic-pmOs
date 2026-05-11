package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"agentic-pmos/apps/api/internal/config"
	"agentic-pmos/apps/api/internal/platform/httpx"
	"agentic-pmos/apps/api/internal/platform/password"
)

const (
	sessionCookieName = "apmos_session"
	sessionDuration   = 30 * 24 * time.Hour
	maxBodyBytes      = 1 << 20
	minPasswordLength = 10
	maxPasswordLength = 128

	maxNameLength      = 120
	maxTitleLength     = 120
	maxTimezoneLength  = 80
	maxAvatarURLLength = 500
	maxBioLength       = 800
)

const userSelectColumns = `u.id::text, u.email::text, u.name, u.avatar_url, u.title, u.timezone, u.bio, u.email_verified_at, u.profile_completed_at, u.last_login_at, u.created_at, u.updated_at`
const userReturningColumns = `id::text, email::text, name, avatar_url, title, timezone, bio, email_verified_at, profile_completed_at, last_login_at, created_at, updated_at`

type Handler struct {
	DB     *pgxpool.Pool
	Redis  *redis.Client
	Config config.Config
}

type User struct {
	ID                 string     `json:"id"`
	Email              string     `json:"email"`
	Name               string     `json:"name"`
	AvatarURL          string     `json:"avatar_url"`
	Title              string     `json:"title"`
	Timezone           string     `json:"timezone"`
	Bio                string     `json:"bio"`
	EmailVerifiedAt    *time.Time `json:"email_verified_at,omitempty"`
	ProfileCompletedAt *time.Time `json:"profile_completed_at,omitempty"`
	LastLoginAt        *time.Time `json:"last_login_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type SessionInfo struct {
	ID         string    `json:"id"`
	Current    bool      `json:"current"`
	UserAgent  string    `json:"user_agent"`
	IPAddress  string    `json:"ip_address"`
	ExpiresAt  time.Time `json:"expires_at"`
	LastSeenAt time.Time `json:"last_seen_at"`
	CreatedAt  time.Time `json:"created_at"`
}

type authResponse struct {
	User User `json:"user"`
}

type profileResponse struct {
	User    User        `json:"user"`
	Session SessionInfo `json:"session"`
}

type sessionsResponse struct {
	Sessions []SessionInfo `json:"sessions"`
}

type currentSession struct {
	ID   string
	User User
}

type SessionContext struct {
	ID   string
	User User
}

func (h Handler) RequireSession(w http.ResponseWriter, r *http.Request) (SessionContext, bool) {
	session, ok := h.requireSession(w, r)
	if !ok {
		return SessionContext{}, false
	}
	return SessionContext{ID: session.ID, User: session.User}, true
}

func (h Handler) Register(w http.ResponseWriter, r *http.Request) {
	type request struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}

	email, ok := normalizeEmail(req.Email)
	if !ok {
		h.recordAuthEvent(r.Context(), "", strings.TrimSpace(req.Email), "register_failed", false, r, map[string]any{"reason": "invalid_email"})
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_email", "Enter a valid email address")
		return
	}

	if err := validatePassword(req.Password); err != nil {
		h.recordAuthEvent(r.Context(), "", email, "register_failed", false, r, map[string]any{"reason": "weak_password"})
		httpx.WriteError(w, r, http.StatusBadRequest, "weak_password", err.Error())
		return
	}

	name := strings.TrimSpace(req.Name)
	if len(name) > maxNameLength {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_name", "Name must be 120 characters or fewer")
		return
	}

	passwordHash, err := password.Hash(req.Password)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_hash_failed", "Could not create account")
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "transaction_failed", "Could not create account")
		return
	}
	defer rollback(r.Context(), tx)

	var user User
	err = scanUser(tx.QueryRow(r.Context(), `
INSERT INTO users (email, name, last_login_at, profile_completed_at)
VALUES ($1, $2, now(), CASE WHEN $2 <> '' THEN now() ELSE NULL END)
RETURNING `+userReturningColumns, email, name), &user)
	if err != nil {
		if isUniqueViolation(err) {
			h.recordAuthEvent(r.Context(), "", email, "register_failed", false, r, map[string]any{"reason": "account_exists"})
			httpx.WriteError(w, r, http.StatusConflict, "account_exists", "An account with this email already exists")
			return
		}
		httpx.WriteError(w, r, http.StatusInternalServerError, "account_create_failed", "Could not create account")
		return
	}

	if _, err := tx.Exec(r.Context(), `INSERT INTO user_passwords (user_id, password_hash) VALUES ($1, $2)`, user.ID, passwordHash); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_store_failed", "Could not create account")
		return
	}

	session, err := h.createSession(r.Context(), tx, user.ID, r)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_create_failed", "Could not create session")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "account_create_failed", "Could not create account")
		return
	}

	h.recordAuthEvent(r.Context(), user.ID, user.Email, "register_success", true, r, map[string]any{"session_id": session.ID})
	setSessionCookie(w, h.Config, session.Token, session.ExpiresAt)
	httpx.WriteJSON(w, http.StatusCreated, authResponse{User: user})
}

func (h Handler) Login(w http.ResponseWriter, r *http.Request) {
	type request struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}

	email, ok := normalizeEmail(req.Email)
	if !ok {
		h.recordAuthEvent(r.Context(), "", strings.TrimSpace(req.Email), "login_failed", false, r, map[string]any{"reason": "invalid_email"})
		httpx.WriteError(w, r, http.StatusUnauthorized, "invalid_credentials", "Email or password is incorrect")
		return
	}

	if h.loginLimited(r.Context(), r, email) {
		h.recordAuthEvent(r.Context(), "", email, "login_blocked", false, r, map[string]any{"reason": "rate_limited"})
		httpx.WriteError(w, r, http.StatusTooManyRequests, "too_many_attempts", "Too many login attempts. Try again later")
		return
	}

	user, passwordHash, err := h.findUserWithPasswordByEmail(r.Context(), email)
	if errors.Is(err, pgx.ErrNoRows) {
		h.recordFailedLogin(r.Context(), r, email)
		h.recordAuthEvent(r.Context(), "", email, "login_failed", false, r, map[string]any{"reason": "not_found"})
		httpx.WriteError(w, r, http.StatusUnauthorized, "invalid_credentials", "Email or password is incorrect")
		return
	}
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "login_failed", "Could not log in")
		return
	}

	verified, err := password.Verify(req.Password, passwordHash)
	if err != nil || !verified {
		h.recordFailedLogin(r.Context(), r, email)
		h.recordAuthEvent(r.Context(), user.ID, user.Email, "login_failed", false, r, map[string]any{"reason": "bad_password"})
		httpx.WriteError(w, r, http.StatusUnauthorized, "invalid_credentials", "Email or password is incorrect")
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_create_failed", "Could not create session")
		return
	}
	defer rollback(r.Context(), tx)

	if err := scanUser(tx.QueryRow(r.Context(), `
UPDATE users
SET last_login_at = now(), updated_at = now()
WHERE id = $1
RETURNING `+userReturningColumns, user.ID), &user); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "login_failed", "Could not log in")
		return
	}

	session, err := h.createSession(r.Context(), tx, user.ID, r)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_create_failed", "Could not create session")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_create_failed", "Could not create session")
		return
	}

	h.clearLoginLimit(r.Context(), r, email)
	h.recordAuthEvent(r.Context(), user.ID, user.Email, "login_success", true, r, map[string]any{"session_id": session.ID})
	setSessionCookie(w, h.Config, session.Token, session.ExpiresAt)
	httpx.WriteJSON(w, http.StatusOK, authResponse{User: user})
}

func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	session, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	info, err := h.sessionInfo(r.Context(), session.User.ID, session.ID)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_lookup_failed", "Could not load session")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, profileResponse{User: session.User, Session: info})
}

func (h Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	type request struct {
		Name      *string `json:"name"`
		Title     *string `json:"title"`
		Timezone  *string `json:"timezone"`
		AvatarURL *string `json:"avatar_url"`
		Bio       *string `json:"bio"`
	}

	session, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}

	name := session.User.Name
	title := session.User.Title
	timezone := session.User.Timezone
	avatarURL := session.User.AvatarURL
	bio := session.User.Bio

	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
	}
	if req.Title != nil {
		title = strings.TrimSpace(*req.Title)
	}
	if req.Timezone != nil {
		timezone = strings.TrimSpace(*req.Timezone)
	}
	if req.AvatarURL != nil {
		avatarURL = strings.TrimSpace(*req.AvatarURL)
	}
	if req.Bio != nil {
		bio = strings.TrimSpace(*req.Bio)
	}

	if err := validateProfile(name, title, timezone, avatarURL, bio); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_profile", err.Error())
		return
	}

	var user User
	err := scanUser(h.DB.QueryRow(r.Context(), `
UPDATE users
SET name = $2,
    title = $3,
    timezone = $4,
    avatar_url = $5,
    bio = $6,
    profile_completed_at = CASE WHEN $2 <> '' AND $4 <> '' THEN COALESCE(profile_completed_at, now()) ELSE NULL END,
    updated_at = now()
WHERE id = $1
RETURNING `+userReturningColumns, session.User.ID, name, title, timezone, avatarURL, bio), &user)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "profile_update_failed", "Could not update profile")
		return
	}

	h.recordAuthEvent(r.Context(), user.ID, user.Email, "profile_updated", true, r, nil)
	httpx.WriteJSON(w, http.StatusOK, authResponse{User: user})
}

func (h Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	type request struct {
		CurrentPassword     string `json:"current_password"`
		NewPassword         string `json:"new_password"`
		LogoutOtherSessions bool   `json:"logout_other_sessions"`
	}

	session, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}

	if req.CurrentPassword == req.NewPassword {
		httpx.WriteError(w, r, http.StatusBadRequest, "password_reused", "New password must be different from the current password")
		return
	}
	if err := validatePassword(req.NewPassword); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "weak_password", err.Error())
		return
	}

	var existingHash string
	if err := h.DB.QueryRow(r.Context(), `SELECT password_hash FROM user_passwords WHERE user_id = $1`, session.User.ID).Scan(&existingHash); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_lookup_failed", "Could not change password")
		return
	}

	verified, err := password.Verify(req.CurrentPassword, existingHash)
	if err != nil || !verified {
		h.recordAuthEvent(r.Context(), session.User.ID, session.User.Email, "password_change_failed", false, r, map[string]any{"reason": "bad_current_password"})
		httpx.WriteError(w, r, http.StatusUnauthorized, "invalid_current_password", "Current password is incorrect")
		return
	}

	newHash, err := password.Hash(req.NewPassword)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_hash_failed", "Could not change password")
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_change_failed", "Could not change password")
		return
	}
	defer rollback(r.Context(), tx)

	if _, err := tx.Exec(r.Context(), `UPDATE user_passwords SET password_hash = $2, updated_at = now() WHERE user_id = $1`, session.User.ID, newHash); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_change_failed", "Could not change password")
		return
	}

	if req.LogoutOtherSessions {
		if _, err := tx.Exec(r.Context(), `
UPDATE user_sessions
SET revoked_at = now(), revoked_reason = 'password_changed'
WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL`, session.User.ID, session.ID); err != nil {
			httpx.WriteError(w, r, http.StatusInternalServerError, "session_revoke_failed", "Could not revoke other sessions")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "password_change_failed", "Could not change password")
		return
	}

	h.recordAuthEvent(r.Context(), session.User.ID, session.User.Email, "password_changed", true, r, map[string]any{"logout_other_sessions": req.LogoutOtherSessions})
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	session, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	sessions, err := h.sessionsForUser(r.Context(), session.User.ID, session.ID)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "sessions_lookup_failed", "Could not load sessions")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, sessionsResponse{Sessions: sessions})
}

func (h Handler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	type request struct {
		SessionID string `json:"session_id"`
	}

	session, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.SessionID == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "missing_session_id", "Session ID is required")
		return
	}

	result, err := h.DB.Exec(r.Context(), `
UPDATE user_sessions
SET revoked_at = now(), revoked_reason = 'manual_revoke'
WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, req.SessionID, session.User.ID)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_revoke_failed", "Could not revoke session")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.WriteError(w, r, http.StatusNotFound, "session_not_found", "Session was not found")
		return
	}

	if req.SessionID == session.ID {
		expireSessionCookie(w, h.Config)
	}

	h.recordAuthEvent(r.Context(), session.User.ID, session.User.Email, "session_revoked", true, r, map[string]any{"session_id": req.SessionID})
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	type request struct {
		KeepCurrent bool `json:"keep_current"`
	}

	session, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	req := request{KeepCurrent: true}
	if r.Body != nil && r.ContentLength != 0 {
		if !decodeJSON(w, r, &req) {
			return
		}
	}

	query := `
UPDATE user_sessions
SET revoked_at = now(), revoked_reason = 'logout_all'
WHERE user_id = $1 AND revoked_at IS NULL`
	args := []any{session.User.ID}
	if req.KeepCurrent {
		query += ` AND id <> $2`
		args = append(args, session.ID)
	}

	if _, err := h.DB.Exec(r.Context(), query, args...); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "logout_all_failed", "Could not revoke sessions")
		return
	}

	if !req.KeepCurrent {
		expireSessionCookie(w, h.Config)
	}

	h.recordAuthEvent(r.Context(), session.User.ID, session.User.Email, "logout_all", true, r, map[string]any{"keep_current": req.KeepCurrent})
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil && cookie.Value != "" {
		tokenHash := hashToken(cookie.Value)
		var userID, email, sessionID string
		_ = h.DB.QueryRow(r.Context(), `
SELECT u.id::text, u.email::text, s.id::text
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token_hash = $1`, tokenHash).Scan(&userID, &email, &sessionID)
		_, _ = h.DB.Exec(r.Context(), `UPDATE user_sessions SET revoked_at = now(), revoked_reason = 'logout' WHERE token_hash = $1 AND revoked_at IS NULL`, tokenHash)
		if userID != "" {
			h.recordAuthEvent(r.Context(), userID, email, "logout", true, r, map[string]any{"session_id": sessionID})
		}
	}

	expireSessionCookie(w, h.Config)
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) requireSession(w http.ResponseWriter, r *http.Request) (currentSession, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		httpx.WriteError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return currentSession{}, false
	}

	tokenHash := hashToken(cookie.Value)
	var session currentSession
	err = scanSessionUser(h.DB.QueryRow(r.Context(), `
SELECT s.id::text, `+userSelectColumns+`
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token_hash = $1
  AND s.revoked_at IS NULL
  AND s.expires_at > now()`, tokenHash), &session)
	if errors.Is(err, pgx.ErrNoRows) {
		expireSessionCookie(w, h.Config)
		httpx.WriteError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return currentSession{}, false
	}
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_lookup_failed", "Could not load session")
		return currentSession{}, false
	}

	_, _ = h.DB.Exec(r.Context(), `UPDATE user_sessions SET last_seen_at = now() WHERE id = $1`, session.ID)
	return session, true
}

type session struct {
	ID        string
	Token     string
	ExpiresAt time.Time
}

func (h Handler) createSession(ctx context.Context, tx pgx.Tx, userID string, r *http.Request) (session, error) {
	token, err := newSessionToken()
	if err != nil {
		return session{}, err
	}

	expiresAt := time.Now().UTC().Add(sessionDuration)
	var sessionID string
	err = tx.QueryRow(ctx, `
INSERT INTO user_sessions (user_id, token_hash, user_agent, ip_address, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id::text`, userID, hashToken(token), r.UserAgent(), clientIP(r), expiresAt).Scan(&sessionID)
	if err != nil {
		return session{}, err
	}

	return session{ID: sessionID, Token: token, ExpiresAt: expiresAt}, nil
}

func (h Handler) findUserWithPasswordByEmail(ctx context.Context, email string) (User, string, error) {
	var user User
	var passwordHash string
	err := scanUserWithPassword(h.DB.QueryRow(ctx, `
SELECT `+userSelectColumns+`, p.password_hash
FROM users u
JOIN user_passwords p ON p.user_id = u.id
WHERE u.email = $1`, email), &user, &passwordHash)
	return user, passwordHash, err
}

func (h Handler) sessionInfo(ctx context.Context, userID string, sessionID string) (SessionInfo, error) {
	var info SessionInfo
	err := h.DB.QueryRow(ctx, `
SELECT id::text, user_agent, COALESCE(ip_address::text, ''), expires_at, last_seen_at, created_at
FROM user_sessions
WHERE user_id = $1 AND id = $2 AND revoked_at IS NULL`, userID, sessionID).Scan(&info.ID, &info.UserAgent, &info.IPAddress, &info.ExpiresAt, &info.LastSeenAt, &info.CreatedAt)
	info.Current = true
	return info, err
}

func (h Handler) sessionsForUser(ctx context.Context, userID string, currentSessionID string) ([]SessionInfo, error) {
	rows, err := h.DB.Query(ctx, `
SELECT id::text, user_agent, COALESCE(ip_address::text, ''), expires_at, last_seen_at, created_at
FROM user_sessions
WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
ORDER BY last_seen_at DESC, created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make([]SessionInfo, 0)
	for rows.Next() {
		var info SessionInfo
		if err := rows.Scan(&info.ID, &info.UserAgent, &info.IPAddress, &info.ExpiresAt, &info.LastSeenAt, &info.CreatedAt); err != nil {
			return nil, err
		}
		info.Current = info.ID == currentSessionID
		sessions = append(sessions, info)
	}
	return sessions, rows.Err()
}

func (h Handler) recordAuthEvent(ctx context.Context, userID string, email string, eventType string, success bool, r *http.Request, metadata map[string]any) {
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		metadataJSON = []byte(`{}`)
	}

	_, _ = h.DB.Exec(ctx, `
INSERT INTO auth_events (user_id, email, event_type, success, ip_address, user_agent, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, nullableString(userID), nullableString(email), eventType, success, clientIP(r), r.UserAgent(), string(metadataJSON))
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Request body must contain a single JSON object")
		return false
	}
	return true
}

func normalizeEmail(value string) (string, bool) {
	email := strings.ToLower(strings.TrimSpace(value))
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email || !strings.Contains(email, "@") {
		return "", false
	}
	return email, true
}

func validatePassword(value string) error {
	if len(value) < minPasswordLength {
		return fmt.Errorf("Password must be at least %d characters", minPasswordLength)
	}
	if len(value) > maxPasswordLength {
		return fmt.Errorf("Password must be %d characters or fewer", maxPasswordLength)
	}

	var hasLetter, hasNumber bool
	for _, char := range value {
		if unicode.IsLetter(char) {
			hasLetter = true
		}
		if unicode.IsNumber(char) {
			hasNumber = true
		}
	}
	if !hasLetter || !hasNumber {
		return errors.New("Password must include at least one letter and one number")
	}
	return nil
}

func validateProfile(name string, title string, timezone string, avatarURL string, bio string) error {
	if len(name) > maxNameLength {
		return fmt.Errorf("Name must be %d characters or fewer", maxNameLength)
	}
	if len(title) > maxTitleLength {
		return fmt.Errorf("Title must be %d characters or fewer", maxTitleLength)
	}
	if timezone == "" {
		return errors.New("Timezone is required")
	}
	if len(timezone) > maxTimezoneLength {
		return fmt.Errorf("Timezone must be %d characters or fewer", maxTimezoneLength)
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return errors.New("Timezone must be a valid IANA timezone such as UTC or Asia/Karachi")
	}
	if len(avatarURL) > maxAvatarURLLength {
		return fmt.Errorf("Avatar URL must be %d characters or fewer", maxAvatarURLLength)
	}
	if avatarURL != "" {
		parsed, err := url.Parse(avatarURL)
		if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			return errors.New("Avatar URL must be a valid http or https URL")
		}
	}
	if len(bio) > maxBioLength {
		return fmt.Errorf("Bio must be %d characters or fewer", maxBioLength)
	}
	return nil
}

func newSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func setSessionCookie(w http.ResponseWriter, cfg config.Config, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   cfg.CookieSecure(),
		SameSite: http.SameSiteLaxMode,
	})
}

func expireSessionCookie(w http.ResponseWriter, cfg config.Config) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.CookieSecure(),
		SameSite: http.SameSiteLaxMode,
	})
}

func clientIP(r *http.Request) any {
	forwardedFor := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if forwardedFor != "" {
		parts := strings.Split(forwardedFor, ",")
		ip := net.ParseIP(strings.TrimSpace(parts[0]))
		if ip != nil {
			return ip.String()
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return nil
	}
	if ip := net.ParseIP(host); ip != nil {
		return ip.String()
	}
	return nil
}

type rowScanner interface {
	Scan(...any) error
}

func scanUser(scanner rowScanner, user *User) error {
	var emailVerifiedAt sql.NullTime
	var profileCompletedAt sql.NullTime
	var lastLoginAt sql.NullTime
	err := scanner.Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.Title,
		&user.Timezone,
		&user.Bio,
		&emailVerifiedAt,
		&profileCompletedAt,
		&lastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return err
	}
	user.EmailVerifiedAt = nullableTime(emailVerifiedAt)
	user.ProfileCompletedAt = nullableTime(profileCompletedAt)
	user.LastLoginAt = nullableTime(lastLoginAt)
	return nil
}

func scanUserWithPassword(scanner rowScanner, user *User, passwordHash *string) error {
	var emailVerifiedAt sql.NullTime
	var profileCompletedAt sql.NullTime
	var lastLoginAt sql.NullTime
	err := scanner.Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.Title,
		&user.Timezone,
		&user.Bio,
		&emailVerifiedAt,
		&profileCompletedAt,
		&lastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		passwordHash,
	)
	if err != nil {
		return err
	}
	user.EmailVerifiedAt = nullableTime(emailVerifiedAt)
	user.ProfileCompletedAt = nullableTime(profileCompletedAt)
	user.LastLoginAt = nullableTime(lastLoginAt)
	return nil
}

func scanSessionUser(scanner rowScanner, session *currentSession) error {
	var emailVerifiedAt sql.NullTime
	var profileCompletedAt sql.NullTime
	var lastLoginAt sql.NullTime
	err := scanner.Scan(
		&session.ID,
		&session.User.ID,
		&session.User.Email,
		&session.User.Name,
		&session.User.AvatarURL,
		&session.User.Title,
		&session.User.Timezone,
		&session.User.Bio,
		&emailVerifiedAt,
		&profileCompletedAt,
		&lastLoginAt,
		&session.User.CreatedAt,
		&session.User.UpdatedAt,
	)
	if err != nil {
		return err
	}
	session.User.EmailVerifiedAt = nullableTime(emailVerifiedAt)
	session.User.ProfileCompletedAt = nullableTime(profileCompletedAt)
	session.User.LastLoginAt = nullableTime(lastLoginAt)
	return nil
}

func nullableTime(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func rollback(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}
