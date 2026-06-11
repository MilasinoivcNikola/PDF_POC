"use client";

// The Approve control for an order's review page (commerce PR-08). Posts to
// /api/admin/approve, which renders the final PDF, uploads it to `order-pdfs`, and
// moves the order `awaiting_review → approved`. Disabled while the preview is busy
// (a repaint / text save / download in flight) so an approve can never capture a
// mid-repaint book — `busy` is threaded in from BookPreview's shared state.
//
// On success it navigates back to the queue (the order leaves the awaiting-review
// list). Rendered via BookPreview's `renderActions` slot, beside "Download PDF".

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveButton({
  orderId,
  busy,
}: {
  orderId: string;
  busy: boolean;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    // Don't approve while the preview is mid-repaint/save/download — the change
    // isn't on disk yet, so the rendered PDF would capture the stale book.
    if (approving || busy) {
      return;
    }
    setError(null);
    setApproving(true);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError("We couldn't approve this book just now. Please try again.");
        setApproving(false);
        return;
      }
      // Approved — the final PDF is uploaded and the order moved on. Back to queue.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("We couldn't approve this book just now. Please try again.");
      setApproving(false);
    }
  }

  return (
    <span className="admin-approve">
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleApprove}
        disabled={approving || busy}
      >
        {approving ? "Approving…" : "Approve & finish"}
      </button>
      {error ? <span className="admin-approve__error">{error}</span> : null}
    </span>
  );
}
