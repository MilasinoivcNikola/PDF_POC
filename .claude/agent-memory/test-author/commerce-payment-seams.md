---
name: commerce-payment-seams
description: Testable seams + mock patterns for the Lemon Squeezy payment surface (PR-06) — pure helpers, webhook route, checkout route, store
metadata:
  type: project
---

The PR-06 payment surface and how to unit-test it without live LS/Supabase/network.
**Why:** this is the payment trust boundary — the edges (signature, idempotency)
matter more than the happy path; the QA can't exercise a real charge cheaply.
**How to apply:** when adding/reviewing tests on these modules, point at these seams.

## Pure (no mocks) — `lib/order/lemonsqueezy.ts`, tested in `lemonsqueezy.test.ts`
- `verifyWebhookSignature(rawBody, header, secret)` — HMAC-SHA256 **hex** of raw bytes,
  `crypto.timingSafeEqual`. Generate a valid sig in tests with the same
  `crypto.createHmac("sha256",secret).update(body,"utf8").digest("hex")`. Guarded
  cases that must return `false` *without throwing*: missing/empty/null header, empty
  secret, **wrong-length**, **same-length non-hex**, **upper-cased** digest (no
  case-folding — raw byte compare). The length guard before `timingSafeEqual` is
  load-bearing (it throws on unequal-length buffers).
- Parsers `getEventName`/`getCustomOrderId`/`getLemonSqueezyOrderId`/`isPaidOrderEvent`
  + `buildCheckoutBody`/`getCheckoutUrl` — all pure, return safe nulls, never throw.
  Note: `getLemonSqueezyOrderId` does **not** gate on `data.type` (only a non-empty
  string id). custom_data lives in `meta.custom_data.orderId`, NOT in `data`.

## Webhook route — `app/(public)/api/webhooks/lemonsqueezy/route.ts`
Test idiom: `vi.mock("@/lib/order/store", …)` to stub `getOrder`/`setOrderLsId`/
`updateOrderStatus`; sign the body for real. Set
`process.env.LEMONSQUEEZY_WEBHOOK_SECRET` in `beforeEach`.
- Order of ops is the spine: raw body → verify sig (401, **before any store call** —
  assert `getOrderMock` not called) → JSON.parse (400) → paid-event check (else 200) →
  `isSafeOrderId` (else 200, no store) → `getOrder` → idempotency.
- Idempotency: only `pending_payment`/`paid` act. `pending_payment` → setLsId + paid +
  queued (2 `updateOrderStatus`). `paid` → queued only. Everything past queued
  (`queued`/`generating`/`awaiting_review`/`approved`/`delivered`) AND off-path
  (`refunded`/`cancelled`/`failed`) = quiet 200 no-op, no transition, no setLsId.
- Replies are bare `Response` (not JSON house-shape); errors are terse non-leaky text.
- 500 when secret unset, when `setOrderLsId` throws, or when `updateOrderStatus` throws
  (so LS retries; the idempotency guard makes the retry a safe resume).

## Checkout route — `app/(public)/api/checkout/route.ts`
Test idiom: `vi.mock("@/lib/order/lemonsqueezy", () => ({ createCheckout: … }))` so no
fetch. Catalog (`getProduct`) is the real pure module. Config via env, set/restored
per test: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, and the **per-product**
variant `LEMONSQUEEZY_VARIANT_<PRODUCTID_UPPER_UNDERSCORED>` (e.g.
`LEMONSQUEEZY_VARIANT_STORY_1_BOOK`). Returns JSON **house-shape**. Codes: `invalid_json`/
`invalid_request`/`invalid_order_id`/`missing_product` (400), `unknown_product` (404),
`checkout_unavailable` (503, any missing config — must not echo the var), `checkout_failed`
(502, createCheckout throws — must not leak the upstream message). `redirectUrl` is
derived from request origin → `/order/<productId>/confirmation` (grants nothing).

## Store — `lib/order/store.ts`, tested in `store.io.test.ts`
Supabase mocked via a chainable builder stub (`vi.mock("@/lib/supabase/server")`).
`setOrderLsId` patches ONLY `{ ls_order_id, updated_at }` (assert exact key set so a
retry can't clobber `inputs`/`status`/etc.), rejects unsafe id before any client call.
`updateOrderStatus` calls `assertTransition` before any `.update()` (illegal move → no
write). `getOrder` **throws** on a malformed id (not null) — webhook guards with
`isSafeOrderId` first.

## Config quirks (general)
- `npm run test:run` = `vitest run`; node env; `@/*` alias mirrored in `vitest.config.ts`;
  Oxc automatic JSX runtime for `.tsx`. Baseline before PR-06 test additions: 772 tests.
- Don't run `npm run build` while `next dev` is live on THIS repo (see auto-memory
  dev-build-cache-conflict). Public build is `DEPLOY_TARGET=public npm run build`.
