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
| 12 | [Input photo downscale](12-input-photo-downscale.md) | 6 (polish) | 2 · `ai-image-specialist` | 06, 07, 10 |
| 13 | [Switch scene generation to Low tier](13-low-tier-images.md) | 6 (polish) | 2 · `ai-image-specialist` | 07, 09 |
| 14 | [Multi-story engine generalization](14-multi-story-engine.md) | 7 (Story 2) | 1 · `pdf-render-specialist` | 10 |
| 15 | [Story 2 — master text, merge & variants](15-story2-master-text-and-variants.md) | 7 (Story 2) | 1 · `pdf-render-specialist` | 14 |
| 16 | [Story 2 — letter PDF template & print CSS](16-story2-letter-template-and-css.md) | 7 (Story 2) | 1 · `pdf-render-specialist` | 15 |
| 17 | [Story 2 — Premium imagery (portrait + belief wash)](17-story2-imagery.md) | 7 (Story 2) | 2 · `ai-image-specialist` | 14, 16 |
| 18 | [Story 2 — wizard inputs & landing story picker](18-story2-wizard-and-story-picker.md) | 7 (Story 2) | 3 · `nextjs-ui-builder` | 14, 15 |
| 19 | [Story 2 — in-browser preview & PDF download](19-story2-preview-and-download.md) | 7 (Story 2) | 3 + 1 · `nextjs-ui-builder` / `pdf-render-specialist` | 16, 17, 18 |
| 20 | [Story 4 — text, two-tense engine & registration](20-story4-text-and-tense-engine.md) | 8 (Story 4) | 1 · `pdf-render-specialist` | 14, 15, 16 |
| 21 | [Story 4 — imagery (portrait + pet-in-scene)](21-story4-imagery.md) | 8 (Story 4) | 2 · `ai-image-specialist` | 20 |
| 22 | [Story 4 — wizard, storefront & order intake](22-story4-wizard-and-storefront.md) | 8 (Story 4) | 3 · `nextjs-ui-builder` | 20, 21 |
| 23 | [Story 5 — text, registration & Premium imagery](23-story5-text-registry-and-imagery.md) | 9 (Story 5) | 1 + 2 · `pdf-render-specialist` / `ai-image-specialist` | 14, 15, 16, 17 |
| 24 | [Story 5 — wizard, storefront & order intake](24-story5-wizard-and-storefront.md) | 9 (Story 5) | 3 · `nextjs-ui-builder` | 23 |

> **Note:** Stories 2–3 were "out of scope" in the original `local-prototype-plan.md`. Story 2 (features 14–19) is a deliberate, PM-approved scope expansion (2026-06-09): full product, with the AI pet portrait (Premium tier), built on a generalized multi-story engine. Story 4 (features 20–22) is the first concrete title built via [`../new-book-playbook.md`](../new-book-playbook.md) (commerce PR-10) — "If [PET_NAME] Could Talk", the living/celebration twin of Story 2, split into 3 PRs. Story 5 (features 23–24) is the second playbook title — "A Letter to [PET_NAME]", the owner's-voice companion/inverse of Story 2, split into 2 PRs (its imagery is Story 2's exact shape, so the text and imagery fold into one PR).

## Milestone map (from the plan)

- **M1 — Static PDF from hardcoded JSON:** 01 → 02 → 03 → 04 → 05. *Done = a beautiful 12-page PDF from a JSON file with placeholder images.*
- **M2 — AI reference illustration:** 06. *Done = upload a pet photo, get one stylized illustration of the same animal.*
- **M3 — Full scene pipeline:** 07. *Done = JSON + photo → full PDF with all illustrations of the real pet (the "wow" moment).*
- **M4 — Wizard UI:** 08 → 09. *Done = complete the wizard, click Generate, backend produces a book.*
- **M5 — In-browser preview:** 10. *Done = see all 12 pages with real illustrations, then download the PDF.*
- **M6 — Polish:** 11 (open-ended).
- **M7 — Story 2 (A Letter from [PET_NAME]):** 14 → 15 → 16 → 17 → 18 → 19. *Done = pick Story 2 on the landing page, walk the wizard, generate the Premium portrait + belief wash, preview the typeset letter, and download `Letter-from-[PET_NAME].pdf`.* Phase 0 (14) is the behavior-preserving engine refactor — Story 1 must stay byte-identical.
- **M8 — Story 4 (If [PET_NAME] Could Talk):** 20 → 21 → 22. *Done = pick Story 4 on the landing page (or its storefront listing), walk the wizard / order form, generate the cover portrait + pet-in-scene page-4, preview the present-tense letter, and download `If-[PET_NAME]-Could-Talk.pdf`.* The living/celebration twin of Story 2; follows the new-book-playbook (no new layout — reuses the `letter` treatment). The headline `livingOrMemorial` toggle flips the whole letter to past tense for a grieving buyer; the **living** path is default. Story 1 + Story 2 stay byte-identical.
- **M9 — Story 5 (A Letter to [PET_NAME]):** 23 → 24. *Done = pick Story 5 on the landing page (beside Story 2, "one from them, one from you"), walk the wizard / order form, generate the cover portrait + figure-free belief wash, preview the owner's-voice letter, and download `Letter-to-[PET_NAME].pdf`.* The owner-writes-to-the-pet inverse + companion of Story 2; follows the new-book-playbook (no new layout — reuses the `letter` treatment; imagery is Story 2's exact shape, so text + imagery fold into PR 23). Stories 1 / 2 / 4 stay byte-identical. The Stories 2+5 companion **bundle** is deliberately out of scope (net-new multi-product commerce).

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
