"use client";

// One book page in the in-browser preview. It renders the SAME per-page markup
// the PDF uses (the shared `renderPage` from lib/pdf/pages) so screen and print
// can't drift, then overlays a screen-only "Regenerate" affordance for the pages
// that carry an illustration. The regenerate call is owned by BookPreview (it
// holds the image map + session id); PageView just shows the control and its
// painting state.

import type { ReactNode } from "react";

import { renderPage } from "@/lib/pdf/pages";
import type { ResolvedPage } from "@/lib/story/merge";

interface PageViewProps {
  /** The fully-resolved page (copy already merged). */
  page: ResolvedPage;
  /** Image src for this page's slot (a data URL), or undefined for placeholder. */
  src?: string;
  /** Whether this page has an illustration that can be regenerated. */
  canRegenerate: boolean;
  /** True while this page's illustration is being re-painted. */
  regenerating: boolean;
  /** Re-paint just this page's illustration. */
  onRegenerate: () => void;
}

const regenerateIcon: ReactNode = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M12 7a5 5 0 1 1-1.46-3.54M12 1v3h-3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function PageView({
  page,
  src,
  canRegenerate,
  regenerating,
  onRegenerate,
}: PageViewProps) {
  return (
    <div className="preview-page">
      {renderPage(page, src)}
      {canRegenerate ? (
        <button
          type="button"
          className="preview-page__regen"
          onClick={onRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <span className="gen-dots" aria-hidden>
              <span className="gen-dot" />
              <span className="gen-dot" />
              <span className="gen-dot" />
            </span>
          ) : (
            regenerateIcon
          )}
          {regenerating ? "Painting…" : "Regenerate"}
        </button>
      ) : null}
    </div>
  );
}
