# Phase 0: Product Foundation

## Objective

Turn the product vision into buildable MVP requirements, implementation assumptions, and first delivery boundaries.

## Scope

- Confirm MVP features.
- Confirm first external task tool: Jira, Linear, or both.
- Confirm roles and permissions.
- Confirm source-of-truth behavior.
- Confirm approval model for agent actions.
- Confirm first dashboard and command-center UX flows.

## Product Work

- Finalize workspace creation flow.
- Finalize project creation and setup checklist.
- Finalize member invitation and role update flows.
- Finalize connector setup flows for GitHub, Slack, and Jira/Linear.
- Finalize activity feed event types.
- Finalize natural language ticket creation UX.
- Finalize approval inbox UX.
- Finalize task detail, computed status, and sprint dashboard UX.
- Finalize daily digest and weekly report draft UX.

## Technical Work

- Create initial domain entity map.
- Define API resource boundaries.
- Define event and job naming conventions.
- Define connector abstraction shape.
- Define agent suggestion schema.
- Define audit event schema.
- Define environment and deployment assumptions.

## Data Work

- Draft tables for workspaces, users, projects, connectors, activity events, tasks, sprints, suggestions, approvals, reports, notifications, and audit.
- Decide which external payloads are stored as raw JSONB.
- Decide retention expectations for Slack and raw events.

## Exit Criteria

- MVP scope is agreed.
- First connector priority is agreed.
- Role permission defaults are agreed.
- Core entity map is ready.
- Phase 1 engineering can start without major product ambiguity.
