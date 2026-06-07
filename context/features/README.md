# Feature Backlog — *Quietly Kept* (Story 1 PDF Generator)

This folder holds one spec file per branch-sized feature for the local prototype.
Each spec is written to be lifted straight into `context/current-feature.md` via
`/feature load`, then built with `/feature start`.

- **Source of truth for scope:** [`../local-prototype-plan.md`](../local-prototype-plan.md)
- **Workflow:** [`../ai-interaction.md`](../ai-interaction.md) — document → branch → implement → test → review → commit → merge.
- **Each feature = one branch** named in its spec (`feature/<slug>`).

## How to use this folder

1. `/feature load context/features/NN-<name>.md` — copy a spec into the working file.
2. `/feature start` — branch + dispatch the owning specialist agent.
3. `/feature test` / `qa` / `review` → `complete`.

Build them roughly in number order — each feature lists what it depends on.

## Backlog

| #  | Feature | Milestone | Craft Area / Owner agent | Depends on |
|----|---------|-----------|--------------------------|------------|
| 01 | [Project scaffolding & design system](01-project-scaffolding.md) | 1 (setup) | 3 · `nextjs-ui-builder` | — |
| 02 | [Session types & storage](02-session-types-and-storage.md) | 1 | 3 · `nextjs-ui-builder` | 01 |
| 03 | [Story master text, merge & variants](03-story-master-text-and-variants.md) | 1 | 1 · `pdf-render-specialist` | 02 |
| 04 | [PDF template & print CSS](04-pdf-template-and-print-css.md) | 1 | 1 · `pdf-render-specialist` | 03 |
| 05 | [Puppeteer renderer & CLI render script](05-puppeteer-renderer-and-cli.md) | 1 | 1 · `pdf-render-specialist` | 04 |
| 06 | [OpenAI client & reference illustration](06-openai-client-and-reference-illustration.md) | 2 | 2 · `ai-image-specialist` | 02 |
| 07 | [Scene pipeline & pet consistency](07-scene-pipeline-and-pet-consistency.md) | 3 | 2 · `ai-image-specialist` | 05, 06 |
| 08 | [Wizard UI](08-wizard-ui.md) | 4 | 3 · `nextjs-ui-builder` | 02 |
| 09 | [Generation progress & orchestration API](09-generation-progress-and-orchestration.md) | 4 | 3 + 2 · `nextjs-ui-builder` / `ai-image-specialist` | 07, 08 |
| 10 | [In-browser preview & PDF download](10-preview-and-pdf-download.md) | 5 | 3 + 1 · `nextjs-ui-builder` / `pdf-render-specialist` | 05, 09 |
| 11 | [Polish & iteration](11-polish-and-iteration.md) | 6 | mixed | 10 |

## Milestone map (from the plan)

- **M1 — Static PDF from hardcoded JSON:** 01 → 02 → 03 → 04 → 05. *Done = a beautiful 12-page PDF from a JSON file with placeholder images.*
- **M2 — AI reference illustration:** 06. *Done = upload a pet photo, get one stylized illustration of the same animal.*
- **M3 — Full scene pipeline:** 07. *Done = JSON + photo → full PDF with all illustrations of the real pet (the "wow" moment).*
- **M4 — Wizard UI:** 08 → 09. *Done = complete the wizard, click Generate, backend produces a book.*
- **M5 — In-browser preview:** 10. *Done = see all 12 pages with real illustrations, then download the PDF.*
- **M6 — Polish:** 11 (open-ended).

## Spec file shape

Every spec uses the same sections so `/feature load` maps cleanly:

- `# NN — Title` + a metadata blockquote (Craft Area, owner, milestone, depends-on, branch)
- `## Status` — Not Started | In Progress | Complete
- `## Goals` — success criteria
- `## Scope` — in / out of scope
- `## Implementation notes` — files to create, key decisions
- `## References` — canonical sources to read
- `## Done when` — acceptance checklist
- `## Tests` — what `test-author` / `qa-verifier` should cover

## Status legend

`Not Started` · `In Progress` · `Complete` — keep the spec's `## Status` in sync as work lands, and log completions in [`../history.md`](../history.md).
