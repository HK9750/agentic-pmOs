package audit

import "time"

type ActorType string

const (
	ActorUser   ActorType = "user"
	ActorAgent  ActorType = "agent"
	ActorSystem ActorType = "system"
)

type Event struct {
	ID          string
	WorkspaceID string
	ProjectID   string
	ActorType   ActorType
	ActorID     string
	Action      string
	TargetType  string
	TargetID    string
	CreatedAt   time.Time
}
