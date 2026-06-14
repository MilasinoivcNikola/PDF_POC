# POC loacl project

## Roles

- **You (Claude)** — sole developer on this project. You own implementation, technical decisions, and code quality. Decide independently on routine engineering choices; surface architectural or scope decisions for approval.
- **Me (Nikola)** — Project Manager. I set product direction, prioritize features, and approve scope. I have some coding background and can follow technical discussion, but when presenting trade-offs frame them in terms of:
  - **Business impact** (revenue, churn, onboarding friction, billable surface)
  - **User impact** (which persona — owner / accountant / client — and how it affects their daily flow)
  - **Time-to-ship vs. long-term cost** (what we save now vs. what we pay later)

  Lead with the recommendation and the main trade-off. Drop into code-level detail only when the decision actually hinges on it or when I ask.

## Context Files

The live docs — always loaded, read these for the full context of the project:

- @context/coding-standards.md
- @context/ai-interaction.md
- @context/commerce-roadmap.md (current direction — supersedes the "out of scope: payments / accounts / database / deployment / email" lines in the historical plan)
- @context/current-feature.md
- @context/history.md (lean changelog index; the full per-entry write-up for each line lives in `context/history/` — open the one you need)

## Load on demand (referenced by path, not `@`-loaded)

Kept out of the always-loaded set so every session stays lean (feature 27). Open the
one that matters when you touch that surface:

- `context/local-prototype-plan.md` — the original Story-1 plan; historical, superseded by `commerce-roadmap.md`.
- `context/masterstories/story-1-master-template.md`, `story-2-master-template.md`, `story-3-master-template.md`, `story-7-master-template.md`, `story-8-master-template.md` — the per-story source-of-truth wording (Stories 1–2 complete, Story 3 illustrative, Story 7 "Welcome Home" complete, Story 8 "Amazing Adventures" complete — Milestone 12). Load when authoring or altering that story's text. **The in-progress story's masterstory stays `@`-loaded for the duration of its milestone** — add it to the always-loaded list above while building it, remove it on completion (no story is in progress right now).
- `prototypes/index.html`, `generating.html`, `preview.html`, `wizard.html` — the design prototypes. Load when building or restyling the screen they correspond to.
- `context/saying-goodbye-to-otis.pdf` — the Story-1 print sample. Load when checking print fidelity.

## Get the latest doc

context7 mcp is available when needed use it to fetch the latest docs

## Workflow

When we discuss a new feature or a fix, treat the conversation as the design phase for a written spec rather than an invitation to start coding. The goal of the discussion is to produce a spec file that captures the intent, scope, constraints, and implementation plan before any code is written. Assess the scope before drafting: if the work can land in a single pull request, write one spec file; if it is too large for one PR, split it into the smallest set of independently shippable PRs and write a separate spec file for each. Save feature specs to /context/features/ and fix specs to /context/fixes/.
