# Current Feature

PR-08 — Admin Review & Approval (Commerce Phase 3b)

## Status

In Progress

## Decisions (locked)

- **Admin auth method: Supabase Auth** (the roadmap default; PM confirmed 2026-06-11).
  Real email/password login backed by Supabase, cookie-based session via `@supabase/ssr`
  (new dep — pre-approved by the commerce roadmap's "Supabase Auth admin gate"). One
  operator account created in the Supabase dashboard. A login page + server-side session
  checks on the `(operator)/admin/**` pages and the new admin mutation API routes.

## Goals

The operator's approval gate: an auth-gated queue to review each generated book,
repaint any drifted page, and **Approve** → final PDF. The ~30-second human glance
that keeps a grief product from shipping a bad book.

- `app/(operator)/admin/page.tsx` — queue list of `awaiting_review` + `failed` orders,
  auth-gated via **Supabase Auth** (single operator account).
- `app/(operator)/admin/[orderId]/page.tsx` — reuse the existing **preview** +
  **per-page regenerate** + **inline text edit** against the order's generated images.
- **Approve** action: `renderStoryPdf(session, images)` → upload to `order-pdfs` →
  set status `approved` (+ store `pdfKey`).
- Surface `failed` orders with the error + a "re-queue" action (`failed → queued`).

## Done when

- [ ] Operator can review, repaint, and approve a book locally.
- [ ] Approve yields the final PDF in `order-pdfs` storage + `approved` status (+ `pdfKey`).
- [ ] Admin is genuinely auth-gated and operator-only; `build` + `test:run` + `tsc` green.

## Notes

**Owner:** Craft Area 3 (nextjs-ui-builder) — App Router pages, auth gate, admin UI,
operator API routes. Touches the commerce surface (orders, Supabase, admin-auth) →
**commerce-security-reviewer** runs at review alongside code-reviewer + context-auditor.

**Depends on:** PR-07 (local batch worker — produces `awaiting_review` orders). Part of
the commerce plan ([00-overview.md](./features/00-overview.md)); spec at
[08-admin-review-and-approval.md](./features/08-admin-review-and-approval.md).

**State machine:** `awaiting_review → approved` (+ `pdfKey`); `failed → queued` re-queue.
Both legal per `lib/order/state.ts` — the single source of truth; never fork it.

**Out of scope:** Delivery email (PR-09) reacts to `approved`.

**Reuse:** the preview / regenerate / render-pdf stack (features 05/07/10),
`storyPdfFilename` / `letterPdfFilename`, the per-page repaint md5-isolation behaviour,
and the preview's existing **download/regenerate race guards** (so an Approve can't
capture a mid-repaint book).

**Risks (per spec + security spine):**
- **Real auth gate** is the headline — the admin exposes customer photos and lets the
  operator spend on repaints. Must genuinely block an unauthenticated visitor.
- Admin lives **operator-side** so repaint (engine) works and the OpenAI key stays local.
  Operator API routes call `assertOperator()` as the first statement of every verb.
- Service-role Supabase client is server-only; never reaches a client bundle.

**Testing:**
- Unit: approve transition, PDF render + upload wiring (Puppeteer / Supabase mocked).
- qa (reuse a fixture, ~$0 or one Low repaint): open an `awaiting_review` order, repaint
  one page (only that page changes), Approve → final PDF in `order-pdfs`, status
  `approved`; auth blocks an unauthenticated visitor. Local Supabase stack, no cloud write.
