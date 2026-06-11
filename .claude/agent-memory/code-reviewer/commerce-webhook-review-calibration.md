---
name: commerce-webhook-review-calibration
description: What is code-review-blocking vs. owned-elsewhere on the Lemon Squeezy payment/webhook surface (commerce PR-06)
metadata:
  type: feedback
---

On the commerce payment surface, three webhook concerns are **owned by the
commerce-security-reviewer, not code-review** — do not raise them as code-review
*blockers* (note them in passing at most):

1. `setOrderLsId(orderId, getLemonSqueezyOrderId(payload) ?? "")` can persist a
   **blank `ls_order_id`** if `data.id` is ever absent. It's harmless to the state
   machine (status drives off the row, not `ls_order_id`) — a data-quality/security
   judgment call, not a correctness crash.
2. **No cross-check** of the LS-charged amount/variant vs. the expected product.
   This is **intentional MoR-design trust** on (signed HMAC + server-minted orderId),
   confirmed for this repo. Don't flag as a code-review bug.
3. Treating `order_created` as "paid" is an **LS-config assumption** (manual
   fulfilment, digital product). A security/config call, not a code defect.

**Why:** the PR's test step explicitly hands these three to the security reviewer;
re-flagging them as code-review blockers is noise and steps on the other reviewer's
verdict. **How to apply:** on any future webhook/payment PR, scope code-review to
correctness/patterns/edge-cases (raw-body-before-parse, idempotency no-op,
getOrder-throw handling, house JSON shape, boundary membership) and leave
trust-model/amount-verification/secret-handling to commerce-security-reviewer.

Related: [[commerce-idempotency-pattern]].
