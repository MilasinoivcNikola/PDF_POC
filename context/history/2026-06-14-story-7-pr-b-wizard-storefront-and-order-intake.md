## 2026-06-14 — Story 7 (PR-B): "Welcome Home" Wizard, Storefront & Order Intake

**Branch:** `feature/story7-wizard` (0e9bcd2, merge 28d4fb0)
**Spec:** [context/features/29-story7-wizard-and-storefront.md](../features/29-story7-wizard-and-storefront.md)
**Master template:** [context/masterstories/story-7-master-template.md](../masterstories/story-7-master-template.md)

### What shipped

PR-B of 2 for **Story 7 — "Welcome Home, [PET_NAME]'s Gotcha Day"** — **completes Story 7**
(Milestone 11). PR-A made the engine produce a correct Welcome Home PDF from a
`Story7Session`; PR-B builds the two human-facing surfaces that *create* that session: the
**operator `/create` wizard** and the **public storefront order form**. Per the reuse
guarantee, nothing in the worker, admin, delivery, or order state machine changed — orders
flow **by id**, and every product-specific path is **dispatched** on `storyType === "story-7"`
/ `isStory7Draft`, never mutated into shared code. Mirrors the Story 5 (PR-24) / Story 6
(PR-26) PR-B split, extended for Story 7's larger field set and one conditional reveal.

**Wizard** — 5 steps `upload → pet → homecoming → tone → generate`:
- `app/(operator)/create/homecoming/page.tsx` (NEW) — step 3: 3 required (`ownerNames`,
  `favoriteActivity`, `sleepingSpot`) gating Continue + 6 optional (`homecomingMemory`,
  `quirks`, `childName`, `familyMembers`, `nicknames`, `dateAdopted`), with blank-fallback
  notices on the memory/quirks textareas.
- `create/pet/page.tsx` — `story-7` continue-href branches to `/create/homecoming`
  (narrative book; reuses Story 1's pet fields, pronoun + illustration-style choice, no new
  fields).
- `create/tone/page.tsx` — `Story7Tone()`: `occasion` (new-arrival default /
  gotcha-day-anniversary) with the **conditional numeric `yearsHome` reveal** (shown +
  required only on anniversary; `yearsHome: ""` cleared on toggle-back so a stale value can't
  leak), `adoptionSource` (shelter default + 4), `lifeStage` (puppy-kitten / adult default /
  senior-adoption).
- `create/generate/page.tsx` — `story-7` required-field map + step count/label.

**Draft → session bridge & validation:**
- `lib/session/draft.ts` — `Story7RequiredField`, `missingRequiredFieldsStory7` (incl. the
  conditional `yearsHome` gate), `draftToSessionStory7` (required throw; `quirks` /
  `homecomingMemory` store `""` when blank → variant fallback fires; `childName` /
  `familyMembers` / `nicknames` / `dateAdopted` dropped when blank), `isStory7Draft`, and the
  `missingRequiredFieldsForDraft` / `draftToSessionForDraft` dispatchers.
- `lib/session/storage.ts` — `newStory7Draft()` + the `newDraft("story-7")` overload
  (off-spec but mandatory — `newDraft` was otherwise returning a Story-1 shape).
- `lib/session/disk.ts` — `AnySession` widened with `Story7Session` (the third inputs-union).
- `app/(operator)/api/session/route.ts` — `validateStory7` + POST dispatcher branch;
  snake_case codes incl. `missing_years_home` enforced only on the anniversary toggle.

**Storefront & order intake:**
- `lib/catalog/products.ts` — `buildProduct("story-7-welcome", "story-7", …)`,
  `PLACEHOLDER_STORY_7_PRICE_USD = 2900` ($29 launch rec), `illustrationCount` **derived**
  (= 8) from the registry, copy lifted from the template's customer-facing description.
