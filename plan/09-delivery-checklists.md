# Delivery Checklists

This file defines practical checklists for building and releasing features.

## Feature Definition Of Done

- API implemented and documented.
- Database migrations added and reversible where practical.
- RBAC checks added.
- Audit event added for important state changes.
- Unit tests for core domain logic.
- Integration tests for external provider logic where feasible.
- Job idempotency tested for background workflows.
- Realtime update emitted when user-facing state changes.
- Error states shown in API or UI model.
- Observability added for failures and latency.
- Security-sensitive fields excluded from logs.

## Connector Checklist

- OAuth or API credential flow implemented.
- Token storage encrypted.
- External resources listed.
- Resource mapping to project implemented.
- Historical sync implemented.
- Webhook receiver implemented where supported.
- Polling fallback implemented.
- Idempotency keys implemented.
- Rate limit handling implemented.
- Connector health surfaced.
- Disconnect flow implemented.
- External source URLs stored.

## Agent Checklist

- Trigger clearly defined.
- Context builder scoped to project and permission model.
- Structured output schema defined.
- Evidence required.
- Duplicate/cooldown checks implemented.
- Suggestion created instead of automatic action.
- Approval flow implemented.
- Execution worker validates permissions again.
- Agent run history stored.
- Feedback captured.
- False positive cases added to evals.

## Background Job Checklist

- Job payload is versioned.
- Job handler is idempotent.
- Retry policy exists.
- Dead-letter behavior exists.
- Job progress is visible if user-facing.
- External API errors are classified.
- Rate limits are respected.
- Job metrics are emitted.
- Job has a correlation ID.

## API Checklist

- Request validation.
- Auth check.
- Workspace/project authorization check.
- Pagination for list endpoints.
- Stable error format.
- Audit where needed.
- Tests for permission boundaries.
- No secrets in responses.

## Release Checklist

- Migrations tested in staging.
- Worker and scheduler deployed with compatible schema.
- Queue consumers healthy.
- Connector webhooks reachable.
- Rollback plan prepared.
- Error dashboards checked.
- Rate limits configured.
- Demo workspace verified.
- Smoke tests passed.
