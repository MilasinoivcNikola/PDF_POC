# 04 — PDF Template & Print CSS

> **Craft Area:** 1 — PDF pipeline · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 1 · **Depends on:** 03
> **Branch:** `feature/pdf-template`

## Status

Not Started

## Goals

- A React component that turns a `ResolvedStory` (+ per-page image paths) into a single print-ready HTML document: cover, dedication, 12 story pages, back cover.
- Print CSS that produces clean, predictable page boundaries at Letter size (8.5×11"), with fonts embedded so the PDF looks identical on any machine.
- Visual fidelity to the `prototypes/preview.html` spreads — same warm editorial look, the same per-page treatments (cover, bond pages, the gentle-truth page, love-stays, closing).
- Images sized/placed for 300 DPI print output.

## Scope

**In scope**
- `lib/pdf/template.tsx` — a React component (rendered to an HTML string via `react-dom/server` `renderToStaticMarkup`) that lays out all pages from the resolved story model. One `.story-page` section per page; pulls copy from feature 03 and image `src` from the manifest (placeholder paths acceptable until feature 07).
- `lib/pdf/styles.css` — print-optimized CSS:
  - `@page { size: 8.5in 11in; margin: ... }` and `preferCSSPageSize`-friendly rules.
  - `page-break-after: always` / `break-inside: avoid` for precise page boundaries; last page no trailing blank.
  - `@font-face` embedding Fraunces / Lora / JetBrains Mono from local font files (base64 or file URLs Puppeteer can read) — **do not** rely on Google Fonts at render time.
  - 300 DPI image sizing guidance (physical inches, not px), `print-color-adjust: exact` so background washes/colors render.
  - Port the relevant `.book-page*` / cover / page-treatment styles from `prototypes/styles.css` and `preview.html`, adapted from screen to print.
- A typed input contract: `renderStoryHtml(story: ResolvedStory, images: PageImageMap): string`.

**Out of scope**
- Launching Puppeteer / producing the actual PDF bytes (feature 05).
- Generating the illustrations (feature 07) — use placeholder gray rectangles / the prototype's SVG art for now.
- The on-screen preview page (feature 10 reuses this template but for screen).

## Implementation notes

**Key decisions**
- **Build the template so it serves both PDF and screen.** Feature 10's in-browser preview should reuse this same component; keep print-only concerns in `styles.css` (print media / `@page`) and avoid hard-coding anything that blocks screen reuse.
- Self-host fonts (download the three families into the repo, e.g. `public/fonts/` or `lib/pdf/fonts/`) and embed via `@font-face`. This is what makes the PDF portable and is a core learning goal of the plan.
- Mirror the page treatments already designed in `preview.html`: cover with pet art + "A story for [child]", dedication, bond pages with art + body, the Page 7 "gentle truth" centered treatment, Page 10 love-stays, Page 12 closing. Reuse those class names where practical.
- Letter (8.5×11") is the default; leave the square 8×8" option as a future toggle (note it, don't build it).

**Files**
- `lib/pdf/template.tsx`
- `lib/pdf/styles.css`
- self-hosted font files (location your call; keep them out of `node_modules`)

## References

- @prototypes/preview.html — the page-by-page visual target (cover through closing).
- @prototypes/styles.css — `.book-page*`, cover, and token styles to adapt for print.
- @context/saying-goodbye-to-otis.pdf — the finished-PDF reference for layout/typography feel.
- @context/local-prototype-plan.md — "Craft Area 1" (print CSS, `@page`, page breaks, DPI, font embedding).
- Use context7 for current print-CSS / `@page` behavior in headless Chrome if needed.

## Done when

- [ ] `renderStoryHtml()` returns a complete HTML doc with cover + 12 pages + back cover.
- [ ] Print CSS yields exactly one page per `.story-page` (verify in Chrome Print Preview / via the feature 05 debug PDF).
- [ ] Fonts are embedded via `@font-face`; no external font requests at render time.
- [ ] Layout visually matches `preview.html` spreads.
- [ ] `npm run build` passes.

## Tests

- `test-author`: `renderStoryHtml()` is pure → assert the HTML contains each page's resolved copy, the right number of `.story-page` sections, and image `src`s from the manifest.
- Visual verification happens in feature 05 (the first real PDF) and via `qa`.
