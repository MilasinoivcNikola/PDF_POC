# Story Samples PR-04: "If Your Pet Could Talk" (Guinea Pig) Sample Set

**Date:** 2026-06-15
**Branch:** `feature/story-samples-04`
**Spec:** `context/features/story-samples-04-could-talk-other.md`
**Milestone:** 17 — Storefront sample assets

---

## What shipped

The catalog's **first `species: "other"` sample** — a real **guinea pig** sample book for
Story 4 ("If Your Pet Could Talk"). Replaced the two placeholder tiles at
`public/samples/story-4-talk/` with a generated book at the locked mixed
`PRODUCTION_QUALITY` tier (HIGH `talk-cover` + MEDIUM `talk-page-4` + LOW reference, a
~$0.30 paid run) plus a slim downloadable `preview.pdf`, and surfaced the
"See the full book (PDF)" affordance on the detail page. Proves the storefront handles a
pet outside the dog/cat/rabbit/bird set.

Built via the PR-0 harness (`scripts/sample-run.ts` → `scripts/sample-capture.ts`) over the
committed `uploads/sample-photos/other.jpg` (Pexels #4383759, guinea pig — PM-confirmed at
photo approval since `"other"` is open-ended).

## Deliverables

- **`fixtures/sample-story4-other.json`** (new) — a complete Story-4 living session
  ("Pepper," a tri-colour guinea pig, `species: "other"`, `livingOrMemorial: "living"`,
  tasteful owner + memories). Resolves with zero surviving `[FIELD]`.
- **`public/samples/story-4-talk/`** — `talk-cover.jpg` + `talk-page-4.jpg` (overwrote
  placeholders) + new slim `preview.pdf`.
- **`lib/catalog/products.ts`** — added `previewPdf: "/samples/story-4-talk/preview.pdf"`
  to the `story-4-talk` product (`sampleImages` unchanged).
- **`lib/catalog/products.test.ts`** — added `story-4-talk` to the `WITH_PREVIEW` map +
  a dedicated assertion (mirrors story-1/story-2).

## Two folded-in fixes (PM-approved during review/QA)

This sample PR was the first to exercise two pre-existing Story 4 defects, both fixed here
(byte-safely) rather than deferred — because both shipped into the committed customer-facing
sample and both affect the LIVE sellable product.

### 1. `species: "other"` grammar on the Page-6 climax (code-review finding)
Story 4's climax composed `as much as a {species} can love`, substituting the **raw** species
word — fine for dog/cat/rabbit/bird, but `"other"` rendered the ungrammatical **"a other can
love"**. Fix: new pure `climaxSpeciesNoun(species)` in `lib/story/story4/variants.ts` —
`"other"` → "friend" (matching `speciesDescriptor`), every other species keeps the literal
`{species}` placeholder so merge still substitutes the raw word → **existing books
byte-identical**. Corrected the test that asserted the broken output
(`lib/story/story4/variants.test.ts`) + added a negative `not.toContain("a other can love")`.
Verified: other → "a friend can love" (living + memorial), dog → "a dog", cat → "a cat".

**Catalog-wide sibling logged as debt, NOT fixed here:** the same raw-`{species}` defect
exists for `"other"` in Stories 1/2/5/7/8 (all sellable). Logged in `context/debt.md` (medium;
fix before public launch). Stories 4/6/9 handle it.

### 2. Page-4 illustration never rendered in the book (PM noticed in the preview PDF)
Story 4 reuses Story 2's letter layouts; its `talk-page-4` renders via `LetterBodyPage`
(`lib/pdf/pages-story2.tsx`), which only drew an image for pages in
`LETTER_WASH_PAGE_IDS = ["letter-page-5", "note-page-5"]`. `talk-page-4` was **never wired**
(Story 4's imagery PR, PR-21, verified the raw PNG + extended `manifestToImageMap`, but never
touched the renderer and its QA inspected the PNG, not the composed book). So the generated
page-4 scene was silently dropped — every Story 4 book (sample **and** the live worker PDF)
showed only the cover. Fix (pdf-render-specialist): a new **feature-illustration** concept
distinct from the soft wash — `LETTER_FEATURE_PAGE_IDS = ["talk-page-4"]` + a `LetterFeature`
component + `.letter-page__feature` CSS (full feature image: 3.6in, no wash mask, full
opacity, 2px radius matching the cover) in `lib/pdf/pages-story2.tsx` + `lib/pdf/styles.css` +
the screen mirror in `app/globals.css`; new `lib/pdf/template.story4.test.tsx`. The PM chose
the **feature** treatment over reusing the soft wash. Regenerated `preview.pdf` ($0) — now
shows BOTH illustrations; Story 4 stays 6 pages (no forced 7th). Visually verified via
`pdftoppm` (cover portrait + page-4 tunnel feature).

## Verification

- **Review:** code-reviewer (1 blocking, fixed) + context-auditor (IN SYNC). No
  commerce-security review — not a commerce-surface diff.
- **QA:** qa-verifier 5/5 PASS (detail page renders the guinea-pig samples + working
  preview-PDF link; `/books` card shows the real thumbnail; 0 console errors / 0 asset 404s).
- **Byte-identity:** Story 1/2/5 PDFs identical by raw length + timestamp-normalized SHA
  (only the new path on `talk-page-4` changes output).
- **Gates:** `npm run test:run` **1957 pass** (+4, the new template test) · `npm run build`
  pass · `/books/story-4-talk` stays `●` SSG · boundary test unaffected.

## Notes / carried forward

- The page-4 render bug means **other letter-style titles may share the
  "generated-but-not-displayed" gap** (cf. the existing "Story-6 unused image slots" debt) —
  scoped this fix to Story 4 per PM direction; not swept catalog-wide.
- `previewPdf` continues as the standard sample-set member (no longer Story-1-only); the
  products test tracks the live set via the `WITH_PREVIEW` map rather than a hardcoded count.
