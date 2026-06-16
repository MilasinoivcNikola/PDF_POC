# Feature Spec — Heart-Book Logo (replace the text wordmark)

## Summary

Replace the placeholder paw ornament that currently sits beside the "Dearbound"
text wordmark with a real **logo**: the **"Open Heart-Book"** glyph (Direction 03,
locked in `context/prototypes/004-heart-book-lockup/`). The wordmark word itself
becomes **letter-spaced small-caps** (treatment D). The glyph **tints by audience**
(gold on living/celebration pages, rose on loss/memorial pages, neutral ink
everywhere else), and the **favicon** is replaced with the same heart-book mark.

This is **presentation-only chrome**. No engine, no PDF template, no commerce
surface, no route-graph/boundary change. Single PR.

**Design source of truth:** `context/prototypes/004-heart-book-lockup/index.html`
(the locked glyph geometry, the three tint states, the favicon-optimized redraw, and
the four wordmark treatments) + its `NOTES.md`. Lift the SVG path data from there
rather than re-drawing.

## Decisions (locked with PM)

| Decision | Choice |
|----------|--------|
| Logo direction | **03 — Open Heart-Book** (book pages forming a heart) |
| Glyph color | **Two-worlds tint** — neutral ink in the global header; gold on living pages, rose on loss pages |
| Favicon | **Keep the heart-book** at favicon scale (the size-tuned redraw from 004), transparent background |
| Wordmark type | **D — letter-spaced small-caps "Dearbound"** |

## Goals

1. Swap the paw ornament for the locked heart-book glyph in the header and footer wordmark.
2. Set the "Dearbound" wordmark in letter-spaced small-caps (treatment D).
3. Tint the **header** glyph by audience: gold (living) / rose (loss) / neutral ink (default).
4. Replace the favicon (`app/icon.svg`) with the heart-book mark.
5. Zero change to any non-chrome surface — PDFs byte-identical, boundary test green.

## Implementation plan

### 1. Extract the glyph into one shared, client-safe component

The paw path is currently **inlined three times** (`components/site/SiteHeader.tsx`,
`components/site/SiteFooter.tsx`, and `app/icon.svg`). Don't perpetuate that.

- New `components/site/HeartBookMark.tsx` — a `"use client"`-free, **client-safe**
  named export (`HeartBookMark`) returning the locked inline SVG (path data lifted
  from the 004 mockup's main lockup). Same discipline as `SiteHeader`/`SiteFooter`:
  imports nothing but is pure presentational — stays in the public route graph
  (boundary test must remain green; it walks the public import closure).
- Props: `className?` (so the header/footer can size it via the existing
  `.wordmark__ornament` class). The fill uses `currentColor` so color is driven by
  CSS (see tint, below) — keep the `fill="currentColor"` pattern the paw already used.
- Keep the `viewBox` the mockup uses; the visual box still maps onto the 20×20
  ornament slot (`.wordmark__ornament` is `width/height: 20px`).

### 2. Wire it into header + footer

- `SiteHeader.tsx` / `SiteFooter.tsx`: delete the inline `<svg className="wordmark__ornament">…`
  paw and render `<HeartBookMark className="wordmark__ornament" />` in its place.
  Everything else (the `BRAND` text, the `Link`, nav) is unchanged.

### 3. Two-worlds tint (header only)

The header is one shared component, so the audience must be passed in:

- Add an optional prop to `SiteHeader`: `accent?: "living" | "loss"`.
  - default (unset) → neutral: glyph inherits the wordmark's ink color (today's behavior).
  - `"living"` → glyph colored `var(--gold)`.
  - `"loss"` → glyph colored `var(--rose)`.
- Implement as a modifier class on the ornament, e.g. `.wordmark__ornament--living { color: var(--gold) }`
  / `--loss { color: var(--rose) }` (the SVG fills `currentColor`, so set `color`).
  Add the two rules in `app/globals.css` next to the existing `.wordmark__ornament`.
