"use client";

// The in-browser book — feature 10's "done". Given a finalized session id, it
// fetches the resolved story + the generated-illustration data-URL map from
// /api/preview (server-side reads the session JSON + PNGs), lays the pages out as
// the facing-page spreads of prototypes/preview.html, and offers:
//   - a per-page "Regenerate an illustration" control (POST /api/regenerate-
//     illustration) that re-paints ONE page and swaps it in place, and
//   - a "Download PDF" button (POST /api/render-pdf) that streams the print-
//     quality Letter PDF and shows its real filename · size afterwards.
//
// The resolved copy comes from the same feature-03 `resolveStory` the PDF uses,
// and each page renders through the shared per-page template (lib/pdf/pages via
// PageView), so what the user sees here equals what the PDF contains.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PageView } from "@/components/preview/PageView";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";

/** Page slots that carry a regenerate-able illustration (back cover is text). */
const ILLUSTRATED_PAGES = new Set<PageId>([
  "cover",
  "page-1",
  "page-2",
  "page-3",
  "page-4",
  "page-5",
  "page-6",
  "page-7",
  "page-8",
  "page-9",
  "page-10",
  "page-11",
  "page-12",
]);

type ImageMap = Partial<Record<PageId, string>>;

interface PreviewData {
  pages: ResolvedStory;
  images: ImageMap;
  petName: string;
  childName: string;
}

interface PreviewResponse {
  ok: boolean;
  pages?: ResolvedStory;
  images?: ImageMap;
  petName?: string;
  childName?: string;
  error?: string;
}

interface DownloadMeta {
  filename: string;
  /** Rendered byte length, for the "· N.N MB" meta. */
  bytes: number;
}

/** A short human label for a spread, shown above each facing pair. */
function spreadLabel(left: PageId, right?: PageId): string {
  const isCover = left === "cover";
  if (isCover) {
    return "Cover & Dedication";
  }
  if (right === "back-cover" || left === "back-cover") {
    return "Closing & A place to remember";
  }
  const num = (id: PageId) => id.replace("page-", "");
  return right ? `Pages ${num(left)} & ${num(right)}` : `Page ${num(left)}`;
}

