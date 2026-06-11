# code-reviewer — project memory

- [Commerce webhook review calibration](commerce-webhook-review-calibration.md) — blank ls_order_id / no amount-check / order_created-as-paid are security-reviewer's, not code-review blockers
- [Commerce idempotency pattern](commerce-idempotency-pattern.md) — validated raw-body→verify→status-based-no-op→step-by-step-advance shape for order webhooks
