# Book-Detail Redesign PR-2: Gallery (single-image carousel lightbox)

**Branch:** `feature/book-detail-redesign-pr2-gallery`
**Date:** 2026-06-16
**Milestone:** 18 — Book-detail redesign (second of three PRs)

## What shipped

The detail page (`/books/[productId]`) no longer renders **all** `sampleImages` as a
flat grid. It now shows **one** large featured illustration at a time, with a carousel
**lightbox** for browsing the full set — the PM's "see one illustration at a time, click
to enlarge, arrow through the rest" experience. Presentation-only: no data, engine, or
commerce change, and it reuses the `sampleImages` that already exist (no asset work —
that was PR-1). Independent of PR-1/PR-3.

### New `components/site/BookGallery.tsx` (`"use client"` leaf island)

The second non-chrome member of `components/site/` (beside `SiteHeader`/`SiteFooter`).
Props are plain values from the Server Component page: `sampleImages: string[]`,
`title: string` (alt text + lightbox title), `audience: "living" | "loss"` (carries the
gold-living / rose-loss accent via a `joyful` modifier class).

- **On-page featured viewer:** one large image (index 0 = cover by default), on-image
  prev/next arrows that step the set **in place**, a `1 / N` counter pill, a floating
  page-tag caption (top-left), and a "View all N illustrations" trigger.
- **Lightbox overlay:** the selected image large + centered, flanking arrow buttons + a
  counter in the caption, a top bar (title `Inside "{title}"` + "← → to browse · Esc to
  close" hint + close button), backdrop-click-to-close, Esc-to-close, ←/→ one-at-a-time
  nav, and a thin quick-jump thumbnail strip (active-dot tracked). Opens **at the current
  featured index**, not reset to 1.
- **Accessibility:** `role="dialog"` + `aria-modal` + `aria-labelledby`, focus moved into
  the overlay on open, **focus trap** (Tab/Shift+Tab cycle), **focus restored** to the
  trigger on close, `body` scroll-lock while open, all controls labelled — listener and
  scroll-lock both cleaned up on unmount/close.
- **Degradation:** single-image titles hide the arrows; the 2-image pair is a 2-stop
  carousel rendered un-cropped (`object-fit: contain` via a `pair` variant); the
  paw-mark placeholder fallback (empty `sampleImages`) now lives here, owning the
  sample-less case (the markup moved out of the page).

### Pure helper `components/site/galleryCaption.ts` (+ `.test.ts`)

Factored the testable logic out of the React tree (coding-standards: test pure utilities,
not rendering): `wrapIndex(n, total)` (modulo wrap, `total<=0 → 0`) and
`captionForImage(src, i)` ("The cover" at index 0 / "Page N" from a trailing `…page-N`
stem across prefixes / "Illustration {i+1}" fallback). The caption reads the **real slot
stem**, so Story 2's `letter-page-5` second sample reads "Page 5" (non-sequential but
truthful). 8 unit tests.

### Co-located `components/site/BookGallery.module.css`

Gallery + lightbox CSS ported from the prototype
(`context/prototypes/002-book-detail-gallery-questions/styles.css`), BEM → camelCase,
existing design tokens only (no hardcoded hexes that already have a token).

### Page wiring

`app/(public)/books/[productId]/page.tsx` replaced the inline `styles.gallery` block with
`<BookGallery sampleImages={…} title={title} audience={product.audience} />` and dropped
the now-unused `PawMark` function. The orphaned `.gallery*`/`.galleryPlaceholder`/
`.galleryPaw` rules were removed from `page.module.css`. Info column, facts, CTA, PDF
link, and the Story 2↔5 companion callout are untouched.

## Verification

- `npm run test:run`: **2135 passed** (+8 new gallery-helper tests).
- `npm run build`: clean; **`● /books/[productId]` stayed SSG** (all products
  prerendered, 45 static pages) — the `createPortal` lightbox is a client island that
  no-ops until mount, so the static tier held.
- Boundary test (`lib/runtime/surface.boundary.test.ts`) green — the page's public import
  closure walks `BookGallery`, which imports nothing engine/server-side.

## Review

- **code-reviewer:** PASS, no blockers. Verified wrap-around, caption derivation,
  single/empty/2-image degradation, full lightbox a11y, SSG hold, token reuse, and that
  the orphaned styles were removed. Three nice-to-haves; the mislabeled test-describe
  block was fixed (the `letter-page-5` assertion moved to the page-N block).
- **context-auditor:** IN SYNC. One low-priority doc gloss fixed — `coding-standards.md`'s
  `components/site/` description now lists `BookGallery` alongside the chrome. Both
  sanctioned deviations verified non-drift.
- **commerce-security-reviewer:** not dispatched (presentation-only; no commerce surface).

## QA (Playwright, $0)

First pass found **two real blocker bugs**, both from the lightbox being rendered inside
the `position: sticky` gallery wrapper:

1. **Lightbox z-index trapped** — `fixed; z-index: 50` was confined to the sticky
   gallery's stacking context, so the sibling sticky `.info` column painted **over** the
   right half of the overlay and the Next arrow was unclickable by mouse (keyboard still
   worked via the document listener). **Fix:** `createPortal` the overlay to
   `document.body` (gated on a `mounted` flag so SSG prerender never touches `document`).
2. **Backdrop-click never fired** — the `e.target === e.currentTarget` gate was on the
   dialog root, but its flex children tile the whole dialog, so the root is never the
   click target. **Fix:** moved the gated close handler onto the `.lightboxStage` gutter
   (children — figure/image/arrows — are not `currentTarget`, so they don't close).

Re-QA: both fixes verified in-browser via coordinate hit-tests (Next-arrow topmost
element is the button's svg, not a `<p>`; gutter-click topmost is the stage div and
closes), with no regression to open-at-current-index, keyboard ←/→/Esc, focus
trap/restore, scroll-lock, counter, thumb-strip, the 2-image pair, or the gold/rose
accent. Zero runtime console errors across Story 1 (13) / Story 7 (8) / Story 5 (2).

## Deviations (both sanctioned)

1. Lightbox via **conditional render + portal** rather than an `is-open` display class —
   cleanest in React and the only correct fix for the z-index trap.
2. The prototype's `--gold-faint` token does not exist in `app/globals.css`; used the
   existing `--gold-soft` (the same gold tint the catalog/detail placeholder already
   uses) rather than inventing a token. Documented in the module header.

## Not done here

- The questions / example / source-photo section is **PR-3**.
- The empty-samples paw placeholder was not live-QA'd (all 8 titles ship samples, so it's
  unreachable via a real product) — covered by code review + the component's `total === 0`
  branch.
