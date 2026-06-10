# PR-08 — Admin Review & Approval (Phase 3b)

> **Branch:** `feature/admin-review` · **Phase:** 3b · **Depends on:** PR-07
> **Status:** Planned · Part of the [commerce plan](./00-overview.md). Operator-side, auth-gated.

## Goal

The operator's approval gate: an auth-gated queue to review each generated book, repaint
any drifted page, and **Approve** — producing the final PDF. The ~30-second human glance
that keeps a grief product from shipping a bad book.

## Scope (in this PR)

- An auth-gated admin under `(operator)`.
- Queue of `awaiting_review` orders; detail view = the existing preview + repaint + edit.
- Approve → render final PDF → upload to Supabase → `approved`.
- `failed` orders visible for retry.

## Out of scope

- Delivery email (PR-09) — Approve sets `approved`, which PR-09 reacts to.

## What to build

- `app/(operator)/admin/page.tsx` — queue list (`awaiting_review` + `failed`), auth-gated
  via **Supabase Auth** (single operator account).
- `app/(operator)/admin/[orderId]/page.tsx` — reuse the existing **preview** +
  **per-page regenerate** + **inline text edit** against the order's generated images.
- Approve action: `renderStoryPdf(session, images)` → upload to `order-pdfs` → set
  `approved` (+ store `pdfKey`).
- Surface `failed` orders with the error + a "re-queue" action.

## Data / contracts

`awaiting_review → approved` (+ `pdfKey`); the final PDF lands in Supabase.

## Reuse

- The entire preview / regenerate / render-pdf stack (features 05/07/10),
  `storyPdfFilename` / `letterPdfFilename`, the per-page repaint md5-isolation behaviour.

## Testing

- **Unit:** approve transition, PDF render+upload wiring (Puppeteer/Supabase mocked).
- **Manual / qa (reuse a fixture, ~$0 or one Low repaint):** open an `awaiting_review`
  order, repaint one page (only that page changes), Approve → final PDF in `order-pdfs`,
  status `approved`. Auth blocks an unauthenticated visitor.

## Done when

- [ ] Operator can review, repaint, and approve a book locally.
- [ ] Approve yields the final PDF in storage + `approved` status.
- [ ] Admin is genuinely auth-gated and operator-only; build + tests green.

## Risks / notes

- **Real auth gate** — the admin exposes customer photos + lets you spend on repaints.
- Admin lives **operator-side** so repaint (engine) works and the key stays local.
- Reuse the preview's existing download/regenerate race guards so an approve can't capture
  a mid-repaint book.
