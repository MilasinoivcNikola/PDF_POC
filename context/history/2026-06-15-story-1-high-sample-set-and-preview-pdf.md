# Story 1 HIGH-Fidelity Sample Set + Preview PDF

**Date:** 2026-06-15
**Branch:** `feature/story1-high-sample-preview`
**Craft Area:** 2 (AI illustration) + 3 (Next.js UI) — `ai-image-specialist` + `nextjs-ui-builder`
**Spec:** [`context/features/story-1-high-sample-preview.md`](../features/story-1-high-sample-preview.md)

## What & why

The `/books/story-1-book` detail page showed only 3 low-tier samples — a prospective
buyer of the storefront's hero title couldn't see real quality or the whole book before
paying. This feature ran Story 1 **once at the HIGH image tier** (1 reference + 13 scenes
= 14 paid images, ~$3) from a real boy-and-boxer photo, then captured the output as
**durable committed static assets** so the storefront serves files, never a live render —
we never pay for it again. Two new public artifacts: the full 13-image HIGH gallery
(cover + page-1..page-12) and a downloadable full-book `preview.pdf` behind a "See the
full book (PDF)" link. Doubled as the PM's HIGH-vs-Low quality check.

## What changed

- **`lib/catalog/products.ts`** — added optional `previewPdf?: string` to the `Product`
  contract (a plain string path, threaded through `buildProduct`), keeping the module
  pure/client-safe (no engine / `lib/supabase/server` import — the public boundary holds).
  Expanded `story-1-book.sampleImages` 3 → 13 and set its `previewPdf`. Other products omit
  it; the gallery + link both degrade gracefully.
- **`app/(public)/books/[productId]/page.tsx`** — a conditional "See the full book (PDF)"
  link (`btn btn--ghost`, `target="_blank"` + `rel="noopener noreferrer"`) rendered only
  when `product.previewPdf` is set. The gallery already mapped `sampleImages`, so 13 tiles
  render with no structural change (lead-cover + grid holds at desktop). Page stays `●` SSG.
- **`fixtures/story1-high.json`** — a complete Story-1 `StorySession` driving the run:
  Bo (fawn-and-white boxer, dark mask + white blaze, watercolor), child Liam (age 6-8),
  tasteful memory copy that ships publicly. Honors the master-template quality bar ("died",
  never "passed away"); verified zero surviving `[FIELD]` via a pure `resolveStory` call.
  `pet.photo` uses the `"uploads/..."` prefix form (per `resolveUnder` resolving against
  cwd, matching `fixtures/otis.json` — the spec's no-prefix guess was wrong).
- **`scripts/story1-high-run.ts`** + **`proto:story1-high`** (package.json) — the throwaway
  paid-run harness, modeled on `scripts/story8-prototype.ts`: load fixture →
  `generateAllIllustrations(session, { sceneQuality: "high", referenceQuality: "high" })` →
  render via `manifestToImageMap` + `renderStoryPdf` → PDF to `./output/`, PNGs under
  `./generated/story1-high/`. Kept (not deleted) like `story8-prototype.ts`, for re-runs.
- **`public/samples/story-1-book/`** — 13 web JPGs (`sips`, ~1000px, q80, ~330-400 KB each;
  no new npm dependency) overwriting the old 3, plus `preview.pdf`.
- **`lib/catalog/products.test.ts`** — pins the exact 13-image set + length, the `previewPdf`
  path, and the "only Story 1 has a previewPdf" invariant.
- **Docs** — `context/new-book-playbook.md` (Step 4 field list + a Step 6 note) and
  `context/coding-standards.md` (catalog blurb) now record `previewPdf` as the deliberate
  **one-time HIGH-tier hero exception** to the Low-default tier, not an engine-default change.

## Run / cost / consistency

- **Approach A** (the `generateAllIllustrations` default), HIGH for both tiers, concurrency
  left at the default 3 (spec: do NOT raise it — Tier 2 has ~8× TPM headroom and the run is
  speed-irrelevant; conservative concurrency protects pet consistency). 14 fresh cache misses
  confirmed (quality is not in the cache key, so a fresh `story1-high` id with an empty
  `./generated/` was mandatory). ~$3 one-time.
- **Pet consistency held well at HIGH** — the boxer (dark mask, white blaze, fawn body, red
  collar) stayed on-model across sitting / sleeping / running / from-behind poses; the child
  reads as a consistent stylized kid (Story-1 prompts deliberately stylize the child, pet-only
  reference), the agreed bar. HIGH is noticeably cleaner than Low and well-suited to samples.

## Review / QA findings

- **code-reviewer:** PASS, no code blockers — client-safe boundary held, quality bar honored,
  conditional-link logic + tests clean.
- **context-auditor:** no contradictions; flagged two doc omissions (`previewPdf` absent from
  the new-book-playbook + coding-standards) — both fixed in-branch.
- **qa-verifier (browser):** PASS on all 4 — 13 tiles load (no 404s), PDF link serves
  `200 application/pdf`, link correctly absent on `/books/story-2-letter`, 0 console errors,
  page stays SSG.
- No commerce surface touched (catalog data + storefront markup only) → no security review.

## Decision recorded

- The committed `preview.pdf` is **~31 MB** (embeds 13 full-res HIGH PNGs as data URLs). Both
  reviewers flagged it as permanent git-history weight; **PM chose to keep it full-res** for
  fidelity rather than slim it from the web JPGs. Not gitignored — deliberate.

## Verification

- `npm run test:run` — 1938 passed / 89 files (incl. `surface.boundary.test.ts`, green)
- `npm run build` — clean; `/books/[productId]` prerendered `●` SSG
