# Phase 4: Activity, Tasks, And Computed Status

## Objective

Turn synced external data into a unified activity feed, mirrored tasks, and explainable task status.

## Activity Feed Work

- List project activity chronologically.
- Filter by source, assignee, task, event type, and date.
- Open event detail.
- Show actor, source platform, timestamp, related task, source link, and agent interpretation when available.
- Support manual event-to-task linking.

## Task Mirror Work

- Create internal task records from Jira/Linear/GitHub issues.
- Store external link and source status.
- Mirror assignee, priority, due date, sprint, labels, title, description, comments where needed.
- Link PRs, commits, Slack messages, comments, blockers, and risks.
- Show task detail with full context.

## Computed Status Work

- Implement status categories.
- Calculate status from source status, PRs, commits, blockers, due dates, sprint end date, and QA signals when available.
- Store computed status reason and evidence.
- Recalculate when related events arrive.
- Surface inconsistent state warnings.

## Detection Work

- Implement stale task detection based on configurable inactivity threshold.
- Implement basic inconsistent task detection.
- Create suggestions or warnings for PM review.

## Realtime Work

- Publish activity feed updates.
- Publish task computed status updates.
- Publish connector sync progress updates.

## Exit Criteria

- PM can view unified activity from connected tools.
- PM can inspect event details and open external source links.
- PM can manually link an event to a task.
- Mirrored tasks show source and computed status.
- Stale and inconsistent task warnings are visible with reasons.
