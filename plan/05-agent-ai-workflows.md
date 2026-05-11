# Agent And AI Workflow Plan

This file maps agentic behavior into safe, auditable workflows.

## Agent Principles

- Agents assist first and act only after approval in MVP.
- Every suggestion needs evidence.
- Every external write needs a human decision.
- Every action needs audit history.
- Agents should prefer fewer, higher-quality suggestions over noisy alerts.
- Feedback from approval, rejection, and edits should improve future suggestions.

## Core Agent Pipeline

1. Trigger occurs from webhook, schedule, command, report request, or manual action.
2. Context builder fetches relevant tasks, events, comments, PRs, messages, blockers, risks, sprint data, and settings.
3. Agent runs with structured input and a narrow task.
4. Model output is parsed into a strict schema.
5. Validator checks required fields, permissions, evidence, confidence, and duplicate suggestions.
6. Suggestion is created with reason, impact, target tool, and evidence.
7. PM reviews suggestion.
8. PM approves, edits, rejects, or snoozes.
9. Approved action is executed by a Go worker.
10. Execution result and audit event are stored.

## MVP Agents

| Agent | Trigger | Output |
| --- | --- | --- |
| Command agent | PM submits natural language command. | Structured action draft, missing fields, ticket preview. |
| Blocker agent | Slack/message/comment event or scheduled scan. | Blocker candidate with affected task, severity, evidence. |
| Stale task agent | Daily schedule. | Stale task warning and follow-up suggestion. |
| Sprint health agent | Task/sprint/blocker/PR changes. | Health score, reasons, recovery suggestions. |
| Follow-up agent | PR delay, stale task, unresolved blocker, QA pending. | Suggested recipient, reason, message draft, evidence. |
| Report agent | Daily/weekly schedule or PM request. | Digest or stakeholder report draft. |
| Assistant agent | User question. | Answer with evidence links. |

## Natural Language Command Flow

Supported MVP intents:

- Create single ticket.
- Create multiple tickets.
- Update ticket.
- Assign ticket.
- Change priority.
- Move ticket to sprint.
- Add acceptance criteria.
- Generate report.
- Ask project question.

Command output should always become a draft before execution.

Draft states:

- `needs_clarification`
- `ready_for_review`
- `approved`
- `executing`
- `executed`
- `failed`
- `rejected`

## Ticket Creation Draft

Fields:

- Title.
- Type.
- Description.
- Assignee.
- Priority.
- Due date.
- Sprint.
- Labels.
- Acceptance criteria.
- Target external tool.
- Duplicate warnings.
- Missing fields.

Validation:

- Project exists.
- Assignee belongs to project.
- Sprint exists when supplied.
- External tool supports requested fields.
- Similar existing tickets are surfaced.
- PM has permission to approve creation.

## Evidence Model

Evidence can point to:

- Activity event.
- Task.
- PR.
- Commit.
- Slack message.
- Jira/Linear comment.
- Blocker.
- Risk.
- Report.
- Meeting note later.

Every evidence item should include:

- Source type.
- Source URL when available.
- Short excerpt or summary.
- Timestamp.
- Confidence or match reason where useful.

## Safety Checks

Before creating a suggestion:

- Check duplicate suggestions.
- Check cooldowns.
- Check working hours for message sends.
- Check connector health.
- Check user permissions.
- Check project agent settings.
- Check whether evidence is strong enough.

Before executing an approved action:

- Re-check permission.
- Re-check connector token status.
- Re-check target external object still exists.
- Re-check draft has not expired.
- Use idempotency key.
- Store execution result.

## Python Usage

Keep runtime product workflows in Go unless there is a clear need.

Python can be useful for:

- Prompt and model evaluation scripts.
- Offline embedding experiments.
- Data science analysis on false positives.
- Batch reprocessing notebooks.
- Custom ML classifiers if LLM-only detection is too slow or expensive.

If Python becomes production runtime, isolate it behind an internal API or queue consumer and keep audit/approval state in the Go/Postgres core.
