## 2026-06-14 — Story 8 (PR-B): "Amazing Adventures" Wizard, Storefront & Order Intake

**Feature 32** · branch `feature/story8-wizard` (merge `<MERGE_SHA>`) · makes Story 8
**creatable** (operator `/create` wizard) and **sellable** (public storefront + order
intake) — **completes Story 8 / Milestone 12.** **PR-B of 3.** PR-A (feature 31) proved
the engine produces a correct Adventure PDF from a `Story8Session`; PR-B builds the two
human-facing surfaces that *create* that session. Mirrors Story 7's PR-B (spec 29),
extended for Story 8's **two conditional reveals**. Per the reuse guarantee, the worker,
admin, delivery, and order state machine are untouched — orders flow by id; all
product-specific logic is dispatched (`isStory8` / `storyType === "story-8"`), never
mutated into shared code, and every existing book's PDF stays byte-identical.

### What shipped

**Wizard — 5 steps (`upload → pet → adventure → tone → generate`):**
- **NEW route `app/(operator)/create/adventure/page.tsx` (step 3):** the book's
  distinctive inputs — `superpower` (optional, fallback-derived), `favoriteActivity`,
  `quirks`, `childName` (conditional-required), `sidekickName` (pet-plus only),
  `nicknames`. The step gates on **no** step-local required field (mirrors Story 7's
  `homecoming` step) — see the dead-end fix below.
- **`pet` (step 2) reused as-is** — Story 8 is a narrative book (keeps pronoun +
  illustration-style choice); only the continue href branches to `/create/adventure`
  for `story-8`.
- **`tone` (step 4) — `Story8Tone()` sub-component:** `adventureTheme` (only the
  authored **backyard-mystery** offered + a "more adventures coming soon" note — no
  un-authored themes selectable), `heroCount` (**pet-plus** default / pet-solo),
  `childAgeBracket` (3-5 / **6-8** / 9-12).
- **`generate` (step 5):** `STORY8_FIELD_FIX` required-field map + 5-step count/label +
  latency-honest copy (Story 8 is the slowest book — Approach B is sequential).

**The two conditional reveals:**
1. `childName` is **required when `heroCount = pet-plus`** (the default), optional under
   `pet-solo`. Enforced at the **generate step** (where `heroCount` is already chosen),
   not step 3 — the fix for the review-caught dead-end.
2. `sidekickName` only applies in `pet-plus`; hidden in the UI and dropped/ignored on
   the bridge under `pet-solo`.

**Draft → session bridge & validation:**
- `lib/session/draft.ts` — `Story8RequiredField`, `missingRequiredFieldsStory8`
  (required: petName/species/breedColor/photo; conditional `childName` under pet-plus),
  `draftToSessionStory8` (optional-with-fallback `superpower`/`favoriteActivity`/`quirks`
  stored `""`; `sidekickName`/`nicknames`/`childName`-under-pet-solo dropped when blank;
  stale `sidekickName` ignored under pet-solo), `isStory8Draft`, both dispatchers wired
  (the PR-A "not yet creatable" throws removed).
- `app/(operator)/api/session/route.ts` — `validateStory8` + dispatcher branch;
  snake_case codes `missing_pet_name` / `missing_species` / `missing_breed_color` /
  `missing_photo`, plus `missing_child_name` **only under pet-plus**.
- Seam files widened: `lib/session/storage.ts` (`newStory8Draft` + overload),
  `lib/session/disk.ts` (`AnySession`).

**Storefront & order intake:**
- `lib/catalog/products.ts` — `story-8-adventure` product via `buildProduct`;
  `PLACEHOLDER_STORY_8_PRICE_USD = 3400` ($34 launch); title/tagline/description from
  the master template's customer-facing description (lead with the real-photo-likeness
  differentiator vs breed-picker competitors); `sampleImages` set; `lsVariantId`
  undefined (server-resolved at checkout); `illustrationCount` **derived** (= 10).
- `app/(public)/order/[productId]/OrderForm.tsx` — `Story8Fields` branch (narrative,
  **not** letter): adventure inputs + hero-count/age toggles + the same two conditional
  reveals, posting to the unchanged product-agnostic `/api/order`.
