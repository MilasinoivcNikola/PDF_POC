// Pure, client-safe helpers for BookGallery (book-detail PR-2). Kept out of the
// "use client" component so they're unit-testable without React rendering
// (coding-standards: test pure utilities, not the React tree).

/**
 * Wrap-around index for the one-at-a-time carousel. `go(n)` normalizes any
 * integer step (including the off-the-end `i + 1` / `i - 1` from next/prev) back
 * into `[0, total)` via the standard `(n + total) % total` so the carousel loops.
 * `total === 0` collapses to 0 (the placeholder case has no images to index).
 */
export function wrapIndex(n: number, total: number): number {
  if (total <= 0) return 0;
  return ((n % total) + total) % total;
}

/**
 * The floating page-tag / lightbox caption for sample image `i`:
 *   - index 0 is always the cover;
 *   - a filename ending in `…page-N` (any prefix: `page-`, `baby-page-`,
 *     `welcome-page-`, `talk-page-`, …) reads as "Page N";
 *   - anything else falls back to "Illustration {i+1}".
 * `src` is the public path (`/samples/<id>/cover.jpg`); we match on the file stem.
 */
export function captionForImage(src: string, i: number): string {
  if (i === 0) return "The cover";
  const stem = src.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "";
  const match = stem.match(/page-(\d+)$/i);
  if (match) return `Page ${match[1]}`;
  return `Illustration ${i + 1}`;
}
