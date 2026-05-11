# Realtime And Background Processing Plan

This file maps realtime updates, background jobs, polling, streaming, and queue usage.

## Realtime Product Needs

Realtime updates are needed for:

- Activity feed updates.
- Connector sync progress.
- New agent suggestions.
- Approval inbox updates.
- Command parsing and execution results.
- Notifications.
- Sprint health recalculation.

## Recommended Realtime Transport

Use Server-Sent Events first unless the frontend needs bidirectional realtime from the same connection.

Reasoning:

- Most MVP realtime updates are server-to-client.
- SSE is simpler to operate than WebSockets.
- REST can handle client-to-server actions such as approve, reject, edit, and command submit.
- WebSockets can be introduced later for richer collaboration or live command drafting.

## Realtime Topics

- `workspace:{id}:notifications`
- `project:{id}:activity`
- `project:{id}:suggestions`
- `project:{id}:connector_health`
- `project:{id}:sprint_health`
- `user:{id}:inbox`
- `command:{id}:updates`

## Background Job Categories

| Category | Example jobs |
| --- | --- |
| Connector sync | Historical import, incremental polling, webhook normalization, token refresh. |
| Derived state | Task computed status, stale detection, sprint health, scope change detection. |
| Agent jobs | Blocker detection, risk detection, follow-up suggestions, report drafts, assistant retrieval. |
| External writes | Create ticket, update ticket, send Slack message, assign task. |
| Notifications | In-app create, email send, Slack send. |
| Search indexing | Create/update search documents, embeddings generation. |
| Maintenance | Retry failed jobs, cleanup expired state, archive raw events. |

## Queue Recommendation

Use RabbitMQ for production-grade async work once integrations and agents are active.

Suggested queues:

- `webhook.normalize`
- `sync.github`
- `sync.slack`
- `sync.jira`
- `sync.linear`
- `tasks.recalculate`
- `sprints.recalculate`
- `agents.detect`
- `agents.report`
- `actions.execute`
- `notifications.send`
- `search.index`

Each queue should have:

- Retry policy.
- Dead-letter queue.
- Visibility into failure reason.
- Idempotency guard.
- Worker concurrency limits.

## Postgres Outbox

Use the outbox pattern for durable event publication.

When a transaction creates an important internal event, also write an outbox row. A publisher job reads the outbox and publishes to RabbitMQ or realtime fanout.

Use this for:

- Activity event created.
- Task computed status changed.
- Suggestion created.
- Approval decision made.
- External action executed.
- Report generated.

## Scheduler Jobs

Run scheduled jobs in Go.

Daily jobs:

- Stale task detection.
- Open blocker age check.
- Follow-up cooldown check.
- Daily digest generation.
- Connector reconciliation.

Frequent jobs:

- Incremental polling for tools without reliable webhooks.
- Sprint health recalculation.
- Search indexing backlog.
- Notification delivery retries.

Weekly jobs:

- Weekly report draft.
- Sprint review draft for completed sprints.
- Audit/archive maintenance.

## Streaming And Polling

For MVP, treat streaming as internal event processing rather than a full Kafka-style architecture.

Recommended path:

1. Webhooks and polling store raw events.
2. RabbitMQ queues process normalized events.
3. Postgres stores durable activity and state.
4. SSE publishes selected updates to clients.

Add Kafka/NATS only if the system needs high-volume event streams, replay across many consumers, or strict event-stream semantics beyond the MVP.

## Worker Safety

- Jobs must be idempotent.
- External writes must be guarded by approval state.
- External writes must use idempotency keys where providers allow it.
- Long-running jobs need progress records.
- Failed jobs should be visible in connector health or agent history when user-facing.
- Rate limits should be tracked per connector and per provider.
