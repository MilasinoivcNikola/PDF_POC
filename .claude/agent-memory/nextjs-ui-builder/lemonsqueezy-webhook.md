---
name: lemonsqueezy-webhook
description: Lemon Squeezy webhook signature scheme + idempotency rules confirmed against live docs (PR-06)
metadata:
  type: project
---

Lemon Squeezy (Merchant of Record) is the payment layer (commerce PR-06). Confirmed
against the live LS API docs (June 2026 — context7 MCP was unavailable, used WebFetch
+ WebSearch on docs.lemonsqueezy.com and corroborating sources):

- **Webhook signature:** header `X-Signature`; HMAC-SHA256 **hex** digest of the
  **RAW request body** keyed with `LEMONSQUEEZY_WEBHOOK_SECRET`; compare with
  `crypto.timingSafeEqual` (guard equal length first — it throws on unequal lengths).
  Read the raw body with `request.text()` BEFORE any parse — `request.json()` would
  re-serialize and break the HMAC.
- **Webhook payload (JSON:API):** `meta.event_name` (e.g. `order_created`),
  `meta.custom_data` (OUR `{ orderId }` round-trips here — it's in `meta`, NOT `data`),
  `meta.test_mode`, and `data.id` = the LS order id (`data.type === "orders"`).
- **Checkout:** `POST https://api.lemonsqueezy.com/v1/checkouts`, JSON:API body with
  `attributes.checkout_data.custom: { orderId }` (round-trips into `meta.custom_data`),
  `attributes.product_options.redirect_url` (post-payment → our confirmation page),
  `relationships.store`/`relationships.variant`; hosted URL at `data.attributes.url`.
  Headers: `Authorization: Bearer`, `Accept`/`Content-Type: application/vnd.api+json`.

**Why:** signature verification is the security spine — payment is trusted ONLY via the
verified webhook, never the client redirect/confirmation page (which grants nothing and
advances no state).

**How to apply (idempotency — LS retries any non-2xx and may double-deliver):** read the
order first. The paid flow is `pending_payment → paid → queued`. Advance step-by-step from
the CURRENT status (so a partial-failure retry left at `paid` resumes to `queued`); an order
already at `queued`+ or off the paid path (`refunded`/`cancelled`/`failed`) is a no-op 200.
Unknown events / unresolvable orderId → safe 200 (so LS stops retrying). Unsigned/tampered →
401 BEFORE any DB read. Drive status via `updateOrderStatus` (it `assertTransition`s before
any write) — never fork the state machine. `lsOrderId` needed a new `setOrderLsId(id, lsId)`
in `lib/order/store.ts` (status-agnostic patch; the contract had the field but it wasn't
writable post-create). See [[public-api-route-secrets]] for the boundary tier.
