# 22 — Story 4: Wizard, Storefront & Order Intake

> **Craft Area:** 3 — App/UI (+ commerce) · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 8 — Story 4 · **Phase:** 3 (PR 3 of 3) · **Depends on:** 20, 21
> **Branch:** `feature/story4-wizard`

## Status

Not Started

## Goals

- Make Story 4 **creatable** (the operator wizard) **and sellable** (a public storefront listing + order form) end to end — landing → wizard / order → generate → preview → download — reusing the whole commerce loop (intake → pay → worker → admin → delivery) **by id, with zero infra change**.
- Collect the headline **`livingOrMemorial`** toggle at input time, conditionally revealing the **memorial-only** fields (death-type, belief-frame, second date).
- **Story 1 and Story 2 stay behaviorally unchanged.**

## Scope

**In scope**
- `lib/session/draft.ts` — `missingRequiredFieldsStory4`, `draftToSessionStory4`, `isStory4Draft`; extend the dispatchers (`missingRequiredFieldsForDraft` / `draftToSessionForDraft`). Required set: `petName`, `ownerNames`, `species`, `photo`, `quirks`, `favoriteRitual`, `favoriteSpots`, `favoriteActivity`.
- `app/(operator)/api/session/route.ts` — `validateStory4` + per-`storyType` dispatch (house JSON shape, `isSafeSessionId` guard preserved).
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union += `Story4Memories` / `Story4Toggles` groups; per-group shallow-merge handles story-4.
- **Wizard steps** (`app/(operator)/create/*`): generalize the existing `isStory2` branches in `pet` / `generate` / `preview` to "letter products" (story-2 **or** story-4); extend the shared `owner` (reused as-is), `letter` (**+ `favoriteActivity`**), and `tone` (**+ the `livingOrMemorial` toggle** that conditionally reveals death-type / belief-frame) to be story-4-aware. (`STORY_4_STEPS` was added in PR 20.)
- **Landing picker** (`app/(public)/page.tsx`) — a third card (celebration) → `/books/story-4-talk`.
- **Catalog** (`lib/catalog/products.ts`) — `PLACEHOLDER_STORY_4_PRICE_USD` (= `2900`, $29) + `buildProduct("story-4-talk", "story-4", {...})` (marketing copy from the master template; `illustrationCount` **derived** from the registry — do not set it).
- **Public order form** (`app/(public)/order/[productId]/OrderForm.tsx`) — a `Story4Fields` component + story-4 seeding/dispatch (`isStory4Draft`, `newDraft("story-4")`, `draftToSessionForDraft`).
- **Letter-surface generalization:** `components/preview/BookPreview.tsx` (the `isLetter` single-column + filename checks include story-4), `lib/delivery/email.ts` (noun "letter" for story-4). The inline-edit preview is registry-driven (PR 20's `editable` contract) — **no route change**.
- **Samples** — `public/samples/story-4-talk/` (cover + page-4 frames, web-optimized ~800px JPEG, pulled from PR 21's Low run), referenced in the catalog's `sampleImages`.
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_4_TALK` (non-secret, resolved server-side at checkout).
- `lib/runtime/surface.boundary.test.ts` — confirm no new public page/route entry is needed (the dynamic `/books/[productId]`, `/order/[productId]` are already covered) and the public graph stays engine-free (story-4 prompts in `lib/ai/*` must not reach the registry/catalog).

**Out of scope**
- The **manual** Lemon Squeezy product/variant setup (manual-fulfilment) + final price confirmation + the live test-mode purchase — a documented go-live step, not code.
- The "family" relationship option. Re-send / order-lookup flows (post-MVP, never built for any product).

## Implementation notes

**Key decisions**
- **Story 4 is its own storefront listing**, and the **living/memorial choice lives inside it** (one SKU, two audiences — the I See Me! model). Story 2 stays a **separate** grief listing: a celebration buyer and a grief buyer never land on each other's product page.
- **Preview + download for Story 4 are nearly free:** `/api/preview`, `/api/render-pdf`, `/api/update-text`, `/api/regenerate-illustration` are all registry-driven (features 14/16/17/19), so the only changes are the `BookPreview` / `email` letter-surface checks — no markup or route fork.
- **The whole commerce loop is reused by id** — `orderId === sessionId` locally; the worker (PR-07), admin (PR-08), and delivery (PR-09) generate / approve / deliver any registered `storyType` with no edit (the new-book reuse guarantee).
- Match the warm editorial tone; **reuse** `.field` / `.radio-option` / `.upload-zone` / `.steps` / `.style-grid` — don't fork the design system.

**Files**
- `lib/session/draft.ts` · `app/(operator)/api/session/route.ts`
- `components/wizard/WizardProvider.tsx` · `app/(operator)/create/{pet,owner,letter,tone,generate,preview}/page.tsx`
- `app/(public)/page.tsx` · `app/(public)/order/[productId]/OrderForm.tsx`
- `lib/catalog/products.ts` · `components/preview/BookPreview.tsx` · `lib/delivery/email.ts`
- `public/samples/story-4-talk/*` · `.env.local.example` · `lib/runtime/surface.boundary.test.ts`

## References

- @context/masterstories/story-4-master-template.md — the exact fields + toggles to collect, the customer-facing product description, and the pricing ($27–29 PDF; $29 recommended).
- @context/new-book-playbook.md — Step 2 (draft→session/wizard/picker wiring), Step 4 (catalog), Step 5 (LS variant env var), Step 6 (samples) + the standing guards.
- @context/features/18-story2-wizard-and-story-picker.md — the wizard generalization + landing-picker pattern this mirrors.
- @context/features/19-story2-preview-and-download.md — the registry-driven preview/download reuse.
- @context/features/04-public-storefront.md, @context/features/05-order-intake-and-photo-upload.md, @context/features/06-lemonsqueezy-checkout-and-webhook.md — the public storefront / order / checkout surface to extend.

## Done when

- [ ] The landing page offers Story 4 (celebration); `/books` lists `story-4-talk` at `$29`; the detail page shows the 2-illustration count (derived).
- [ ] The Story-4 wizard collects every field **incl. the `livingOrMemorial` toggle** (which conditionally reveals death-type / belief-frame), persists across refresh (same id), gates the required fields, and writes a valid `Story4Session`.
- [ ] The **public order form** creates a `pending_payment` order with the `Story4Session` inputs + photo in Supabase — **no generation, no charge**.
- [ ] Preview renders the letter single-column with the real images; **Download → `If-[PET_NAME]-Could-Talk.pdf`**; inline edit + cover/page-4 regenerate work.
- [ ] **Story 1 and Story 2 are unchanged** end to end (wizard, storefront, order, preview, download).
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test passes; commerce-security review clean.

## Tests

- `test-author`: per-story `missingRequiredFieldsStory4` + `draftToSessionStory4` (order, whitespace-as-missing, defaults/trim, optional-drop, throw); `/api/session` story-4 validation branches (disk mocked); catalog products test (+ the `story-4-talk` entry, `illustrationCount` derived from the registry, unique id/storyType); story-4 `editable-fields`; `illustrationLabels` story-4 slots/labels.
- `qa` (reuse PR 21's on-disk book → **$0**): drive the Story-4 wizard in a browser (refresh-persistence, required gates, the living/memorial conditional reveal) → Generate (idempotent) → preview → download `If-…-Could-Talk.pdf`; the public order form writes a `pending_payment` row against the **local** Supabase stack; Story 1/2 regression (still 14 / 2 images, correct filenames).
- `commerce-security`: the public order-form + checkout-config + PII path (service-role boundary, server-minted order id, no spend-before-payment, no secret/PII leak) — the reason this is its own PR.
