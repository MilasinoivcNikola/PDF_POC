# Story 9 (PR-A): Text, Variants, Registration & Approach-A Imagery

> Book: **"[PET_NAME] and the New Baby"** — the family-transition keepsake.
> Source of truth: `context/masterstories/story-9-master-template.md`.
> Recipe: `context/new-book-playbook.md` (Steps 1, 2, 4; **Step 3 skipped** — reuses Story-1 layouts).
> Branch: `feature/story9-text`.

## Status

Not Started

## Scope

The engine produces a correct **8-page** "New Baby" PDF from a `Story9Session`, with all
variants applied and 7 reference-anchored illustrations. **Not yet sellable** — no wizard
step, no storefront card, no public order intake (that is PR-B). This is the
text-engine + registration + imagery half, independently verifiable via the render CLI.

This book is **authoring-only**: it reuses the Story-1 `PageLayout` set verbatim
(`cover`, `dedication`, `narrative`, `love`, `closing`, `back-cover`), so there is **no new
`renderPage` case, no new print CSS, and no screen↔PDF parity work**. We do **not** use
Story 1's `truth` layout (its death page — no place here). The `love` layout carries the
Page 7 "Love does not divide. It multiplies." hero beat.

## Goals

1. **Text engine — `lib/story/story9/`** (mirrors Story 6's module shape):
   - `master-text.ts` — the 8 master pages at the default tone (**expecting**, no other
     pets, dog voice), each with its `illustrationBrief`. Page ids use a `baby-` prefix
     (`baby-cover`, `baby-page-1` … `baby-page-7`, `baby-back-cover`) to avoid collision
     with other stories' ids.
   - `merge.ts` — `STORY_9_LAYOUT` (page id → Story-1 `PageLayout`) and the value builder.
     **`[BABY_NAME]` degrades to the literal `"the new baby"`** whenever `babyStatus` is
     `expecting` OR the name is blank — no surviving `[BABY_NAME]`, no doubled article
     (`a a`, `the the`). `[SPECIES_DESCRIPTOR]` reuses Story 1's mapping (good boy / sweet
     girl / kitty / bunny / friend) and drives the "big [SPECIES_DESCRIPTOR]" phrasing.
   - `variants.ts` — entry point `resolveStory9(session)`. Variant dimensions:
     - **`babyStatus` (expecting | arrived)** — the primary toggle; rewrites Pages 4, 6,
       and 8 between the anticipatory ("coming / will be", baby abstract) and the present
       ("has arrived / now there is", baby named) framings. Both paths must read as a
       complete, natural book — not one with words swapped.
     - **species** voice tweaks on Pages 2, 6 (cat supervises/doesn't crowd; bird/rabbit
       "settles in" not "curls up").
     - **`otherPetsInHome` (yes | no)** — appends the "the more, the merrier" line on
       Pages 2, 4, 5, 7. Never competitive.
   - Tests: `merge.test.ts` (zero surviving `[FIELD]` over the full variant matrix;
     `[BABY_NAME]` degradation; no doubled article), `variants.test.ts` (both `babyStatus`
     paths, species touches, other-pets lines), `registry.test.ts` (round-trip + slots +
     layouts + filename), plus `fixtures.ts` and an editable-fields contract if PR-B's
     preview editing needs it (otherwise defer the editable-fields module to PR-B).

2. **Session contract — `lib/session/types.ts`**: add `Story9Memories`, `Story9Toggles`
   (`babyStatus: "expecting" | "arrived"`, `otherPetsInHome`), `Story9Draft`,
   `Story9Session`; new fields `babyName?`, `babyArrival?` (both optional). Add `"story-9"`
   to the `StoryType` union and `baby-*` ids to the `PageId` union in `master-text.ts`.

3. **Registration**:
   - `lib/story/story-9.ts` — the `StoryDefinition`: `resolve` → `resolveStory9`,
     `illustrationSlots = STORY_9_SCENE_PAGE_IDS` (**exactly 7**: `baby-cover`,
     `baby-page-2` … `baby-page-7`; **not** page-1/8/back-cover), `pdfFilename` →
     `newBabyPdfFilename`, wizard config, editable contract.
   - `lib/story/registry.ts` — import + add to `REGISTRY` and `AnyEditableSession`.
   - `lib/pdf/filename.ts` — add `newBabyPdfFilename(petName)` → `[PET_NAME]-and-the-New-Baby.pdf`.

4. **Imagery — `lib/ai/story9-prompts.ts`** (Approach A): 7 per-scene prompt builders.
   **Only the pet is photo-anchored** (locked reference illustration, consistent across
   pages); the **baby and all adult figures are abstract** — a bundle, a small hand, a
   silhouette, 3/4 or from-behind, **never a specific face**. Warm nursery-adjacent
   palette, golden-hour light. Scene generation defaults to the **low** cost tier.
   Add `story9-prompts.test.ts`.

## Guards / standing tests to update

- `lib/runtime/surface.boundary.test.ts` — add `lib/ai/story9-prompts` to the engine-only
  (public-forbidden) list.
- `lib/story/registry.test.ts` — add the `"story-9"` round-trip assertion.
- Existing PDF byte-identity tests must stay green — Step 3 is skipped, so every other
  product's output is untouched.

## Out of scope (PR-B)

Wizard step + the conditional baby-fields reveal, storefront card, public order intake,
sample images under `public/samples/`.

## Notes / decisions

- **Two-PR split** (A then B), matching Stories 4–8.
- **$27** (2700 cents), default toggle **expecting** — locked with PM 2026-06-14.
- **Copy review:** PM reviews the draft variant text directly (no paid ghostwriter) —
  focus on the expecting↔arrived split reading as two whole books and the Page 7 hero line.
- **Conditional-field gate:** learn from Story 8 PR-B's review-caught wizard dead-end —
  gate the conditional `babyName` at *generate*, not at the wizard step (lands in PR-B,
  noted here so the session contract supports it).
- Quality bar (from the masterstory, non-negotiable): never frame the baby as replacing
  or displacing the pet; never "fur baby"; no memorial language; pet's security
  established (Pages 2–3) before the baby is mentioned.
