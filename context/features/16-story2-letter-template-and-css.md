# 16 — Story 2: Letter PDF Template & Print CSS

> **Craft Area:** 1 — PDF pipeline · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 7 — Story 2 · **Phase:** 2 · **Depends on:** 15
> **Branch:** `feature/story2-letter-template`

## Status

Not Started

## Goals

- Turn a resolved Story-2 `ResolvedStory` into a self-contained, print-ready **6-page letter** HTML, rendered to PDF by the existing Puppeteer core — a reverent typeset keepsake where "white space is the design."
- Reuse `renderStoryHtml` + the font-inlining mechanism + `renderStoryPdf` as-is; add only the **letter-layout page components** and the **letter print CSS**, dispatched via feature 14's `layout` tags.

## Scope

**In scope**
- Letter page components keyed on the letter layouts (e.g. `letter-cover`, `letter-opening`/salutation, `letter-body`, `letter-signature`) — in `lib/pdf/pages.tsx` (extend the layout switch) or a sibling `lib/pdf/pages-story2.tsx` imported by the same switch.
- Letter print CSS in `lib/pdf/styles.css`: 8.5×11 portrait, **1.25" margins**, **no page numbers**, **no keepsake frame**, cream / off-white background (never pure white), refined serif body, generous leading (~1.5), salutation + signature hierarchy, optional small ornament on the cover only. Scope it under a `.letter-page` class so Story-1's `.story-page` geometry is untouched (new tokens, e.g. `--page-margin-letter: 1.25in`).
- Wire Story-2's filename (`Letter-from-[PET_NAME].pdf`) through `renderStoryPdf` via the registry (defined in 14/15).
- Reuse `waitForAssets`, `preferCSSPageSize`, `printBackground`, embedded woff2 fonts — no external requests in the emitted HTML.

**Out of scope**
- Real imagery (feature 17) — use a tasteful placeholder paw-print / silhouette SVG until then.
- The on-screen preview route (feature 19) — though the **same** letter components serve both targets.
- A4 and 5×7 frame-ready alternate sizes — note as future toggles, don't build.
- Adding a new font dependency (see typography decision).

## Implementation notes

**Key decisions**
- **One set of letter components, two render targets.** The screen preview (19) and the PDF render from the same letter components — single source of markup, the parity invariant we held for Story 1 (every selector mirrored in both `lib/pdf/styles.css` and `app/globals.css`, tokens single-sourced via `var()`).
- **Typography:** the master template recommends Cormorant Garamond, but we already self-host **Lora** (a named alternative) and **Fraunces**. Use **Lora** for the letter body and **Fraunces** for the cover title to avoid adding a font — flag Cormorant as an optional later swap, not a blocker.
- Letter geometry via new `.letter-page` tokens; do **not** touch `.story-page` (protects feature 14's byte-identity for Story 1).
- Exactly **6 printed pages**; verify page count + MediaBox 612×792 (Letter).

**Files**
- `lib/pdf/pages.tsx` (letter layouts) and/or `lib/pdf/pages-story2.tsx`
- `lib/pdf/styles.css` (letter rules, scoped under `.letter-page`)
- `app/globals.css` (mirror the letter selectors for the preview in 19)
- `lib/story/registry.ts` (filename already registered in 14/15)

## References

- @context/masterstories/story-2-master-template.md — the "Typography & layout guide" (margins, no page numbers, serif, cream bg, hierarchy) and per-page illustration briefs.
- @context/features/04-pdf-template-and-print-css.md — the Story-1 template/CSS this parallels.
- @context/features/14-multi-story-engine.md — the `layout` dispatch the letter pages hook into.

## Done when

- [ ] A Story-2 fixture renders a **6-page Letter PDF**, fonts embedded/self-contained, **no external requests**.
- [ ] 1.25" margins, no page numbers, no frame, cream background, serif body — matches the master template's typography guide.
- [ ] Story-1 PDF is unchanged (no `.story-page` regression; byte-identity from feature 14 preserved).
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: `renderStoryHtml` on a Story-2 `ResolvedStory` contains 6 letter-page sections in order; no surviving `{placeholder}` / `__FONT_*__` token; the signature shows the pet name; the optional date line is present/absent per fixture.
- `qa`: render the letter PDF from a fixture (placeholder art is fine), eyeball the typography + 6-page Letter pagination + embedded fonts; confirm Story-1 still renders byte-identically.
