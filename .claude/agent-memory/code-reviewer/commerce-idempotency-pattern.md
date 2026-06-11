---
name: commerce-idempotency-pattern
description: The validated-correct webhook idempotency shape for order state-machine advances in this repo
metadata:
  type: project
---

The repo's **validated-correct** idempotent webhook pattern for advancing an order
through the state machine (first used in commerce PR-06's LS webhook):

1. Read raw body with `request.text()` **before** any parse (HMAC is over raw bytes).
2. Verify HMAC, reject **before** any DB read/write.
3. Resolve our order via `custom.orderId`; guard with `isSafeOrderId`; wrap
   `getOrder` in try/catch because it **throws on a malformed id** (returns 200
   "no matching order", never a 500 leak).
4. **Dedupe by current status, not by advancing blindly:** if status is past the
   paid path (`!== pending_payment && !== paid`) → 200 no-op (never re-transition,
   which would throw `IllegalTransitionError`). Off-path (refunded/cancelled/etc.)
   is left untouched.
5. Advance **step-by-step from the current status** (`pending_payment → paid` only
   if currently pending; then `→ queued`), so a partial-failure retry resumes.
   `updateOrderStatus` asserts each transition before any write.
6. Return 500 on a transient DB error so LS retries (step 4 makes the retry safe).

**Why:** this is the feature-09 TOCTOU-claim discipline applied to payments; it is
the shape to expect (and to confirm against, not re-derive) on PR-07's worker and
any later state-advancing webhook. **How to apply:** when reviewing a new
state-machine-advancing handler, check it matches this shape — a handler that calls
`updateOrderStatus` without the status-based no-op guard is a real idempotency bug
(double-delivery → `IllegalTransitionError` → 500 → infinite LS retry).

Related: [[commerce-webhook-review-calibration]].