- `app/(public)/order/[productId]/OrderForm.tsx` — `Story7Fields` branch (the largest public
  field set so far: narrative pet + owner names + the homecoming memories + the 3 toggles +
  the conditional `yearsHome` reveal + email/photo). Treated as **narrative, excluded from
  the `isLetter` set**. POSTs to the unchanged product-agnostic `/api/order`.
- `app/(public)/page.tsx` + `page.module.css` — the catalog's **first joyful** landing
  story-picker card (`chooserCardJoyful` gold-morning accent, "Welcome home · a gotcha-day
  book"), distinct from the grief titles; seeds `newDraft("story-7")`.
- `components/wizard/illustrationLabels.ts` — `WELCOME_ILLUSTRATION_SLOTS` (reference + 8 =
  9) + warm present-tense labels + dispatch.
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union widened with
  `Partial<Story7Memories>` / `Partial<Story7Toggles>`.
- `components/preview/BookPreview.tsx` — confirmed Story 7 lands in the narrative
  facing-spread branch (not letter); `Welcome-Home.pdf` fallback filename.
- `app/(operator)/api/generate-illustrations/route.ts` — added `"story-7"` to
  `REFERENCE_ANCHOR_STORIES` (count = `slots + 1 = 9`), paying off the feature-28 debt row.
- `app/globals.css` — styled `.field input[type="number"]` to match the borderless-underline
  text fields and dropped the native spinner (fixes the anniversary "years home" input, which
  had fallen through to the browser default). Single-sourced, so it corrects both the wizard
  tone step and the public order form at once.
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_7_WELCOME`.

### Tests & verification

- **Unit** (verified, none needed adding): `draft.test.ts` (conditional `yearsHome` both
  directions, fallback-`""` vs optional-omit, `isStory7Draft`, a `resolveStory7` round-trip
  asserting zero surviving `[FIELD]`), `route.test.ts` (every missing-field code +
  `missing_years_home` only on anniversary), `products.test.ts` (exists, derived
  `illustrationCount === 8`, price `2900`), `illustrationLabels.test.ts` (9 slots,
  drift-guarded, label per slot). Full suite **1617 pass / 78 files**; `tsc --noEmit` clean;
  `npm run build` green (`/order/[productId]` SSGs 6 product paths).
- **Browser QA (PASS, $0 spend)** — joyful landing card → 5 steps; required-field gating;
  the `yearsHome` reveal/clear/gate; adoption-source Page-3 sentences (thank-you line only
  for shelter/rescue/stray); the **"1 year" singular** anniversary framing; blank-optional
  fallbacks with no `[FIELD]` leaks; `/books/story-7-welcome` ($29, 8 illustrations) and the
  order form's validation + server-side accept. Merge/variant correctness checked server-side
  via `/api/preview` on seeded fixtures (no paid generation).
- **Reviews** — code review PASS (no findings), security review PASS (no HIGH/MEDIUM; public
  boundary engine-free, spend guard intact, free-text fields inert, secret non-`NEXT_PUBLIC`),
  context audit IN SYNC.

### Carried forward (see `context/debt.md`)

- **Storefront samples are placeholders** (Story-6 copies) — real Low-tier Welcome Home art
  (incl. the figure-free empty-house page + a peak-joy page) needed before launch.
- **Lemon Squeezy** — the 6th variant (`LEMONSQUEEZY_VARIANT_STORY_7_WELCOME`) + final PM
  price confirmation, folded into the existing LS-setup row.
- **Gotcha-day demand is a hypothesis** — inferred from the broader personalized-pet-book
  category, not a named competitor; validate with early Story 7 sales.

### Notes

- The feature-28 `REFERENCE_ANCHOR_STORIES` debt row is now paid off and removed.
- CLAUDE.md cleanup: the Story 7 masterstory moved out of the always-loaded `@` set into the
  load-on-demand list (milestone complete).
- A local-env seam surfaced in QA (not a feature bug): a fully-valid order failed only at the
  cloud-Supabase Storage upload because local `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
  mis-set to a JWT value — shared by all products, so the order-row write is
  unverified-in-browser locally. Covered by the existing PR-05 order-intake tests.
