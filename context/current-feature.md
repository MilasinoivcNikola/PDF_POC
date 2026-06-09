# Story 2: Letter PDF Template & Print CSS

## Status

In Progress

## Goals

- Turn a resolved Story-2 `ResolvedStory` into a self-contained, print-ready **6-page letter** HTML, rendered to PDF by the existing Puppeteer core — a reverent typeset keepsake where "white space is the design."
- Reuse `renderStoryHtml` + the font-inlining mechanism + `renderStoryPdf` as-is; add only the **letter-layout page components** and the **letter print CSS**, dispatched via feature 14's `layout` tags.
- A Story-2 fixture renders a **6-page Letter PDF** (MediaBox 612×792), fonts embedded/self-contained, **no external requests**.
- Typography matches the master template's guide: **1.25" margins**, **no page numbers**, **no keepsake frame**, cream/off-white background (never pure white), refined serif body, generous leading (~1.5), salutation + signature hierarchy, small ornament on the cover only.
- **Story-1 PDF is unchanged** — no `.story-page` regression; feature 14's byte-identity preserved.
- `npm run build` + `npm run test:run` pass.

## Notes

**Craft Area 1 — PDF pipeline.** `start` dispatches to **`pdf-render-specialist`**.
Milestone 7 (Story 2), Phase 2. Depends on feature 15 (Story-2 text/merge/variants, already merged). Branch: `feature/story2-letter-template`.

**Key decisions (from spec):**
- **One set of letter components, two render targets.** The screen preview (feature 19) and the PDF render from the same letter components — single source of markup. Parity invariant: every new selector mirrored in both `lib/pdf/styles.css` and `app/globals.css`, tokens single-sourced via `var()`.
- **Add a dedicated `letter` layout** (carry-forward from feature 15: all 5 Story-2 body pages currently map to the `narrative` `PageLayout` tag, which is the children's-book treatment — wrong for a typeset letter). Add `letter` (and likely `letter-cover`) to the `PageLayout` union + `STORY_2_LAYOUT`, plus the exhaustive `renderPage` switch case(s).
- **Typography — no new font dependency.** Master template recommends Cormorant Garamond, but reuse the already-self-hosted **Lora** (letter body) and **Fraunces** (cover title). Flag Cormorant as an optional later swap, not a blocker.
- **Letter geometry via new `.letter-page` tokens** (e.g. `--page-margin-letter: 1.25in`); do **not** touch `.story-page` — protects feature 14's Story-1 byte-identity.
- Exactly **6 printed pages**; verify page count + MediaBox 612×792 (Letter). Reuse `waitForAssets`, `preferCSSPageSize`, `printBackground`, embedded woff2 fonts.

**Files it will touch:**
- `lib/pdf/pages.tsx` (extend the layout switch) and/or a sibling `lib/pdf/pages-story2.tsx` imported by the same switch — letter layouts.
- `lib/pdf/styles.css` — letter print rules, scoped under `.letter-page`.
- `app/globals.css` — mirror the letter selectors (for the feature-19 preview).
- `lib/story/story2/merge.ts` (`STORY_2_LAYOUT`) + `lib/story/merge.ts` (`PageLayout` union) — the new `letter`/`letter-cover` layout tags.
- `lib/story/registry.ts` — `Letter-from-[PET_NAME].pdf` filename already registered in 14/15.

**Maps to:** the master template's "Typography & layout guide" in `context/masterstories/story-2-master-template.md`. No prototype HTML exists for the letter (the `prototypes/*.html` are all Story-1) — design from the master template's typography spec.

**Out of scope (don't drift):**
- Real imagery — feature 17. Use a tasteful placeholder paw-print / silhouette SVG until then.
- The on-screen preview route — feature 19 (same letter components serve both targets, but the route is not built here).
- A4 and 5×7 frame-ready alternate sizes — note as future toggles, don't build.
- Adding a new font dependency.
