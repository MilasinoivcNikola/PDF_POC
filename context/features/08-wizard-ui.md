# 08 — Wizard UI

> **Craft Area:** 3 — App/UI · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 4 · **Depends on:** 02
> **Branch:** `feature/wizard-ui`

## Status

Not Started

## Goals

- A browser multi-step wizard that captures every Story-1 input, persists progress across refreshes, and ends at a "Generate" action — **the first half of Milestone 4**.
- Looks and feels like `prototypes/wizard.html` (warm editorial, single column, gentle copy, sticky section heading, save indicator).
- Writes a complete `StorySession` to disk at Generate time so the pipeline (features 07/09) can pick it up.

## Scope

**In scope**
- Routes under `app/create/` for the input steps, per the plan's structure:
  1. `upload/` — pet photo (drag-drop / file picker) with preview.
  2. `pet/` — name, species, breed/appearance, pronoun, illustration style.
  3. `child/` — child name, age bracket.
  4. `memories/` — favorite activity, sleeping spot, favorite memory, optional dedication.
  5. `style/` — death-type sensitivity, belief frame, other-pets-in-home.
  6. `generate/` — the kick-off step (its progress UI is feature 09; here, just the entry/CTA and writing the session).
- React Context provider holding the draft, synced to `localStorage` (reuse feature 02's helpers) so refresh doesn't lose progress.
- `components/wizard/`: `StepShell` (header, section heading, footer nav, save status), `ProgressBar` / steps indicator ("Step NN of 06"), `ImageUploader` (drag-drop + preview + replace, with a gentle "this might not work well" notice for low-res/blurry photos).
- Validation: only **pet name, child name, photo** are required (plan); everything else optional with graceful defaults.
- On Generate: assemble the draft into a complete `StorySession`, POST it to be written to `./sessions/[id].json`, then route into feature 09's progress screen.

**Out of scope**
- The generation progress animation + orchestration call (feature 09).
- Preview / download (feature 10).
- The AI/PDF backends (already built in 05/07).
- Mobile responsiveness (desktop-first per plan).

## Implementation notes

**Key decisions**
- **Reconcile the step count.** The plan lists discrete routes (upload, pet, child, memories, style, generate); the prototype `wizard.html` shows "Step 02 of 06" and visually folds photo + style into the pet step. Default to the plan's route structure (one concern per route) and label them 1–6 to match the "of 06" counter, with the generate step as 06 (matching `generating.html`'s "Step 06 of 06"). Preview/download are post-generation and uncounted. Flag any deviation in the PR.
- Reuse the prototype's exact class names and components from `styles.css` (`.field`, `.radio-option`, `.upload-zone`, `.style-grid`, `.steps`, `.wizard-footer`, etc.) — the design is already done.
- Context + `localStorage` only (no Zustand/Jotai) per plan. Keep the Context provider at the `app/create/layout.tsx` level so all steps share it.
- The "Continue/Back" nav and "Saved just now" indicator already exist in the prototype — wire them to real state.

**Files**
- `app/create/layout.tsx` (Context provider + shared chrome)
- `app/create/{upload,pet,child,memories,style,generate}/page.tsx`
- `components/wizard/{StepShell,ProgressBar,ImageUploader}.tsx`
- a small server action / route to persist the finalized session to disk.

## References

- @prototypes/wizard.html — the canonical look + the fields collected.
- @prototypes/styles.css — form/wizard component styles.
- @context/local-prototype-plan.md — step structure, Milestone 4, required-fields rule, low-quality-photo handling.
- @context/masterstories/story-1-master-template.md — field list + toggles (must collect all of them across the steps).

## Done when

- [ ] All six input steps render on-brand and collect every field/toggle in the session model.
- [ ] Draft persists across refresh via `localStorage`; "saved" indicator reflects real saves.
- [ ] Required-field validation (pet name, child name, photo) blocks Generate; everything else optional.
- [ ] Image uploader supports drag-drop + preview + replace and warns on small/blurry photos.
- [ ] Generate writes a complete `./sessions/[id].json` and routes to the generate step.
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: draft→`StorySession` assembly, validation logic (required fields), `localStorage` persistence helpers (if any new ones).
- `qa`: complete the wizard in a browser, refresh mid-way (state survives), reach the generate step with a written session.
