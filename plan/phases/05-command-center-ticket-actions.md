# Phase 5: Command Center And Ticket Actions

## Objective

Allow PMs to create and update external tickets through natural language, while keeping approval and preview in the loop.

## Command Center Work

- Add command submission endpoint.
- Detect intent.
- Extract structured fields.
- Ask clarification when required fields are missing.
- Store command draft and state.
- Stream command updates to user if processing is asynchronous.

## Ticket Creation Work

- Create single-ticket draft.
- Create multiple-ticket draft.
- Generate title, description, labels, and acceptance criteria.
- Validate assignee, sprint, priority, and external tool support.
- Detect likely duplicates.
- Let PM edit draft fields.
- Require approval before external creation.
- Execute approved creation in external task tool.
- Create or update internal mirrored task after success.

## Ticket Update Work

- Identify target ticket from natural language.
- Ask PM to choose if multiple matches exist.
- Draft assignment, priority, sprint, status, and description updates.
- Validate with external tool field constraints.
- Execute approved update.
- Sync internal task mirror.

## Approval Work

- Create reusable approval model.
- Support approve, edit, reject, and snooze.
- Store approval decision.
- Execute approved actions through worker.
- Store action execution result and audit event.

## Exit Criteria

- PM can create a ticket using natural language.
- PM can create multiple tickets from one command.
- PM can review and edit ticket previews.
- Duplicate warnings appear before creation.
- Approved tickets are created in the external tool and mirrored internally.
- Ticket updates require preview and approval.
