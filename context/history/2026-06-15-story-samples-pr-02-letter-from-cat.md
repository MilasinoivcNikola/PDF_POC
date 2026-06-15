## 2026-06-15 — Story Samples PR-02: "A Letter from Your Pet" (Cat) Sample Set

**Branch:** `feature/story-samples-02` (feature 91f5766, merge 290ba7e) — **Milestone 17 (Storefront sample assets)**.

Gave Story 2 ("A Letter from Your Pet") its real storefront sample set, replacing the
two low-quality placeholder tiles with a genuine **cat** sample book generated at the
locked mixed `PRODUCTION_QUALITY` tier, plus a slim downloadable preview PDF — so
`/books/story-2-letter` now shows true output quality and visibly proves the pipeline
works for a **non-dog** pet (the catalog's first non-dog sample). Built on the PR-0
harness (`scripts/sample-run.ts` + `sample-capture.ts`) and the committed royalty-free
`uploads/sample-photos/cat.jpg`.

### What shipped

- **Fixture — `fixtures/sample-story2-cat.json`** — a complete `Story2Session`
  (`id: "sample-story2-cat"`): "Clementine," a long-haired grey British Longhair with
  copper eyes (`species: "cat"`, watercolor style, photo = the committed cat sample),
  owner "Eleanor," tasteful memories, and the `peaceful` / `rainbow-bridge` / `self` /
  `no` toggles. Public-facing copy — validated via `resolveStory2`: zero surviving
  `[FIELD]` placeholders, quality bar honored (no "passed away"), and the species-aware
  merge resolves to cat phrasing ("just a cat", the loaf-in-a-sunbeam line) with no dog
  phrasing leaked.
- **Paid run** — `npm run proto:sample fixtures/sample-story2-cat.json` at the mixed
  tier (HIGH `letter-cover` hero + MEDIUM `letter-page-5` interior + LOW reference),
  Story 2's 2 slots (`LETTER_SCENE_PAGE_IDS`). ≈ $0.30 one-time. The cat held strongly
  on-model — an unmistakable fluffy grey cat with copper eyes faithfully matching the
  photo's species, coat, fur length, and eye color. Page 5 is the figure-free
  golden-hour wildflower-meadow wash (the rainbow-bridge brief), by design.
- **Capture** — overwrote the placeholders in `public/samples/story-2-letter/` with
  slim web JPGs (`letter-cover.jpg` 1000×1000 ~225KB, `letter-page-5.jpg` ~348KB) and
  rendered the slim 6-page `preview.pdf` (~700KB) from the downscaled images.
- **Catalog — `lib/catalog/products.ts`** — added
  `previewPdf: "/samples/story-2-letter/preview.pdf"` to `story-2-letter`, mirroring
  Story 1's placement; `sampleImages` unchanged; module stays pure/client-safe (no new
  imports, boundary test unaffected).
- **Tests — `lib/catalog/products.test.ts`** — relaxed the brittle "only Story 1 has a
  previewPdf" invariant into a per-product `WITH_PREVIEW` set (`story-1-book` +
  `story-2-letter`), so the next sample PR just adds its id; added a focused assertion
  that `story-2-letter.previewPdf` is set.

### Review / QA

- **Code review:** PASS — catalog mirrors Story 1, test relaxation sound, fixture
  validated, no secrets.
- **Commerce security:** PASS — `previewPdf` is a plain public static path (no
  IDOR/auth surface), no PII/secrets/camera-EXIF in the committed assets (AI art carries
  no camera metadata; only the empty `sips` Exif stub), catalog stays engine/service-role
  free, money/auth path empty-diff.
- **Context audit:** DRIFT FOUND → fixed on-branch. `context/new-book-playbook.md`'s
  Step-4 `previewPdf` bullet still claimed "today only `story-1-book` carries one";
  reworded to match the file's own later passage (previewPdf is the standard slim preview
  once a sample set exists; Story 1's *full-res HIGH* variant is the only exception). Also
  fixed a cosmetic self-contradictory comment in `products.ts` ("first non-dog/cat" →
  "first non-dog sample, a cat").
- **QA:** PASS — `/books/story-2-letter` loads 200 with 0 console errors / 0 404s; the
  2-tile gallery renders the real cat watercolor; the "See the full book (PDF)" link
  serves `200 application/pdf`; the `/books` card renders in the loss section. `next
  build` confirmed `/books/[productId]` stays `●` SSG.

### Verification

- `npm run build` passes; `/books/[productId]` is `●` SSG with `story-2-letter`
  prerendered. `npm run test:run` — 1952 passed (89 files). No new dependency, no
  engine/route/boundary change.

### Out of scope

Story 2's wizard/order copy; other titles' sample sets (their own PRs); the Stories 2↔5
bundle SKU.