- **Where the prop is set:** the **book detail page**
  (`app/(public)/books/[productId]/page.tsx`) already knows the product's
  `audience` (gold living / rose loss tint is used there) — pass
  `accent={audience === "living" ? "living" : "loss"}` into its `SiteHeader`.
  All other pages (landing, `/books` catalog spanning both worlds, policies, order,
  download, confirmation) leave `accent` unset → **neutral**, matching the "global
  header stays neutral" decision.
- **Footer glyph stays neutral** everywhere (the footer is one shared component on
  every page with no per-page audience; tinting it per-page is out of scope and the
  004 mockup only tinted the header). This resolves the designer's open question in
  favor of neutral.

### 4. Wordmark type → small-caps (treatment D)

- In `app/globals.css`, update `.wordmark`: add `font-variant-caps: small-caps;`
  and bump `letter-spacing` to the tracked value from the 004 mockup (the mockup is
  the reference for the exact em value). Keep the existing Fraunces
  `font-variation-settings`. This applies to both header and footer wordmarks (both
  use `.wordmark`), which is the intended consistent treatment.

### 5. Favicon

- Replace `app/icon.svg` with the heart-book — use the **favicon-optimized redraw**
  from 004 (the size-tuned variant, not the large lockup), on a transparent
  background per the decision. Keep the rounded `--surface`/`#FBF7EE` chip the
  current icon uses unless we choose transparent at build (see open question below).
- **Dark-tab fallback (designer-flagged):** the 16px mark can wash out on dark
  browser-tab chrome. Add a `@media (prefers-color-scheme: dark)` block inside the
  SVG that lightens the ink / adds a faint outline so it stays legible. (Pending the
  open question below — if PM accepts some dimming we ship a single drawing.)
- **Multi-size (designer-flagged, optional in this PR):** Next.js serves `app/icon.svg`
  at all sizes from one file. The 004 note recommends a true multi-size `.ico` so
  16/32/48 each use their tuned drawing. Treat the SVG swap as required; a tuned
  multi-size `.ico` is a nice-to-have we can fold in or defer to debt — call it at build.

## Out of scope / related but not this PR

- The catalog page's `PawMark` placeholder (`app/(public)/books/page.tsx:55`) — the
  decorative fallback shown for sample-less books. All 8 titles now carry samples
  (Milestone 17), so it rarely renders, and it's a placeholder, not the brand logo.
  Leaving it as-is keeps scope tight; swapping it to the heart-book is a follow-up if
  PM wants full paw-removal. **Flag at review.**
- No copy, layout, pricing, PDF, or route changes.

## Open build-time questions (don't block starting; resolve during build)

1. **Favicon dark-tab fallback:** faint outline / lighter ink in `prefers-color-scheme:
   dark` (recommended), **or** ship pure transparent ink and accept some dimming on
   dark tabs?
2. **Favicon chip:** keep the rounded cream chip (current `icon.svg` style) **or** go
   fully transparent (the decision said transparent background — confirm we drop the chip)?
3. **Multi-size `.ico`:** ship a tuned 16/32/48 `.ico` set in this PR, or defer to
   `debt.md` and ship the single tuned SVG now?

## Testing & verification

- `npm run test:run` and `npm run build` must pass.
- **Boundary test** (`lib/runtime/surface.boundary.test.ts`) must stay green — the new
  `HeartBookMark` is client-safe and must not pull anything into the public graph.
- No new unit tests strictly required (pure presentational SVG/CSS), but a small
  guard that `HeartBookMark` renders is fine and cheap.
- **QA in the browser** (the chrome is on every public page): confirm the glyph
  renders in header + footer, the small-caps wordmark reads correctly, the book-detail
  header tints gold (a living title) and rose (a memorial title) while landing/catalog
  stay neutral, and the favicon shows in the tab. PDFs are untouched → byte-identical
  (no PDF re-render needed).

## Risk

Low. Presentational chrome on already-extracted shared components; the heaviest
"logic" is one optional `accent` prop threaded into a single page. The one thing to
watch is the boundary test (keep the new component import-clean).
