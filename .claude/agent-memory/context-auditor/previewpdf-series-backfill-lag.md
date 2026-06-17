---
name: previewpdf-series-backfill-lag
description: Each story-samples-NN branch adds a previewPdf to one title; new-book-playbook field-list "only story-1-book carries one" goes stale incrementally — grep it per sample PR
metadata:
  type: project
---

The storefront-sample series (PR-0 + per-title `feature/story-samples-NN` branches)
backfills a slim `previewPdf` to one title at a time. PR-0 already reframed previewPdf
as **standard, not Story-1-only** in the docs — but the reframe is uneven, so each new
sample PR re-exposes the lag.

**Canonical state after the reframe:** every title gets a slim `PRODUCTION_QUALITY`
`preview.pdf` from `scripts/sample-run.ts` → `sample-capture.ts`; Story 1 *additionally*
carries a one-time full-res HIGH preview (the `proto:story1-high` flourish). LOW stays the
engine default; the mixed `PRODUCTION_QUALITY` is the sample tier.

**The two previewPdf passages drift independently:**
- coding-standards.md ~L152-158 ("optional `previewPdf?` … generated for **any** title …
  Story 1 *additionally* carries a one-time full-res HIGH preview") — already correct,
  title-agnostic. Stays in sync as more titles ship one. Do NOT flag.
- new-book-playbook.md ~L302-308 ("`previewPdf` is part of the standard set") — already
  correct.
- **new-book-playbook.md Step-4 field-list bullet (~L224-230)** — was the laggard ("Today only
  `story-1-book` carries one"); **now FIXED** (verified PR-05, 2026-06-15): the bullet reads
  "It is part of the **standard** sample set … The one exception is `story-1-book`, which
  *additionally* carries a one-time full-res HIGH preview." Title-agnostic + correct. Do NOT flag.
- new-book-playbook.md ~L303-309 also title-agnostic ("standard set", Story 1 HIGH = lone exception).

**How to apply:** on any `feature/story-samples-NN` branch, grep new-book-playbook.md for
"only `story-1-book`" / "Today only" near the Step-4 field list. As of PR-05 both previewPdf
passages are reframed standard-not-Story-1-only — so this lag is resolved unless a future
edit regresses it.

**PR-01 (`story-samples-01-saying-goodbye-pug`, 2026-06-17) RETIRED the Story-1 HIGH preview
entirely** (Story 1 graduated onto the standard slim mixed-tier sample; `proto:story1-high`
removed from package.json; `scripts/story1-high-run.ts` + `fixtures/story1-high.json` kept only
as dead historical record). This flips the "Story 1 *additionally* carries a full-res HIGH
preview" wording from CORRECT → FALSE in every doc that still says it. coding-standards.md L166-169
was updated in-branch (good). **new-book-playbook.md still claims it in THREE spots — L313-316
(Step-4 field list), L409-415 (the "previewPdf is part of the standard set" note, incl. a live
`proto:story1-high` script citation).** On any future grep, also hunt "full-res HIGH" /
"`proto:story1-high`" / "~31 MB", not just "only story-1-book". Also: `lib/catalog/book-questions.ts`
L58 carries a stale in-code comment ("Example pinned to fixtures/story1-high.json") — the branch
repointed the pin to `fixtures/sample-story1-dog.json` but left the comment, drift it introduced.

**The recurring REAL finding on each sample PR is in `context/debt.md`, not the playbook:**
each title has a "Story-N storefront samples missing" (severity **medium**) debt row that the
sample PR resolves — it must be struck/removed in-branch or it actively misleads ("card shows a
placeholder, not its art" when the art now exists). PR-08 hits row 39 (Story 8). The doc-set
previewPdf/sampleImages/coding-standards prose stays IN SYNC (all title-agnostic); the debt row
is the one blocking drift. Also worth a non-blocking note: a sample PR is the **first live
Approach-B run** for Story 8 (debt row 34 "live B run unverified") — but resolving row 34 is a
generation-quality judgement the `complete` owner records, not this auditor's call. If still phrased Story-1-only, that's the (recurring) blocking-ish finding. The
test invariant (`lib/catalog/products.test.ts`) was correctly relaxed PR-by-PR from
"exactly Story 1" to a per-product WITH_PREVIEW set — code side is fine; the doc bullet lags.

See [[product-contract-field-additions]] (the one-time `previewPdf?` field add) — distinct
from this incremental per-title backfill lag.
