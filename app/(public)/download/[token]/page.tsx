"use client";

// The public tokenized download page (commerce PR-09) — where the emailed link
// lands. It fetches GET /api/download/[token] on mount (the same "fetch an API on
// mount" pattern the wizard preview uses) and renders either:
//   - the "Your book is ready — Download [filename]" state (anchor → the short-lived
//     signed URL the route minted), or
//   - a soft, on-brand "this link isn't working" notice for an invalid/expired
//     token (NO white-screen, and NO leak of WHY it failed).
//
// PUBLIC SURFACE + CLIENT-SAFE (the load-bearing boundary): this PAGE never touches
// Supabase or the engine — all DB access lives in the API route, so the public page
// graph stays client-safe (the boundary test asserts it imports no
// lib/supabase/server / engine). It only `fetch`es the route.
//
// Re-download: reloading re-runs the fetch, which mints a FRESH signed URL, so the
// link keeps working while the token is valid.

import { useEffect, useState } from "react";
import Link from "next/link";

interface DownloadResponse {
  ok: boolean;
  downloadUrl?: string;
  filename?: string;
  petName?: string;
  error?: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; downloadUrl: string; filename: string; petName: string }
  | { kind: "unavailable" };

const wordmark = (
  <svg
    className="wordmark__ornament"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 8 Q4 5 6 4 Q8 5 7 8 Z M13 8 Q15 5 13 4 Q11 5 12 8 Z M3 12 Q1 10 3 9 Q5 10 4 12 Z M16 12 Q18 10 16 9 Q14 10 15 12 Z M10 17 Q5 17 5 12 Q5 9 10 9 Q15 9 15 12 Q15 17 10 17 Z"
      fill="currentColor"
      opacity="0.7"
    />
  </svg>
);

export default function DownloadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { token } = await params;
        const res = await fetch(`/api/download/${encodeURIComponent(token)}`);
        const body = (await res.json()) as DownloadResponse;
        if (cancelled) {
          return;
        }
        if (res.ok && body.ok && body.downloadUrl && body.filename) {
          setState({
            kind: "ready",
            downloadUrl: body.downloadUrl,
            filename: body.filename,
            petName: body.petName ?? "",
          });
        } else {
          // Any non-ok (invalid/expired/not-found/error) degrades to the soft
          // notice — we never surface WHY.
          setState({ kind: "unavailable" });
        }
      } catch {
        if (!cancelled) {
          setState({ kind: "unavailable" });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="page-wrap">
      <header className="site-header">
        <Link href="/" className="wordmark">
          {wordmark}
          Quietly Kept
        </Link>
        <div className="label">Your keepsake</div>
      </header>

      <main className="wizard">
        {state.kind === "loading" ? (
          <div
            className="wizard__intro fade-in"
            style={{ textAlign: "center", maxWidth: "34em" }}
          >
            <p className="lede" style={{ margin: "var(--s-16) auto 0" }}>
              Finding your keepsake…
            </p>
          </div>
        ) : state.kind === "ready" ? (
          <div className="download-final fade-in" style={{ marginTop: "var(--s-16)" }}>
            <span className="label label--gold">Ready for you</span>
            <h2 className="mt-4">
              {state.petName
                ? `${state.petName}’s keepsake is ready.`
                : "Your keepsake is ready."}
            </h2>
            <p>
              We painted it by hand. Take your time with it — you can return to this
              link to download it again whenever you need it.
            </p>
            <a
              href={state.downloadUrl}
              download={state.filename}
              className="btn btn--primary"
            >
              Download your keepsake
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v9m0 0L3 6m4 4l4-4M1 13h12"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <p className="download-meta">{state.filename}</p>
          </div>
        ) : (
          <div
            className="wizard__intro fade-in"
            style={{ textAlign: "center", maxWidth: "36em" }}
          >
            <span className="label label--gold">We&apos;re sorry</span>
            <h1 className="display-md mt-4">This link isn&apos;t working.</h1>
            <p className="lede mt-4">
              This download link may have expired, or it isn&apos;t one we recognize.
              If you were expecting your keepsake, please reply to the email we sent
              you and we&apos;ll make it right.
            </p>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <Link href="/policies" className="label">
          Our refund &amp; remake promise
        </Link>
        <p className="label">Made slowly · Made by hand</p>
      </footer>
    </div>
  );
}
