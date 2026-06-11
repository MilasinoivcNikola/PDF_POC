---
name: commerce-admin-review-calibration
description: PR-08 admin-review verdict — reused-route session-gate gap is security-posture (security-reviewer's), not a code-correctness blocker; approve failure-chain shape validated
metadata:
  type: feedback
---

For the commerce admin (PR-08 and any later admin work), the **reused engine routes**
(`/api/preview`, `/api/regenerate-illustration`, `/api/update-text`, `/api/render-pdf`)
are intentionally gated by `assertOperator()` **only** — no Supabase-session check — so the
non-authed operator wizard preview keeps working. The admin UI calls them by id.

**Why:** adding a session requirement to those shared routes would break the wizard flow.
The new admin **mutation** routes that spend or change order state (`/api/admin/approve`,
`/api/admin/requeue`) DO add `getOperatorUserId()` on top of `assertOperator()`; the admin
**pages** are session-gated server-side. The residual (a local-machine user hitting the
shared regenerate route directly to spend) is documented in `AdminBookReview.tsx`.

**How to apply:** do NOT flag the reused-route session-gap as a code-review blocker — it is a
**security-posture** call for the commerce-security-reviewer, and it is already flagged in
code. As code-reviewer, only confirm the comment is *accurate* (it is) and that the new
admin mutation/pages routes carry the dual gate in the right order (`assertOperator()` first,
then the session check). See [[commerce-webhook-review-calibration]] for the same
"security-reviewer's, not mine" split on the webhook PR.

**Approve failure-chain shape (validated as correct, reuse as the bar for similar routes):**
render `MergeError` → 422; render/upload throw → 500 with the status **NOT** flipped after a
spent render (upload precedes the status write, status only moves on a successful upload);
transition race on the final `updateOrderStatus` → 409. `pdfKey` rides the **same guarded**
`awaiting_review → approved` patch in `updateOrderStatus` (assert-before-write), so an order
is never `approved` without its `pdfKey` — mirrors the existing `error`-on-`failed` pattern.
