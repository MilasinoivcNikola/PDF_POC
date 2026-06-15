## 2026-06-15 — Story Samples PR-07: "Welcome Home" (Bird) Sample Set + closing-page cover-medallion fix

The catalog's **first feathered sample** — and the species flagged as the one
photo-consistency risk in the sample-set plan (birds anchor worse than mammals: less
facial structure, busy plumage). It held. Branch `feature/story-samples-07`, a clean
replay of the PR-02/04/05/06 sample-set pattern, plus one folded-in shared-template fix
that the new preview surfaced.

### The sample set

Replaced Story 7's 2 placeholder tiles (incl. the bogus `welcome-page-7.jpg`, which never
matched a real slot) with the **full 8-illustration** bird gotcha-day sample at the locked
mixed `PRODUCTION_QUALITY` tier (HIGH `welcome-cover` + MEDIUM 7 interiors + LOW reference,
≈ $0.72 one-time paid run) + a slim downloadable `preview.pdf`, via the PR-0 harness
(`scripts/sample-run.ts` → `sample-capture.ts`) and the committed `uploads/sample-photos/bird.jpg`.

- **Fixture** `fixtures/sample-story7-bird.json` (`id: "sample-story7-bird"`) — **Kiwi**, a
  grey cockatiel (sunny yellow crest, bold orange cheek patches, white wing flashes), modeled
  on `fixtures/welcome-home-biscuit.json` but with bird-appropriate copy throughout
  (perch-by-the-window sleeping spot, whistling/crest-up quirks, a travel-carrier homecoming,
  `adoptionSource: "rescue"`, `occasion: "gotcha-day-anniversary"`, `yearsHome: "3"`,
  `lifeStage: "adult"`). No dog-isms. `resolveStory7`-validated: 11 pages, **zero surviving
  `[FIELD]`**, no memorial/banned language, quality bar honored.
- **Consistency verdict: HOLDS** — the flagged-risk species passed with no re-pick. Across all
  7 bird-present scenes the cockatiel stays on-model; the distinctive orange cheek + yellow
  crest carried it. The figure-free `welcome-before` correctly has no bird. One non-blocker:
  `welcome-learning` rendered an extra background bird (both foreground birds on-model).
- **Capture** — `public/samples/story-7-welcome/` now holds exactly 8 JPGs named by **real
  slot id** (`welcome-cover` + `welcome-before … welcome-belong`) + `preview.pdf`; the
  misnamed `welcome-page-7.jpg` is deleted (404 fix).
- **Catalog** `lib/catalog/products.ts` — `story-7-welcome.sampleImages` grows 2 → 8 (real
  slot ids in book order) + `previewPdf: "/samples/story-7-welcome/preview.pdf"`, matching the
  `story-6-tribute` shape. **Test** `lib/catalog/products.test.ts` — pinned 8-item `toEqual`
  set + `toHaveLength(8)` + `previewPdf` assertion, `story-7-welcome` added to `WITH_PREVIEW`.

### Folded-in fix — the closing page rendered a placeholder

The new preview surfaced a **pre-existing Story-7 defect** (present since the story shipped,
affecting every Story-7 book): page 9 (`welcome-closing`) is **not** one of the 8 illustration
slots (they end at `welcome-belong`), but it reuses Story 1's `closing` layout — which renders
`src ? <img> : <PlaceholderPet />`. With no src, the generic pet-face silhouette leaked into the
book. (Story 1 is unaffected: its closing `page-12` *is* a generated hero slot.)

PM decision: **reuse the cover image, circled** ($0, "rhymes with the cover" per the masterstory
brief). Implemented via the established per-story page-id allow-list pattern:

- `lib/pdf/pages.tsx` — new `CLOSING_COVER_FALLBACK_PAGE_IDS = ["welcome-closing"]` (beside
  `DEDICATION_ART_PAGE_IDS` / `LOVE_ART_PAGE_IDS`). `coverSrc` is computed once in `StoryPages`
  (cover located by `layout === "cover"`, robust across stories) and threaded through
  `renderPage(page, src, coverSrc)` to `ClosingPage`, whose art slot is now: own `src` → else
  `page.id ∈ allow-list && coverSrc` → cover image in a `closing__art--circle` vignette → else
  `PlaceholderPet` (unchanged fallback).
- CSS in **both** single sources: print `lib/pdf/styles.css` + screen `app/globals.css` —
  `.closing__art--circle` (round gold-ringed medallion; `--gold` rgba matching the existing
  local pattern), plus a `.preview-page .closing__art--circle` specificity override for preview
  scale.
- `lib/pdf/template.story7.test.tsx` (new, mirrors `template.story6.test.tsx`) — locks Story 7's
  11-section structure + asserts all three closing branches (circled cover when cover src present,
  clean placeholder fallback when absent, own-src precedence).
- `preview.pdf` re-rendered **$0** — pure downscale/re-render of the already-generated PNGs via
  `sample-capture.ts`, no new API calls.

**Byte-identity held:** the gate contains only `welcome-closing`, so Story 1/2/4/6/8/9 are
untouched (`coverSrc` computed-but-unused for them). The `lib/pdf/template*.test.tsx` suite passes.

### Docs

`context/coding-standards.md` (allow-list family + template-test list now name
`CLOSING_COVER_FALLBACK_PAGE_IDS` / `story7`, with the cover-reuse twist explained),
`context/new-book-playbook.md` (third reuse exception: closing-page-not-a-slot → cover fallback),
`context/debt.md` (removed the resolved "Story-7 samples are placeholders" row; added a low-sev
row recording the deliberate cover-reuse vs. the masterstory's distinct-"settled"-closing brief —
a future 9th slot if ever wanted).

### Review / QA

code-reviewer **PASS** twice (sample set, then byte-identity of the closing fix); context-auditor
**IN SYNC** → **DRIFT FOUND** on the fix (3 doc items, all resolved in-PR); no commerce-security
(non-commerce diff); qa-verifier **5/5 PASS** ($0, static-asset render: 8-tile gallery, PDF 200,
no 404s, `welcome-page-7.jpg` gone). `npm run test:run` 1976 pass · `npm run build` passes
(`/books/story-7-welcome` stays `●` SSG).
