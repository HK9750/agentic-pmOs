# Integration And Sync Plan

This file maps external tool integration, historical sync, webhook processing, and connector health.

## Integration Principles

- External tools remain source of truth during MVP.
- Store external IDs and source URLs everywhere.
- All sync operations must be idempotent.
- All external writes require approval in MVP.
- Failed sync should degrade the project dashboard clearly rather than silently.
- Connector health must be visible to PM/admin users.

## Connector Lifecycle

1. User starts OAuth/API connection.
2. System validates permission and stores connector record.
3. System stores encrypted token reference.
4. System fetches accessible external resources.
5. User maps resource to project.
6. System registers webhooks if supported.
7. System schedules historical sync.
8. System imports and normalizes data.
9. System starts incremental sync through webhook and polling fallback.
10. Connector health is updated continuously.

## Ingestion Pipeline

1. Receive webhook or polling response.
2. Validate signature or token authorization.
3. Store raw event with idempotency key.
4. Publish normalization job.
5. Normalize payload into activity events and mirrored records.
6. Link event to workspace, project, external resource, user, task, sprint, or PR.
7. Trigger derived-state jobs such as computed task status, blocker detection, and sprint health.
8. Publish realtime updates.

## GitHub MVP Scope

Import:

- Repositories.
- Issues if used as task source.
- Pull requests.
- PR reviews.
- PR comments.
- Commits.
- Branch references when useful for task linking.

Webhooks:

- `issues`
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment`
- `issue_comment`
- `push`

Key mappings:

- Repository to project.
- GitHub user to platform user.
- PR/commit to task through branch name, PR title, issue references, external ticket key, manual links.

## Slack MVP Scope

Import:

- Selected project channels.
- Recent history allowed by Slack API and workspace permission.
- Messages, threads, mentions, and permalinks.

Events:

- New channel message.
- Thread reply.
- Mention of bot/app.

Primary use:

- Blocker detection.
- Follow-up evidence.
- Project Q&A context.
- Scope creep candidate detection later.

Privacy rules:

- Only ingest explicitly selected channels.
- Show source links and channel names in evidence.
- Respect Slack retention and permission boundaries.

## Jira Or Linear MVP Scope

Choose one first if delivery pressure is high. The abstraction should support both, but one connector should be production-quality before the second is expanded.

Import:

- Projects/boards/teams.
- Issues/tasks.
- Statuses and workflow categories.
- Sprints/cycles.
- Labels.
- Priorities.
- Assignees.
- Comments.

Writes after approval:

- Create issue.
- Update title/description/acceptance criteria.
- Assign issue.
- Change priority.
- Move to sprint/cycle.
- Change status if allowed.

## Status Mapping

Each external board needs mapping into internal categories:

- Backlog.
- Not started.
- In progress.
- Review.
- QA.
- Done.
- Canceled.
- Unknown.

Store mapping per project and connector because workflows vary between teams.

## Connector Health States

- Active.
- Syncing.
- Failed.
- Token expired.
- Rate limited.
- Disabled.
- Needs mapping.

Health details should include:

- Last successful sync time.
- Last failure time.
- Failure reason.
- Retry count.
- Current rate-limit state.
- Actions available: retry, reconnect, disable, edit mapping.

## Polling Strategy

Use webhooks where available, but keep polling fallback.

Polling jobs should:

- Track cursors per connector/resource.
- Use incremental updated-since queries where possible.
- Respect external rate limits.
- Back off on errors.
- Reconcile missed webhook events.
- Publish sync progress for the integrations UI.

## Idempotency

Every external event should have a deterministic idempotency key:

- Provider.
- Connector ID.
- External resource ID.
- External event ID or payload hash.
- Event timestamp/version when needed.

External writes also need idempotency keys to avoid duplicate ticket creation after retries.
