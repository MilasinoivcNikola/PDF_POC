# Current Feature

Feature 31 — Story 8 (PR-A): "Amazing Adventures" Text, Variants, Registration & Approach-B Imagery

## Status

In Progress

## Goals

Make the engine *produce a correct Adventure PDF from a `Story8Session`* — text → variants → merge → registration → Approach-B imagery — verified by the `render:test` CLI with a fixture. **PR-A of 3.** No wizard, no storefront, not yet sellable (those land in Feature 32 / PR-B).

- **Text engine** `lib/story/story8/*` (master-text, variants, merge, editable-fields, fixtures), mirroring `lib/story/story7/`. Backyard Mystery theme authored to v1; the other three themes are sketches/fallbacks only.
- **Session/draft types** in `lib/session/types.ts`: `StoryType += "story-8"`, `AdventureTheme`/`HeroCount`, `Story8Adventure`/`Story8Toggles`/`Story8Draft`/`Story8Session`, `WizardDraft` union; widen `Order.inputs` with `Story8Session`.
- **Registration** `lib/story/story-8.ts` + `registry.ts` + `wizard-config.ts` (`STORY_8_STEPS` data only) + `lib/pdf/filename.ts` (`adventurePdfFilename`).
- **Approach-B imagery** — the one genuinely new engine bit: refactor `lib/ai/story8-prompts.ts` (from PR-0) to read resolved briefs; add `generateStory8Illustrations` + `case "story-8"` to `lib/ai/generate.ts`, **defaulting to Approach B internally** (worker calls bare). 11 API images = 1 reference + 10 slots; pages 10–11 reuse imagery (no extra generation).
- **No new page layout / CSS — Step 3 SKIPPED.** Reuses the Story-1 narrative set (`cover`, `narrative`, `closing`, `back-cover`); no death page. Every existing book's PDF stays **byte-identical**.

## Notes

- **Branch:** `feature/story8-text`
- **Depends on:** Feature 30 (PR-0) GO — `lib/ai/story8-prompts.ts` + the Approach-B loop already exist and are validated.
- **Master template:** context/masterstories/story-8-master-template.md
- **Playbook:** context/new-book-playbook.md — Steps 1, 1a, 2 (+ AI generate); **Step 3 SKIPPED.**
- **Spec:** context/features/31-story8-text-registry-and-imagery.md
- **Closest precedent:** Feature 28 (Story 7 PR-A) — narrative book, no new layout, mixed reference handling.

### Decisions to lock with PM before/while building
- **Launch theme set** — recommend ship PR-A with Backyard Mystery only (enum carries all four; others are follow-on authoring). *Confirm.*
- **Price** — recommend $34 (`3400`); recorded for fixture/marketing, set in PR-B. *Confirm.*
- **Climax tier** — if PR-0's GO required climax at Medium, encode Medium as the per-slot default for `adventure-climax` (the one opt-out of the Low cost rule). *Confirm from PR-0 findings.*

### Craft Areas / agents
- Text engine + merge/variants → **pdf-render-specialist** (Craft Area 1).
- Approach-B imagery (`lib/ai/*`) → **ai-image-specialist** (Craft Area 2).
- Types/registry/wizard-config wiring → small, can ride with the above.

### Key guardrails
- Tone = happy/adventure (like Story 7, no grief language) but with real *mild, safe* jeopardy — the wobble must never tip into scary/sad and must resolve safely on the next beat. Encoded as test assertions.
- The `[SUPERPOWER]` fallback chain (blank → activity → quirks → species stock) is the soul of the book; never override a real customer quirk with stock.
- Conditional-required `[CHILD_NAME]`: thrown `MergeError` under `heroCount = pet-plus`, permitted blank in `pet-solo`.
- Keep scene identity (`ADVENTURE_SCENE_PAGE_IDS`) out of `lib/ai/*` — lives in the product module for the public catalog chain.
- **Known limitation → context/debt.md:** `regenerateSceneIllustration` (admin repaint) approximates B as A — no priors on a single repaint. Flag as candidate enhancement, not a PR-A blocker.

### Out of scope (→ PR-B / Feature 32)
Catalog entry, price wiring, Lemon Squeezy variant + env, wizard step UIs + draft→session bridge + `/api/session` validation, public order form branch, landing story-picker card, `illustrationLabels`, `REFERENCE_ANCHOR_STORIES`, samples. Additional adventure themes are follow-on authoring after Story 8 ships.
