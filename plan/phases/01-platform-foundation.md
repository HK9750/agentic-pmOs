# Phase 1: Platform Foundation

## Objective

Build the backend foundation for API, database, jobs, realtime, auth, and observability.

## Backend Work

- Initialize Go project structure.
- Add configuration loading for local, staging, and production.
- Add structured logging.
- Add HTTP router and middleware.
- Add request IDs and correlation IDs.
- Add database connection and migration framework.
- Add Redis client.
- Add RabbitMQ client or job interface with RabbitMQ adapter.
- Add worker process entrypoint.
- Add scheduler entrypoint.
- Add health endpoints.
- Add base error response format.

## Auth And Security Work

- Implement user identity model.
- Implement session or JWT flow.
- Add password/OAuth decision based on chosen auth provider.
- Add RBAC middleware placeholder.
- Add tenant scoping helpers for workspace/project access.

## Realtime Work

- Add SSE endpoint foundation.
- Add project and user event topics.
- Add internal publish function.
- Add Redis pub/sub only if multiple API instances are expected early.

## Data Work

- Create initial migrations for users and basic auth records.
- Create migration system and local reset command.
- Add seed data path for local development.

## DevOps Work

- Add local Docker Compose for Postgres, Redis, and RabbitMQ.
- Add environment sample file.
- Add Makefile or task runner commands.
- Add lint/test commands.
- Add basic CI checks.

## Exit Criteria

- API server runs locally.
- Worker runs locally.
- Scheduler runs locally.
- Database migrations run cleanly.
- A test endpoint can publish a realtime event.
- Logs include request/job correlation IDs.
