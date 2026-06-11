---
name: commerce-admin-seams
description: Testable seams + mock patterns for the PR-08 admin review/approval surface (auth gate, approve, requeue) and the updateOrderStatus pdfKey patch
metadata:
  type: project
---

The PR-08 admin surface (Supabase-Auth-gated operator review + approve) testable seams and the mock pattern that works.

**Why:** these are the pure/route seams to point new tests at for the admin area; the dual-gate ordering and the no-spend-on-reject invariant are the load-bearing guards.

**How to apply:** reuse these mocks for any later admin-route test; re-verify the module paths still exist before relying on them.

## Testable seams (mock the boundary)
- `app/(operator)/api/admin/approve/route.ts` — POST. Auth gate → read order → must be `awaiting_review` → `readSession` (orderId === sessionId; PR-07 worker wrote `./sessions/[orderId].json`) → `renderStoryPdf` → `putPdf` → `updateOrderStatus(id,"approved",{pdfKey})`. Invariant under test: on EVERY rejection path `renderStoryPdf`/`putPdf`/`updateOrderStatus` are NOT called (no spend/upload/write).
- `app/(operator)/api/admin/requeue/route.ts` — POST. Auth gate → `isSafeOrderId` → `updateOrderStatus(id,"queued")`. `failed→queued` legality is enforced inside the store (route catches `IllegalTransitionError`→409, "Order not found"→404).
- `app/(operator)/api/admin/auth/route.ts` — POST sign-in / DELETE sign-out. Cookie internals are `@supabase/ssr`'s job (NOT unit-testable); assert the contract only: house JSON shape, OPAQUE `invalid_credentials` (never echo provider msg / which field / email), email trimmed but password not, `signInWithPassword` called with the creds.
- `lib/order/store.ts` `updateOrderStatus(id,to,{error?,pdfKey?})` — the `pdfKey` option maps camelCase→snake_case `pdf_key` in the SAME guarded patch as `status`; omitted when not passed; never written on an illegal move (assert-before-write).

## Mock pattern (what each test stubs)
- Auth gate: `vi.mock("@/lib/supabase/auth", ...)` → stub `getOperatorUserId` (return a user id by default in `beforeEach`; override → `null` for the 401 test) and/or `createSupabaseAuthClient` → a fake `{ auth: { signInWithPassword, signOut } }`.
- `vi.mock("@/lib/order/store")` → `getOrder` / `updateOrderStatus`; `vi.mock("@/lib/supabase/storage")` → `putPdf`; `vi.mock("@/lib/session/disk")` → `readSession`; `vi.mock("@/lib/ai/generate")` → `manifestToImageMap`; `vi.mock("@/lib/pdf/render")` → `renderStoryPdf`.
- Keep REAL (the actual guards under test): `isSafeOrderId`, `IllegalTransitionError` + `MergeError` (import after the mocks via top-level `await import(...)` so `instanceof` matches the route), `assertOperator`.
- `MergeError` ctor is `new MergeError(string[])` (the missing keys).

## assertOperator under test (the 404 gate)
`assertOperator()` reads `DEPLOY_TARGET`; default is `"operator"`, so it returns `null` and per-route tests DON'T mock it (the handler proceeds). The public-build 404 for every operator route is proven once in `lib/runtime/all-operator-routes-gate.test.ts` (table-driven, sets `DEPLOY_TARGET=public`; already lists the 3 admin routes + has a disk drift-guard) — don't duplicate that 404 check per route. In the route source, `assertOperator()` runs BEFORE the auth check, so the public 404 is independent of (and ahead of) the 401 session check.

See [[commerce-payment-seams]] for the webhook/checkout/store mock idioms this builds on.
