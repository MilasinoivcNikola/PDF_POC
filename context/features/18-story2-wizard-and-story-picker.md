# 18 — Story 2: Wizard Inputs & Landing Story Picker

> **Craft Area:** 3 — App/UI · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 7 — Story 2 · **Phase:** 4 · **Depends on:** 14, 15
> **Branch:** `feature/story2-wizard`

## Status

Not Started

## Goals

- Let a user **choose Story 1 or Story 2** on the landing page, then walk a story-aware wizard that collects Story-2's inputs and writes a valid `Story2Session` to disk for generation (17) and preview (19).
- Generalize the wizard chrome (`StepShell` / `ProgressBar` / `draftToSession` / required-fields) to be driven by a **per-story step config** instead of Story-1 hardcodes — without changing the Story-1 wizard's behavior.

## Scope

**In scope**
- **Landing page** (`app/page.tsx`): a gentle story chooser — *Story 1, the child's book* vs *Story 2, the letter keepsake* — that sets `storyType` on a fresh draft before entering `/create`.
- A **story-aware step config** (the steps, required fields, and draft→session bridge per story), registered alongside the story definition (feature 14's registry). Story 1 keeps its existing 6 steps unchanged; Story 2's steps:
  1. `upload` — pet photo (**reuse** the existing uploader; Premium cover uses the photo).
  2. `pet` — name, species, breed (**reuse** the pet-basics step; drop pronoun/illustration-style or keep minimal as needed).
  3. `owner` — owner name(s) + relationship (single / couple).
  4. `letter` — quirks, favorite ritual, favorite spots, nicknames (opt), dates (opt).
  5. `tone` — death type, belief frame, gift-for, new-pet.
  6. `generate` — kick-off (its progress UI is feature 09, reused; Story-2 labels via the registry).
- Parameterize `ProgressBar` / `StepShell` on the **per-story step count** ("Step NN of NN") — remove the hardcoded `total = 6` / "of 06".
- `draftToSession` dispatch per `storyType` (uses feature 15's `Story2Session`); a per-story required-field set; server-side validation in `app/api/session/route.ts` per `storyType`.
- `WizardProvider` holds a `storyType`-tagged draft; `loadDraft`/`saveDraft` tolerate both shapes.

**Out of scope**
- Preview / download for Story 2 (feature 19).
- New generation-progress *mechanics* (reuse feature 09; only its labels/copy come from the registry).
- The "family" relationship option (punted in feature 15).

## Implementation notes

**Key decisions**
- **Context + `localStorage` only** — no new state library (per the plan / coding standards).
- The draft is discriminated by `storyType`. Pick one shape and apply it consistently: a single draft with optional story-specific groups gated by `storyType`, **or** a `storyType` field that selects which `Partial` groups are read. Whatever the choice, `loadDraft` must not crash on either product's saved draft.
- **Required-field gating for Story 2:** `petName`, `ownerNames`, `species`, `quirks`, `favoriteRitual`, `favoriteSpots`, and `photo` (photo because the Premium cover uses it). Mirror the gentle, bereaved-owner copy of the Story-1 gates.
- Match the prototype's warm editorial tone; **reuse** `.field`, `.radio-option`, `.upload-zone`, `.steps`, `.wizard-footer` — don't fork the design system.

**Files**
- `app/page.tsx` (story chooser)
- `app/create/*` (story-aware step rendering — a Story-2 step subset or a config-driven step renderer)
- `components/wizard/{WizardProvider,StepShell,ProgressBar}.tsx`
- `lib/session/draft.ts` (per-story `missingRequiredFields` / `draftToSession`)
- `app/api/session/route.ts` (per-story validation)
- `lib/story/registry.ts` (the wizard step config per story)

## References

- @prototypes/wizard.html, @prototypes/index.html — the warm editorial look + the landing layout to extend with a picker.
- @context/masterstories/story-2-master-template.md — the exact Story-2 fields + toggles to collect.
- @context/features/08-wizard-ui.md — the Story-1 wizard pattern this generalizes.
- @context/features/15-story2-master-text-and-variants.md — the `Story2Session` shape the wizard must produce.

## Done when

- [ ] The landing page offers Story 1 / Story 2; choosing sets `storyType` on a fresh draft.
- [ ] The Story-2 wizard collects every Story-2 field, persists across refresh (same id), and gates the required fields.
- [ ] Generate writes a valid `Story2Session` to `./sessions/[id].json` and routes into the generation screen.
- [ ] The Story-1 wizard is unchanged (still 6 steps, same required set).
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: per-story `missingRequiredFields` reporting + `draftToSession` for Story 2 (defaults/trim/optional-drop); `/api/session` Story-2 validation branches (disk write mocked).
- `qa`: complete the Story-2 wizard in a browser, refresh mid-way (state + id survive), reach Generate with a written `Story2Session`; confirm the Story-1 wizard still works end-to-end.
