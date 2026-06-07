# 05 — Puppeteer Renderer & CLI Render Script

> **Craft Area:** 1 — PDF pipeline · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 1 (completes it) · **Depends on:** 04
> **Branch:** `feature/pdf-renderer`

## Status

Not Started

## Goals

- Turn the HTML from feature 04 into a real, print-quality PDF on disk via headless Chrome.
- A CLI script renders a 12-page PDF from a hardcoded/sample JSON input + placeholder images — **Milestone 1's "done" artifact**: `node scripts/render-test.ts test-input.json` → `output/Saying-Goodbye-to-[PET_NAME].pdf`.
- The renderer is a clean function the later API route (feature 10) can call directly.

## Scope

**In scope**
- `lib/pdf/render.ts` — `renderStoryPdf(session: StorySession, images: PageImageMap): Promise<Buffer>`:
  - Resolve story (feature 03) → HTML (feature 04) → `page.setContent(html, { waitUntil: 'networkidle0' })` → `page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true, margin: 0 })`.
  - Ensure embedded fonts and local images are fully loaded before `.pdf()` (await fonts / image decode).
  - Launch/teardown Puppeteer cleanly (single browser per call is fine at this scope; note reuse as a future optimization).
- `scripts/render-test.ts` — CLI entry: read a JSON file argument, fill missing image slots with placeholder rectangles, call `renderStoryPdf`, write to `./output/` with the template's filename convention `Saying-Goodbye-to-[PET_NAME].pdf`.
- `test-input.json` (or `fixtures/`) — a complete sample `StorySession` (the Otis example is a good fixture).
- Placeholder image assets (gray rectangles or the prototype SVGs) so the pipeline runs with zero AI dependency.
- `npm run render:test` script wrapping the CLI.

**Out of scope**
- AI illustrations (feature 07 swaps placeholders for real images via the manifest).
- The HTTP `/api/render-pdf` route + browser download (feature 10).
- Browser-pool / warm-Chrome performance work (note as future).

## Implementation notes

**Key decisions**
- Verify the Puppeteer + Next.js/TS execution path: running a `.ts` script may need `tsx`/`ts-node` or a small build step — pick the simplest that fits the repo and document the `npm` script.
- Keep `renderStoryPdf` free of Next.js request types so it's callable from both the CLI and the future API route.
- Honor the production checklist filename: `Saying-Goodbye-to-[PET_NAME].pdf`.
- Use the plan's debug tip while developing: `page.pdf({ path: './output/debug.pdf' })` to eyeball output; Chrome DevTools print preview for CSS iteration.

**Files**
- `lib/pdf/render.ts`
- `scripts/render-test.ts`
- `fixtures/otis.json` (or `test-input.json`)
- placeholder images

## References

- @context/local-prototype-plan.md — "Minimum viable v1" `render.ts` sketch + Milestone 1 definition of done.
- @context/masterstories/story-1-master-template.md — production checklist (filename, 8.5×11, ≥300 DPI).
- @context/saying-goodbye-to-otis.pdf — compare your output against this.
- Use context7 for current Puppeteer `page.pdf()` options.

## Done when

- [ ] `node scripts/render-test.ts <fixture>.json` writes a 12-page PDF to `./output/`.
- [ ] PDF is Letter size, backgrounds/colors print, fonts embedded, one page per story page.
- [ ] Output is visually faithful to `preview.html` and comparable to `saying-goodbye-to-otis.pdf`.
- [ ] `renderStoryPdf()` is reusable (no request-object coupling).
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: unit-test the filename builder and any input-validation/placeholder-fill helpers (keep PDF byte-generation out of unit tests — it's slow/binary).
- `qa` / manual: open the generated PDF, confirm page count, sizing, fonts, and page breaks. **This is the Milestone 1 milestone-check.**
