"use client";

// Client wrapper that composes the REUSED preview stack (BookPreview — preview +
// per-page regenerate + inline text edit) with the admin's Approve action for one
// order (commerce PR-08).
//
// The orderId === sessionId bridge: PR-07's worker wrote the generated book to the
// operator's local disk keyed by the order id, so BookPreview (which fetches
// /api/preview?id=… and posts to /api/regenerate-illustration | /api/update-text |
// /api/render-pdf by id) works against an admin order when handed the orderId as
// its sessionId — no fork of the preview stack.
//
// Approve is rendered via BookPreview's `renderActions` slot, which hands back its
// `busy` flag (a repaint / text save / download in flight). Threading that into the
// Approve button reuses the preview's existing race guard so an approve can't
// capture a mid-repaint book.
//
// SECURITY — the reused engine routes' auth boundary (a deliberate decision for
// PR-08, flagged for the security reviewer):
//   BookPreview calls the shared operator engine routes /api/preview,
//   /api/regenerate-illustration, /api/update-text, and /api/render-pdf BY ID. Those
//   routes are also used by the non-authed operator wizard preview, so adding a
//   Supabase session requirement to them would break that flow. They are left
//   gated ONLY by the build-surface guard — assertOperator() makes them 404 on a
//   public deploy, and per PR-03 the operator surface only ever runs on the
//   operator's local machine (it never ships to Vercel; the keys aren't set there).
//   So on the public host these routes don't exist; on the local operator host the
//   operator is the only user. The NEW admin MUTATION routes that spend or change
//   order state — /api/admin/approve and /api/admin/requeue — DO additionally
//   require a logged-in Supabase session (getOperatorUserId()), and the admin PAGES
//   are session-gated server-side. The residual exposure is: anyone with local
//   access to the running operator machine could hit the shared /api/regenerate-
//   illustration route directly and spend. That is judged acceptable for a single-
//   operator local tool (the same person who runs the engine), and is called out
//   here so the security reviewer can weigh in rather than it being silent. If the
//   operator surface ever became multi-user / network-exposed, these reused routes
//   would need their own session gate (or an admin-scoped variant).

import { BookPreview } from "@/components/preview/BookPreview";
import { ApproveButton } from "@/app/(operator)/admin/[orderId]/ApproveButton";

export function AdminBookReview({ orderId }: { orderId: string }) {
  return (
    <BookPreview
      sessionId={orderId}
      renderActions={({ busy }) => (
        <ApproveButton orderId={orderId} busy={busy} />
      )}
    />
  );
}
