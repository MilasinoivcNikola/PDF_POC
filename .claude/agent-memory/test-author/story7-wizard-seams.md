---
name: story7-wizard-seams
description: feature 29 PR-B Story-7 wizard/storefront/intake seams — the conditional yearsHome gate (anniversary-only) tested in BOTH draft.test.ts and route.test.ts, plus catalog/labels
metadata:
  type: project
---

Feature 29 (PR-B) made Story 7 "Welcome Home" **creatable + sellable** (PR-A was the engine, see [[story7-text-seams]]). The testable seams added in PR-B:

- **`lib/session/draft.ts`** (`draft.test.ts`): `missingRequiredFieldsStory7` / `draftToSessionStory7` / `isStory7Draft` + dispatcher branches. Required-7: petName, species, breedColor, ownerNames, favoriteActivity, sleepingSpot, photo. Narrative book → reuses Story-1 `Pet` group (pronoun + illustrationStyle) + Story-2 `Owner` group; NO child group (childName is an optional memories field).
- **`app/(operator)/api/session/route.ts`** (`route.test.ts`): `validateStory7` + POST dispatch on `storyType === "story-7"`. Codes: missing_pet_name/species/photo/breed_color/owner_names/favorite_activity/sleeping_spot + `missing_years_home`.
- **`lib/catalog/products.ts`** (`products.test.ts`): `story-7-welcome`, storyType `story-7`, `illustrationCount === 8` DERIVED from `getStory("story-7").illustrationSlots`, price `2900`.
- **`components/wizard/illustrationLabels.ts`** (`illustrationLabels.test.ts`): `WELCOME_ILLUSTRATION_SLOTS` = `reference` + 8 page slots = 9; drift guard `.slice(1)` === registry slots. `story7LabelsFor` is an **internal** helper — tested THROUGH the public `illustrationLabel(slot, name, "story-7")`, same as Story 1/6 (the spec named `story7LabelsFor` but it's not exported; don't add a direct-export test).

**The load-bearing branch — conditional `yearsHome`** (the trickiest, well-covered in BOTH files):
- `yearsHome` required ONLY when `occasion === "gotcha-day-anniversary"`; the `new-arrival` default never requires it.
- draft.test.ts: new-arrival passes with yearsHome absent; anniversary returns `["yearsHome"]`; provided satisfies; whitespace-only counts missing. `draftToSessionStory7` DROPS `yearsHome` on new-arrival even if a stale value is set (`"yearsHome" in toggles` === false).
- route.test.ts: new-arrival body with no yearsHome → 200; anniversary with no yearsHome → 400 `missing_years_home`; anniversary + yearsHome → 200.

**Optional-with-fallback divergence**: `quirks` / `homecomingMemory` store `""` when blank (key present) — the variant layer supplies the Page-4/6 fallback. `childName` / `familyMembers` / `nicknames` / `dateAdopted` are optional-omit (dropped when blank). The route ACCEPTS blank quirks/homecomingMemory — that acceptance is the dispatch-proof that validateStory7 ran (not validateStory2/4, which require quirks).

Suite at feature 29: 78 files / 1617 tests green; tsc --noEmit clean. No gaps found — all four spec'd files present and adequate; added nothing.
