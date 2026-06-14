"use client";

// Step 7 — the in-browser preview (feature 10). After generation, this shows the
// assembled book page by page with the REAL generated illustrations, then offers
// the print-quality PDF download and a per-page "regenerate" control. The session
// id comes from the wizard draft (the same context the Generate step wrote under),
// so the preview reads the very book that was just generated.
//
// All the data-loading + rendering lives in <BookPreview>: it fetches the resolved
// pages + image map from /api/preview and lays them out as the prototype's facing-
// page spreads. This page is the wizard chrome (header/footer) + the hydration gate.

import Link from "next/link";
import { useWizard } from "@/components/wizard/WizardProvider";
import { BookPreview } from "@/components/preview/BookPreview";
import { BRAND } from "@/lib/brand";

export default function PreviewPage() {
  const { draft, hydrated } = useWizard();
  const isLetter =
    draft?.storyType === "story-2" ||
    draft?.storyType === "story-4" ||
    draft?.storyType === "story-5";

  return (
    <div className="page-wrap">
      <header className="site-header">
        <Link href="/" className="wordmark">
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
          {BRAND}
        </Link>
        <div className="label">
          Preview · {isLetter ? "Your letter" : "Your book"}
        </div>
      </header>

      {!hydrated ? (
        <main className="wizard" style={{ textAlign: "center" }}>
          <p className="lede" style={{ margin: "var(--s-16) auto 0" }}>
            Gathering your book…
          </p>
        </main>
      ) : draft?.id ? (
        <BookPreview sessionId={draft.id} />
      ) : (
        <main className="wizard" style={{ textAlign: "center", maxWidth: "40em" }}>
          <p className="lede" style={{ margin: "var(--s-16) auto 0" }}>
            We couldn&apos;t find a book to preview yet.
          </p>
          <p className="mt-8">
            <Link href="/create/upload" className="btn-link">
              Start a new book &rarr;
            </Link>
          </p>
        </main>
      )}

      <footer className="site-footer">
        <Link href="/" className="label">
          Start a new book
        </Link>
        <p className="label">Saved to this device only</p>
      </footer>
    </div>
  );
}
