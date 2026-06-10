# PR-06 — Lemon Squeezy Checkout + Webhook (Phase 2b)

> **Branch:** `feature/lemonsqueezy-checkout` · **Phase:** 2b · **Depends on:** PR-05
> **Status:** Planned · Part of the [commerce plan](./00-overview.md).

## Goal

Take payment via **Lemon Squeezy** (Merchant of Record). On the verified paid webhook,
move the order `pending_payment → paid → queued`. Payment is trusted **only** via the
signed webhook, never a client redirect.

## Scope (in this PR)

- Lemon Squeezy account/product setup (manual fulfilment, no auto-download).
- Order form → LS hosted checkout with our order id in custom data.
- The signed webhook handler → flip the order to `queued` (idempotent).
- A "we're painting it — check your email" confirmation page.

## Out of scope

- Generation (PR-07), admin (PR-08), delivery email (PR-09).

## Setup (one-time, documented in the PR)

- Create the LS store + one product/variant **per book**; set to **manual fulfilment**
  (we deliver later — no instant download). Record each `lsVariantId` into the catalog (PR-02).
- Confirm the Serbian PayPal/bank payout at signup.
- Env: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`.

## What to build

- Checkout creation from the order step: build an LS checkout for the product variant
  with `custom` data `{ orderId }`; redirect the customer. (LS checkout API / URL.)
- `app/api/webhooks/lemonsqueezy/route.ts` (public) — **verify HMAC signature**, handle
  `order_created`/`order_paid`, resolve our order via `custom.orderId`, transition
  `pending_payment → paid → queued`, persist `lsOrderId`. **Idempotent** (LS retries; a
  duplicate delivery is a no-op).
- `app/(public)/order/[productId]/confirmation` — post-payment "check your email" page.

## Data / contracts

Webhook is the only trusted "paid" signal. Stores `lsOrderId`; transitions via PR-01's
state machine.

## Reuse

- The **idempotency discipline from feature-09** (claim/dedupe so a retried or
  double-delivered webhook produces exactly one transition).
- Order store + state machine; house JSON shape.

## Testing

- **Unit:** signature verification (valid/invalid/missing), `custom.orderId` → order
  lookup, idempotent transition (duplicate webhook → one move), unknown-event ignore.
- **Manual:** an LS **test-mode** purchase flips the order to `queued` exactly once with
  `lsOrderId` set; a replayed webhook doesn't double-move.

## Done when

- [ ] A test-mode purchase moves the order to `queued` exactly once.
- [ ] Tampered/unsigned/duplicate webhooks are rejected or no-op'd safely.
- [ ] `lsVariantId`s recorded in the catalog; build + tests green.

## Risks / notes

- **Signature verification is security-critical** — reject anything unsigned/mismatched.
- **Idempotency** — LS retries webhooks; dedupe on `lsOrderId`/event id.
- Confirm the product is **manual fulfilment** so LS doesn't try to auto-deliver a file.
- The redirect page must not grant access to anything — only the webhook advances state.
