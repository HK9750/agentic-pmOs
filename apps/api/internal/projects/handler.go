package projects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
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

type Project struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspace_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	ProjectKey  string     `json:"project_key"`
	ProjectType string     `json:"project_type"`
	Status      string     `json:"status"`
	Role        string     `json:"role"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	TargetDate  *time.Time `json:"target_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type response struct {
	Project Project `json:"project"`
}

type listResponse struct {
	Projects []Project `json:"projects"`
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	type request struct {
		WorkspaceID string `json:"workspace_id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		ProjectKey  string `json:"project_key"`
		ProjectType string `json:"project_type"`
		StartDate   string `json:"start_date"`
		TargetDate  string `json:"target_date"`
	}

	session, ok := h.Auth.RequireSession(w, r)
	if !ok {
		return
	}

	var req request
	if !decodeJSON(w, r, &req) {
		return
	}

	workspaceID := strings.TrimSpace(req.WorkspaceID)
	name := strings.TrimSpace(req.Name)
	description := strings.TrimSpace(req.Description)
	projectKey := strings.ToUpper(strings.TrimSpace(req.ProjectKey))
	projectType := strings.TrimSpace(req.ProjectType)
	if projectType == "" {
		projectType = "software_product"
	}

	startDate, err := parseOptionalDate(req.StartDate)
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_start_date", "Start date must use YYYY-MM-DD")
		return
	}
	targetDate, err := parseOptionalDate(req.TargetDate)
	if err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_target_date", "Target date must use YYYY-MM-DD")
		return
	}

	if err := validateProject(workspaceID, name, description, projectKey, projectType); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_project", err.Error())
		return
	}

	role, err := h.workspaceRole(r.Context(), workspaceID, session.User.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, r, http.StatusForbidden, "workspace_access_denied", "You do not have access to this workspace")
		return
	}
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_lookup_failed", "Could not verify workspace access")
		return
	}
	if !canCreateProject(role) {
		httpx.WriteError(w, r, http.StatusForbidden, "project_create_denied", "Your role cannot create projects in this workspace")
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "project_create_failed", "Could not create project")
		return
	}
	defer tx.Rollback(r.Context())

	project, err := scanProject(tx.QueryRow(r.Context(), `
INSERT INTO projects (workspace_id, name, description, project_key, project_type, start_date, target_date, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id::text, workspace_id::text, name, description, project_key, project_type, status, start_date, target_date, created_at, updated_at`, workspaceID, name, description, projectKey, projectType, nullableDate(startDate), nullableDate(targetDate), session.User.ID))
	if err != nil {
		if isUniqueViolation(err) {
			httpx.WriteError(w, r, http.StatusConflict, "project_key_exists", "A project with this key already exists in the workspace")
			return
		}
		httpx.WriteError(w, r, http.StatusInternalServerError, "project_create_failed", "Could not create project")
		return
	}

	project.Role = role
	if _, err := tx.Exec(r.Context(), `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)`, project.ID, session.User.ID, role); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "project_member_failed", "Could not assign project member")
		return
	}

	if _, err := tx.Exec(r.Context(), `
INSERT INTO audit_events (workspace_id, project_id, actor_type, actor_id, action, target_type, target_id, metadata)
VALUES ($1, $2, 'user', $3, 'project.created', 'project', $2, $4::jsonb)`, workspaceID, project.ID, session.User.ID, `{"source":"manual"}`); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "audit_failed", "Could not record project audit event")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "project_create_failed", "Could not create project")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, response{Project: project})
}

func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	session, ok := h.Auth.RequireSession(w, r)
	if !ok {
		return
	}

	workspaceID := strings.TrimSpace(r.URL.Query().Get("workspace_id"))
	if workspaceID == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "missing_workspace_id", "workspace_id query parameter is required")
		return
	}

	if _, err := h.workspaceRole(r.Context(), workspaceID, session.User.ID); errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, r, http.StatusForbidden, "workspace_access_denied", "You do not have access to this workspace")
		return
	} else if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "workspace_lookup_failed", "Could not verify workspace access")
		return
	}

	rows, err := h.DB.Query(r.Context(), `
SELECT p.id::text, p.workspace_id::text, p.name, p.description, p.project_key, p.project_type, p.status, COALESCE(pm.role, wm.role), p.start_date, p.target_date, p.created_at, p.updated_at
FROM projects p
JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
WHERE p.workspace_id = $1 AND p.archived_at IS NULL
ORDER BY p.created_at DESC`, workspaceID, session.User.ID)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "project_list_failed", "Could not load projects")
		return
	}
	defer rows.Close()

	projects := make([]Project, 0)
	for rows.Next() {
		project, err := scanProjectWithRole(rows)
		if err != nil {
			httpx.WriteError(w, r, http.StatusInternalServerError, "project_list_failed", "Could not load projects")
			return
		}
		projects = append(projects, project)
	}
	if err := rows.Err(); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "project_list_failed", "Could not load projects")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, listResponse{Projects: projects})
}

func (h Handler) workspaceRole(ctx context.Context, workspaceID string, userID string) (string, error) {
	var role string
	err := h.DB.QueryRow(ctx, `
SELECT role
FROM workspace_members
WHERE workspace_id = $1 AND user_id = $2`, workspaceID, userID).Scan(&role)
	return role, err
}

func canCreateProject(role string) bool {
	return role == "owner" || role == "admin" || role == "pm"
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

func validateProject(workspaceID string, name string, description string, projectKey string, projectType string) error {
	if workspaceID == "" {
		return errors.New("Workspace ID is required")
	}
	if name == "" {
		return errors.New("Project name is required")
	}
	if len(name) > 160 {
		return errors.New("Project name must be 160 characters or fewer")
	}
	if len(description) > 2000 {
		return errors.New("Project description must be 2000 characters or fewer")
	}
	if projectKey == "" {
		return errors.New("Project key is required")
	}
	if len(projectKey) > 20 {
		return errors.New("Project key must be 20 characters or fewer")
	}
	for _, char := range projectKey {
		if (char < 'A' || char > 'Z') && (char < '0' || char > '9') && char != '-' {
			return errors.New("Project key can only contain uppercase letters, numbers, and hyphens")
		}
	}
	if projectType == "" {
		return errors.New("Project type is required")
	}
	if len(projectType) > 80 {
		return errors.New("Project type must be 80 characters or fewer")
	}
	return nil
}

func parseOptionalDate(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func nullableDate(value *time.Time) any {
	if value == nil {
		return nil
	}
	return *value
}

type rowScanner interface {
	Scan(...any) error
}

func scanProject(scanner rowScanner) (Project, error) {
	var project Project
	var startDate sql.NullTime
	var targetDate sql.NullTime
	err := scanner.Scan(&project.ID, &project.WorkspaceID, &project.Name, &project.Description, &project.ProjectKey, &project.ProjectType, &project.Status, &startDate, &targetDate, &project.CreatedAt, &project.UpdatedAt)
	project.StartDate = nullableTime(startDate)
	project.TargetDate = nullableTime(targetDate)
	return project, err
}

func scanProjectWithRole(scanner rowScanner) (Project, error) {
	var project Project
	var startDate sql.NullTime
	var targetDate sql.NullTime
	err := scanner.Scan(&project.ID, &project.WorkspaceID, &project.Name, &project.Description, &project.ProjectKey, &project.ProjectType, &project.Status, &project.Role, &startDate, &targetDate, &project.CreatedAt, &project.UpdatedAt)
	project.StartDate = nullableTime(startDate)
	project.TargetDate = nullableTime(targetDate)
	return project, err
}

func nullableTime(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
