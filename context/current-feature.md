# Current Feature

PR-10 — New-Book Product Playbook (formalize the recipe)

## Status

In Progress

## Goals

> **Scope decision (PM, 2026-06-11):** do **not** build a concrete book now. Capture
> PR-10 as a standing, repo-checked **reference recipe** so any future title is a quick,
> low-risk branch. The which-book product call (Story 3 vs. a new original) is deferred.

- A canonical reference doc lives in the repo (proposed: `context/new-book-playbook.md`)
  that turns the PR-10 per-book checklist into a precise, **step-by-step recipe** a future
  engineer (or future-me) follows to add a new sellable book on its own `feature/book-<name>`
  branch — concrete file paths, not prose.
- It covers all six checklist steps with concrete pointers into the existing code:
  1. **Author text** — `lib/story/<book>/{master-text,variants,merge}.ts`, reusing
     `clean` / `substitute` / `MergeError` from `lib/story/merge.ts`; honour the relevant
     master template's quality bar (the "died" rule / banned-phrase list).
  2. **Register it** — a `StoryDefinition` in `lib/story/registry.ts` (the features-14/15
     pattern): `resolve`, `illustrationSlots`, `pdfFilename`, `wizard`, `editable`.
  3. **Layout/CSS — only if a new page layout** — add a `PageLayout` value + a `renderPage`
     case + print **and** screen CSS, preserving **screen↔PDF parity** and
     **existing-book byte-identity** (the feature-16 `letter` precedent).
  4. **Catalog entry** — a `Product` in `lib/catalog/products.ts` (price, copy,
     `illustrationCount` derived from the registry, `sampleImages`).
  5. **Lemon Squeezy product/variant** (manual fulfilment) → record `lsVariantId`
     via the per-product `LEMONSQUEEZY_VARIANT_<PRODUCT_ID>` env, not the client catalog.
  6. **Samples** — a few Low-tier sample books for the storefront detail page.
- It states the **standing guards** every new book must clear: its own merge/variant unit
  tests (zero surviving placeholders, the template's "died"/banned-phrase rules,
  optional-field handling), **byte-identity of all existing books' PDFs**, and
  `npm run build` + `test:run` + `tsc --noEmit` green.
- It documents the **reuse guarantee**: the order → pay → worker → admin → delivery loop is
  unchanged — a new book flows through **by id** with **zero** changes to Supabase, the
  worker, the admin, or delivery.
- The recipe is **discoverable**: linked from `context/commerce-roadmap.md` (Phase 5) so it
  isn't buried in `context/features/`.

## Notes

- **Craft Area:** primarily **documentation** — no product code. Closest owning agent is
  **pdf-render-specialist** (owns the story-text / registry / merge / byte-identity patterns
  the recipe centers on, via features 14/15/16). Could also run on the main thread.
- **Phase 5, the final commerce PR.** Closes out the commerce roadmap (PRs 01–09 shipped).
- **Optional stretch (confirm at `start`):** a small scaffolding helper (e.g.
  `scripts/new-book.ts`) that stamps a new `lib/story/<book>/` skeleton + registry/catalog
  entry stubs. Default to **doc-only** unless explicitly green-lit — keep the surface small
  per the plan; don't add a "nice to have."
- **Out of scope:** authoring an actual new title now (PM-deferred); any infra change to the
  order/payment/worker/admin/delivery loop; any new dependency. The doc must **describe** the
  recipe, not exercise it.
- **Accuracy bar:** because it's a reference others will trust, every file path / module name /
  env var it cites must be verified against the current tree (the codebase has moved a lot —
  e.g. `lib/story/scenes.ts`, `lib/pdf/filename.ts`, the `(public)`/`(operator)` split).
