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

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { PageView } from "@/components/preview/PageView";
import type { PageId } from "@/lib/story/master-text";
import { clean, type ResolvedStory } from "@/lib/story/merge";
import {
  EDITABLE_FIELDS,
  type EditableField,
  editableFieldsForPage,
} from "@/lib/story/editable-fields";

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
type FieldValues = Record<EditableField, string>;

/** A blank value for every editable field, so the editors always have a string. */
function emptyFieldValues(): FieldValues {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, ""]),
  ) as FieldValues;
}

interface PreviewData {
  pages: ResolvedStory;
  images: ImageMap;
  petName: string;
  childName: string;
  fields: FieldValues;
}

interface PreviewResponse {
  ok: boolean;
  pages?: ResolvedStory;
  images?: ImageMap;
  petName?: string;
  childName?: string;
  fields?: Partial<FieldValues>;
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

/** Printed page width in CSS px (8.5in @ 96dpi). The preview .story-page renders
 *  at this real size, then `zoom: --preview-scale` shrinks it to its column. */
const PRINT_PAGE_PX = 816;

export function BookPreview({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [images, setImages] = useState<ImageMap>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  // The <main> we set the per-column --preview-scale on (cascades to every page).
  const mainRef = useRef<HTMLElement | null>(null);

  const [regenerating, setRegenerating] = useState<PageId | null>(null);
  const [savingText, setSavingText] = useState(false);
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
          fields: { ...emptyFieldValues(), ...(body.fields ?? {}) },
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

  // True-scale preview: measure a real spread cell and set --preview-scale so the
  // print-sized .story-page (816px) zooms down to fit its column exactly. The
  // .spread columns are minmax(0, 1fr), so a cell's width is half the row (minus
  // gap) and does NOT depend on the zoomed page inside it — no measure↔zoom loop.
  // Re-measures on resize and at the responsive (≤900px) single-column breakpoint.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || !data) {
      return;
    }
    const cell = main.querySelector<HTMLElement>(".preview-page");
    if (!cell) {
      return;
    }
    let lastWidth = 0;
    const apply = () => {
      const width = cell.clientWidth;
      if (width > 0 && width !== lastWidth) {
        lastWidth = width;
        main.style.setProperty("--preview-scale", String(width / PRINT_PAGE_PX));
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(cell);
    return () => observer.disconnect();
  }, [data]);

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

  // Persist one edited free-text field. On success the server returns the WHOLE
  // re-resolved book (a name edit changes every page), so we replace `pages` and
  // the header names, and update our raw `fields` so the editor stays in sync.
  // Returns true on success so PageView can keep its editor open on failure.
  async function handleSaveText(
    field: EditableField,
    value: string,
  ): Promise<boolean> {
    if (savingText) {
      return false;
    }
    setActionError(null);
    setSavingText(true);
    try {
      const res = await fetch("/api/update-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, field, value }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        pages?: ResolvedStory;
        petName?: string;
        childName?: string;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.pages) {
        setActionError(
          body.error === "field_required"
            ? "That part of the story can't be left empty. Please add a few words."
            : "We couldn't save that change just now. Please try again.",
        );
        return false;
      }
      const resolvedPages = body.pages;
      // Mirror the server's `clean()` locally so the editor re-fills with exactly
      // what was persisted (no double spaces, stripped braces).
      const persisted = clean(value);
      setData((current) =>
        current
          ? {
              ...current,
              pages: resolvedPages,
              petName: body.petName ?? current.petName,
              childName: body.childName ?? current.childName,
              fields: { ...current.fields, [field]: persisted },
            }
          : current,
      );
      // The book changed, so any prior download meta is stale.
      setDownloadMeta(null);
      return true;
    } catch {
      setActionError("We couldn't save that change just now. Please try again.");
      return false;
    } finally {
      setSavingText(false);
    }
  }

  async function handleDownload() {
    // Don't render the PDF while a page is mid-repaint or a text save is in
    // flight: the change isn't persisted to disk until the call resolves, so the
    // download would capture the stale book. Wait for those to finish first.
    if (downloading || regenerating || savingText) {
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
    <main ref={mainRef}>
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
            disabled={downloading || regenerating !== null || savingText}
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
                  editableFields={editableFieldsForPage(page.id)}
                  fieldValues={data.fields}
                  saving={savingText}
                  onSaveText={handleSaveText}
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
          disabled={downloading || regenerating !== null || savingText}
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
