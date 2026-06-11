"use client";

// Re-queue control for a `failed` order in the admin queue (commerce PR-08). Posts
// to /api/admin/requeue, which moves `failed → queued` (legal per the state
// machine) so the worker re-runs the book. On success it refreshes the queue so the
// order drops out of the `failed` list. Client-only — the actual transition + auth
// gate live in the route.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RequeueButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequeue() {
    if (busy) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/requeue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError("Couldn't re-queue this order. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't re-queue this order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="admin-requeue">
      <button
        type="button"
        className="btn btn--ghost"
        onClick={handleRequeue}
        disabled={busy}
      >
        {busy ? "Re-queuing…" : "Re-queue"}
      </button>
      {error ? <span className="admin-requeue__error">{error}</span> : null}
    </span>
  );
}
