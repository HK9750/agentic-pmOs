# Product Scope Map

This file maps the requested functionality into product modules that can be designed, built, tested, and released in phases.

## Core Users

| Role | Primary platform use |
| --- | --- |
| Owner | Workspace control, billing later, permissions, connector ownership, agent policy. |
| Admin | Workspace operations, members, connectors, project configuration, agent permissions. |
| Project Manager | Main operator for project setup, ticket creation, approvals, reports, risks, blockers, sprint health. |
| Developer | Assigned work, blockers, reminders, task context, personal updates. |
| QA Engineer | Ready-for-QA work, bugs, release checks, QA blockers, handoff context. |
| Stakeholder | Simplified status, milestone progress, risks, delivery summaries. |
| Viewer | Read-only project information within permission scope. |

## Product Modules

| Module | MVP scope | Later scope |
| --- | --- | --- |
| Workspace management | Create workspace, setup checklist, role-based member invites. | Billing, advanced workspace policy, multi-workspace admin. |
| Project management | Create/edit/archive project, setup flow, project members. | Portfolio dashboard, roadmap planning, capacity planning. |
| Connectors | GitHub, Slack, Jira or Linear OAuth, webhooks, historical sync, health. | Google Calendar, Docs, Notion, Figma, CI/CD, Sentry, monitoring. |
| External mapping | Repo, Slack channel, Jira/Linear board mapping to project. | Multi-project routing, ownership rules, automatic mapping suggestions. |
| Unified activity feed | Chronological events, filters, event details, manual task linking. | Advanced event graph, cross-project activity correlations. |
| Natural language command center | Create ticket, update ticket, assign, priority, sprint move, report request. | Complex multi-step project operations and higher autonomy. |
| Ticket creation and updates | Drafts, previews, duplicates, acceptance criteria, PM approval. | Bulk workflows, templates, policy-based auto-approval for safe internal actions. |
| Task tracking | Internal mirrored tasks, linked PRs/messages/comments, computed status. | Advanced dependency graph and ownership intelligence. |
| Sprints | Create/import sprint, dashboard, health score, scope changes. | Capacity planning, velocity forecasting, retrospective generation. |
| Blockers and risks | Detection, manual creation, review, resolution, escalation suggestions. | Predictive delivery risk models and cross-project risk rollups. |
| Reports | Daily digest, weekly stakeholder report, sprint review draft. | Automated retrospectives, board-ready executive packs. |
| Follow-ups | Suggestions, Slack draft/send after approval, cooldowns. | Multi-channel follow-ups, escalation trees, working-hour intelligence. |
| Approval workflow | PM inbox, approve/edit/reject/snooze, execute approved action. | Configurable autonomy levels per agent/tool/project. |
| Project assistant | Basic Q&A over tasks, activity, blockers, risks, reports. | Deep semantic project memory and decision history. |
| Meeting notes | Not MVP unless simple paste/upload extraction is pulled forward. | Transcription, action extraction, Docs/Calendar integration. |
| QA and release | Basic ready-for-QA signals if easy through task status. | Full QA handoff, bug triage, release readiness, deployment checks. |
| Notifications | In-app notifications, basic Slack/email hooks. | Rich preferences, digest tuning, stakeholder notification policies. |
| Audit and history | Important user and agent action audit. | Detailed agent run replay and compliance exports. |
| Settings | Project metadata, members, linked tools, agents, thresholds. | Workspace-wide policy templates and enterprise governance. |

## MVP Functional Scope

The MVP should include:

1. Workspace creation.
2. Project creation.
3. Member invitation.
4. GitHub connector.
5. Slack connector.
6. Jira or Linear connector.
7. Unified activity feed.
8. Natural language ticket creation.
9. Ticket preview and approval.
10. Task mirroring.
11. Computed task status.
12. Blocker detection.
13. Stale task detection.
14. Sprint dashboard.
15. Sprint health score.
16. Daily digest.
17. Weekly report draft.
18. Follow-up suggestions.
19. Approval workflow.
20. Basic project assistant Q&A.

## Source of Truth Rules

- Jira, Linear, and GitHub remain external sources of truth for tasks/issues during MVP.
- The platform stores mirrored task data for search, dashboards, computed status, and agent context.
- External writes require PM/admin approval in MVP.
- Every external write must produce an audit event.
- Every AI-generated claim about blockers, risk, status, or sprint health must include evidence.

## Important Product Constraints

- The platform should reduce project coordination noise, not create another noisy inbox.
- Follow-up suggestions need cooldowns, working-hour checks, and relevance thresholds.
- Agent autonomy starts low. Draft and approval workflows come before direct action.
- Users must always be able to open the source item in the external tool.
- Manual correction matters. PMs need to fix task links, dismiss false positives, and give feedback.
