---
name: admin-auth-gate
description: The PR-08 admin auth model — dual gate on pages+mutation routes, and the accepted reused-engine-route residual
metadata:
  type: project
---

**The admin gate (PR-08, first auth in the codebase).** Supabase Auth, single
operator account, cookie session via `@supabase/ssr`.

- `lib/supabase/auth.ts` — server-only (imports `node:process` + `next/headers`, so
  webpack refuses a client bundle; never in any `surface.boundary.test.ts` entry).
  Uses the **anon key** + the request cookie store, NOT the service-role key — purely
  the gate, never the data path (RLS denies anon). `getOperatorUserId()` uses
  `auth.getUser()` (re-validates the token server-side), **never** `getSession()` (which
  only decodes the cookie) — so a tampered/expired cookie does not pass.

**Verified dual gate (re-confirm on any new admin surface):**
- Admin **pages** (`(operator)/admin/**`): `getOperatorUserId()` → `redirect("/admin/login")`
  if null, AND sit under `(operator)/layout.tsx` `force-dynamic` + `notFound()` (404 under
  public).
- New admin **mutation routes** (`/api/admin/{approve,requeue,auth}`): FIRST statement is
  `assertOperator()` (404 under public), THEN `getOperatorUserId()` → 401 if absent. Both
  are in the `all-operator-routes-gate.test.ts` drift-guard table.
- Auth failures return an opaque `invalid_credentials` (never "no such user" vs "wrong
  password", never echo the provider error).

**Accepted residual — the reused operator engine routes (`/api/preview`,
`/api/regenerate-illustration`, `/api/update-text`, `/api/render-pdf`) are gated ONLY by
`assertOperator()`, NOT by a session.** They're shared with the non-authed operator
wizard, so adding a session check would break that flow. The admin detail view reuses
them by id (`BookPreview(sessionId=orderId)`). **Verdict: ACCEPTABLE for a single-operator
localhost-only tool** — PR-03 guarantees the operator surface never deploys off localhost
(keys not set on Vercel; 404 there), so the only party who can hit those routes is whoever
already runs the engine on that machine. The NEW spend/state-mutating admin routes
(approve/requeue) DO require a session. Documented in `AdminBookReview.tsx`.
**This flips to BLOCKING the moment the operator surface becomes multi-user or
network-exposed** (then those reused routes need a session gate or admin-scoped authed
variants). Re-raise if a future PR exposes the operator surface beyond localhost.

See [[operator-engine-boundary]], [[spend-guard-claim-pattern]].