- `app/(public)/page.tsx` + `page.module.css` — the catalog's most playful landing
  story-picker card (`.chooserCardAdventure`, distinct accent, "A joyful adventure
  starring your pet"), links to `/books/story-8-adventure`, seeds `newDraft("story-8")`.
- `components/wizard/illustrationLabels.ts` — `ADVENTURE_ILLUSTRATION_SLOTS`
  (`reference` + 10 = 11) + `story8LabelsFor` (playful action labels) + dispatch.
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union widened with
  `Partial<Story8Adventure>` / `Partial<Story8Toggles>`.
- `components/preview/BookPreview.tsx` — confirmed Story 8 stays out of the `isLetter`
  set (narrative facing-spread) + fallback filename.
- `app/(operator)/api/generate-illustrations/route.ts` — `"story-8"` added to
  `REFERENCE_ANCHOR_STORIES` (all 10 slots reference-anchored → progress counts
  `slots + 1 = 11`).
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_8_ADVENTURE` (non-secret runtime
  config, server-resolved at checkout).

### Review-caught fix — the operator wizard dead-end

Code review found a trap in the spec's "simplest" suggestion: `childName` was
hard-gated on step 3 using the **defaulted** `heroCount = pet-plus`, but the
`heroCount` toggle that relaxes it lives on step 4 (`tone`) — unreachable until step 3
passes. A first-time operator wanting a `pet-solo` book was stuck. **Fix:** step 3 no
longer blocks on `childName`; the conditional requirement is enforced at the generate
step (step 5), where `heroCount` is known — and the step-3 hint was rephrased honestly.
This mirrors Story 7's `yearsHome` (its `homecoming` step likewise doesn't gate the
tone-step field). Also hardened: `lib/ai/story8-prompts` added to `FORBIDDEN_LOCAL` in
`lib/runtime/surface.boundary.test.ts` (defense-in-depth drift-guard carried from PR-A).

### Verification

- **Unit tests** (1756 passed, 83 files): `draft.test.ts` (conditional `childName`
  gate, optional-with-fallback, optional-omit, pet-solo sidekick ignore, `isStory8Draft`,
  round-trip with zero surviving `[FIELD]`), `route.test.ts` (`validateStory8` codes +
  `missing_child_name` only under pet-plus), `products.test.ts` (product exists, derived
  count = 10, price 3400), `illustrationLabels.test.ts` (11 slots + labels). One symmetry
  test added (per-field `species` gate, matching Story 2/4 suites).
- **Reviews:** code-review clean after the dead-end fix; **commerce-security PASS,
  zero blockers** (trust boundary empty-diff — order route / state machine / Supabase
  clients / webhook untouched; orders flow by id; spend guard intact); **context-audit
  IN SYNC**.
- **Browser QA PASS** ($0 spend): landing card → 5-step wizard → both hero-count paths
  (the dead-end fix confirmed both ways) → tone toggles → storefront `/books` +
  `/order` render narrative-styled. Superpower fallback + no-`[FIELD]`-leak verified at
  $0 via the text engine (71/71). End-to-end **likeness spot-check NOT run** (no
  reusable ready session → would be fresh paid generation; skipped per the cost rule —
  PR-0's gate already proved likeness).
- `npm run build`, `npm run test:run`, `npx tsc --noEmit`, the public-boundary test all
  green; existing books' PDFs byte-identical (no template touched).

### Outstanding (manual ops, out of code scope)
1. **Lemon Squeezy** — create the Story 8 product/variant at **manual fulfilment**,
   price `3400`; record its id in `LEMONSQUEEZY_VARIANT_STORY_8_ADVENTURE` on the public
   host. PM price confirmation before go-live.
2. **Sample JPEGs** — `public/samples/story-8-adventure/adventure-cover.jpg` +
   `adventure-leap.jpg` (Low-tier ~800px) are referenced by `sampleImages` but not yet
   produced; the storefront card shows broken images until they land.
