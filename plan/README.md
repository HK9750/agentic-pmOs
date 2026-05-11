# Agentic Project Management Platform Plan

This directory turns the product functionality document into an execution plan for building the platform.

The plan assumes a backend-heavy product where Go owns APIs, realtime transport, background workers, connector sync, polling, streaming, and core project intelligence. Python is optional and should be used only where it clearly helps with AI evaluation, embeddings, offline analysis, or specialized ML workflows.

## Planning Defaults

- Backend runtime: Go.
- API style: REST for core resources, SSE first for realtime updates, webhooks for external events.
- Primary database: PostgreSQL for relational project data, transactional integrity, JSONB event payloads, full-text search, and optional pgvector.
- Cache and coordination: Redis for sessions, rate limits, short-lived caches, locks, and pub/sub fanout when useful.
- Async jobs: Start with an internal Go job abstraction. Add RabbitMQ for reliable background work once connector sync and agent jobs become active. A Postgres outbox should still be used for durable event publishing.
- Object storage: S3-compatible storage for meeting uploads, exported reports, and large raw payload archives.
- Search and memory: Start with PostgreSQL full-text plus pgvector. Add OpenSearch only if search volume or query complexity outgrows Postgres.
- AI provider usage: Start with Groq Cloud behind internal Go interfaces. Require structured outputs, evidence links, audit logs, and approval gates for external writes.

## Locked Initial Decisions

- First task connector: Jira.
- Authentication: custom email/password and server-side sessions.
- Frontend: Next.js.
- Deployment: local development only until the core MVP flow works.
- LLM provider: Groq Cloud free tier for now.

## Document Order

1. `00-product-map.md` maps the requested product flows into buildable modules.
2. `01-technical-blueprint.md` defines the recommended system shape.
3. `02-data-storage-plan.md` defines storage choices and core entities.
4. `03-integration-sync-plan.md` maps GitHub, Slack, Jira, and Linear sync.
5. `04-realtime-background-plan.md` maps realtime, polling, queues, streaming, and workers.
6. `05-agent-ai-workflows.md` maps the agentic behavior and approval model.
7. `06-security-permissions-audit.md` maps RBAC, data isolation, secrets, and audit.
8. `07-mvp-phase-overview.md` gives the MVP phase sequence.
9. `08-post-mvp-roadmap.md` maps post-MVP expansion.
10. `09-delivery-checklists.md` defines engineering and release checklists.
11. `10-open-decisions.md` tracks decisions that should be made before or during implementation.
12. `phases/` contains one implementation file per MVP phase.

## MVP Phase Map

| Phase | Name | Outcome |
| --- | --- | --- |
| 0 | Product foundation | Scope, roles, workflows, and first implementation assumptions are frozen. |
| 1 | Platform foundation | Go app, database, auth, job runner, observability, and dev environment exist. |
| 2 | Workspace, project, members | Users can create workspaces, invite members, create projects, and configure setup. |
| 3 | Connectors and sync | GitHub, Slack, and Jira/Linear can connect, import history, and receive updates. |
| 4 | Activity, tasks, computed status | Imported data becomes activity events, mirrored tasks, and explainable computed states. |
| 5 | Command center and ticket actions | PM can create and update tickets through natural language drafts and approvals. |
| 6 | Agents, suggestions, follow-ups | Agents detect blockers, stale tasks, risks, and follow-up opportunities for PM approval. |
| 7 | Sprints, reports, assistant | Sprint health, daily digest, weekly report, and basic project Q&A are usable. |
| 8 | Hardening and beta launch | Security, reliability, onboarding, monitoring, and beta readiness are complete. |

## Product Promise

The platform understands the real state of the project across tools and helps the PM take the next best action.

## Build Principle

External tools remain the source of truth during MVP. This platform becomes the intelligence, coordination, reporting, and approved-action layer.
