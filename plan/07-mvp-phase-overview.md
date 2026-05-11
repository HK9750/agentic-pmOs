# MVP Phase Overview

This file gives the full MVP sequence. Detailed phase files live in `plan/phases/`.

## Phase 0: Product Foundation

Outcome: The MVP scope, roles, workflows, data boundaries, and first implementation assumptions are clear enough to start engineering.

Primary deliverables:

- Final MVP scope.
- Role permission draft.
- Connector priority decision.
- Main entity map.
- UX flow map for workspace, project, connectors, command center, approvals, activity, tasks, sprint, and reports.

## Phase 1: Platform Foundation

Outcome: The backend foundation is ready for feature development.

Primary deliverables:

- Go repository structure.
- API server.
- Database migrations.
- Auth/session foundation.
- Worker and scheduler foundation.
- Redis and RabbitMQ integration plan or local setup.
- Observability baseline.

## Phase 2: Workspace, Project, Members

Outcome: Users can create a workspace, invite people, create projects, and complete setup basics.

Primary deliverables:

- Workspace CRUD.
- Member invites.
- Role assignment.
- Project CRUD.
- Project setup checklist.
- Audit for workspace/project/member actions.

## Phase 3: Connectors And Sync

Outcome: GitHub, Slack, and Jira/Linear can connect, map resources, sync history, and receive incremental updates.

Primary deliverables:

- OAuth flows.
- Connector health UI/API.
- External resource mapping.
- Historical sync jobs.
- Webhook receivers.
- Polling fallback.
- Raw event and normalized activity ingestion.

## Phase 4: Activity, Tasks, Computed Status

Outcome: Imported tool data becomes usable project intelligence.

Primary deliverables:

- Unified activity feed.
- Activity detail panel data.
- Manual event-to-task linking.
- Mirrored tasks.
- PR/task/message linking.
- Computed task status.
- Stale and inconsistent task detection foundation.

## Phase 5: Command Center And Ticket Actions

Outcome: PMs can create and update tickets using natural language with safe previews and approvals.

Primary deliverables:

- Natural language command endpoint.
- Structured action drafts.
- Clarification handling.
- Single-ticket creation.
- Multiple-ticket creation.
- Ticket update drafts.
- Duplicate detection.
- Approval execution into Jira/Linear/GitHub.

## Phase 6: Agents, Suggestions, Follow-Ups

Outcome: Agents create useful suggestions with evidence while PM remains in control.

Primary deliverables:

- Blocker detection.
- Manual blockers.
- Stale task suggestions.
- Risk candidates.
- Follow-up suggestions.
- Approval inbox.
- Slack follow-up send after approval.
- Agent feedback and history.

## Phase 7: Sprints, Reports, Assistant

Outcome: PMs can manage sprint health, generate summaries, and ask project questions.

Primary deliverables:

- Sprint create/import.
- Sprint dashboard.
- Sprint health score and reason breakdown.
- Daily digest.
- Weekly stakeholder report draft.
- Basic project assistant Q&A with evidence.
- Notifications for key events.

## Phase 8: Hardening And Beta Launch

Outcome: The MVP can be used by beta teams with acceptable reliability, security, and supportability.

Primary deliverables:

- Permission hardening.
- Connector resilience.
- Queue retries and dead-letter handling.
- Observability dashboards.
- Performance pass.
- Security review.
- Seed/demo workspace.
- Beta onboarding checklist.
- Support runbook.
