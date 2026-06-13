---
name: story6-text-seams
description: PR-25 Story-6 ("While You're Still Here") text/registry seams — the narrative-layout living tribute, single-tense present, transitionFrame toggle, dedication block, the 8-page/7-slot accounting
metadata:
  type: project
---

Story 6 ("While You're Still Here, [PET_NAME]") is the first **narrative-layout**
new book since Story 1 — reuses Story 1's `cover`/`dedication`/`narrative`/`love`/
`back-cover` layouts wholesale; **not a letter** (no `LETTER_SIGNOFFS`, no
single-column). Living tribute, **single-tense (present), pet is alive** — the
memorial conversion / `DEATH_TYPE` / `BELIEF_FRAME` / `truth` layout were DROPPED
by PM (2026-06-12). Mirror Story 4 for the file split (`variants.test.ts` +
`merge.test.ts` + `registry.test.ts`).

**Why:** record the seams so the next Story-6 test run (or PR 26's wizard/catalog)
points at the right modules without re-discovering them.

**How to apply:**
- **Testable seams (pure, $0):** `lib/story/story6/{master-text,variants,merge,
  editable-fields}.ts`, `lib/story/story-6.ts` (registry def + `TRIBUTE_SCENE_PAGE_IDS`),
  `lib/pdf/filename.ts` `tributePdfFilename` → `While-Youre-Still-Here-[PET_NAME].pdf`
  (apostrophe dropped). Fixture: `story6SessionWith()` / `biscuitSession6()` (senior
  Jack Russell "Biscuit", owner "Sarah", still-here, no other pets).
- **8 pages / 7 image slots** is the accounting trap: book = cover + page-1
  (dedication) + pages 2-6 + back-cover = **8 pages**; `TRIBUTE_SCENE_PAGE_IDS` = 7
  (the page-1 dedication portrait IS a slot, per Story 1; `tribute-back-cover`
  excluded). `totalImages = slots + 1 = 8` (Story 1's shape — reference + 7).
- **`STORY_6_LAYOUT` double-lock:** `tribute-cover`→cover, `tribute-page-1`→
  dedication, `tribute-page-2..4`→narrative, `tribute-page-5`/`6`→**love**,
  `tribute-back-cover`→back-cover. Assert against a hand-authored
  `Record<Story6PageId, PageLayout>` AND assert no page is ever `truth`.
- **Variant engine (`composeVariants6`):** ONE toggle `transitionFrame`
  (`still-here` default = gratitude closer, no future; `road-ahead` = single
  forward-looking Page-5 closer, finitude named once, **death never named**) +
  age-band (derived from free-text `ageOrStage`: ≥15 → very-senior appends Page-2
  line; diagnosis-without-senior-age → younger-diagnosed softens Page-5 lead) +
  species voice (Pages 2-4) + `otherPetsInHome:yes` (Page-4 line). NO two-tense
  engine (that's Story 4).
- **Living-tribute guard** = Story 4's tense-leak guard scoped to "no past / no
  farewell": banned phrases, no `die/died/death/dead` anywhere, no farewell markers
  (`goodbye`, `you're gone`, `we lost`), `truth` layout never assigned.
- **Age-band pitfall (a test-bug I hit):** the Page-5 LEAD embeds `{ageOrStage}`,
  so you CANNOT byte-compare leads across age bands — assert the senior opener
  *phrase* ("You're in the gentle part of a long life now.") survives vs. the
  younger-diagnosed lead ("You came to a hard turn"), not raw equality.
- **Optional fields:** `ownerMessage` → Page-1 `ResolvedPage.dedication` (dropped,
  no em dash, when blank/whitespace/undefined — `cleanOptional`). `stillLoves`/
  `quirks` = optional-with-variant-fallback. `nicknames`/`dateAdopted`/
  `favoriteSpots`/`sleepingSpot` = optional-omit (feed art briefs). Required (throw
  on blank): `petName`/`breedColor`/`ageOrStage`/`ownerNames`/`favoriteRitual`/
  `favoriteActivity`.
- **Imagery already covered** by `lib/ai/story6-prompts.test.ts` +
  `generate.story6.test.ts` (imagery agent owns these): 7 slots all
  `useReference:true` (NO figure-free wash — unlike Story 2/5), all `images.edit`,
  Story 1/2/4/5 totals pinned. Don't rewrite.
- Result: +77 tests (variants 32, merge 28, registry 17); suite 1280→1357.
