# PR-02 — Product Catalog & Pricing

> **Branch:** `feature/product-catalog` · **Phase:** Foundation · **Depends on:** PR-01
> **Status:** Planned · Part of the [commerce plan](./00-overview.md).

## Goal

Turn the story registry into a sellable **catalog** — each book a product with an id,
title, marketing copy, price, sample art, and a Lemon Squeezy variant id — so the
storefront (PR-04) and checkout (PR-06) have something to list and charge for.

## Scope (in this PR)

- A `Product` type + a catalog module derived from the registry.
- Product metadata + price for the live books (Story 1 memorial book, Story 2 letter).
- Client-safe (no engine/Puppeteer import) so the public storefront can import it.

## Out of scope

- Storefront UI (PR-04), checkout (PR-06), creating the LS products (PR-06).

## What to build

- `lib/catalog/products.ts` — `Product` (`productId`, `storyType`, `title`, `tagline`,
  `description`, `priceUsd`, `lsVariantId?`, `sampleImages`, `illustrationCount`) +
  `getProducts()` / `getProduct(productId)`. Pure.
- Map each `storyType` → a `Product`; pull `illustrationCount` from the registry's
  `illustrationSlots` so it can't drift.
- Price placeholders (default e.g. `2900` cents) — **flagged as the deferred pricing
  decision**; final numbers set with PM before PR-06.
- `lsVariantId` left optional/empty until the LS products exist (filled in PR-06).

## Data / contracts

`Product` is the storefront/checkout contract. `lsVariantId` ties a product to a Lemon
Squeezy variant.

## Reuse

- `lib/story/registry.ts` (`getStory`, `illustrationSlots`) — catalog references it,
  doesn't fork it. Same client-safe boundary as the registry/`filename.ts` split (PR-19)
  so importing the catalog never pulls in Puppeteer.

## Testing

- **Unit:** `getProducts()` returns the expected books; every catalog product maps to a
  real registry story; `illustrationCount` matches the story's slot count; `priceUsd > 0`;
  `getProduct(unknown)` returns null.

## Done when

- [ ] `getProducts()` lists the live books with price + copy + sample refs.
- [ ] Catalog imports cleanly into a client/public module (no engine in the bundle).
- [ ] Build + tests green.

## Risks / notes

- Keep the catalog **client-safe** — a stray transitive engine import would break the
  storefront's static build. Add a build/import assertion if cheap.
- Prices here are placeholders until the PM sets them; treat as config, not content.
