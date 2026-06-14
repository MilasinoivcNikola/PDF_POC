# Story 9 (PR-A): Text, Variants, Registration & Approach-A Imagery

## Status

In Progress

## Goals

Book: **"[PET_NAME] and the New Baby"** — the family-transition keepsake. The engine
produces a correct **8-page** "New Baby" PDF from a `Story9Session`, all variants applied,
7 reference-anchored illustrations. **Not yet sellable** (wizard/storefront/intake = PR-B).
Authoring-only: reuses Story-1 `PageLayout` set verbatim — **no new `renderPage` case, no
new print CSS, no parity work, Step 3 skipped**. (Does not use Story 1's `truth` layout.)

1. **Text engine — `lib/story/story9/`** (mirrors Story 6's module shape):
   - `master-text.ts` — 8 master pages at default tone (**expecting**, no other pets, dog
     voice), each with its `illustrationBrief`. Page ids `baby-` prefixed (`baby-cover`,
     `baby-page-1` … `baby-page-7`, `baby-back-cover`).
   - `merge.ts` — `STORY_9_LAYOUT` (page id → Story-1 `PageLayout`) + value builder.
     `[BABY_NAME]` degrades to literal `"the new baby"` when `babyStatus` is `expecting`
     OR name blank — no surviving `[BABY_NAME]`, no doubled article. `[SPECIES_DESCRIPTOR]`
     reuses Story 1's mapping, drives "big [SPECIES_DESCRIPTOR]" phrasing.
   - `variants.ts` — `resolveStory9(session)`. Dimensions:
     - **`babyStatus` (expecting | arrived)** — primary toggle; rewrites Pages 4, 6, 8
       between anticipatory and present framings. Both must read as a complete book.
     - **species** voice tweaks on Pages 2, 6.
     - **`otherPetsInHome` (yes | no)** — appends "the more, the merrier" line on Pages
       2, 4, 5, 7. Never competitive.
   - Tests: `merge.test.ts` (zero surviving `[FIELD]` over full matrix; `[BABY_NAME]`
     degradation; no doubled article), `variants.test.ts`, `registry.test.ts`, `fixtures.ts`
     (+ editable-fields contract only if PR-B's preview needs it, else defer to PR-B).

2. **Session contract — `lib/session/types.ts`**: add `Story9Memories`, `Story9Toggles`
   (`babyStatus`, `otherPetsInHome`), `Story9Draft`, `Story9Session`; optional `babyName?`,
   `babyArrival?`. Add `"story-9"` to `StoryType`; `baby-*` ids to `PageId`.

3. **Registration**:
   - `lib/story/story-9.ts` — `StoryDefinition`: `resolve`→`resolveStory9`,
     `illustrationSlots = STORY_9_SCENE_PAGE_IDS` (**exactly 7**: `baby-cover`,
     `baby-page-2` … `baby-page-7`; **not** page-1/8/back-cover), `pdfFilename`→
     `newBabyPdfFilename`, wizard config, editable contract.
   - `lib/story/registry.ts` — import + add to `REGISTRY` and `AnyEditableSession`.
   - `lib/pdf/filename.ts` — `newBabyPdfFilename(petName)` → `[PET_NAME]-and-the-New-Baby.pdf`.

4. **Imagery — `lib/ai/story9-prompts.ts`** (Approach A): 7 per-scene prompt builders.
   **Only the pet is photo-anchored**; baby + all adults abstract (bundle, small hand,
   silhouette, 3/4 or from-behind, **never a specific face**). Warm nursery palette,
   golden-hour light. Defaults to **low** cost tier. Add `story9-prompts.test.ts`.

**Guards / standing tests:** add `lib/ai/story9-prompts` to engine-only list in
`lib/runtime/surface.boundary.test.ts`; add `"story-9"` round-trip to
`lib/story/registry.test.ts`; existing PDF byte-identity tests stay green.

## Notes

- **Craft Areas:** spans **1 (PDF/story text)** + **2 (AI imagery)**. Lead with
  **pdf-render-specialist** (text engine + registration + filename — the bulk), then
  **ai-image-specialist** for `lib/ai/story9-prompts.ts`. No UI work this PR.
- Source of truth: `context/masterstories/story-9-master-template.md`. Recipe:
  `context/new-book-playbook.md` (Steps 1, 2, 4; **Step 3 skipped**).
- Branch: `feature/story9-text`. Verify via the render CLI (not sellable yet).
- **$27** (2700 cents), default toggle **expecting** — locked with PM 2026-06-14.
- **Conditional-field gate:** gate `babyName` at *generate*, not the wizard step (lands
  PR-B; session contract must support it now). Learn from Story 8 PR-B's dead-end.
- **Quality bar (non-negotiable, from masterstory):** never frame baby as replacing/
  displacing the pet; never "fur baby"; no memorial language; pet's security established
  (Pages 2–3) before baby mentioned.
- **Out of scope (PR-B):** wizard step + conditional reveal, storefront card, public
  order intake, sample images.
</content>
</invoke>
