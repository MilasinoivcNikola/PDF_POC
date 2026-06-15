---
name: catalog-sampleimages-empty-allowed
description: A catalog Product may ship with sampleImages [] (degrades to placeholder card); no doc asserts every product has samples, so emptying them is not drift
metadata:
  type: project
---

Public Refresh PR-3 (`feature/public-refresh-catalog-page`, 2026-06-15) emptied
Story 8/9 `sampleImages` to `[]` in `lib/catalog/products.ts` because the
`public/samples/<id>/` JPEGs were never generated (referencing them rendered a
broken `<img>`). The `/books` card degrades to a placeholder art block. Tests in
`products.test.ts` were relaxed from "non-empty sampleImages" to "=== []".

**Why this is NOT drift:** no in-scope doc asserts every product ships with samples
as an invariant.
- `coding-standards.md` (~L144) only *describes* `sampleImages` ("web-optimized
  sample art under `public/samples/`, populated in PR-04") — a description, not a
  must-be-non-empty rule. Still truthful; not misleading.
- `new-book-playbook.md` Step 6 (~L253) says generate samples + reference them, but
  the storefront card already had a `sampleImages[0] ? <img> : null` fallback before
  this PR, so "card degrades without samples" is a pre-existing, in-spec behaviour.

**How to apply:** if a future branch empties/omits `sampleImages`, don't flag it as
a contradiction. The one *nice-to-have* worth recommending (deferred by PM judgement —
re-confirm): new-book-playbook Step 6 could note "samples are optional — a sample-less
card degrades to the placeholder art block; backfill later" so a new-book author
knows shipping before samples is allowed. Low severity.

**Card kicker / marketing copy stays out of `products.ts`** (PR-3): the `/books`
page holds a page-local `CARD_COPY: Record<productId, {kicker}>` lookup, deliberately
NOT in the catalog module (keeps it pure/minimal). This is consistent with the
[[canonical-doc-map]] "products.ts stays pure/client-safe" rule — page-local marketing
copy is the right home. If the playbook ever gains a "card kicker" step it would be a
new convention worth recording, but as of PR-3 it's a single page's concern, not a
documented cross-book contract. See [[new-book-playbook-pr10]].
