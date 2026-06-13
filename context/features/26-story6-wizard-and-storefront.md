# 26 — Story 6: Wizard, Storefront & Order Intake

> **Craft Area:** 3 — App/UI (+ commerce) · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 10 — Story 6 ("While You're Still Here, [PET_NAME]") · **Phase:** 2 (PR 2 of 2 — completes Story 6) · **Depends on:** 25
> **Branch:** `feature/story6-wizard`

## Status

Not Started

## Goals

- Make Story 6 **creatable** (the operator wizard) **and sellable** (a public storefront listing + order form) end to end — landing → wizard / order → generate → preview → download — reusing the whole commerce loop (intake → pay → worker → admin → delivery) **by id, with zero infra change**.
- Collect the living-tribute fields: the new `ageOrStage` / `stillLoves` / `ownerMessage`, the reused pet (incl. **pronoun + style**, like Story 1) + owner + memory fields, and the `transitionFrame` / `otherPetsInHome` toggles.
- **Merchandise Story 6 as the catalog's one *living* keepsake** — the only book made *before* a pet dies. Present it distinctly from the four after-loss titles, not grouped with them.
- **Stories 1, 2, 4 and 5 stay behaviorally unchanged.**

## Scope

**In scope**
- `lib/session/draft.ts` — `missingRequiredFieldsStory6`, `draftToSessionStory6`, `isStory6Draft`; extend the dispatchers (`missingRequiredFieldsForDraft` / `draftToSessionForDraft`). **Required set: `petName`, `species`, `breedColor`, `ownerNames`, `ageOrStage`, `favoriteRitual`, `favoriteActivity`, `photo`** (8). `stillLoves` / `quirks` / `favoriteSpots` / `sleepingSpot` / `ownerMessage` / `nicknames` / `dateAdopted` are dropped-when-blank (the optional-with-fallback fields the variant layer covers — PR 25 owns the fallbacks).
- `app/(operator)/api/session/route.ts` — `validateStory6` + per-`storyType` dispatch (house JSON shape, `isSafeSessionId` guard preserved; Story 1/2/4/5 branches byte-identical).
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union += `Story6Memories` / `Story6Toggles` groups (+ the reused `Owner` group); per-group shallow-merge handles story-6.
- **Wizard steps** (`app/(operator)/create/*`):
  - **`pet` (story-6 variant): keep pronoun + illustration style + breedColor** (Story 6 is a narrative book like Story 1) — **do NOT** fold story-6 into the existing `isLetter` field-drop branch (that branch drops pronoun/style for the letter books). Add the new `ageOrStage` field here.
  - **`tribute` (new step):** `ownerNames`, optional `ownerMessage`, `quirks`, `stillLoves`, `favoriteActivity`, `favoriteRitual`, `favoriteSpots`, `sleepingSpot`, optional `nicknames` / `dateAdopted` — gently-worded, present-tense framing.
  - **`tone` (story-6 variant):** `transitionFrame` (`still-here` default / `road-ahead`) + `otherPetsInHome` only — no death/belief/gift/living-memorial toggles. (`STORY_6_STEPS = upload → pet → tribute → tone → generate` was added in PR 25; the exact split between `tribute`/`tone` is adjustable — keep new fields on a coherent step.)
