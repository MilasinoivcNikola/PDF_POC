"use client";

// The operator sign-in form (commerce PR-08). Posts email/password to the admin
// auth route, which signs in via Supabase Auth and sets the session cookie; on
// success it navigates to /admin (a server component that re-checks the session).
// Client-only chrome — the actual credential check happens server-side.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError("That email and password don't match. Please try again.");
        return;
      }
      // Re-fetch the now-gated page server-side so the session cookie is read.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("We couldn't sign you in just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label className="field__label" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error ? (
        <p className="notice" style={{ marginTop: "var(--s-2)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn--primary"
        disabled={submitting}
        style={{ marginTop: "var(--s-4)" }}
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
