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
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

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
      <SiteHeader />

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

      <SiteFooter />
    </div>
  );
}
