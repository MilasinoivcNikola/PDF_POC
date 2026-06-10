# PR-04 — Public Storefront (Phase 1)

> **Branch:** `feature/storefront` · **Phase:** 1 · **Depends on:** PR-02, PR-03
> **Status:** Planned · Part of the [commerce plan](./00-overview.md).

## Goal

The always-on, customer-facing marketing + product pages, deployable to Vercel. The
"advertise our product" site. No payment, no engine — pure, safe groundwork.

## Scope (in this PR)

- Marketing landing in the Quietly Kept design system.
- A product list and a product detail page driven by the catalog (PR-02).
- "Order this book" CTA → the order route (stubbed until PR-05).
- Footer + policy stubs (refund / AI-honesty copy placeholders).

## Out of scope

- The order form, photo upload, payment, generation.

## What to build

- `app/(public)/page.tsx` — marketing landing (adapt the existing landing/picker;
  reframe for the pet-memorial product line).
- `app/(public)/books/page.tsx` — product grid from `getProducts()`.
- `app/(public)/books/[productId]/page.tsx` — detail: sample art, copy, price,
  "Order this book" → `/(public)/order/[productId]` (stub).
- Sample art assets per book (a few real generated pages, watermarked if desired).
- Policy/footer stubs: refund, "how it's made / AI-honesty", privacy — copy flagged as
  the deferred PM decision.

## Data / contracts

Reads `Product` from the catalog. No new persisted data.

## Reuse

- `app/globals.css` design system, fonts, components. Static/SSR — no engine imports
  (guaranteed by PR-03's boundary).

## Testing

- **Build/prerender:** pages render statically; CTA links resolve.
- **Manual / qa:** a Vercel preview deploy shows the brand + books + prices; no operator
  code in the bundle; CTA points at the stubbed order route.

## Done when

- [ ] A real Vercel URL shows the marketing site + book catalog with prices.
- [ ] CTA routes toward the (stubbed) order flow.
- [ ] Public bundle contains no engine/operator code; build green.

## Risks / notes

- AI-honesty copy in a grief context is a brand decision — ship a placeholder, flag for
  PM sign-off before launch.
- Keep imagery weight reasonable (sample pages can be large PNGs) — optimize for the
  marketing pages.
