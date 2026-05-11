# Open Decisions

This file tracks decisions that should be made before or during implementation.

## Recommended Defaults

| Decision | Recommended default | Reason |
| --- | --- | --- |
| Primary database | PostgreSQL | Strong fit for relational workflow data plus JSONB/search/vector support. |
| Cache/locks | Redis | Useful for sessions, rate limits, locks, short-lived state, fanout. |
| Queue | RabbitMQ when background workload starts | Reliable jobs, retries, dead-letter queues, worker scaling. |
| Runtime | Go | Matches backend-heavy, realtime, polling, workers, and connector needs. |
| Realtime transport | SSE first | MVP updates are mostly server-to-client. |
| Search | Postgres full-text and pgvector first | Avoids early OpenSearch complexity. |
| AI runtime | Go orchestration with optional Python evals | Keeps product workflows in one backend while allowing ML experimentation. |
| Architecture | Modular monolith plus worker processes | Faster early delivery and easier consistency. |

## Locked For Initial Build

| Topic | Decision |
| --- | --- |
| First task connector | Jira first. |
| Auth | Custom auth from scratch. |
| Frontend | Next.js. |
| Deployment | Local development only for now. |
| LLM provider | Groq Cloud free tier for now. |
| Realtime transport | SSE first. |
| Primary backend | Go modular monolith with API, worker, and scheduler entrypoints. |
| Database | PostgreSQL first. |
| Cache | Redis first. |
| Queue | Internal Go job abstraction first, RabbitMQ when connector/agent workload needs durable queues. |

## Implemented Foundation Choices

| Topic | Implemented |
| --- | --- |
| Backend router | Gin. |
| Frontend styling | Tailwind CSS with dark command-workbench styling. |
| Auth foundation | Argon2id password hashes, HTTP-only session cookies, Redis login attempt limiting, active session management. |
| Profile foundation | User profile fields, profile update endpoint, password change endpoint, session revoke/logout-all endpoints. |
| Workspace foundation | Workspace create/list with automatic owner membership. |
| Project foundation | Project create/list scoped to workspace membership. |

## Decisions To Confirm

| Topic | Options | Impact |
| --- | --- | --- |
| First task connector | Jira first, Linear first, or both | Affects ticket create/update work and status mapping complexity. |
| Auth provider | Custom email/password, OAuth login, Clerk/Auth0/Supabase Auth | Affects security, speed, and ownership. |
| Frontend stack | Next.js, React SPA, other | Affects realtime, auth integration, and deployment. |
| Cloud provider | AWS, GCP, Fly.io, Render, Railway, self-hosted | Affects queues, object storage, secrets, and deployment ops. |
| LLM provider | OpenAI, Anthropic, Azure OpenAI, local/other | Affects structured output, privacy, cost, latency. |
| Jira vs Linear support depth | One production-quality first or both equal | Affects MVP timeline. |
| WebSocket vs SSE | SSE first or WebSocket first | Affects realtime gateway complexity. |
| RabbitMQ timing | Start with RabbitMQ or add after Postgres job queue | Affects local dev and production reliability. |
| Semantic search timing | pgvector in MVP or post-MVP | Affects assistant quality and implementation cost. |

## Decision Log Template

Use this format when a decision is made:

```md
## YYYY-MM-DD: Decision title

Decision: What was chosen.

Context: Why this decision was needed.

Options considered: Short list of alternatives.

Reason: Why this choice is best now.

Revisit when: Condition that would justify changing it.
```
