# PR-09 — Delivery via Resend (Phase 4)

> **Branch:** `feature/delivery-resend` · **Phase:** 4 · **Depends on:** PR-08
> **Status:** Planned · Part of the [commerce plan](./00-overview.md). **Closes the MVP loop.**

## Goal

On approval, email the customer a secure, tokenized download link and move the order to
`delivered`. Completes the end-to-end path: order → pay → generate → approve → email →
download.

## Scope (in this PR)

- Resend delivery email (Quietly Kept tone).
- A tokenized public download page serving the PDF via a signed, expiring URL.
- `approved → delivered` transition.

## Out of scope

- Nothing after — this is the last MVP PR. (Post-MVP: re-send, order lookup, etc.)

## What to build

- `lib/delivery/email.ts` — Resend client + the delivery email (download link, warm copy).
  Env: `RESEND_API_KEY`, `FROM_EMAIL`.
- Trigger on `approved`: the admin Approve action (PR-08) calls delivery → send email →
  `delivered`. Store a `deliveryToken` on the order.
- `app/(public)/download/[token]/page.tsx` — verify token → serve the PDF from Supabase
  via a **signed, time-boxed URL**. Never email the raw storage URL. Allow re-download
  while the token is valid.
- Handle expired/invalid token gracefully (soft notice, offer re-issue path later).

## Data / contracts

`approved → delivered`; adds `deliveryToken`. The email links to `/download/[token]`,
which mints a short-lived signed Supabase URL.

## Reuse

- PR-01 Supabase signed-URL helper, `storyPdfFilename` / `letterPdfFilename` for the
  download filename, the soft-error preview pattern (no white-screen on a bad token).

## Testing

- **Unit:** token issue/verify (unguessable, single-order scoped), email payload,
  signed-URL generation (Resend/Supabase mocked).
- **Manual / qa:** approve an order → email arrives → link downloads the **correct** PDF
  with the right filename → status `delivered`; an expired/invalid token shows a soft notice.

## Done when

- [ ] Approving an order emails a working tokenized download link and sets `delivered`.
- [ ] Full loop works end-to-end (order → pay → generate → approve → email → download).
- [ ] Build + tests + `tsc --noEmit` green; qa PASS.

## Risks / notes

- **Never leak a permanent public storage URL** — links go through a tokenized page that
  mints short-lived signed URLs.
- Token must be **unguessable** and scoped to one order.
- Refund/remake policy copy is the remaining deferred PM decision — surface it in the
  email/confirmation footer.
