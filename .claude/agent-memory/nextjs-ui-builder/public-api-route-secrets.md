---
name: public-api-route-secrets
description: A public API route may hold secrets but must stay engine-free; add it to PUBLIC_API_ENTRIES in the boundary test
metadata:
  type: feedback
---

A public-surface API route (`app/(public)/api/.../route.ts`) MAY hold server-only secrets
(service-role Supabase key, `LEMONSQUEEZY_API_KEY`/`_WEBHOOK_SECRET`) and must NOT call
`assertOperator()` — it runs on the always-on Vercel host that takes/confirms payment. What
it must never do is import the engine (`lib/ai/*`, Puppeteer, `lib/pdf/render`/`template`,
`lib/session/disk`).

**Why:** the three-tier deploy-surface boundary (PR-03/05) — public PAGE (client-safe, no
`lib/supabase/server`) · public API ROUTE (service-role + `@supabase/supabase-js` OK, engine
banned) · operator (everything). The load-bearing guarantee is *no engine in the public route
graph*, not *operator-only*.

**How to apply:** when you add a public API route, add its path to **`PUBLIC_API_ENTRIES`** in
`lib/runtime/surface.boundary.test.ts` (NOT `PUBLIC_ENTRIES` — that's for pages and forbids
`lib/supabase/server`). The guard walks the import closure and fails on any engine module/
package. Keep secrets read via `process.env` only inside the server route — never in a
client-safe module like `lib/catalog/products.ts` (a `process.env` read there diverges
client/server and breaks the static storefront build). Non-secret public identifiers (e.g. an
LS variant id) are still resolved server-side at request time from a per-product env var
(`LEMONSQUEEZY_VARIANT_<PRODUCT_ID>`), not stored in the catalog. Confirmed via the boundary
test passing + a `.next/static` grep showing no secret env names leak. See
[[lemonsqueezy-webhook]].
