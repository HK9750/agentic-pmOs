# Post-MVP Roadmap

This file maps major expansion areas after the MVP is validated.

## Post-MVP Phase 1: QA And Release Intelligence

Goals:

- Ready-for-QA detection.
- QA handoff summaries.
- Bug creation from QA context.
- Automatic bug triage.
- Critical bug escalation.
- Release checklist.
- Release readiness score.
- Release blocker workflow.

Technical additions:

- QA task states and handoff records.
- Bug-to-task and bug-to-release links.
- Release candidate entity.
- CI/CD and deployment connector foundation if available.

## Post-MVP Phase 2: Meeting Notes And Documents

Goals:

- Upload or paste meeting notes.
- Extract decisions, risks, blockers, owners, action items, and due dates.
- Convert action items to suggestions.
- Add Google Calendar and Google Docs connectors.
- Add Notion connector.

Technical additions:

- Document ingestion pipeline.
- File parsing and text extraction.
- Meeting note memory records.
- Action-item extraction agent.

## Post-MVP Phase 3: Design, CI/CD, And Monitoring Signals

Goals:

- Figma connector.
- CI/CD connector.
- Sentry or monitoring connector.
- Release readiness based on real deployment and error signals.
- Risk detection from failing builds and production incidents.

Technical additions:

- New external resource types.
- Build/deploy activity event types.
- Incident and error activity records.
- Release health agent.

## Post-MVP Phase 4: Portfolio And Capacity

Goals:

- Multi-project portfolio dashboard.
- Cross-project risk view.
- Capacity planning.
- Roadmap planning.
- Milestone tracking.

Technical additions:

- Portfolio-level entities.
- Capacity and allocation records.
- Cross-project reporting queries.
- Stakeholder portal refinements.

## Post-MVP Phase 5: More Autonomous Agents

Goals:

- Configurable autonomy per project and agent.
- Safe auto-execution for low-risk internal actions.
- More advanced recovery plans.
- Retrospective generation.
- Preference learning from PM feedback.

Technical additions:

- Agent policy engine.
- Autonomy levels.
- Stronger simulation/preview before execution.
- Agent quality metrics.

## Expansion Rule

Do not add a new connector or autonomous workflow until the approval, audit, evidence, and permission foundations are stable.
