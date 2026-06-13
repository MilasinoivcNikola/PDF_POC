## 2026-06-08 — Puppeteer PDF Renderer & CLI

**Branch:** `feature/pdf-renderer` → `main` (`31f1f48`, merge `f5ace97`) · Craft Area 1 (pdf-render-specialist)

Milestone 1, feature 05 — **completes Milestone 1**. Turned feature-04's self-contained HTML into real PDF bytes via headless Chrome, behind a clean reusable function plus a CLI that produces the milestone's "done" artifact.

- `lib/pdf/render.ts` — `renderStoryPdf(session, images): Promise<Buffer>` runs the whole Craft-Area-1 chain in one call: `resolveStory` (03) → `renderStoryHtml` (04) → `page.setContent(html, { waitUntil: "load" })` → `page.pdf({ format: "Letter", printBackground: true, preferCSSPageSize: true, margin: 0 })`. A `page.evaluate(waitForAssets)` awaits `document.fonts.ready` + every `<img>` decode before printing so the first page never renders with fallback metrics. Browser launch/teardown in a `finally` (no leaked Chrome on error). **No Next.js request types** → feature 10's API route reuses it as-is. Chose `waitUntil: "load"` over the plan-sketch's `networkidle0` (Puppeteer 25 rejects it for `setContent`, and the fully-inlined HTML has nothing to idle on). Exports `storyPdfFilename(petName)` → production-checklist `Saying-Goodbye-to-[PET_NAME].pdf` with a path-safe slugify (diacritics folded, separators stripped, `Pet` fallback). `TODO(feature 10)` marks the `--no-sandbox`/executable-path seam containerized runs will need.
- `scripts/render-test.ts` (+ `scripts/tsconfig.json`) — CLI: JSON path arg → parse `StorySession` → `renderStoryPdf(session, {})` (empty manifest → template's inline placeholder SVGs, zero AI dependency) → write to `./output/`. Missing/unreadable/invalid-JSON arg → clear message + non-zero exit; a sparse fixture surfaces `MergeError`'s missing-field list. The script tsconfig flips only `jsx` to `react-jsx` so `tsx` runs `template.tsx` (no `import React`), mirroring `vitest.config.ts`.
- `fixtures/otis.json` — complete sample `StorySession`, mirrors `lib/story/fixtures.ts` `otisSession()` exactly (incl. the trimmed compact `breedColor`).
- `package.json` — added `puppeteer` (dep) + `tsx` (devDep) + the `render:test` script.
- `lib/pdf/render.test.ts` — 8 filename-builder unit tests (the pure testable surface: convention, multi-word/whitespace slugging, diacritic folding, path-separator stripping, empty/symbol-only fallback). PDF byte-generation left to the qa milestone-check per the testing standard.

**Observed artifact:** `output/Saying-Goodbye-to-Otis.pdf` — 14 sheets (cover + 12 story pages + back cover), MediaBox 612×792 (Letter), backgrounds printing, fonts embedded & self-contained, ~785 KB. Page 2 / Page 9 read correctly after the grammar fix above.

**Gates:** `npm run build` ✓ (17 routes) · `npm run test:run` ✓ (110 tests, +8) · `qa` **PASS** (Milestone 1 milestone-check: 14-sheet Letter pagination, embedded fonts, prototype fidelity; the 2 copy bugs it surfaced were fixed first) · code review **PASS** (no blockers; applied the feature-10 launch-args TODO, skipped two cosmetic nits).

**Milestone 1 complete.** Deferred: real illustrations via a populated `PageImageMap` (07); `/api/render-pdf` + browser download (10); warm browser-pool perf. Known property (not a bug): headless Chrome embeds fonts as Type3 glyph procedures rather than named TrueType subsets — fine for the POC, revisit only if a print shop needs named subsets.

