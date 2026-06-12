# 24 — Story 5: Wizard, Storefront & Order Intake

> **Craft Area:** 3 — App/UI (+ commerce) · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 9 — Story 5 ("A Letter to [PET_NAME]") · **Phase:** 2 (PR 2 of 2 — completes Story 5) · **Depends on:** 23
> **Branch:** `feature/story5-wizard`

## Status

Not Started

## Goals

- Make Story 5 **creatable** (the operator wizard) **and sellable** (a public storefront listing + order form) end to end — landing → wizard / order → generate → preview → download — reusing the whole commerce loop (intake → pay → worker → admin → delivery) **by id, with zero infra change**.
- Collect the two new fields (`lastGoodDay`, `whatIKeep`) on the letter step and the Story-5 toggles (`deathType`, `beliefFrame`) on the tone step.
- **Merchandise Story 5 as the companion of Story 2, never an either/or** — cross-link the two detail pages ("one from them, one from you"). The combined-price **bundle is out of scope** (net-new multi-product commerce).
- **Stories 1, 2 and 4 stay behaviorally unchanged.**

## Scope

**In scope**
- `lib/session/draft.ts` — `missingRequiredFieldsStory5`, `draftToSessionStory5`, `isStory5Draft`; extend the dispatchers (`missingRequiredFieldsForDraft` / `draftToSessionForDraft`). **Required set: `petName`, `ownerNames`, `species`, `photo`, `favoriteRitual`, `favoriteSpots`** (6 — one fewer than Story 2, because `quirks` is optional-with-fallback here). `lastGoodDay` / `whatIKeep` / `quirks` / `nicknames` / dates are dropped-when-blank.
- `app/(operator)/api/session/route.ts` — `validateStory5` + per-`storyType` dispatch (house JSON shape, `isSafeSessionId` guard preserved).
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union += `Story5Memories` / `Story5Toggles` groups; per-group shallow-merge handles story-5.
- **Wizard steps** (`app/(operator)/create/*`): generalize the existing "letter products" branches in `pet` / `generate` / `preview` to include story-5 (story-2 ∨ story-4 ∨ story-5 → drop child/pronoun, default style); extend the shared `owner` (reused as-is), `letter` (story-5 variant: `quirks` + `favoriteRitual` + `favoriteSpots` + `nicknames`/dates **+ the two new `lastGoodDay` / `whatIKeep`**, and **no** `favoriteActivity`), and `tone` (story-5 variant: **`deathType` + `beliefFrame` only** — no gift, no living/memorial, no new-pet) to be story-5-aware. (`STORY_5_STEPS` was added in PR 23.)
- **Story-aware generation progress:** `components/wizard/illustrationLabels.ts` (story-5 slots `note-cover` / `note-page-5` + owner-toned labels + the registry-drift guard) and `components/wizard/GenerationProgress.tsx` (story-5 subtitle + 2-image cost footer ~$0.02).
- **Landing picker** (`app/(public)/page.tsx`) — a fourth card → `/books/story-5-letter-to`, presented beside Story 2 ("one from them, one from you").
- **Catalog** (`lib/catalog/products.ts`) — `PLACEHOLDER_STORY_5_PRICE_USD` (= `2900`, $29) + `buildProduct("story-5-letter-to", "story-5", {...})` (marketing copy from the master template's customer-facing description; `illustrationCount` **derived** from the registry — do not set it).
- **Companion cross-link** (storefront detail) — `app/(public)/books/[productId]/page.tsx`: surface a "companion: A Letter from [PET_NAME]" link on the Story-5 page and the reverse on Story 2. Copy-only; no cart, no bundle SKU.
- **Public order form** (`app/(public)/order/[productId]/OrderForm.tsx`) — a `Story5Fields` component + story-5 seeding/dispatch (`isStory5Draft`, `newDraft("story-5")`, `draftToSessionForDraft`).
- **Letter-surface generalization:** `components/preview/BookPreview.tsx` (the `isLetter` single-column + filename checks include story-5), `lib/delivery/email.ts` (noun "letter" for story-5). Inline edit/preview is registry-driven (PR 23's `editable` contract) — **no route change**.
- **Samples** — `public/samples/story-5-letter-to/` (cover + page-5 frames, web-optimized ~800px JPEG, pulled from PR 23's Low run), referenced in the catalog's `sampleImages`.
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_5_LETTER_TO` (non-secret, resolved server-side at checkout).
- `lib/runtime/surface.boundary.test.ts` — `lib/ai/story5-prompts` added to the engine modules banned from the public graph; confirm no new public page/route entry is needed (the dynamic `/books/[productId]`, `/order/[productId]` are already covered).

**Out of scope**
- The **Stories 2 + 5 companion bundle** (combined-price multi-product order) — net-new commerce work outside the reuse guarantee; a separate, PM-gated decision.
- The **manual** Lemon Squeezy product/variant setup (manual-fulfilment) + final price confirmation + the live test-mode purchase — a documented go-live step, not code.
- The "family" relationship option. Re-send / order-lookup flows (post-MVP, never built for any product).

## Implementation notes

**Key decisions**
- **Story 5 is its own storefront listing**, merchandised as Story 2's **companion** (cross-linked, "one from them, one from you"), never an alternative — the master template's #1 product risk is cannibalizing Story 2, mitigated in copy/placement, not by hiding it.
- **Preview + download for Story 5 are nearly free:** `/api/preview`, `/api/render-pdf`, `/api/update-text`, `/api/regenerate-illustration` are all registry-driven (features 14/16/17/19) — the only changes are the `BookPreview` / `email` letter-surface checks. No markup or route fork.
- **The whole commerce loop is reused by id** — `orderId === sessionId` locally; the worker (PR-07), admin (PR-08), and delivery (PR-09) generate / approve / deliver `story-5` with **no edit** (the new-book reuse guarantee). Confirm `lib/order/types.ts` `Order.inputs` already admits `Story5Session` (widen the union if not — a type-only touch, as PR 22 did for `Story4Session`).
- Match the warm editorial tone; **reuse** `.field` / `.radio-option` / `.upload-zone` / `.steps` / `.style-grid` — don't fork the design system.

**Files**
- `lib/session/draft.ts` · `app/(operator)/api/session/route.ts`
- `components/wizard/WizardProvider.tsx` · `app/(operator)/create/{pet,owner,letter,tone,generate,preview}/page.tsx`
- `components/wizard/illustrationLabels.ts` · `components/wizard/GenerationProgress.tsx`
- `app/(public)/page.tsx` · `app/(public)/books/[productId]/page.tsx` · `app/(public)/order/[productId]/OrderForm.tsx`
- `lib/catalog/products.ts` · `components/preview/BookPreview.tsx` · `lib/delivery/email.ts` · `lib/order/types.ts` (if widening)
- `public/samples/story-5-letter-to/*` · `.env.local.example` · `lib/runtime/surface.boundary.test.ts`

## References

- @context/masterstories/story-5-master-template.md — the exact fields + toggles to collect, the customer-facing product description, the pricing ($29 PDF; the bundle is out of scope), and the companion-merchandising requirement (Notes #7).
- @context/new-book-playbook.md — Step 2 (draft→session/wizard/picker wiring), Step 4 (catalog), Step 5 (LS variant env var), Step 6 (samples) + the standing guards.
- @context/features/22-story4-wizard-and-storefront.md — the closest precedent (the Story-4 wizard/storefront/order PR this mirrors almost exactly).
- @context/features/18-story2-wizard-and-story-picker.md — the wizard generalization + landing-picker pattern.
- @context/features/19-story2-preview-and-download.md — the registry-driven preview/download reuse.
- @context/features/04-public-storefront.md, @context/features/05-order-intake-and-photo-upload.md, @context/features/06-lemonsqueezy-checkout-and-webhook.md — the public storefront / order / checkout surface to extend.

## Done when

- [ ] The landing page offers Story 5 beside Story 2 ("one from them, one from you"); `/books` lists `story-5-letter-to` at `$29`; the detail page shows the 2-illustration count (derived) and cross-links to Story 2 (and vice versa).
- [ ] The Story-5 wizard collects every field incl. the two new `lastGoodDay` / `whatIKeep` and the `deathType` / `beliefFrame` toggles, persists across refresh (same id), gates the 6 required fields, and writes a valid `Story5Session` (no `child`, no `livingOrMemorial`/`giftFor`/`newPet`).
- [ ] The **public order form** creates a `pending_payment` order with the `Story5Session` inputs + photo in Supabase — **no generation, no charge**.
- [ ] Preview renders the letter single-column with the real cover portrait + figure-free belief wash; **Download → `Letter-to-[PET_NAME].pdf`**; inline edit + cover/page-5 regenerate work.
- [ ] **Stories 1, 2 and 4 are unchanged** end to end (wizard, storefront, order, preview, download).
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test passes; commerce-security review clean.

## Tests

- `test-author`: per-story `missingRequiredFieldsStory5` + `draftToSessionStory5` (order, whitespace-as-missing, defaults/trim, optional-drop, throw) + a `resolveStory5(draftToSessionStory5(...))` round-trip smoke test; `/api/session` story-5 validation branches (disk mocked); catalog products test (+ the `story-5-letter-to` entry, `illustrationCount` derived from the registry, unique id/storyType); story-5 `editable-fields`; `illustrationLabels` story-5 slots/labels + the registry-drift guard.
- `qa` (reuse PR 23's on-disk book → **$0**): drive the Story-5 wizard in a browser (refresh-persistence, the 6 required gates, the two new fields, the tone toggles) → Generate (idempotent, **2** slots not 14) → preview single-column → download `Letter-to-[…].pdf`; the public order form writes a `pending_payment` row against the **local** Supabase stack; Stories 1/2/4 regression (still 14 / 2 / 2 images, correct filenames); the Story-2 ↔ Story-5 cross-links resolve.
- `commerce-security`: the public order-form + checkout-config + PII path (service-role boundary, server-minted order id, no spend-before-payment, no secret/PII leak) — the reason this is its own PR.
