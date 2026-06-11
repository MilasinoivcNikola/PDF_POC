"use client";

// Sign-out control for the admin chrome (commerce PR-08). Calls the admin auth
// route (DELETE) to clear the session cookie, then navigates back to the login
// page. Client-only so it can fire the request and refresh.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // Best-effort — navigate to login regardless; the page re-checks the session.
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className="btn-link"
      onClick={handleSignOut}
      disabled={busy}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
