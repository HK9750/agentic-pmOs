package workspaces

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"agentic-pmos/apps/api/internal/auth"
	"agentic-pmos/apps/api/internal/platform/httpx"
)

const maxBodyBytes = 1 << 20

type Handler struct {
	DB   *pgxpool.Pool
	Auth auth.Handler
}

type Workspace struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	WorkspaceType string    `json:"workspace_type"`
	Role          string    `json:"role"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type response struct {
	Workspace Workspace `json:"workspace"`
}

type listResponse struct {
	Workspaces []Workspace `json:"workspaces"`
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	type request struct {
		Name          string `json:"name"`
		Description   string `json:"description"`
		WorkspaceType string `json:"workspace_type"`
	}

	session, ok := h.Auth.RequireSession(w, r)
	if !ok {
		return
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}

	name := strings.TrimSpace(req.Name)
	description := strings.TrimSpace(req.Description)
	workspaceType := strings.TrimSpace(req.WorkspaceType)
	if workspaceType == "" {
		workspaceType = "engineering_team"
	}
	if err := validateWorkspace(name, description, workspaceType); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_workspace", err.Error())
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_create_failed", "Could not create workspace")
		return
	}
	defer tx.Rollback(r.Context())

	var workspace Workspace
	err = tx.QueryRow(r.Context(), `
INSERT INTO workspaces (name, description, workspace_type, created_by)
VALUES ($1, $2, $3, $4)
RETURNING id::text, name, description, workspace_type, created_at, updated_at`, name, description, workspaceType, session.User.ID).
		Scan(&workspace.ID, &workspace.Name, &workspace.Description, &workspace.WorkspaceType, &workspace.CreatedAt, &workspace.UpdatedAt)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_create_failed", "Could not create workspace")
		return
	}

	workspace.Role = "owner"
	if _, err := tx.Exec(r.Context(), `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`, workspace.ID, session.User.ID); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_member_failed", "Could not assign workspace owner")
		return
	}

	if _, err := tx.Exec(r.Context(), `
INSERT INTO audit_events (workspace_id, actor_type, actor_id, action, target_type, target_id, metadata)
VALUES ($1, 'user', $2, 'workspace.created', 'workspace', $1, $3::jsonb)`, workspace.ID, session.User.ID, `{"role":"owner"}`); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "audit_failed", "Could not record workspace audit event")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_create_failed", "Could not create workspace")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, response{Workspace: workspace})
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	session, ok := h.Auth.RequireSession(w, r)
	if !ok {
		return
	}

	rows, err := h.DB.Query(r.Context(), `
SELECT w.id::text, w.name, w.description, w.workspace_type, wm.role, w.created_at, w.updated_at
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
WHERE wm.user_id = $1 AND w.archived_at IS NULL
ORDER BY w.created_at DESC`, session.User.ID)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_list_failed", "Could not load workspaces")
		return
	}
	defer rows.Close()

	items := make([]Workspace, 0)
	for rows.Next() {
		var workspace Workspace
		if err := rows.Scan(&workspace.ID, &workspace.Name, &workspace.Description, &workspace.WorkspaceType, &workspace.Role, &workspace.CreatedAt, &workspace.UpdatedAt); err != nil {
			httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_list_failed", "Could not load workspaces")
			return
		}
		items = append(items, workspace)
	}
	if err := rows.Err(); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_list_failed", "Could not load workspaces")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, listResponse{Workspaces: items})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON")
		return false
	}
	return true
}

func validateWorkspace(name string, description string, workspaceType string) error {
	if name == "" {
		return errors.New("Workspace name is required")
	}
	if len(name) > 120 {
		return errors.New("Workspace name must be 120 characters or fewer")
	}
	if len(description) > 1000 {
		return errors.New("Workspace description must be 1000 characters or fewer")
	}
	if len(workspaceType) > 80 {
		return errors.New("Workspace type must be 80 characters or fewer")
	}
	return nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
