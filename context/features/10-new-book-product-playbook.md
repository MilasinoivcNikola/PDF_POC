# PR-10 — New-Book Product Playbook (Phase 5, repeatable)

> **Branch:** `feature/book-<name>` (one per book) · **Phase:** 5 · **Depends on:** the closed loop (01–09)
> **Status:** Repeatable recipe · Part of the [commerce plan](./00-overview.md).

## Goal

A repeatable recipe to add a **new sellable book** with minimal engineering. This is the
"build more books and sell only them" path — once the infra (01–09) is built, each new
title is mostly **writing**, not plumbing. The pipeline is already product-agnostic
(features 14/15), so no infra changes per book.

## Per-book checklist

1. **Author the text** — `lib/story/<book>/master-text.ts` + `variants.ts` + `merge.ts`
   (reuse `clean`/`substitute`/`MergeError`); honour the template's quality bar
   (the "died" rule / banned phrases per the relevant master template).
2. **Register it** — a `StoryDefinition` in the registry (the feature-14/15 pattern):
   `resolve`, `illustrationSlots`, `pdfFilename`, `wizard` config, `editable` fields.
3. **Layout/CSS (only if a new page layout)** — add a `PageLayout` value + renderer case
   + print/screen CSS, preserving **screen↔PDF parity** and **existing-book byte-identity**
   (the feature-16 `letter` precedent).
4. **Catalog entry** — a `Product` in `lib/catalog/products.ts` (PR-02): price, copy,
   `illustrationCount`, sample images.
5. **Lemon Squeezy product** — create the LS product/variant (**manual fulfilment**),
   record `lsVariantId` in the catalog.
6. **Samples** — generate a few sample books (Low) for the storefront detail page.

## Reuse

The **entire** order → pay → worker → admin → delivery loop, unchanged. A new book needs
**zero** changes to Supabase, the worker, the admin, or delivery — it flows through by id.

## Testing

- The book's own merge/variant unit tests: **zero surviving placeholders**, the banned-phrase
  + "died"/euphemism rules for its template, optional-field handling.
- **Byte-identity** of the existing books' PDFs (the standing regression guard).
- Build + `test:run` + `tsc --noEmit` green.

## Done when (per book)

- [ ] The title appears in the storefront with price + samples.
- [ ] It's purchasable via its LS variant (manual fulfilment).
- [ ] It flows order → pay → worker → admin → delivery with **no pipeline changes**.
- [ ] Existing books still render byte-identically.

## Notes

- This is **recurring content work**, not a one-time PR — each new book is its own small
  branch following this recipe.
- Candidate titles to author (pet-focused, full books): the Story-1 memorial book and
  Story-2 letter already exist; Story-3 (Life Story booklet) template exists and is a
  natural next build; further originals (e.g. a celebration-of-life / "happy life" book)
  are pure authoring.
