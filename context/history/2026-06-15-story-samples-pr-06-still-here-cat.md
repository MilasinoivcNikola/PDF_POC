# Story Samples PR-06: "While You're Still Here" (Senior Cat) Sample Set + Dedication/Love Art Fix

**Date:** 2026-06-15
**Branch:** `feature/story-samples-06`
**Spec:** `context/features/story-samples-06-still-here-cat.md`
**Milestone:** 17 — Storefront sample assets

---

## What shipped

The catalog's **second cat sample — a senior cat, deliberately a different animal from the
Story-2 cat** — a full **7-illustration** living-tribute sample for Story 6 ("While You're
Still Here"). Replaced the two placeholder tiles at `public/samples/story-6-tribute/` with a
generated book at the locked mixed `PRODUCTION_QUALITY` tier (HIGH `tribute-cover` + MEDIUM
`tribute-page-1..6` + LOW reference, a ~$0.65 paid run) plus a slim downloadable `preview.pdf`,
and wired the "See the full book (PDF)" affordance on the detail page. The present-tense
tribute leans on photo likeness — a real senior cat with a grizzled grey muzzle showcases
exactly that differentiator.

Built via the PR-0 harness (`scripts/sample-run.ts` → `scripts/sample-capture.ts`) over the
committed `uploads/sample-photos/cat-senior.jpg`.

**Plus a folded-in fix** (PM-approved during QA): the Story-6 book was only placing **4 of its
7** illustrations — the `dedication` and two `love` pages dropped their art. See below.

## Deliverables (the sample set)

- **`fixtures/sample-story6-cat.json`** (new) — a complete Story-6 living-tribute session
  ("Hazel," `she`, a senior brown tabby gone grizzled at the muzzle with a white chest/chin
  and green eyes, `species: "cat"`, photo `uploads/sample-photos/cat-senior.jpg`; owner
  "Diane," single; toggles `transitionFrame: "still-here"` + `otherPetsInHome: "yes"`).
  Resolves through `resolveStory6` with **zero surviving `[FIELD]`**; living/present-tense so
  the "died" quality bar doesn't apply. Caught + fixed an "a a brown tabby" double-article by
  dropping the leading article from `breedColor` (the template prepends "a ", as Biscuit's
  reference fixture does).
- **`public/samples/story-6-tribute/`** — `tribute-cover.jpg` + `tribute-page-1..6.jpg` (7
  files; overwrote the old `tribute-cover`/`tribute-page-3` pair) + slim 8-page `preview.pdf`.
- **`lib/catalog/products.ts`** — expanded `story-6-tribute.sampleImages` 2 → 7 and added
  `previewPdf: "/samples/story-6-tribute/preview.pdf"` (module stays pure/client-safe).
- **`lib/catalog/products.test.ts`** — pinned the 7-image `sampleImages` set + length, added
  `story-6-tribute` to the `WITH_PREVIEW` map + a dedicated `previewPdf` assertion.

## Paid run

Approach A, mixed `PRODUCTION_QUALITY` (HIGH `tribute-cover` + MEDIUM `tribute-page-1..6` +
LOW reference), 7 slots + reference, all fresh cache misses, ≈ **$0.65**; OpenAI key verified
200 first. The senior cat held **strongly on-model** across all 7 — grizzled muzzle, white
chest, green eyes, watercolor, golden-hour celebratory tone (not frail/sad). The
`otherPetsInHome: "yes"` line even surfaced a second cat in the page-3 spread.

## Folded-in fix — Story-6 dedication/love pages dropped 3 of 7 illustrations

QA + a PDF-image audit surfaced that the Story-6 book PDF embedded only **4** images. Story 6
reuses Story-1's page layouts, and the `dedication` (`tribute-page-1`) + `love`
(`tribute-page-5`, `tribute-page-6`) layout components render **no art** — so 3 generated,
paid illustrations were silently dropped from the book (they still appeared in the storefront
gallery). This pre-dated the branch (since Story-6 PR-25) and **contradicted the Story-6
masterstory**, which specifies all 7 illustrations including the dedication portrait. PM chose
**show all 7**; folded into this PR (precedent: PR-04 folded an analogous Story-4 page-render
fix into its sample PR).

- **`lib/pdf/pages.tsx`** — `DedicationPage`/`LovePage` now accept `src` and render art gated
  by per-story page-id allow-lists `DEDICATION_ART_PAGE_IDS = ["tribute-page-1"]` /
  `LOVE_ART_PAGE_IDS = ["tribute-page-5", "tribute-page-6"]` — the same shape as the `letter`
  layout's `LETTER_FEATURE_PAGE_IDS`. Story 1's `page-1`/`page-10` are also dedication/love
  slots but are **not** listed, so they stay text-only → **byte-identical**.
- **`lib/pdf/styles.css`** (print) + **`app/globals.css`** (screen) — new `.dedication__art`
  (contained portrait) + `.love__art` (feature band), mirrored for screen↔PDF parity.
- **`lib/pdf/template.story6.test.tsx`** (new, mirrors `template.story4.test.tsx`) — locks all
  7 slots emitting an `<img>`, the no-src byte-safe path (ornament/no-img), and no cross-leak.
- The committed `preview.pdf` was re-rendered from the **existing** PNGs via
  `scripts/sample-capture.ts` (**$0**, no new paid run) → now embeds **7** images.
- **Docs synced** (no-drift rule): `context/coding-standards.md` (template test reference →
  `template*.test.tsx` glob + the dedication/love art allow-list pattern) and
  `context/new-book-playbook.md` Step 3 (a second shared-renderer exception for reusing
  `dedication`/`love` on an illustrated book).

## Verification

- **Reviews (run twice — before and after the folded-in fix):** code-reviewer **PASS**
  (byte-identity verified: Story 1's "page-10 ignores a supplied src" guard still passes,
  allow-lists disjoint, no placeholder when src absent); context-auditor **IN SYNC** on
  behavior + flagged the two doc-staleness items (both fixed in-PR). No commerce-security
  review — diff touches no orders/payment/auth/Supabase surface.
- **QA:** 5/5 PASS in a real browser (gallery 7 tiles all load, PDF 200 `application/pdf`, 0
  console errors, `/books` still lists Story 6), `$0` spend; plus a visual confirm of the
  rendered dedication portrait + both love-page feature scenes within page bounds.
- **Gates:** `npm run test:run` → **1969 passed**; `npm run build` → ✓; detail page stays
  `●` SSG; boundary test unaffected. No new dependency.

## Notes

The sample-set half is a clean replay of the shipped PR-02/04/05 pattern. The substantive
addition is the dedication/love art fix — a third layout family now joins `letter` in using
the per-story page-id allow-list to carry art on a shared layout while keeping every existing
product byte-identical. No durable deferrals.
