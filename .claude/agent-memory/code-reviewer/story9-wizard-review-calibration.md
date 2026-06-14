---
name: story9-wizard-review-calibration
description: feature 34 / Story-9 PR-B wizard/storefront/order — clean PASS; the babyName-never-required gate-at-generate goal is met at all four layers; root-level baby fields merge cleanly
metadata:
  type: feedback
---

Story 9 PR-B ("[PET_NAME] and the New Baby" creatable + sellable) — reviewed clean, PASS,
no blockers. The mechanical "make a narrative book creatable + sellable" family again (see
[[story5-wizard-review-calibration]] / [[story4-wizard-review-calibration]]): `|| isStory9`
widenings + `isStory9 ? <new> : <existing>` three-way ternaries, existing strings verbatim,
full test:run green (496 in the targeted set incl. boundary test). Story 9 is a NARRATIVE
book like Story 1/6/7/8 → KEEPS pronoun + illustrationStyle, EXCLUDED from `isLetter`,
INCLUDED in `isLiving` and `REFERENCE_ANCHOR_STORIES` (8 images = ref + 7 slots).

**The load-bearing goal (verified met at ALL FOUR layers — don't re-flag):** `babyName` is
NEVER a required field. Confirmed: (1) `missingRequiredFieldsStory9` omits it (required set
is 7: petName/species/breedColor/ownerNames/favoriteActivity/sleepingSpot/photo); (2) the
`/create/baby` step has NO Continue gate (StepShell always advances); (3) generate-step gate
+ (4) public `/api/order` both reuse `missingRequiredFieldsForDraft` → routes to the same
story-9 fn. So an `expecting`/blank-name order completes and degrades to "the new baby" (the
variant layer, PR-A, drives name usage off `babyStatus`). Same gate-at-generate idiom as
Story 7's yearsHome / Story 8's childName.

**Root-level optional fields are the one structural novelty:** `babyName`/`babyArrival` sit
on the session/draft ROOT (not in a group, since they describe the baby not the pet).
`DraftPatch` gained both as top-level optional strings; `WizardProvider.updateDraft` applies
them with `if (patch.babyName !== undefined) merged.babyName = ...` (only when named, so an
unrelated patch never injects them onto another product's draft). `draftToSessionStory9`
DROPS them when blank (`...(present(x) ? {x: x.trim()} : {})`) rather than storing "" — so
merge never prints a dangling line. Verified no state-loss: toggles merge shallowly
(`...current.toggles, ...patch.toggles`) so a partial babyStatus patch preserves
otherPetsInHome.

**`illustrationCount` DERIVED (=7), not hardcoded** — `buildProduct` reads registry slots;
test asserts `product.illustrationCount === getStory("story-9").illustrationSlots.length === 7`.
The checklist `NEWBABY_ILLUSTRATION_SLOTS` (ref + 7 baby-* page slots = 8) re-declares the page
ids locally to stay client-safe; drift guard asserts slice(1) === registry slots.

**Commerce touches are type-only (same as every prior book PR):** `Order.inputs` union +
`AnySession` (disk.ts) + the session-route `validateStory9` branch. No worker/admin/Supabase/
state-machine change — the reuse guarantee holds. Public `/api/order` needed NO edit (generic
dispatcher-driven).

**Non-issue (don't raise):** `public/samples/story-9-newbaby/` does not exist — but
`story-8-adventure` samples are ALSO absent, so shipping a catalog entry whose `sampleImages`
point at not-yet-added files is the established precedent, not a PR-B regression. Storefront
nice-to-have at most; likely already tracked in debt.