/** Format a byte count as a compact "N.N MB" string for the download meta. */
function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function BookPreview({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [images, setImages] = useState<ImageMap>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [regenerating, setRegenerating] = useState<PageId | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMeta, setDownloadMeta] = useState<DownloadMeta | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch the resolved pages + generated images once on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/preview?id=${encodeURIComponent(sessionId)}`,
        );
        const body = (await res.json()) as PreviewResponse;
        if (cancelled) {
          return;
        }
        if (!res.ok || !body.ok || !body.pages) {
          setLoadError(
            body.error === "session_not_found"
              ? "We couldn't find this book. It may not have finished generating yet."
              : "We couldn't load your book just now. Please try again.",
          );
          return;
        }
        setData({
          pages: body.pages,
          images: body.images ?? {},
          petName: body.petName ?? "your pet",
          childName: body.childName ?? "",
        });
        setImages(body.images ?? {});
      } catch {
        if (!cancelled) {
          setLoadError("We couldn't load your book just now. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Group the resolved pages into facing-page spreads of two.
  const spreads = useMemo(() => {
    const pages = data?.pages ?? [];
    const out: ResolvedStory[] = [];
    for (let i = 0; i < pages.length; i += 2) {
      out.push(pages.slice(i, i + 2));
    }
    return out;
  }, [data]);

  async function handleRegenerate(page: PageId) {
    if (regenerating) {
      return;
    }
    setActionError(null);
    setRegenerating(page);
    try {
      const res = await fetch("/api/regenerate-illustration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, page }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        image?: string;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.image) {
        setActionError(
          "We couldn't repaint that illustration just now. Please try again.",
        );
        return;
      }
      // Swap only this page's image in place; a fresh PDF will pick it up too.
      setImages((current) => ({ ...current, [page]: body.image }));
      // The book changed, so any prior download meta is stale.
      setDownloadMeta(null);
    } catch {
      setActionError(
        "We couldn't repaint that illustration just now. Please try again.",
      );
    } finally {
      setRegenerating(null);
    }
  }

  async function handleDownload() {
    // Don't render the PDF while a page is mid-repaint: the new image isn't
    // persisted to the manifest until regenerate resolves, so the download would
    // capture the pre-repaint book. Wait for the regenerate to finish first.
    if (downloading || regenerating) {
      return;
    }
    setActionError(null);
    setDownloading(true);
    try {
      const res = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId }),
      });
      if (!res.ok) {
        setActionError(
          "We couldn't build your PDF just now. Please try again in a moment.",
        );
        return;
      }
      const blob = await res.blob();
      const filename =
        parseFilename(res.headers.get("Content-Disposition")) ??
        "Saying-Goodbye.pdf";

      // Trigger the browser download from the streamed bytes.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDownloadMeta({ filename, bytes: blob.size });
    } catch {
      setActionError(
        "We couldn't build your PDF just now. Please try again in a moment.",
      );
    } finally {
      setDownloading(false);
    }
  }

  if (loadError) {
    return (
      <main className="wizard" style={{ textAlign: "center", maxWidth: "40em" }}>
        <p className="notice" style={{ margin: "var(--s-16) auto 0" }}>
          {loadError}
        </p>
        <p className="mt-8">
          <Link href="/create/generate" className="btn-link">
            &larr; Back to generating
          </Link>
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="wizard" style={{ textAlign: "center" }}>
        <p className="lede" style={{ margin: "var(--s-16) auto 0" }}>
          Gathering your book…
        </p>
      </main>
    );
  }

  const petName = data.petName.trim() || "your pet";

  return (
    <main>
      <section className="preview-header fade-in">
        <span className="label label--gold">Your book is ready</span>
        <h1 className="display-md" style={{ marginTop: "var(--s-4)" }}>
          <em>{petName}&apos;s</em> story is yours to keep.
        </h1>
        <p>
          A first look at all the pages, exactly as they&apos;ll appear in your
          PDF. Take your time — you can regenerate any illustration that
          doesn&apos;t feel right.
        </p>
        <div className="preview-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleDownload}
            disabled={downloading || regenerating !== null}
          >
            {downloading ? "Building your PDF…" : "Download PDF"}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M7 1v9m0 0L3 6m4 4l4-4M1 13h12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {actionError ? (
          <p className="notice" style={{ maxWidth: "34em", margin: "var(--s-6) auto 0" }}>
            {actionError}
          </p>
        ) : null}
      </section>

      {spreads.map((spread) => {
        const left = spread[0];
        const right = spread[1];
        return (
          <section className="spread" key={left.id}>
            <div className="spread__label">
              {spreadLabel(left.id, right?.id)}
            </div>
            {spread.map((page) => {
              const canRegenerate = ILLUSTRATED_PAGES.has(page.id);
              return (
                <PageView
                  key={page.id}
                  page={page}
                  src={images[page.id]}
                  canRegenerate={canRegenerate}
                  regenerating={regenerating === page.id}
                  onRegenerate={() => handleRegenerate(page.id)}
                />
              );
            })}
            {/* keep a lone page in the left column of the grid */}
            {!right ? <div aria-hidden /> : null}
          </section>
        );
      })}

      <section className="download-final" id="download">
        <span className="label label--gold">Take it with you</span>
        <h2 style={{ marginTop: "var(--s-4)" }}>Your book is ready.</h2>
        <p>
          A printable PDF, ready to print at home, at a print shop, or kept on
          your device.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleDownload}
          disabled={downloading || regenerating !== null}
        >
          {downloading ? "Building your PDF…" : "Download PDF"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M7 1v9m0 0L3 6m4 4l4-4M1 13h12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {downloadMeta ? (
          <p className="download-meta">
            {downloadMeta.filename} · 8.5 × 11 inches · {formatBytes(downloadMeta.bytes)}
          </p>
        ) : (
          <p className="download-meta">8.5 × 11 inches · Letter</p>
        )}
      </section>
    </main>
  );
}

/** Pull the filename out of a Content-Disposition header, if present. */
function parseFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1] : null;
}
