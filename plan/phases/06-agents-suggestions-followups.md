# Phase 6: Agents, Suggestions, And Follow-Ups

## Objective

Introduce agent-generated project intelligence with evidence, PM approval, and safe execution.

## Blocker Work

- Detect blocker candidates from Slack, comments, and PR discussions.
- Extract blocker description, affected task, possible owner, severity, and evidence.
- Let PM confirm, edit, or dismiss blocker.
- Support manual blocker creation.
- Support blocker resolution with resolution note.
- Recalculate related task and sprint health when blocker state changes.

## Risk Work

- Detect basic delivery risk patterns.
- Create risk candidates with explanation and evidence.
- Support manual risk creation.
- Track probability, impact, severity, mitigation, owner, and status.

## Follow-Up Work

- Suggest follow-ups for PR review delays, stale tasks, unresolved blockers, missing task updates, and QA pending states.
- Include recipient, reason, message draft, and evidence.
- Enforce cooldowns.
- Respect working hours when configured.
- Send Slack follow-up after approval.
- Link sent message to original task/blocker/suggestion.

## Agent History Work

- Store agent runs.
- Store trigger, input context summary, output, suggestions created, and final PM decision.
- Capture useful/not useful feedback.

## Exit Criteria

- Blocker candidates appear from realistic Slack/comment examples.
- PM can confirm, edit, dismiss, and resolve blockers.
- Stale tasks create useful follow-up suggestions.
- Slack follow-up can be approved, sent, and audited.
- Agent suggestions include evidence and do not execute without approval.
