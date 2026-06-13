---
name: story6-wizard-review-calibration
description: feature 26 Story-6 wizard/storefront — the FIRST narrative-spread storefront book; isLetter must EXCLUDE story-6; spread path + 8-image (ref+7) accounting
metadata:
  type: feedback
---

PR-26 (Story 6 "While You're Still Here" wizard/storefront/order) — the validated
review checks for a **narrative-spread** new book (unlike the Story-4/5 *letter*
PRs). Story 6 is the first storefront book that takes Story 1's facing-page spread
path, so the headline risk inverts the letter pattern.

**`isLetter` must EXCLUDE story-6** (the load-bearing invariant). Confirmed safe
in all five usages — each is the literal `storyType === "story-2" || "story-4" ||
"story-5"` enumeration (no story-6), so story-6 falls to the narrative/spread
`else`: `app/(operator)/create/pet/page.tsx`, `app/(operator)/create/generate`,
`app/(operator)/create/preview`, `OrderForm.tsx`, `components/preview/BookPreview.tsx`.
The pet step keeps pronoun+style+breedColor for story-6 (`!isLetter` gates breedColor;
a separate `isStory6` gates the new ageOrStage). Don't flag these — they're correct.

**8-image accounting (ref + 7), not 14/2.** `TRIBUTE_ILLUSTRATION_SLOTS` =
`reference` + 7 `tribute-*` (8 total); the drift guard test strips the leading
`reference` and compares the 7 page slots to `getStory("story-6").illustrationSlots`
(PR-25's `TRIBUTE_SCENE_PAGE_IDS`). The `reference` anchor is NOT a registry slot —
same as Story 1. `illustrationCount` in the catalog is the registry's 7 (derived).

**`draftToSessionStory6` (mirror of `draftToSessionStory5`, NOT identical):** required
set is 8 (petName, species, breedColor, ownerNames, ageOrStage, favoriteRitual,
favoriteActivity, photo — pronoun-bearing narrative book). Optional-with-fallback
`quirks`/`stillLoves` AND non-optional `favoriteSpots`/`sleepingSpot` are all stored
as `""` when blank (the PR-25 variant layer's `hasSubstantial()` treats `""` as
"not provided" → stock fallback, never a MergeError); only genuinely-optional
`ownerMessage`/`nicknames`/`dateAdopted` are dropped as absent keys. `newStory6Draft`
pre-seeds `species:"dog"` + `illustrationStyle:"watercolor"` (the radio-default trap);
pronoun is NOT pre-seeded but is not in the required-8 (defaults in the bridge).

**The widenings/enumerations are all byte-safe additive** (same as PR-22/24):
`Order.inputs`/`OrderRow.inputs`/`AnySession` += `Story6Session` (type-only, no
mapper change); `email.ts` keepsakeNoun → story-6 falls to "book" (else, no diff
needed); `isStory1Draft` excludes story-6 so an OrderForm story6 draft narrows to
neither story1/story2; `COMPANION_PRODUCT_ID` has no story-6 key → null cross-link
(correct, no bundle); `LEMONSQUEEZY_VARIANT_STORY_6_TRIBUTE` resolves via the generic
`variantEnvName` (productId.toUpperCase().replace(/-/g,"_")). `STORY6_FIELD_FIX` is
`Record<Story6RequiredField, FieldFix>` so tsc forces all 8 keys.

The owner/letter operator steps mention story-5-not-story-6 but are CORRECT —
Story 6's STORY_6_STEPS is upload→pet→tribute→tone→generate (no owner/letter step),
and letter/page.tsx defensively excludes story-6 via `!isStory6Draft(draft)`. A grep
for "story-5 but not story-6" surfaces these as false positives — verify the step
list before flagging.

Verdict: PASS, no blockers. The boundary test needed no change (PR-25 already added
`lib/ai/story6-prompts` to the banned list).
