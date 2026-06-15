# Public Refresh PR-1: Catalog Data Foundation

**Date:** 2026-06-15
**Branch:** `feature/public-refresh-catalog-data`
**Spec:** [context/features/public-refresh-pr-1-catalog-data.md](../features/public-refresh-pr-1-catalog-data.md)
**Series:** Public-pages refresh (PR-1 of 4 + 1 follow-up). Design source:
`context/prototypes/001-public-pages-refresh/`.

## What & why

The refreshed landing + catalog split the 8-title line into two worlds —
**"celebrate them" (living)** vs **"remember them" (loss)**. Today that split is only
implied by ad-hoc per-card accent classes on the landing, and page copy hardcodes counts
("Six keepsakes" for an 8-title catalog). Before any page can render the split from data,
the catalog has to **carry the classification as a field** and pages need to **derive
counts** instead of writing literals.

This PR is **data + pure helpers only — zero visible change**. It ships invisibly and
unblocks PR-2 (chrome/landing), PR-3 (catalog page), PR-4 (detail/policies/download), so
each of those becomes low-risk presentational work.

## Locked decisions (PM-approved)

1. **Internal field name ≠ display copy, deliberately.** The field is
   `audience: "living" | "loss"`; the customer-facing words ("celebrate" / "remember",
   "for the days you have" / "for the goodbye") land in PR-2/3, not here.
2. **Living-vs-loss is the axis** (not celebration-vs-memorial). The consequential call:
   **Story 6 "While You're Still Here" → `living`** — it's a tribute to a pet who is
   *still alive*, so filing it under "the goodbye" was the tone-miss being fixed.
   Consequence: the split is **5 living / 3 loss**, not the 4/4 the mockup drew — which
   is exactly why counts must be derived, never written as "four."
3. **`displayTitle` override only where the stored title reads incomplete standalone.**
   Today that's only Story 9 ("And the New Baby" → **"Your Pet and the New Baby"**); all
   other products fall back to `title`.

### Audience mapping (the 8 products)

| productId | audience |
|---|---|
| `story-1-book` (Saying Goodbye) | `loss` |
| `story-2-letter` (A Letter from Your Pet) | `loss` |
| `story-5-letter-to` (A Letter to Your Pet) | `loss` |
| `story-4-talk` (If Your Pet Could Talk) | `living` |
| `story-6-tribute` (While You're Still Here) | `living` |
| `story-7-welcome` (Welcome Home) | `living` |
| `story-8-adventure` (The Amazing Adventures…) | `living` |
| `story-9-newbaby` (And the New Baby) | `living` |

Story 4 is `living` (its primary shelf); the past-tense pet-has-died checkout option is a
nuance, not a second catalog placement.

## What changed

- **`lib/catalog/products.ts`** — extended the `Product` contract with
  `audience: "living" | "loss"` (required) and `displayTitle?: string` (optional override);
  threaded both through `buildProduct(...)`'s `meta` pick; set `audience` on all 8 entries
  per the mapping; set `displayTitle: "Your Pet and the New Baby"` on `story-9-newbaby`
  only (with an inline comment pinning the Story-6 reclassification rationale). Added two
  pure selectors: `getProductsByAudience(audience)` (filters `getProducts()`, preserves
  catalog order) and `productDisplayTitle(p)` (`p.displayTitle ?? p.title` — the single
  fallback site). **No new imports** — module stays pure and client-safe.
- **`lib/catalog/products.test.ts`** — added an `audience classification` block (valid
  audience on every product + an exact id-set partition pinning the 5/3 split, so a future
  title added without a deliberate classification fails), a `getProductsByAudience` block
  (right members in catalog order; the two worlds partition `getProducts()` with no overlap
  /omission), and a `productDisplayTitle` block (override for story-9, `title` fallback
  elsewhere, no empty resolved title).
- **`context/new-book-playbook.md`** (review-driven) — `audience` is now a *required*
  `Product` field, so the Step-4 field list + the worked `buildProduct` example were
  updated to include it (and note `displayTitle` as usually-omitted). Without this, the
  next book authored from the playbook would fail to compile and fail the partition test.

## Verification

- `npm run test:run` green — 1927 passed (89 files), incl. `surface.boundary.test.ts`
  unchanged (catalog stays client-safe, no engine/Supabase leak).
- `npm run build` green.
- **Review:** code-reviewer PASS (no blocking issues; one inert `??`-vs-`||` nicety left
  as-is). context-auditor found the playbook drift above (fixed in-PR). No
  commerce-security review needed — pure presentational data, no orders/payment/auth surface.
- **QA:** PASS — no regression. `/` and `/books` render HTTP 200, 0 console errors, all 8
  cards present; the living/loss split and the `displayTitle` override are *not* consumed
  yet (story-9 card still shows "And the New Baby"), confirming zero visible change.
  Pre-existing missing-sample-image 404s on `/books` (story-8/story-9 covers) are unchanged
  from `main` — a standing asset gap the follow-up PR addresses, not a regression here.

## Notes / follow-ups

- The Story-6 `living` reclassification is the one judgement call; the partition test pins
  it so it can't silently regress.
- Nothing consumes `audience` / `displayTitle` / the selectors yet — PR-2/3/4 wire them
  into the landing, catalog, and detail pages.
