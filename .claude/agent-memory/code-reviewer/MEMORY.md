# code-reviewer — project memory

- [Commerce webhook review calibration](commerce-webhook-review-calibration.md) — blank ls_order_id / no amount-check / order_created-as-paid are security-reviewer's, not code-review blockers
- [Commerce idempotency pattern](commerce-idempotency-pattern.md) — validated raw-body→verify→status-based-no-op→step-by-step-advance shape for order webhooks
- [Commerce worker review calibration](commerce-worker-review-calibration.md) — PR-07 worker traps: .jpg content-type mismatch + retry-not-$0-cache; cross-process race deferral OK
- [Commerce admin review calibration](commerce-admin-review-calibration.md) — PR-08: reused-route session-gap is security-posture not a code blocker; approve failure-chain + pdfKey-guarded-patch shape validated
- [Commerce delivery review calibration](commerce-delivery-review-calibration.md) — PR-09: email-failure-leaves-approved chain ordering validated; refuted token-re-mint/cast/SDK concerns; /policies-placeholder is a PM flag
- [Story-4 text review calibration](story4-text-review-calibration.md) — feature 20 two-tense engine: byte-identity technique for shared letter-renderer changes; refuted unreachable-throw/PageId-widening; present-tense belief-close is a real exception not a leak
- [Story-4 wizard review calibration](story4-wizard-review-calibration.md) — feature 22 UI/commerce: isStory2→isLetter swaps are byte-safe for existing products; living-path stale-enum is inert at the merge layer (don't flag)
- [Story-5 text review calibration](story5-text-review-calibration.md) — feature 23 owner→pet letter: both shared-renderer changes (NOTE_SIGNOFF, LETTER_WASH_PAGE_IDS) byte-safe; spec-said-reuse cleanOptional/appendOptionalLines were never exported (local re-impl is the precedent)
