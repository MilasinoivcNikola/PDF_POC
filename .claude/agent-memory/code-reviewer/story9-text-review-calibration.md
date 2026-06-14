---
name: story9-text-review-calibration
description: Feature 33 PR-A Story-9 ("[PET_NAME] and the New Baby") review — the "a {species} who loves" raw-species body grammar trap + the dropped Page-2 cat variant
metadata:
  type: project
---

Feature 33 / PR-A `feature/story9-text` — new-baby narrative book (reuses Story-1 layouts, Step 3 skipped, not yet sellable). Review verdict: **CHANGES NEEDED** (two should-fix, no blockers).

**Trap 1 — raw `{species}` in BODY prose, not just an illustration brief.** Page 6 (story9/master-text.ts + variants.ts) has `"...a {species} who loves {pronounObject}."` straight from the masterstory (lines 208/217). For `species="other"` this renders **"a other who loves"** — broken article + flat word. Story 6's precedent uses `{species}` ONLY inside illustration briefs ("a {breedColor} {species}"), never body copy — that's why this is new. The `speciesDescriptor` mapper exists precisely to turn "other"→"friend"; body prose should prefer it (or special-case other). 
**Why:** the merge-test matrix iterates species incl. "other" but only asserts (a) no surviving placeholder, (b) no doubled article — "a other" passes both, so tests are green while output is wrong. A grammar/readability assertion is the missing coverage.
**How to apply:** whenever a story puts raw `{species}` (or any raw enum word) into body copy behind an indefinite article, check the "other"/vowel cases. Don't trust "matrix tests pass" — they only check placeholder survival, not grammar.

**Trap 2 — dropped Page-2 cat variant, with comments asserting it exists.** Masterstory line 140 specifies a Page-2 `[SPECIES]=cat` rewrite. `page2Body()` takes NO species param and never applies it. Yet variants.ts header says "species voice → Pages 2 & 6" and master-text.ts page-2 comment says "The species voice (cat) is layered in story9/variants.ts." So the code COMMENTS lie about a variant that isn't wired (only Page 3 sleeping-line + Page 6 bond are). variants.test.ts has no Page-2 species case. 
**Why:** a documented variant silently missing + misleading comments is a real (non-crash) defect; default dog wording reads fine so it's should-fix not blocker.
**How to apply:** when a variants module header lists which pages a dimension touches, grep that the per-page builder for each listed page actually TAKES that dimension as a param. Mismatch = dropped variant.

**Validated as correct (don't re-flag):**
- `STORY_9_SCENE_PAGE_IDS` = exactly 7 (cover + page-2..7), dedication/page-1/back-cover excluded — matches masterstory line 40.
- `resolveBabyName`: degrades to "the new baby" when expecting OR blank; arrived+named uses name. Sentences carry their own article so no doubling. Correct.
- Page 7 `love` layout body stays [lead,hero,closer] (3 elems) — other-pets append goes INTO the lead string, not a 4th element. LovePage renderer ([lead, ...rest], closer=last) is satisfied. Correct.
- not-yet-sellable dispatcher guards in draft.ts (missingRequiredFieldsForDraft + draftToSessionForDraft) throw "story-9 wizard not yet wired (PR-B)" rather than falling through to Story 1 — correct, matches the spec's gate-at-generate note.
- registry.test.ts swapped its negative-case cast from "story-9" to "story-99" (story-9 is now a real type) — correct maintenance.
- boundary test adds lib/ai/story9-prompts to FORBIDDEN_LOCAL; scene ids imported from lib/story/story-9, prompts import one-way. Boundary intact.
- The "closing layout dropped, folded into Page 7 love beat" is a PM decision — page-8/closing master content is in Page 7's closer. No defect consequence observed (back-cover comment still mentions "closing" in a layout-list aside but that's documentation only).
