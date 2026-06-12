---
name: story5-text-seams
description: PR-23/24 Story-5 ("A Letter to [PET_NAME]") testable seams — the draft→session bridge, /api/session validation, catalog, editable-fields, illustration slots; and the quirks-optional divergence from Story 2
metadata:
  type: project
---

Story 5 ("A Letter to [PET_NAME]") is the owner→pet companion of Story 2 (single past tense, cover + 5 letter pages). Authored PR-23 (text/registry/imagery), made creatable+sellable PR-24 (wizard/storefront/order).

**The load-bearing divergence from Story 2 — `quirks` is optional-with-fallback for Story 5.**
- Required set = **6** (`petName, ownerNames, species, photo, favoriteRitual, favoriteSpots`) — ONE fewer than Story 2/4. `quirks`, `lastGoodDay`, `whatIKeep` are all optional.
- `draftToSessionStory5` stores a **blank `quirks` as `""`** (key present), NOT dropped — so the variant layer's stock Page-3 line fires. (Contrast: `lastGoodDay`/`whatIKeep`/nicknames/dates are DROPPED when blank — key absent.) Assert the actual `""` behavior.
- `/api/session` `validateStory5` does NOT validate quirks → a body with blank quirks must be **accepted** (proves validateStory5 ran, not validateStory2/4 which reject it). This is the cross-product dispatch discriminator test.

**Testable seams (all pure / disk-mocked, $0):**
- `lib/session/draft.ts` — `missingRequiredFieldsStory5` / `draftToSessionStory5` / `isStory5Draft` + dispatchers. Round-trip via `resolveStory5` from `@/lib/story/story5/variants` (line ~440). Tests in `lib/session/draft.test.ts`.
- `app/(operator)/api/session/route.test.ts` — Story-5 validation branches, `writeSession` mocked at `@/lib/session/disk`. Error codes: `missing_pet_name/_species/_photo/_owner_names/_favorite_ritual/_favorite_spots` (no `_quirks`). House shape `{ok:false,error}`.
- `lib/catalog/products.test.ts` — `story-5-letter-to` / storyType `story-5` / `priceUsd 2900` / `illustrationCount === getStory("story-5").illustrationSlots.length` (=2, derived not literal).
- `components/wizard/illustrationLabels.test.ts` — `NOTE_ILLUSTRATION_SLOTS` (`note-cover`, `note-page-5`) drift-guard vs registry; `illustrationSlotsFor("story-5")`; owner-toned labels ("...as you remember them" / "A soft wash for where you keep them").
- `lib/story/story5/editable-fields.test.ts` — **PR-23 did NOT add this; PR-24 test-author created it.** 5 editable fields (petName/ownerNames/quirks/favoriteRitual/favoriteSpots — quirks IS editable+required on preview despite optional-in-bridge; favoriteActivity/lastGoodDay/whatIKeep NOT editable). Page map: note-cover→names, note-page-3→quirks+favoriteRitual, note-page-5→favoriteSpots. Fixture `murphySession5()` from `lib/story/story5/fixtures.ts`.

**Fixtures:** `newDraft("story-5")` pre-seeds `species:"dog"` + `illustrationStyle:"watercolor"` + `beliefFrame:"rainbow-bridge"` (so fresh draft missing 5, not 6). Story-5 toggles = `{deathType, beliefFrame}` only (no giftFor/newPet/livingOrMemorial).

PR-24 test delta: +62 (1196→1258). No impl bugs found; spec's "drops blank quirks" wording is imprecise — impl stores `""`, which is correct (variant fallback needs the key present).
