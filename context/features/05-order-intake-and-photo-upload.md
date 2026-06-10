# PR-05 — Order Intake + Photo Upload (Phase 2a)

> **Branch:** `feature/order-intake` · **Phase:** 2a · **Depends on:** PR-01, PR-04
> **Status:** Planned · Part of the [commerce plan](./00-overview.md).

## Goal

Let a customer provide their pet details + photo + email and create a `pending_payment`
order — reusing the existing wizard inputs, but **without** generating and **without**
charging yet. Isolates the intake form + Supabase upload from the payment integration.

## Scope (in this PR)

- The wizard-as-order form under `(public)`, per book.
- Photo upload to Supabase `order-photos`.
- Customer email capture.
- Create an `Order` in `pending_payment` via the store (PR-01).
- "Continue to payment" button → stubbed (PR-06).

## Out of scope

- Lemon Squeezy checkout (PR-06), any generation, delivery.

## What to build

- `app/(public)/order/[productId]/…` — the order wizard. Reuse the existing wizard
  steps/validation, but the final step uploads the photo + collects **email** and POSTs
  to create an order (instead of generating).
- `app/api/order/route.ts` (public) — `POST`: validate inputs **server-side** (reuse the
  existing required-field validators so a paid order is always renderable), store the
  photo to Supabase, write the `Order` (`pending_payment`), return `{ ok, orderId }`.
  House JSON shape.
- Email field + validation; per-product input set chosen via the registry wizard config.

## Data / contracts

Writes an `Order` (`pending_payment`) with `inputs` + `customerEmail` + `photoKey`.

## Reuse

- Wizard components, `WizardProvider`, `draftToSession` / `draftToSessionStory2`,
  the uploader + `downscaleImage`, and the **server-side required-field validation**
  (the feature-08 lesson: the 7-field gate guarantees `resolveStory` won't `MergeError`).
- PR-01 order store + Supabase storage helpers.

## Testing

- **Unit:** order-creation validation, inputs assembly, required-field gating (client +
  server), email validation, traversal/id safety.
- **Manual:** complete the form → photo lands in `order-photos` → an `Order` row exists
  in `pending_payment` with inputs + email. No generation, no charge.

## Done when

- [ ] Customer can complete the form; photo stored in Supabase; `pending_payment` order created.
- [ ] Server rejects incomplete/invalid input (re-using existing validators).
- [ ] No generation or payment occurs; build + tests green.

## Risks / notes

- **Never generate before payment.** This PR only persists intent.
- Validate inputs at the server boundary so a later paid order can't fail to render
  (carry the feature-08 required-set guarantee into the order path).
- Don't trust the client photo — re-check type/size server-side (reuse upload validation).
