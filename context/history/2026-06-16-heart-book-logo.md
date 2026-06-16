# Heart-Book Logo — replace the text wordmark

**Branch:** `feature/heart-book-logo`
**Date:** 2026-06-16
**Milestone:** 19 — Brand logo

## What shipped

Replaced the placeholder paw ornament that sat beside the "Dearbound" text wordmark
with a real **logo**: the **"Open Heart-Book"** glyph — an open book whose two facing
pages rise into the lobes of a heart, over a centre spine and spreading covers. The
wordmark word itself is now set in **letter-spaced small-caps**. Presentation-only
chrome; no engine, PDF, commerce, or route-graph change.

## How it got here (design phase)

Two designer-agent rounds, both proposal-only HTML mockups under
`context/prototypes/`:

- `003-logo-concepts/` — five directions (Refined Paw, Bound Spine, **Open
  Heart-Book**, Tucked Paw, Monogram), each shown in the live nav, on light/gold/rose
  surfaces, and at favicon scale. PM chose **Direction 03 — Open Heart-Book**.
- `004-heart-book-lockup/` — locked Direction 03: the glyph, the two-worlds tint
  states, a favicon-optimized redraw, and four wordmark treatments. PM picked the
  designer's recommended **treatment D — letter-spaced small-caps**.

Spec written to `context/features/heart-book-logo.md` before any code.

## Implementation (Craft Area 3 — nextjs-ui-builder)

- **New `components/site/HeartBookMark.tsx`** — a client-safe, zero-import named
  export returning the locked inline heart-book SVG (path data lifted verbatim from
  the 004 mockup). The single source for the glyph — it had been inlined three times
  (header, footer, favicon). Strokes fill `currentColor` so colour is CSS-driven; the
  heart's soft fill stays `--rose-faint` so it always reads warm. Same client-safe
  discipline as `SiteHeader`/`SiteFooter`, so the public route graph stays engine-free
  (boundary test auto-covers it via the public import closure).
- **`SiteHeader.tsx` / `SiteFooter.tsx`** — swapped the inline paw `<svg>` for
  `<HeartBookMark className="wordmark__ornament" />`.
- **Two-worlds tint (header only).** `SiteHeader` gained an optional
  `accent?: "living" | "loss"` prop → `.wordmark__ornament--living { color: var(--gold) }`
  / `--loss { color: var(--rose) }` in `app/globals.css`. Only the **book-detail page**
  (`app/(public)/books/[productId]/page.tsx`) sets it, from the product's `audience`.
  Every other page leaves it unset → neutral ink; the **footer glyph stays neutral
  everywhere** (resolved the designer's open question toward neutral).
- **Wordmark small-caps.** `.wordmark` gained `font-variant-caps: small-caps` +
  `letter-spacing: 0.1em` (applies to both header and footer — intended).
- **Favicon.** `app/icon.svg` redrawn as the favicon-tuned heart-book on the existing
  rounded cream chip, with a `prefers-color-scheme: dark` block so it stays legible on
  dark tab chrome.

## Alignment fix (PM-caught during review)

The new glyph's `46×42` viewBox is taller than the wordmark's cap height, and the
wordmark is a **flex** container where the inherited `vertical-align: -3px` is inert —
so the glyph rode ~3–4px above the caps. Fixed by replacing the dead `vertical-align`
with `transform: translateY(3px)` on `.wordmark__ornament`. Verified by measurement,
not eyeball: the glyph's art centre (45.9px) now lands within ~0.1px of the text's
cap-height centre (45.8px). Applies to header + footer and is independent of the tint.

## Verification

- **Review:** code-reviewer **PASS** (zero findings); context-auditor **DRIFT
  FOUND → resolved** (widened the `site/` gloss in `coding-standards.md` to include
  `HeartBookMark`). No commerce surface → no security reviewer.
- **QA (qa-verifier, Playwright, $0 spend): 6/6 PASS** — neutral glyph + small-caps
  wordmark on landing, **gold** header on a living detail page, **rose** on a memorial
  one, neutral `/books` catalog header, neutral footer under a tinted header, favicon
  serves 200.
- **Tests** 2135 pass · **build** clean · route tiers held (`●` SSG detail, `○` static
  `/books` + `/icon.svg`). PDFs untouched → byte-identical.

## Deferred

- A tuned **multi-size `.ico`** (16/32/48) — shipped the single tuned SVG; the 16px is
  near its legibility floor per the 004 note, and browsers probe `/favicon.ico` →
  harmless 404. Logged to `context/debt.md`.

## Out of scope (deliberate)

- The catalog page's `PawMark` placeholder (`app/(public)/books/page.tsx`) — a
  decorative empty-gallery fallback, not the brand mark, and rarely rendered now that
  all 8 titles carry samples. Left as-is; confirmed deliberate at review.
