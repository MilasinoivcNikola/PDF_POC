---
name: story8-text-seams
description: feature 31 PR-A Story-8 ("The Amazing Adventures of [PET_NAME]") seams — catalog's first kids' ADVENTURE book; superpower fallback chain, conditional childName (pet-plus only), full 240-combo matrix, tone guard, grief-banlist gap I closed
metadata:
  type: project
---

Story 8 ("The Amazing Adventures of [PET_NAME]") is the catalog's first JOYFUL kids'
ADVENTURE book (mild, safe jeopardy — unlike every sibling). NARRATIVE-layout book
like Story 1/6/7: reuses `cover`/`narrative`/`closing`/`back-cover` — **never
`dedication`/`love`/`truth`** (no death/dedication/love page). PR-A = text+registry+
imagery only; PR-B (feature 32) adds wizard/storefront/sellable.

**Why:** record the seams + the load-bearing invariants + the one banlist gap so a
re-run re-asserts the spec's guards without re-deriving them.

**How to apply:**
- **Testable seams (pure, $0):** `lib/story/story8/{master-text,variants,merge,
  editable-fields,fixtures}.ts`, `lib/story/story-8.ts` (registry def +
  `ADVENTURE_SCENE_PAGE_IDS`), `lib/pdf/filename.ts` `adventurePdfFilename` →
  `Amazing-Adventures-of-[Name].pdf` ("Pet" fallback), `lib/ai/story8-prompts.ts`
  (`buildStory8SlotPrompts` + `buildScenePromptFromPage`). Fixtures: `biscuitSession8()`
  (dog "Biscuit", child "Emma", backyard-mystery/pet-plus/6-8, real superpower
  "the World's Greatest Nose") + `story8SessionWith(overrides)`.
- **13 page ids / 10 illustration slots.** `ADVENTURE_SCENE_PAGE_IDS` = cover +
  9 scene pages (adventure-ordinary..adventure-celebration). Pages 10-11
  (adventure-home/closing) + back-cover REUSE imagery (no slot). `totalImages = 1+10 = 11`.
- **The superpower fallback chain (the soul):** real input verbatim (NEVER overridden)
  → blank derives "the very best in the world at {activity}" → "the amazing power of
  {quirks}" → species stock (dog=Best Nose / cat=Quietest Paws / rabbit=Fastest Hop /
  bird=Sharpest Eyes / other=Greatest Heart in the Whole Backyard). Pinned in merge.test.ts.
- **Conditional-required childName** — throws `MergeError` under `heroCount=pet-plus`
  when blank/undefined (carries `missingKeys` incl "childName"); PERMITTED blank under
  `pet-solo` (variant layer rewrites call/expedition + drops child everywhere; merge.ts
  registers a generic "the child" stand-in for the BRIEFS only, never the body). Both
  directions tested.
- **5-dim variant matrix** (`composeVariants8`): theme (backyard-mystery authored; the
  other 3 — sea-voyage/space-rescue/enchanted-forest — `toEqual` backyard, TOTAL
  fallback) × hero-count (pet-plus default vs pet-solo) × age (3-5 simplifies climax +
  gentles wobble; 6-8 master; 9-12 lengthens, keeps sequel hook) × species(5) × sidekick
  (Page-5 party line, pet-plus only). merge.test.ts sweeps the full **240-combo** matrix
  via `forEachCombination` for the no-placeholder + tone guards.
- **Adventure-tone guard** (Story 8's distinctive bar — runs over the WHOLE matrix):
  `BANNED_GRIEF` (rainbow bridge / passed away / passed on / fur baby / watching over /
  crossed over / gone too soon / in heaven), `BANNED_FILLER` (little did they know /
  happily ever after), NO emoji in body/headings EXCEPT the back-cover `Hero rating: ⭐`
  line (the lone allowed decoration — guard skips paras containing "Hero rating"), wobble
  bans scary words + climax always resolves (`safe`/`back to its branch`).
- **GAP I CLOSED (this run):** the impl agents' `BANNED_GRIEF` was missing "passed on"
  and "in heaven" — the spec §3 names them explicitly (the master template's own
  "Never" banlist is NARROWER than the spec prose; the SPEC is the checklist of record).
  Added both to the existing array (no new test block) so they sweep the full matrix.
  Everything else in spec §1-5 was already solidly covered.
- **editable surface = 6 fields:** petName/superpower/favoriteActivity/quirks required
  (4); childName/sidekickName optional. nicknames/breedColor NOT exposed.
- **Result:** suite 1695 passing (78 in the 5 story8 files); tsc clean; the only change
  was widening the grief banlist by 2 phrases. §6 byte-identity / §7 boundary / §9 live
  artifact are NOT unit scope (main thread).
