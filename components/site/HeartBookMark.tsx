// The Dearbound brand glyph — the "Open Heart-Book" (Direction 03, locked in
// `context/prototypes/004-heart-book-lockup/`): an open book whose two facing
// pages rise into the lobes of a heart, a center spine, and the open covers
// spreading at the base. Replaces the placeholder paw ornament in the header +
// footer wordmark. Path data lifted verbatim from the 004 mockup's header lockup
// (the inner page-lines are dropped at this size, matching the mockup).
//
// CLIENT-SAFE by design: imports nothing — pure presentational SVG — so it stays
// in the public route graph without pulling the engine in (boundary test). Same
// discipline as SiteHeader/SiteFooter.
//
// The strokes fill `currentColor` so color is CSS-driven: the wordmark's ink by
// default, or the two-worlds tint set via the `.wordmark__ornament--living/--loss`
// modifier classes (see app/globals.css). The soft page-wash stays `--rose-faint`
// so the heart always reads warm, never like a different logo.

interface HeartBookMarkProps {
  /** Sizes/colors the glyph via the existing `.wordmark__ornament` slot. */
  className?: string;
}

export function HeartBookMark({ className }: HeartBookMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 46 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M23 12 C23 6 17 4 13 7 C9 10 10 15 23 24 C36 15 37 10 33 7 C29 4 23 6 23 12 Z"
        fill="var(--rose-faint)"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M23 12 L23 36" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M23 36 C18 31 11 30 5 32 L5 19 C11 17 18 18 23 23"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M23 36 C28 31 35 30 41 32 L41 19 C35 17 28 18 23 23"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
