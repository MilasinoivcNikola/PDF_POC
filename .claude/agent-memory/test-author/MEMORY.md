# test-author — project memory

_Index of saved memories (one line each: `- [Title](file.md) — hook`)._

- [Commerce payment seams](commerce-payment-seams.md) — testable seams + mock patterns for the Lemon Squeezy surface (PR-06): pure helpers, webhook idempotency, checkout route, store
- [Commerce admin seams](commerce-admin-seams.md) — PR-08 admin review/approval seams + mocks: auth gate (getOperatorUserId/createSupabaseAuthClient), approve no-spend-on-reject, requeue, updateOrderStatus pdfKey patch
- [Commerce delivery seams](commerce-delivery-seams.md) — PR-09 Resend delivery seams: token mint/validate, pure buildDeliveryEmail vs thin sender, token store lookup, download no-enumeration invariant, approve→deliver email-failure path
- [Story-4 text seams](story4-text-seams.md) — PR-20 two-tense engine seams + the Page-5 belief-close present-tense exception (scope the leak guard), tense-dependent date line, the 1440-combo matrix
- [Story-4 imagery seams](story4-imagery-seams.md) — PR-21 imagery seams + the divergence-from-Story-2 invariants: both-useReference, both-images.edit (generate never called), page-4 path-independence, registry-driven slots, drift guard
- [Story-5 text seams](story5-text-seams.md) — PR-23/24 Story-5 ("A Letter to") seams: the quirks-optional divergence from Story 2 (6 required, blank quirks stored as "" not dropped), /api/session validateStory5, catalog/labels/editable-fields (PR-24 created the editable test)
- [Story-6 text seams](story6-text-seams.md) — PR-25 Story-6 ("While You're Still Here") narrative-layout living tribute: single-tense present, transitionFrame toggle, 8-page/7-slot accounting, STORY_6_LAYOUT (never `truth`), ownerMessage dedication, the age-band lead byte-compare pitfall
- [Story-7 text seams](story7-text-seams.md) — feature 28 PR-A Story-7 ("Welcome Home — Gotcha Day"), first JOYFUL book: happy-tone guard (10 banned phrases, full matrix), 6-dim matrix, mixed imagery (welcome-before figure-free), 2 deviations (found-as-stray thank-you, anniversary-no-yearsHome gap I closed)
- [Story-7 wizard seams](story7-wizard-seams.md) — feature 29 PR-B Story-7 creatable+sellable: the conditional yearsHome gate (anniversary-only) in BOTH draft.test.ts + route.test.ts, quirks/homecomingMemory store "" (dispatch-proof acceptance), catalog illustrationCount=8 derived, WELCOME slots reference+8=9
