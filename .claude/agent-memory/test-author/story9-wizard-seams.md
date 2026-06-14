---
name: story9-wizard-seams
description: feature 34 PR-B Story-9 ("[PET_NAME] and the New Baby") creatable+sellable seams — the babyName never-required gate-at-generate, validateStory9 route branch, NEWBABY labels, catalog $27/7-slot; the two test gaps I closed (route + labels)
metadata:
  type: project
---

Feature 34 (PR-B) made Story-9 ("[PET_NAME] and the New Baby", the family-transition
keepsake) creatable + sellable. NARRATIVE book — reuses Story-1 `Pet` group IN FULL
(pronoun + illustrationStyle) + Story-2 `Owner` group; NO child. Audited the impl
agent's tests; draft.ts + products.ts were already well covered — I closed two gaps
(route + illustrationLabels), matching the Story-8 PR-B pattern.

**The load-bearing logic (the gate-at-generate decision, same lesson as Story-8 PR-B):**
- **`babyName` is NEVER required** — not in `missingRequiredFieldsStory9` (the 7
  required are petName/species/breedColor/ownerNames/favoriteActivity/sleepingSpot/
  photo — note breedColor+favoriteActivity+sleepingSpot are LIVE `{placeholder}`
  fields merge rejects when blank) and NOT in route `validateStory9`. An `expecting`
  OR `arrived`-with-blank-name order completes cleanly → variant layer degrades to
  "the new baby". Tested at BOTH layers.
- **Optional-field tri-state:** quirks = optional-with-fallback → stored "" when blank
  (NOT dropped). nicknames / babyName / babyArrival = optional-omit → key DROPPED when
  blank (so merge never prints a dangling line; babyName degrades). `draftToSessionStory9`
  trims all free-text. babyStatus default = "expecting" (set by `newStory9Draft` AND
  re-defaulted by the bridge); otherPetsInHome default "no" (bridge only).

**Test areas (all colocated, all green):**
1. `lib/session/draft.test.ts` (Story-9 block ~line 3183) — IMPL AGENT covered fully:
   missingRequiredFieldsStory9 (no babyName even on arrived, whitespace=missing,
   fresh-draft omits pre-seeded species), draftToSessionStory9 (drops/carries
   babyName/babyArrival, trim, expecting-degrade round-trips through resolveStory9 with
   NO `{babyName}`/`[BABY_NAME]` leak + contains "the new baby", babyStatus default),
   isStory9Draft, both dispatchers. NO gap here.
2. `lib/catalog/products.test.ts` — IMPL AGENT covered fully: story-9-newbaby present,
   illustrationCount===7 DERIVED via `getStory("story-9").illustrationSlots.length`
   (NOT literal), priceUsd 2700 ($27, lowest in catalog — #7 niche test), lsVariantId
   undefined. NO gap.
3. **`app/(operator)/api/session/route.test.ts` — GAP I CLOSED.** No story-9 coverage
   existed. Added `validStory9Session` helper + Story-9 validation describe (7 missing-
   field 400s with snake_case codes incl. missing_owner_names/missing_favorite_activity/
   missing_sleeping_spot, ACCEPTS blank quirks + no babyName, ACCEPTS arrived+no-name,
   path-traversal id guard) + happy-path write assertion. Disk MOCKED (writeSessionMock),
   isSafeSessionId real. Mirrors the Story-8 block exactly.
4. **`components/wizard/illustrationLabels.test.ts` — GAP I CLOSED.** No story-9
   coverage. Added NEWBABY_ILLUSTRATION_SLOTS describe (= reference + 7 baby-* =
   8; drift guard strips reference, compares to registry's 7), illustrationSlotsFor
   story-9 case, and label tests (name-woven reference/baby-page-5, fixed baby-cover,
   blank-name "your pet" fallback, every-slot non-empty). Mirrors Story-8.

NOTE: `lib/session/storage.test.ts` has NO per-story `newDraft` factory tests for ANY
story — `newStory9Draft` is covered transitively (every draft test calls
`newDraft("story-9")`). Don't add one; it would break the file's pattern.

Final: `npm run test:run` → 1918 passed, 88 files (PR-A was 1864). Build green
(story-9-newbaby in the SSG `/order/[productId]` set, 8 paths). My additions: 18 tests.
