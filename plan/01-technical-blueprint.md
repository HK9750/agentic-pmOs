# Technical Blueprint

This file defines the recommended system shape for the platform.

## Recommended MVP Architecture

Start with a modular Go backend rather than many separate services.

Reasoning:

- The product has many domains, but the team will need speed and consistency early.
- Most workflows share the same auth, project context, audit, approvals, and connector data.
- A modular monolith keeps transactions and debugging simpler while still allowing workers and realtime processes.
- Packages can later split into services if load, ownership, or deployment pressure requires it.

## Runtime Components

| Component | Runtime | Purpose |
| --- | --- | --- |
| API server | Go | REST API, auth, RBAC, project resources, command center, approvals. |
| Realtime gateway | Go | WebSocket or SSE streams for activity, notifications, command drafts, connector health. |
| Worker process | Go | Connector sync, webhook processing, report generation, agent jobs, notifications. |
| Scheduler | Go | Daily digests, stale checks, sprint health recalculation, polling jobs. |
| Webhook receiver | Go | GitHub, Slack, Jira/Linear callbacks and event ingestion. Can be part of API server early. |
| AI orchestration layer | Go | Prompt assembly, model calls, structured parsing, evidence validation, suggestion creation. |
| Optional ML/eval service | Python | Offline evaluations, embeddings experiments, batch analysis, model quality checks. Not required for core MVP. |

## Suggested Go Package Boundaries

| Package | Responsibility |
| --- | --- |
| `auth` | Login/session/JWT/OAuth identity and service auth. |
| `rbac` | Role and permission checks. |
| `workspaces` | Workspace CRUD, setup checklist, invitations. |
| `projects` | Project CRUD, members, settings, lifecycle. |
| `connectors` | OAuth state, connector config, tokens, health, external resource mappings. |
| `ingestion` | Raw external event capture and normalization. |
| `activity` | Unified activity feed and event detail views. |
| `tasks` | Mirrored tasks, external links, computed status. |
| `sprints` | Sprint records, imports, health scoring, scope changes. |
| `agents` | Agent runs, suggestions, evidence, feedback, safety policy. |
| `commands` | Natural language command parsing and action draft creation. |
| `approvals` | Review, edit, approve, reject, snooze, execute approved actions. |
| `reports` | Daily digest, weekly report, sprint review generation. |
| `notifications` | In-app, Slack, email delivery and preferences. |
| `search` | Keyword search, semantic memory, evidence retrieval. |
| `audit` | User and agent action history. |
| `jobs` | Queues, schedules, retries, dead-letter handling. |

## API Surface

Use REST for MVP because resources are clear and easy to test.

Core API groups:

- `/auth`
- `/workspaces`
- `/members`
- `/projects`
- `/connectors`
- `/integrations/github`
- `/integrations/slack`
- `/integrations/jira`
- `/integrations/linear`
- `/activity`
- `/tasks`
- `/sprints`
- `/blockers`
- `/risks`
- `/commands`
- `/suggestions`
- `/approvals`
- `/reports`
- `/assistant`
- `/notifications`
- `/audit`
- `/settings`

Realtime endpoints:

- `/realtime/projects/{project_id}` for project activity, agent suggestions, sprint health, connector sync progress.
- `/realtime/users/{user_id}` for notifications, approval inbox updates, command result updates.

## Main Data Flow

1. External tool sends webhook or polling job fetches updates.
2. Webhook receiver stores raw event payload with idempotency key.
3. Normalizer converts raw event into internal activity event.
4. Linker attaches event to project, external resource, task, PR, user, or sprint.
5. Derived-state workers update mirrored tasks, computed status, blocker candidates, stale signals, and sprint health.
6. Agent jobs create suggestions with evidence.
7. PM reviews suggestions or command drafts.
8. Approved actions execute against external tools.
9. Audit log records every important user, agent, and external write action.
10. Realtime streams notify dashboards and inboxes.

## Deployment Shape

MVP deployment can start with:

- One Go API container.
- One Go worker container.
- One Go scheduler container or a worker with scheduler enabled.
- PostgreSQL.
- Redis.
- RabbitMQ when reliable job queues are introduced.
- Object storage.
- Reverse proxy or managed load balancer.

## Observability Requirements

- Structured logs with workspace, project, connector, job, and request IDs.
- Metrics for API latency, job duration, sync lag, webhook failures, model calls, queue depth, and external API rate limits.
- Traces for command execution, webhook ingestion, agent runs, and approved action execution.
- Error reporting for failed external writes, token expiration, parsing failures, and model schema failures.

## Scaling Strategy

- Scale API horizontally after stateless auth/session design is in place.
- Scale workers by queue type when sync load grows.
- Separate realtime gateway only if WebSocket/SSE load becomes materially different from REST load.
- Split connector services only if one integration becomes a reliability or rate-limit bottleneck.
- Add dedicated search infrastructure only after Postgres search or pgvector is insufficient.
