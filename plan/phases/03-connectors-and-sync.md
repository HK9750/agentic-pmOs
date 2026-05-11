# Phase 3: Connectors And Sync

## Objective

Connect external tools, map resources to projects, import history, and process ongoing updates.

## Connector Foundation

- Create connector records.
- Store provider, status, scopes, token metadata, and health.
- Store encrypted token references.
- Implement reconnect and disconnect.
- Implement connector health states and error details.
- Add connector action audit events.

## GitHub Work

- Implement GitHub OAuth/App flow.
- List organizations and repositories.
- Map repositories to project.
- Register webhooks.
- Import issues, PRs, commits, reviews, comments.
- Process GitHub webhooks.
- Link GitHub users to platform users where possible.

## Slack Work

- Implement Slack OAuth.
- List accessible channels.
- Map primary and secondary channels to project.
- Import allowed message history.
- Process message events and thread replies.
- Store message permalinks for evidence.

## Jira Or Linear Work

- Implement selected provider OAuth/API flow.
- List boards/projects/teams.
- Map board/team to project.
- Import issues, statuses, sprints/cycles, labels, priorities, assignees, comments.
- Store external status mapping.
- Implement webhook or polling sync.

## Background Work

- Add historical sync jobs.
- Add incremental polling jobs.
- Add webhook normalization jobs.
- Add idempotency keys for raw events.
- Add rate-limit handling.
- Add dead-letter handling for failed event processing.

## Exit Criteria

- PM/admin can connect GitHub, Slack, and the selected task tool.
- PM/admin can map external resources to a project.
- Historical sync creates raw events and normalized activity events.
- Webhook or polling updates appear in the system.
- Connector health shows active, syncing, failed, token expired, and disabled states.
