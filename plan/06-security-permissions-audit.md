# Security, Permissions, And Audit Plan

This file maps security responsibilities for the platform.

## Security Principles

- Workspace data must be isolated by workspace ID.
- Project access must be checked for every project-scoped resource.
- External tokens must be encrypted and access-controlled.
- AI outputs must not bypass permission checks.
- External writes require approval in MVP.
- Audit history must exist for important user, agent, connector, and external write actions.

## RBAC Model

Roles:

- Owner.
- Admin.
- Project Manager.
- Developer.
- QA Engineer.
- Stakeholder.
- Viewer.

Permission areas:

- Workspace settings.
- Member management.
- Project management.
- Connector management.
- Task viewing.
- Task action approval.
- Agent settings.
- Reports.
- Audit history.
- Stakeholder views.

## Permission Defaults

| Capability | Owner | Admin | PM | Developer | QA | Stakeholder | Viewer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Manage workspace | Yes | Limited | No | No | No | No | No |
| Invite members | Yes | Yes | Optional | No | No | No | No |
| Manage connectors | Yes | Yes | Yes | No | No | No | No |
| Create project | Yes | Yes | Yes | No | No | No | No |
| Edit project | Yes | Yes | Yes | No | No | No | No |
| View project | Yes | Yes | Yes | Assigned | Assigned | Limited | Limited |
| Approve external writes | Yes | Yes | Yes | No | No | No | No |
| Create blockers | Yes | Yes | Yes | Yes | Yes | No | No |
| Resolve assigned blockers | Yes | Yes | Yes | Yes | Yes | No | No |
| Generate reports | Yes | Yes | Yes | No | Optional | View | View |
| View audit | Yes | Yes | Limited | No | No | No | No |

These defaults can be refined after the first UI and API design pass.

## OAuth Token Handling

- Store tokens encrypted at rest.
- Prefer envelope encryption through cloud KMS or a secret manager.
- Never expose raw tokens to frontend clients.
- Scope provider permissions narrowly.
- Store token status and refresh metadata separately from project mappings.
- Rotate and revoke tokens cleanly on disconnect.

## Slack And Message Privacy

- Only sync channels selected by an authorized admin/PM.
- Make synced channels visible in project integration settings.
- Show source evidence for AI claims, but avoid exposing messages to users without project access.
- Respect external retention policies where available.
- Allow connector disablement and future data deletion controls.

## Approval Security

The approval worker must validate again at execution time:

- User still has permission.
- Connector is active.
- External resource is still mapped to the project.
- Suggested action has not expired.
- Draft fields are still valid.
- Approval decision has not already been executed.

## Audit Events

Audit important actions:

- Workspace created.
- Member invited.
- Member role changed.
- Project created/edited/archived.
- Connector connected/reconnected/disabled.
- External resource mapped/unmapped.
- Ticket draft created.
- Suggestion created.
- Suggestion approved/rejected/snoozed.
- External ticket created/updated.
- Slack follow-up sent.
- Agent ran.
- Report generated.
- Settings changed.

Audit event fields:

- Workspace ID.
- Project ID if applicable.
- Actor type: user, agent, system.
- Actor ID.
- Action.
- Target type and target ID.
- External source and source URL when applicable.
- Before/after values for settings and external writes where safe.
- Timestamp.
- Request/job/agent run ID.

## API Security Checklist

- Authenticate all private routes.
- Authorize every workspace/project scoped request.
- Validate input schemas.
- Rate limit auth, command, assistant, and webhook endpoints.
- Verify webhook signatures.
- Use CSRF protection if cookie sessions are used.
- Log security-sensitive failures without leaking secrets.
- Add tenant-scope tests for high-risk queries.