- **Story-aware generation progress:** `components/wizard/illustrationLabels.ts` (story-6 slots = `reference` + the 7 `tribute-*` ids, warm present-tense labels, + the registry-drift guard against `getStory("story-6").illustrationSlots`) and `components/wizard/GenerationProgress.tsx` (story-6 subtitle + cost footer ~$0.05 for 8 images — **8 slots, not 14 / 2**).
- **Landing picker** (`app/(public)/page.tsx`) — a fifth card → `/books/story-6-tribute`, framed as **the living tribute** ("for a pet who is still here"), set apart from the after-loss titles.
- **Catalog** (`lib/catalog/products.ts`) — `PLACEHOLDER_STORY_6_PRICE_USD` (= `3200`, **$32** — the template prices Story 6 at the **top of the band ($32–35)**; PM confirms the exact number before the LS variant) + `buildProduct("story-6-tribute", "story-6", {...})`. Marketing copy from the master template's customer-facing description **minus the final memorial paragraph** (we're not building that). `illustrationCount` **derived** from the registry (= 7) — do not set it.
- **Public order form** (`app/(public)/order/[productId]/OrderForm.tsx`) — a `Story6Fields` component + story-6 seeding/dispatch (`isStory6Draft`, `newDraft("story-6")`, `draftToSessionForDraft`). Keeps pronoun + style fields (narrative book).
- **Preview / download surface (the key narrative-book difference):** `components/preview/BookPreview.tsx` — Story 6 renders the **facing-page spread** (the Story-1 default path), **not** the single-column letter. Confirm the `isLetter` check does **not** classify story-6 (it falls to the spread `else`), and that the spread + per-page regenerate + inline edit work for a 7-slot narrative book. `lib/delivery/email.ts` — noun "book" for story-6. Inline edit/preview are registry-driven (PR 25's `editable` contract) — **no route change**.
- **Samples** — `public/samples/story-6-tribute/` (cover + a couple of scene frames, web-optimized ~800px JPEG, pulled from PR 25's Low run), referenced in the catalog's `sampleImages`.
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_6_TRIBUTE` (non-secret, resolved server-side at checkout).
- `lib/order/types.ts` — widen `Order.inputs` to admit `Story6Session` (type-only, as PR 22/24 did for Story 4/5); confirm `lib/order/store.ts` row mapper + `lib/session/disk.ts` `AnySession` follow.
- `lib/runtime/surface.boundary.test.ts` — `lib/ai/story6-prompts` added to the engine modules banned from the public graph; confirm no new public page/route entry is needed (dynamic `/books/[productId]`, `/order/[productId]` already covered).

**Out of scope**
- **The memorial re-render / second-life path — dropped entirely per PM (2026-06-12).** No re-order flow, no order-reopen, no `truth` layout, no `DEATH_TYPE`/`BELIEF_FRAME`.
- The **manual** Lemon Squeezy product/variant setup (manual-fulfilment) + final price confirmation + the live test-mode purchase — a documented go-live step, not code.
- Re-send / order-lookup flows (post-MVP, never built for any product).

## Implementation notes

**Key decisions**
- **First narrative-spread storefront book** — Story 6's preview reuses Story 1's facing-page **spread**, not the single-column letter (Stories 2/4/5). The only `BookPreview` change is ensuring story-6 is **not** classified `isLetter` so it falls into the existing spread branch; the spread/regenerate/edit stack then works unforked for a 7-slot book.
- **Pet step keeps pronoun + style** — unlike the letter books, Story 6 is narrative (Story-1-shaped inputs). Generalize carefully: the `isLetter` branch must exclude story-6.
- **Priced at the top of the band ($32–35).** The template justifies it (highest emotional weight, near-uncontested concept, the photo-likeness differentiator). Placeholder `3200` ($32); PM confirms the exact number, and the catalog `priceUsd` must match the LS variant price.
- **Living tribute is conceptually distinct** (made *before* loss). Merchandise it as such on the landing page — its own framing, not lumped with the after-loss catalog.
- **The whole commerce loop is reused by id** — `orderId === sessionId` locally; the worker (PR-07), admin (PR-08), and delivery (PR-09) generate / approve / deliver `story-6` (8 images = reference + 7) with **no edit** (the new-book reuse guarantee). The only commerce touch is the `Order.inputs` union widen.
- Match the warm editorial tone; **reuse** `.field` / `.radio-option` / `.upload-zone` / `.steps` / `.style-grid` — don't fork the design system.

**Files**
- `lib/session/draft.ts` · `app/(operator)/api/session/route.ts`
- `components/wizard/WizardProvider.tsx` · `app/(operator)/create/{pet,tribute,tone,generate,preview}/page.tsx`
- `components/wizard/illustrationLabels.ts` · `components/wizard/GenerationProgress.tsx`
- `app/(public)/page.tsx` · `app/(public)/order/[productId]/OrderForm.tsx`
- `lib/catalog/products.ts` · `components/preview/BookPreview.tsx` · `lib/delivery/email.ts`
- `lib/order/types.ts` · `lib/order/store.ts` · `lib/session/disk.ts` (union widen)
- `public/samples/story-6-tribute/*` · `.env.local.example` · `lib/runtime/surface.boundary.test.ts`

## References

- @context/masterstories/story-6-master-template.md — the exact fields + the `TRANSITION_FRAME` toggle to collect, the customer-facing product description (use paras 1–3, **drop the memorial para 4**), the pricing ($32–35, top of band), and the "celebrate, never pre-bury" tone bar. **Memorial-conversion sections are out of scope.**
- @context/new-book-playbook.md — Step 2 (draft→session/wizard/picker wiring), Step 4 (catalog), Step 5 (LS variant env var), Step 6 (samples) + the standing guards.
- @context/features/22-story4-wizard-and-storefront.md + @context/features/24-story5-wizard-and-storefront.md — the closest wizard/storefront/order precedents (the draft bridge, per-`storyType` validation, landing card, catalog entry, `Order.inputs` widen, boundary test).
- @context/features/08-wizard-ui.md + @context/features/10-preview-and-pdf-download.md — the **narrative-book** wizard (pronoun + style fields) + the **facing-page spread** preview Story 6 reuses (not the letter single-column).
- @context/features/04-public-storefront.md, @context/features/05-order-intake-and-photo-upload.md, @context/features/06-lemonsqueezy-checkout-and-webhook.md — the public storefront / order / checkout surface to extend.

## Done when

- [ ] The landing page offers Story 6 as the living tribute ("for a pet who is still here"), set apart from the after-loss titles; `/books` lists `story-6-tribute` at the configured price; the detail page shows the **7**-illustration count (derived).
- [ ] The Story-6 wizard collects every field incl. the new `ageOrStage` / `stillLoves` / `ownerMessage` and the `transitionFrame` / `otherPetsInHome` toggles, **keeps pronoun + illustration style** (narrative book), persists across refresh (same id), gates the 8 required fields, and writes a valid `Story6Session` (no `child`, no `deathType`/`beliefFrame`).
- [ ] The **public order form** creates a `pending_payment` order with the `Story6Session` inputs + photo in Supabase — **no generation, no charge**.
- [ ] Generate shows the **8**-slot checklist (reference + 7 `tribute-*`), **not** 14 / 2; the Strict-Mode double-POST stays a single run (TOCTOU guard).
- [ ] Preview renders the **facing-page spread** (not single-column) with the real reference-anchored watercolors; **Download → `While-Youre-Still-Here-[PET_NAME].pdf`** (8 pages, Letter); inline edit + per-page regenerate work.
- [ ] **Stories 1, 2, 4 and 5 are unchanged** end to end (wizard, storefront, order, preview, download — still 14 / 2 / 2 / 2 images, correct filenames).
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test passes; commerce-security review clean.

## Tests

- `test-author`: per-story `missingRequiredFieldsStory6` + `draftToSessionStory6` (order, whitespace-as-missing, defaults/trim, optional-drop, throw) + a `resolveStory6(draftToSessionStory6(...))` round-trip smoke test (a blank-`quirks`/`stillLoves` draft resolves without `MergeError` — proving the dispatch hit the right branch); `/api/session` story-6 validation branches (disk mocked); catalog products test (+ the `story-6-tribute` entry, `illustrationCount` = 7 derived from the registry, unique id/storyType); story-6 `editable-fields`; `illustrationLabels` story-6 slots/labels + the registry-drift guard.
- `qa` (reuse PR 25's on-disk book → **$0** for the preview/download/regression checks): drive the Story-6 wizard in a browser (refresh-persistence, the 8 required gates, the new fields + toggles, pronoun/style present) → Generate (idempotent, **8** slots not 14) → preview **spread** (not single-column) → download `While-Youre-Still-Here-[…].pdf`; the public order form writes a `pending_payment` row against the **local** Supabase stack ([[supabase-local-verify]]); Stories 1/2/4/5 regression (still 14 / 2 / 2 / 2 images, correct filenames). Any live repaint is the one sanctioned Low spend ([[qa-low-tier-cost-control]]).
- `commerce-security`: the public order-form + checkout-config + PII path (service-role boundary, server-minted order id, no spend-before-payment, no secret/PII leak; the two sample JPEGs PII-clean) — the reason this is its own PR.
