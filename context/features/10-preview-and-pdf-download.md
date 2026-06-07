# 10 — In-Browser Preview & PDF Download

> **Craft Area:** 3 + 1 — App/UI + PDF · **Owner agents:** `nextjs-ui-builder` (lead), `pdf-render-specialist` (support)
> **Milestone:** 5 · **Depends on:** 05, 09
> **Branch:** `feature/preview-and-download`

## Status

Not Started

## Goals

- After generation, show the assembled book in the browser, page by page, with the real illustrations — then download the print-quality PDF. **Milestone 5's "done".**
- Matches `prototypes/preview.html` (facing-page spreads, cover → closing, "Your book is ready", download CTA with filename/size meta).
- "Regenerate an illustration" re-runs a single page's image without rebuilding the whole book.

## Scope

**In scope**
- `app/create/preview/page.tsx` — render the **same** story template (feature 04) for screen, using the generated images from the manifest. Spreads / page-by-page navigation as in `preview.html`. Resolve copy via feature 03 so screen and PDF never diverge.
- `app/create/download/page.tsx` (or a download action on the preview page) — "Download PDF" triggers the server render and streams the file.
- `app/api/render-pdf/route.ts` — calls `renderStoryPdf` (feature 05) for the session, streams the PDF as an HTTP download with `Content-Disposition: attachment; filename="Saying-Goodbye-to-[PET_NAME].pdf"`. Optionally also writes to `./output/`.
- **Regenerate single illustration:** a control per page (or a "regenerate" affordance) that calls back into feature 07's single-page regenerate path, updates the manifest + the on-screen image, leaving all other pages untouched (cache makes this cheap).
- Download meta (filename · size) shown after render, as in the prototype.

**Out of scope**
- Changing the template/print CSS (reuse feature 04 as-is; only adapt for screen if strictly needed, without breaking print).
- New generation logic (reuse feature 07's regenerate path).
- Email/sharing (explicitly out of project scope — PDF is an HTTP download).

## Implementation notes

**Key decisions**
- **One template, two render targets.** The preview must reuse `lib/pdf/template.tsx` so what the user sees equals what the PDF contains. Keep print-only rules in the print stylesheet; render the same component for screen with the screen-side styles from `preview.html`.
- Stream the PDF rather than buffering a base64 blob through the client where avoidable; set the attachment filename to the template's convention.
- Regeneration should be obviously scoped to one page and reflect immediately on success; reuse the cache/manifest so other pages aren't re-billed.
- This closes the end-to-end loop: wizard (08) → generate (09) → preview/download (10).

**Files**
- `app/create/preview/page.tsx`
- `app/create/download/page.tsx` (or integrated CTA)
- `app/api/render-pdf/route.ts`
- `components/preview/{BookPreview,PageView}.tsx`
- a client action for single-page regenerate.

## References

- @prototypes/preview.html — the preview layout, spreads, and download section to build.
- @prototypes/styles.css — `.spread`, `.book-page*`, preview/download styles.
- @context/local-prototype-plan.md — Milestone 5, the `/render-pdf` route, and "regenerate this page" guidance.
- Features 04/05 (template + renderer) and 07 (regenerate path) — reuse, don't duplicate.

## Done when

- [ ] Preview shows all 12 pages with the real generated illustrations, navigable, on-brand.
- [ ] Screen preview and the downloaded PDF are visually consistent (same template).
- [ ] "Download PDF" streams a correctly-named, print-quality Letter PDF.
- [ ] Regenerating one illustration updates just that page (and the manifest) and is cheap.
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: the render-pdf route's filename/header builder; any manifest→preview mapping helper.
- `qa`: full flow end-to-end — wizard → generate → preview → regenerate one page → download and open the PDF (the Milestone-5 check, and the whole-app smoke test).
