---
name: commerce-delivery-review-calibration
description: PR-09 (Resend delivery) review — validated email-failure-leaves-approved chain ordering, refuted concerns, and the /policies-placeholder PM flag
metadata:
  type: feedback
---

Commerce PR-09 (delivery via Resend) review calibration. Validated as correct, do not re-flag:

**The email-failure design (the headline call) is validated-as-intentional.** On Approve, the chain is: render PDF → putPdf → `updateOrderStatus(approved, {pdfKey})` → mint token → `setOrderDeliveryToken` → `sendDeliveryEmail` → `updateOrderStatus(delivered)`. Every failure point BELOW the `approved` write returns `{ ok:true, status:"approved", delivery:"failed"|"sent" }` and NEVER advances to terminal `delivered`. This is deliberate: `delivered` is terminal, so stranding a finished-but-un-emailable book there is the failure mode being avoided. The conservative ordering (token persisted BEFORE email, `delivered` only AFTER a successful send) is correct — do not "simplify" it into one transition.

**Refuted concerns (investigated, NOT real):**
- Token re-mint on retry orphaning the prior token: moot — re-approval is blocked by the `status !== "awaiting_review"` 409 gate, so the delivery chain runs exactly once per order. A `delivery:"failed"` order can't re-enter the route. (Retry/re-send is explicitly post-MVP.)
- `order.inputs as StorySession` cast for filename: SOUND. Both `StorySession` and `Story2Session` reuse the `Pet` group, so `order.inputs.pet.name` is type-safe across the union; each registry `pdfFilename` impl narrows by `storyType`.
- `node:process` import / bare `process.env`: both patterns exist in-repo and are consistent (checkout/webhook routes import `node:process`; `lib/ai/client.ts` uses bare `process.env`). Not a finding either way.
- Resend/Supabase SDK signatures: verified against installed `resend@6` (`emails.send` → `{data,error}`, `error.message: string`) and `@supabase/storage-js` (`createSignedUrl(path, ttl, { download?: string|boolean })`). The new `signedPdfUrl(id, ttl, downloadName?)` passes `undefined` when absent, preserving the old 2-arg call. Correct.

**The standing PM process flag for delivery PRs:** the delivery email + download-page footer link to `/policies` for the refund/remake promise, but `/policies` still holds PR-04 PLACEHOLDER copy. Surface to Nikola before any live ship — the email now actively points bereaved customers there. This is a process flag, not a code blocker.

**Nice-to-have I treat as non-blocking here:** a missing download-*page* RTL test (route/token/email/store are all unit-tested; the client page's 3 render states + cancelled-cleanup are QA-covered). Spec's Testing section only mandates unit tests for token/payload/signed-URL, all present.

See [[commerce-admin-review-calibration]] (PR-08), [[commerce-worker-review-calibration]] (PR-07).
