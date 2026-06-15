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
- **new-book-playbook.md ~L224-229 (Step-4 field-list bullet)** — the laggard: "**Omit it**
  unless you've captured one. **Today only `story-1-book` carries one**." This sentence goes
  stale the moment a second title ships a previewPdf (Story 2 cat sample = first such PR).
  Flag as *update doc* — it now misleads a future book author into thinking previewPdf is
  exceptional. Recommend rewording to: previewPdf is the standard slim preview (wire it once
  you've captured a sample set); Story 1's *full-res HIGH* variant is the only exception.

**How to apply:** on any `feature/story-samples-NN` branch, grep new-book-playbook.md for
"only `story-1-book`" / "Today only" / "the documented exception" near the Step-4 field list.
If still phrased Story-1-only, that's the (recurring) blocking-ish staleness finding. The
test invariant (`lib/catalog/products.test.ts`) was correctly relaxed PR-by-PR from
"exactly Story 1" to a per-product WITH_PREVIEW set — code side is fine; the doc bullet lags.

See [[product-contract-field-additions]] (the one-time `previewPdf?` field add) — distinct
from this incremental per-title backfill lag.
