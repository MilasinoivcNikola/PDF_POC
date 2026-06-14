---
name: story8-wizard-seams
description: feature 32 PR-B Story-8 wizard+storefront seams — the two conditional reveals (childName gated on pet-plus, sidekickName ignored under pet-solo), the 4 test areas, the species draft-gate gap I closed
metadata:
  type: project
---

Feature 32 (PR-B) made Story-8 ("The Amazing Adventures of [PET_NAME]") creatable + sellable. Audited the impl agent's tests; coverage was already strong across all 4 spec areas — I added one gap.

**The two conditional reveals (the load-bearing logic):**
- **childName** is conditionally required: required ONLY under `heroCount = pet-plus` (the default), optional under `pet-solo`. The gate reads `draft.toggles.heroCount ?? DEFAULT_HERO_COUNT`, so an *absent* heroCount also requires childName. Tested at both layers (draft `missingRequiredFieldsStory8` + route `missing_child_name`), incl. the heroCount-undefined branch.
- **sidekickName** is ignored under pet-solo even if present (`draftToSessionStory8` drops it via `heroCount === "pet-plus" && present(sidekickName)`). Tested: "IGNORES a stale sidekickName under pet-solo".

**Optional-field tri-state (same shape as Story 7 quirks):** superpower/favoriteActivity/quirks are optional-with-fallback → stored as `""` when blank (NOT dropped). sidekickName/nicknames/childName-under-pet-solo are optional-omit → key dropped when blank. Don't conflate the two.

**The 4 test areas (all colocated, all green):**
1. `lib/session/draft.test.ts` — Story-8 block starts ~line 2856. missingRequiredFieldsStory8 (conditional childName), draftToSessionStory8 (tri-state above, pet-solo handling, toggle defaults backyard-mystery/pet-plus/6-8), isStory8Draft, dispatchers, round-trip through resolveStory8 (no `[FIELD]` leak).
2. `app/(operator)/api/session/route.test.ts` — Story-8 block ~line 1313. validateStory8 per-field snake_case codes + `missing_child_name` only under pet-plus; disk write MOCKED (writeSessionMock).
3. `lib/catalog/products.test.ts` — story-8-adventure: illustrationCount===10 (DERIVED via getStory("story-8").illustrationSlots.length, not literal), price 3400, lsVariantId undefined.
4. `components/wizard/illustrationLabels.test.ts` — ADVENTURE_ILLUSTRATION_SLOTS = reference + 10 = 11; drift guard strips reference and compares to registry; every slot resolves a non-empty label.

**Gap I closed:** draft.test.ts had per-field gates for petName/breedColor/photo/childName but NOT `species` (which IS a `Story8RequiredField`). species is pre-seeded "dog" by `newDraft("story-8")` so the fresh-draft test correctly omits it — but the per-field symmetry (Story 2/4 have it) was missing. Added "reports only species when just the (pre-seeded) species is cleared". The route layer already tested missing_species.

Final: `npm run test:run` → 1756 passed, 83 files. No mocks beyond the existing disk mock; no OpenAI/Puppeteer touched.
