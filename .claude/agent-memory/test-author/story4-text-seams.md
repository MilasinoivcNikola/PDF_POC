---
name: story4-text-seams
description: Story-4 ("If [PET_NAME] Could Talk") two-tense engine testable seams + the tense-leak guard nuance, for PR-20 and the later PR-21/22 wizard/imagery tests
metadata:
  type: project
---

Story 4 = the celebration twin of Story 2 (`lib/story/story4/`), feature 20 (PR-20 of 3).
Pure text/registration only; no imagery (PR-21), no wizard UI/catalog/storefront (PR-22).

**Testable seams (all pure, $0, mirror `lib/story/story2/*.test.ts`):**
- `lib/story/story4/variants.ts` — `composeVariants4()` (unresolved) + `resolveStory4(session)`. The **two-tense engine** is the headline: per-page builders take `living: boolean`, build each body WHOLE (no swap-then-patch), so leaks are structurally hard.
- `lib/story/story4/merge.ts` — `mergeStory4()` + `STORY_4_LAYOUT` (`talk-cover`→`letter-cover`, `talk-page-2..6`→`letter`). Reuses `clean`/`substitute`/`MergeError` from `lib/story/merge.ts`.
- `lib/story/story4/editable-fields.ts` — six editable fields (Story-2's five + Story-1's `favoriteActivity`); cover=names, page-3=quirks+ritual, page-4=activity+spots.
- `lib/story/story4/fixtures.ts` — `biscuitSession()` + `story4SessionWith()` (group-shallow override). USE these.
- `lib/pdf/filename.ts` — `talkPdfFilename` → `If-[PET]-Could-Talk.pdf` (NOT re-exported from `render.ts` like the other two; import from `@/lib/pdf/filename`).
- `lib/story/story-4.ts` — `story4Definition` + `TALK_SCENE_PAGE_IDS = ["talk-cover","talk-page-4"]`. Registry entry in `lib/story/registry.ts` (`"story-4"`).

**TENSE-LEAK GUARD NUANCE (the one trap):** the memorial Page-5 body is
`[truth, favorite, "not always easy", lastLine, deathSeam, beliefClose]`. The
**final** element (beliefClose) is **intentionally present-tense in all 3 frames**
("Wherever I am now, I'm not tired…" / "…there's a room for me…" / "I'm not anywhere
now… But I'm in the spot by the door…") — verbatim template copy mirroring Story 2.
So scope the memorial present-tense assertion to `page5.body.slice(0, -1)` and assert
pages 2 & 4 fully (no exception there). The death-**seam** line is the second-to-last
element (`body.slice(-2,-1)`), the close is last (`body[length-1]`).

**Wording gotchas that bit me (code is correct, my first assertions were wrong):**
- Memorial couple Page-2 = "the letter I **would have written** you both" (past), not "I'd write you both".
- Page-6 species line renders **sentence-initial capital**: "...the only way I know how: ... **As** much as a dog can love" — `toContain` is case-sensitive, search "As much as".
- Cover/sig date line is **tense-dependent**: living = "together since {dateAdopted}" (adopted only); memorial = "{dateAdopted} — {datePassed}" (**both** required, else no line).
- `livingOrMemorial !== "memorial"` is the living test, so an unset toggle reads as living.

**Matrix:** living×memorial(2) × deathType(4) × belief(3) × relationship(2) ×
species(5: dog/cat/rabbit/bird/other — **no horse slot**, folds to "other") ×
giftFor(2) = **1440** sessions in the merge placeholder-survival sweep.

PR-20 added 4 files / **+104 tests** (895→999). All gates green (test:run, build, tsc).
See [[qa-low-tier-cost-control]] — this PR is pure logic, never touched OpenAI.
