---
name: catalog-second-module-lag
description: lib/catalog/ is now two client-safe modules (products.ts + book-questions.ts); CLAUDE.md/coding-standards "Commerce catalog" blurb still describes only products.ts
metadata:
  type: project
---

`lib/catalog/` gained a **second** pure/client-safe module on
`feature/book-detail-redesign-pr1` (2026-06-16): `lib/catalog/book-questions.ts` —
the storefront's "questions you'll answer" + worked-example content map, keyed by
`productId`, fixture-pinned by `book-questions.test.ts` (approach A: hand-authored
`example` literals, a test asserts each equals the field in that title's sample
fixture JSON). Same engine-free discipline as `products.ts`.

**The lag:** `CLAUDE.md` + `context/coding-standards.md:141-158` "Commerce catalog
(`lib/catalog/`)" blurb still reads as if `products.ts` is the sole member ("owns
the `Product` catalog contract … pure and client-safe"). Nice-to-have, not blocking:
the blurb is illustrative, and the new module is **dead code until book-detail PR-3
imports it** (so the public boundary test doesn't yet walk it — that's in-spec, not
drift). Flag as a one-clause addition when the passage is next touched.

**Same branch, second omission:** `scripts/sample-capture.ts` now emits a **third**
sample artifact — `source-photo.jpg` (downscaled from `session.pet.photo`) — and the
`Product` contract gained `sourcePhoto?` (all 8 titles). coding-standards L106 +
L151-158 still describe samples as only "web JPGs + preview.pdf" / `sampleImages` +
`previewPdf?`. Same nice-to-have tier as [[product-contract-field-additions]] — the
canonical home (`new-book-playbook.md`) WAS updated correctly (Step-4 sourcePhoto
bullet + the required-per-title book-questions subsection + Step-6 capture thread).

**How to apply:** on a book-detail-redesign follow-up (PR-2/PR-3) or any branch
touching `lib/catalog/`, recheck whether CLAUDE.md/coding-standards' catalog blurb
has caught up to the two-module reality. The playbook is the doc that matters; the
coding-standards/CLAUDE.md mentions are nice-to-have. See [[product-contract-field-additions]].
