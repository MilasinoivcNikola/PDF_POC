---
name: story9-text-seams
description: feature 33 PR-A Story-9 ("[PET_NAME] and the New Baby") text/registry/imagery seams — the family-transition keepsake, babyName degradation, babyStatus toggle, Story-1 narrative-layout reuse (never `truth`), Approach-A imagery
metadata:
  type: project
---

Story 9 ("[PET_NAME] and the New Baby", `story-9`) is the family-transition
keepsake — JOYFUL/non-memorial, reuses Story 1's `cover`/`dedication`/`narrative`/
`love`/`back-cover` layouts WHOLESALE (no new `PageLayout`, no renderPage case, no
CSS, Step 3 skipped). 8 pages / 7 image slots. Mirrors Story 6's module shape +
test split. Same merge primitives as the others — placeholders are `{field}`
(curly) via shared `substitute`, NOT `[FIELD]`.

**Why:** record the seams so the next Story-9 run (PR-B wizard/catalog) points at
the right modules without re-discovery, and so the audit findings (full parity,
no gaps) aren't re-litigated.

**How to apply:**
- **Testable seams (pure, $0):** `lib/story/story9/{master-text,variants,merge,
  editable-fields}.ts`, `lib/story/story-9.ts` (`story9Definition` +
  `STORY_9_SCENE_PAGE_IDS`), `lib/pdf/filename.ts` `newBabyPdfFilename` →
  `[PET_NAME]-and-the-New-Baby.pdf`, `lib/ai/story9-prompts.ts`
  (`buildStory9SlotPrompts` / `buildScenePromptFromPage`, PURE — no SDK/fs).
  Fixtures: `biscuitSession9()` / `story9SessionWith()` (Biscuit, dog, "Garcia"
  family, expecting, no other pets, babyName="Noah" present-but-degraded).
- **8 pages / 7 slots accounting:** book = `baby-cover` + `baby-page-1`
  (dedication) + `baby-page-2..7` + `baby-back-cover` = 8 pages. `illustrationSlots`
  = `STORY_9_SCENE_PAGE_IDS` = exactly 7: `baby-cover`, `baby-page-2..7` (NOT
  page-1 dedication, NOT back-cover). illustrationCount DERIVED = 7.
- **`STORY_9_LAYOUT`:** baby-cover→cover, baby-page-1→dedication, baby-page-2..6→
  narrative, baby-page-7→**love** (the "Love does not divide. It multiplies." hero),
  baby-back-cover→back-cover. **`truth` NEVER assigned** (it's Story 1's death page).
  merge.test.ts authors an INDEPENDENT expectedLayout map to drift-guard.
- **The defining seam — `{babyName}` degradation** (`resolveBabyName`): name used
  ONLY when babyStatus==="arrived" AND non-blank name; else degrades to literal
  "the new baby" (carries its own "the", so no doubled article). 4 cases: arrived+name,
  expecting+name (degrades), arrived+blank/whitespace (degrades), arrived+undefined
  (degrades). NEVER a literal `{babyName}`/`[BABY_NAME]` token.
- **Variant engine (`composeVariants9`):** primary toggle `babyStatus`
  (expecting default | arrived) rewrites cover subtitle + Page-1 dedication +
  Page 4 (anticipatory→arrived) + Page 6 (the bond, "Soon there will be"→"Now
  there is", named) WHOLE per-page (no half-mix) + Page-5 bond line tweak. Plus
  species voice (Page 3 "curls up"→"settles in" for bird/rabbit; Page 6 cat
  "supervises, doesn't crowd" line) + `otherPetsInHome:yes` appends on Pages
  2/4/5/7 (Page 7 folds into the love LEAD so hero+closer keep fixed shape) +
  quirks fallback on Page 3.
- **Quality-bar guard (variants.test.ts, non-negotiable):** banned phrases (no
  "fur baby", "you'll have to share", "the baby comes first", "less attention",
  "replaced" only inside "not being replaced"), MEMORIAL_MARKERS regex (no
  die/died/death/dead/dying, rainbow bridge, watching over, goodbye, passed away),
  `truth` never assigned, pet security established (no "baby" on Page 2-3 prose
  besides the establishing "Before the new baby" line; first real mention Page 4).
- **Standing guards (verified in place):** `lib/runtime/surface.boundary.test.ts`
  lists `lib/ai/story9-prompts` as engine-only; PDF byte-identity
  (`template.test.tsx`/`template.story2.test.tsx`) stay green (Step 3 skipped =
  no template touch). Story-9 round-trip lives in the COLOCATED
  `lib/story/story9/registry.test.ts` (same pattern as story6 — top-level
  `lib/story/registry.test.ts` covers only story-1/2, do NOT extend it).
- **Audit result (feature 33):** the implementation agents' suite was already at
  full Story-6 parity — 108 Story-9 tests (merge 31, variants 30, registry 17,
  editable-fields 21, prompts 9), all 5 spec-required areas covered, NO gaps to
  fill, NO bugs found. Suite 1864 passed / 88 files; build green.
