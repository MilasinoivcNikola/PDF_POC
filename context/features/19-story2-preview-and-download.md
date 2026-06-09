# 19 — Story 2: In-Browser Preview & PDF Download

> **Craft Area:** 3 — App/UI (+ 1 — PDF, support) · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 7 — Story 2 · **Phase:** 5 (completes Story 2) · **Depends on:** 16, 17, 18
> **Branch:** `feature/story2-preview-download`

## Status

Not Started

## Goals

- After generation, render the assembled **letter** in the browser (single-column, true-scale page feel) with the real cover portrait + belief wash; stream a print-quality `Letter-from-[PET_NAME].pdf` download; reuse inline text-edit + regenerate where they apply.
- Close the Story-2 end-to-end loop: **picker → wizard → generate → preview → download** — and complete the Story-2 product.

## Scope

**In scope**
- A story-aware preview at `/create/preview`: `GET /api/preview` already resolves pages + images via the registry (feature 14); extend its payload for Story-2 fields if needed, and render the letter pages with the **shared** layout components (no markup fork).
- **Single-column** letter presentation (a letter reads as single sheets, not facing-page spreads), with the same true-scale page approach as Story-1's preview where practical.
- Download via the existing `POST /api/render-pdf` (the registry picks the renderer + the `Letter-from-[PET_NAME].pdf` filename).
- Inline edit (`/api/update-text`) for Story-2 editable free-text (`ownerNames`, `quirks`, `favoriteRitual`, `favoriteSpots`, `petName`) reusing the feature-02-style editable-fields map, **per story**; per-page **regenerate** for the cover portrait.

**Out of scope**
- New AI generation work (feature 17).
- A4 / 5×7 alternate sizes.
- Story-1 preview changes beyond what story-awareness requires.

## Implementation notes

**Key decisions**
- **Reuse** the `BookPreview` / `PageView` shells; switch *presentation* on `storyType` (facing-page spreads for Story 1, single column for Story 2). The page **markup** stays shared (the feature-16 letter components), so screen and PDF can't drift.
- The editable-fields map becomes **per-story**; `/api/update-text` validates the edited field against the story's allowlist and **re-resolves via the registry before writing** (a bad edit can never corrupt the saved letter — mirror feature 02's `story_incomplete` guard).
- Keep the feature-10 race guards: disable Download while a regenerate / text-save is in flight so a stale book can't be captured.
- **Parity invariant:** screen and PDF render from the same letter components; mirror every new preview selector in `app/globals.css` and `lib/pdf/styles.css`.

**Files**
- `app/create/preview/page.tsx` (story-aware)
- `components/preview/{BookPreview,PageView}.tsx`
- `app/api/{preview,render-pdf,regenerate-illustration,update-text}/route.ts` (per-story via the registry)
- `lib/story/story2/editable-fields.ts` (the Story-2 page→field map)
- `app/globals.css` (letter preview styles, mirrored from `styles.css`)

## References

- @prototypes/preview.html — the preview look (adapt spreads → single column for the letter).
- @context/masterstories/story-2-master-template.md — page order, the signature/date placement, and what's editable.
- @context/features/10-preview-and-pdf-download.md — the Story-1 preview/download/regenerate/edit pattern this parallels.
- @context/features/16-story2-letter-template-and-css.md — the shared letter components the preview reuses.

## Done when

- [ ] The Story-2 letter previews in-browser with the real imagery; Download yields a 6-page Letter PDF that matches the screen (parity holds).
- [ ] Inline editing a Story-2 field re-resolves, persists, and reflects on screen and in the next PDF; cover regenerate repaints only that one image.
- [ ] The download is named `Letter-from-[PET_NAME].pdf`; Story-1 preview/download is unchanged.
- [ ] No / invalid session degrades to a soft notice (no white-screen).
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: `/api/preview` + `/api/update-text` + `/api/render-pdf` Story-2 branches (filename/headers, editable-field allowlist, required-blank rejection, traversal/404) with disk + render mocked.
- `qa`: live Story-2 end-to-end — reuse a ready fixture for the $0 preview/download/parity checks; one cover regenerate as the only intended paid step; verify screen↔PDF parity and the no/invalid-session edge.
