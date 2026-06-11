---
name: commerce-delivery-seams
description: PR-09 Resend delivery seams + mock patterns — token mint/validate, pure email builder vs thin Resend sender, store token lookup, download route no-enumeration, approve→deliver chain
metadata:
  type: project
---

PR-09 (commerce, Delivery via Resend) testable seams and the invariants the tests pin. All mocked — $0, no Resend/Supabase/OpenAI network.

**Why:** future delivery-adjacent PRs (re-send flow, customer order lookup) reuse these seams; the no-enumeration + email-failure invariants are security-critical and easy to regress.

**How to apply:** when touching `lib/delivery/*`, `app/(public)/api/download/[token]/route.ts`, or the approve→deliver chain, re-check these module paths still exist (grep), then mirror the mock style below.

## Pure / testable seams
- `lib/delivery/token.ts` — `mintDeliveryToken()` (only randomness; `node:crypto` `randomBytes(32).toString("base64url")` → 43-char base64url). `isWellFormedToken()` is pure (regex `^[A-Za-z0-9_-]{43}$`). Tests assert SHAPE + UNIQUENESS (never an exact value) + accept/reject. `isWellFormedToken` is **fail-closed on non-strings** (RegExp coerces; `null`/`[]`/`123` → false) — pinned by a regression test.
- `lib/delivery/email.ts` — split like `lib/order/lemonsqueezy.ts`: pure `buildDeliveryEmail()` → `{subject,html,text}` (noun "book" vs "letter" per `storyType`; pet name in both bodies; `/policies` footer via `policiesUrlFrom` deriving origin from the download URL; `escapeHtml` on interpolated values) + thin `sendDeliveryEmail()` calling `resend.emails.send`. The API key is in the Resend **constructor**, never the send payload — asserted absent from `JSON.stringify(payload)`.
- `lib/order/store.ts` — `setOrderDeliveryToken(id, token)` (status-agnostic, patches `delivery_token`+`updated_at` ONLY, `isSafeOrderId` guard before any client call) and `getOrderByDeliveryToken(token)` (validates token shape FIRST → `null` with **no DB call** on garbage; maps via `rowToOrder`; `null` on no match). Mirror `setOrderLsId`.

## Routes
- `app/(public)/api/download/[token]/route.ts` (PUBLIC, no `assertOperator()`) — well-formed token → delivered order w/ pdfKey → `{ok:true, downloadUrl, filename, petName}`; filename via `getStory(storyType).pdfFilename`. **No-enumeration invariant (security-critical):** malformed token / unknown token / found-but-no-pdfKey ALL return byte-identical `{ok:false, error:"invalid_or_expired"}` + 404 — assert the three are equal to EACH OTHER, not just to the literal. `lookup_failed`/`sign_failed` 500 branches. Never echoes customer email; only the signed URL (never `pdfKey`).
- `app/(operator)/api/admin/approve/route.ts` — render→putPdf→`approved`(+pdfKey)→mint token→`setOrderDeliveryToken`→`sendDeliveryEmail`→`delivered`. **Email-failure path (the key one):** send throws OR `PUBLIC_SITE_URL` unset → order LEFT at `approved`, body `delivery:"failed"`, `updateOrderStatus(...,"delivered")` NEVER called, no PII in body OR `console.error` log (spy on console.error, flatten calls incl. Error.message/stack, assert email absent). Also `delivery:"sent"` when email went out but the delivered move failed.

## Mock patterns
- store IO test (`lib/order/store.io.test.ts`): chainable query-builder stub w/ per-terminal queued `{data,error}` (`single`/`maybeSingle`/`order`); `vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => builder }))`.
- email test: `vi.mock("resend", () => ({ Resend: class { emails = { send: sendMock } } }))`; `RESEND_API_KEY`/`FROM_EMAIL` via `process.env` with restore in `afterEach`.
- approve route test: mock every boundary (`@/lib/supabase/auth`, `@/lib/order/store`, `@/lib/supabase/storage`, `@/lib/session/disk`, `@/lib/ai/generate`, `@/lib/pdf/render`, `@/lib/delivery/token`, `@/lib/delivery/email`); keep `IllegalTransitionError`/`MergeError`/`assertOperator`/`isSafeOrderId` REAL. `PUBLIC_SITE_URL` set in `beforeEach`.
