---
name: operator-engine-boundary
description: The three-tier deploy-surface boundary and how to verify a new engine-touching module stays off the public graph
metadata:
  type: project
---

**Three-tier deploy-surface boundary** (PR-03/05/06, `lib/runtime/surface.ts` +
`app/(public)`/`app/(operator)` route groups):

- **Public page** (`PUBLIC_ENTRIES`) — fully client-safe: NO engine AND NO
  `lib/supabase/server`.
- **Public API route** (`PUBLIC_API_ENTRIES`) — MAY import the service-role Supabase
  client (`lib/supabase/server` + `@supabase/supabase-js`) but must stay engine-free
  (no `lib/ai/*`, `lib/pdf/render`, Puppeteer, `lib/session/disk`). Does NOT call
  `assertOperator()` (runs on the public host). Service-role key is **server-only, not
  operator-only** — it's set on the public Vercel deploy too (intake writes orders).
- **Operator** (`app/(operator)/*` + `lib/order/`/`scripts/`) — everything: OpenAI key,
  Puppeteer, service-role client. Operator API routes call `assertOperator()` first
  statement of every verb.

**The CLI batch worker (PR-07, `lib/order/worker.ts` + `scripts/process-orders.ts`)**
is operator-only: it imports `lib/ai/generate` + (transitively) `lib/supabase/server`.
It lives ONLY in `lib/order/` + `scripts/` and is invoked by the CLI — there is no HTTP
route, so it's not in any boundary-test closure. Correct: the public graph must never
reach it.

**Verification recipe for a new engine-touching module (re-run each time):**
- `grep -rln "lib/order/worker\|process-orders" app/` → must be empty (nothing under
  `app/` imports it).
- For a new public route, add it to `PUBLIC_ENTRIES` / `PUBLIC_API_ENTRIES` in
  `lib/runtime/surface.boundary.test.ts` and run the suite; the closure walk fails if
  it transitively reaches `lib/ai/*` / `lib/pdf/render` / Puppeteer.
- The stronger one-time proof (do on a real `DEPLOY_TARGET=public` build):
  `grep -r "OPENAI_API_KEY\|SUPABASE_SERVICE_ROLE_KEY\|renderStoryPdf\|puppeteer" .next/static`
  → zero hits.

See [[spend-guard-claim-pattern]].
