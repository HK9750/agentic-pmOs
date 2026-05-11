# Phase 2: Workspace, Project, And Members

## Objective

Implement the core product container: workspace, members, roles, projects, and setup checklist.

## Workspace Work

- Create workspace.
- Edit workspace name and description.
- Store workspace type.
- Assign creator as owner.
- Show setup checklist state.
- Mark checklist items as completed based on actual actions where possible.

## Member Work

- Invite members by email.
- Assign default role.
- Accept invitation.
- List workspace members.
- Update member role.
- Show permission impact before role update if frontend supports it.
- Audit invitations and role changes.

## Project Work

- Create project with name, description, key, type, start date, target delivery date.
- Add project members.
- Edit project details.
- Archive project.
- Store project setup checklist.
- Open project setup screen after creation.

## Permission Work

- Enforce owner/admin/PM project creation rules.
- Enforce owner/admin member invite rules.
- Enforce project read access by role.
- Add tests for workspace isolation.

## Data Work

- Add tables for workspaces, workspace members, invitations, projects, project members, setup checklist items.
- Add audit events for create/update/archive and member changes.

## Exit Criteria

- A new user can create a workspace and project.
- Owner/admin can invite a member and update role.
- PM can create a project if allowed by workspace policy.
- Archived projects become read-only for normal operations.
- Audit events exist for important changes.
