# Data And Storage Plan

This file defines the recommended data stores and the first core domain model.

## Recommended Storage Choices

| Need | Recommended store | Reason |
| --- | --- | --- |
| Core product data | PostgreSQL | Workspaces, projects, tasks, approvals, audit, reports, permissions need relational integrity. |
| External raw events | PostgreSQL JSONB first, object storage for large/archive payloads | Easy queryability and transactional ingestion. |
| Search | PostgreSQL full-text first | Good enough for MVP and avoids extra infrastructure. |
| Semantic memory | pgvector first | Keeps embeddings near source data and reduces early complexity. |
| Cache and locks | Redis | Fast caching, idempotency windows, rate limits, distributed locks. |
| Realtime fanout | Redis pub/sub or streams when needed | Simple cross-process fanout for notifications and activity updates. |
| Reliable async jobs | RabbitMQ | Durable queues, retries, dead-letter queues, separate worker scaling. |
| Files and exports | S3-compatible object storage | Meeting uploads, report exports, raw payload archives. |

## Why PostgreSQL First

The product has many relationships:

- Workspace to members.
- Project to external resources.
- Task to PRs, commits, messages, blockers, risks, sprints, and reports.
- Suggestion to evidence, approval decision, execution result, and audit event.

PostgreSQL handles these relationships, gives strong transactions, supports JSONB for external payload flexibility, and can support full-text and vector search for MVP.

## Core Entities

| Entity | Purpose |
| --- | --- |
| `users` | Platform identities. |
| `workspaces` | Company/team container. |
| `workspace_members` | User membership and role. |
| `invitations` | Pending member invites. |
| `projects` | Project metadata and lifecycle. |
| `project_members` | Project-level membership and role overrides if needed. |
| `connectors` | Connected GitHub, Slack, Jira, Linear accounts. |
| `connector_tokens` | Encrypted access/refresh token references. |
| `external_resources` | Repositories, Slack channels, Jira boards, Linear teams mapped to projects. |
| `raw_external_events` | Immutable webhook/polling payloads. |
| `activity_events` | Normalized project activity feed records. |
| `external_identities` | Mapping between platform users and GitHub/Slack/Jira/Linear users. |
| `tasks` | Internal mirrored task records. |
| `task_external_links` | Links from internal task to Jira/Linear/GitHub issue. |
| `task_activity_links` | Links between tasks and activity events. |
| `pull_requests` | Mirrored PR records when GitHub is connected. |
| `commits` | Mirrored commit metadata where useful. |
| `sprints` | Internal or imported sprint records. |
| `sprint_tasks` | Task membership and sprint baseline tracking. |
| `blockers` | Confirmed blockers and candidates. |
| `risks` | Confirmed risks and candidates. |
| `agent_runs` | Each agent execution with trigger and context summary. |
| `suggestions` | Agent/command-generated proposed actions. |
| `suggestion_evidence` | Source messages, tasks, PRs, comments, or events supporting suggestions. |
| `approvals` | Review decisions and final approved action parameters. |
| `action_executions` | Result of executing approved internal/external actions. |
| `reports` | Daily digests, weekly reports, sprint reviews. |
| `notifications` | In-app and delivery-channel notifications. |
| `audit_events` | Immutable record of important user, agent, and system actions. |
| `search_documents` | Denormalized text/vector records for project memory. |

## Event Model

Store two levels of event data:

1. Raw event: exact external payload, source headers, received time, idempotency key, connector ID.
2. Normalized activity event: internal type, actor, project, task, source URL, timestamp, summary, metadata.

Raw events are for auditability and reprocessing. Activity events are for product UX and downstream agents.

## Suggested Activity Event Types

- `task_created`
- `task_updated`
- `task_status_changed`
- `task_assigned`
- `comment_added`
- `pull_request_opened`
- `pull_request_reviewed`
- `pull_request_merged`
- `commit_pushed`
- `slack_message_detected`
- `blocker_candidate_created`
- `blocker_confirmed`
- `risk_candidate_created`
- `suggestion_created`
- `suggestion_approved`
- `external_action_executed`
- `report_generated`
- `connector_sync_started`
- `connector_sync_failed`

## Computed Status Storage

Tasks need both source status and computed status.

Store:

- Source status from Jira/Linear/GitHub.
- Normalized source status category.
- Computed status.
- Computed status reason.
- Computed status evidence IDs.
- Last recalculated timestamp.

Computed statuses:

- Not started.
- In progress.
- Under review.
- Blocked.
- Stale.
- Ready for QA.
- Done.
- Inconsistent.
- Unknown.

## Indexing Priorities

Add indexes early for:

- Workspace and project scoping on every major table.
- External IDs and connector IDs for idempotent sync.
- Activity feed by project and timestamp.
- Tasks by project, assignee, sprint, source status, computed status, due date.
- Suggestions by project, status, type, created time.
- Audit by workspace, project, actor, action, created time.
- Search documents by project and text/vector columns.

## Data Retention

- Keep audit events indefinitely unless a customer policy says otherwise.
- Keep normalized activity events long-term because reports and project memory need history.
- Keep raw external events for a configurable period, then archive large payloads to object storage.
- Store Slack data carefully and respect workspace retention/privacy settings.
