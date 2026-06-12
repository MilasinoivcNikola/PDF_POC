# code-reviewer — project memory

- [Commerce webhook review calibration](commerce-webhook-review-calibration.md) — blank ls_order_id / no amount-check / order_created-as-paid are security-reviewer's, not code-review blockers
- [Commerce idempotency pattern](commerce-idempotency-pattern.md) — validated raw-body→verify→status-based-no-op→step-by-step-advance shape for order webhooks
- [Commerce worker review calibration](commerce-worker-review-calibration.md) — PR-07 worker traps: .jpg content-type mismatch + retry-not-$0-cache; cross-process race deferral OK
- [Commerce admin review calibration](commerce-admin-review-calibration.md) — PR-08: reused-route session-gap is security-posture not a code blocker; approve failure-chain + pdfKey-guarded-patch shape validated
- [Commerce delivery review calibration](commerce-delivery-review-calibration.md) — PR-09: email-failure-leaves-approved chain ordering validated; refuted token-re-mint/cast/SDK concerns; /policies-placeholder is a PM flag
- [Story-4 text review calibration](story4-text-review-calibration.md) — feature 20 two-tense engine: byte-identity technique for shared letter-renderer changes; refuted unreachable-throw/PageId-widening; present-tense belief-close is a real exception not a leak
