# PR-01 — Order Model & Supabase Data Layer

> **Branch:** `feature/order-model-supabase` · **Phase:** Foundation · **Depends on:** —
> **Status:** Planned · Part of the [commerce plan](./00-overview.md).

## Goal

Stand up the data spine: an `Order` with a status state machine, persisted in Supabase
(Postgres + Storage), behind a server-only data-access layer. No UI. Everything later
hangs off this.

## Scope (in this PR)

- The `Order` type + `OrderStatus` state machine (pure, unit-tested).
- Supabase: `orders` table migration, two Storage buckets, a server-only client.
- A data-access module (create / read / update-status / list-by-status).
- Storage helpers (put/get photo + PDF, signed-URL generation for later delivery).
- Env vars + `.env.local.example` updates.

## Out of scope

- Any UI, order intake (PR-05), payment (PR-06), worker (PR-07). No engine changes.

## What to build

- `lib/order/types.ts` — `Order` (`id`, `productId`, `storyType`, `status`,
  `customerEmail`, `inputs` (the captured `StorySession`/`Story2Session`), `photoKey`,
  `pdfKey?`, `lsOrderId?`, `deliveryToken?`, `error?`, `createdAt`, `updatedAt`) and
  `OrderStatus = pending_payment | paid | queued | generating | awaiting_review |
  approved | delivered | failed | refunded | cancelled`.
- `lib/order/state.ts` — pure `ALLOWED_TRANSITIONS` map + `canTransition(from,to)` /
  `nextStatus()`. The single source of truth for legal status moves.
- `lib/supabase/server.ts` — server-only Supabase client (service-role key). Guarded so
  it can never reach a client/public bundle (the existing `disk.ts` server-only pattern).
- `lib/order/store.ts` — `createOrder`, `getOrder`, `updateOrderStatus` (goes through
  `state.ts`), `listOrdersByStatus`. Row ↔ `Order` mapping.
- `lib/supabase/storage.ts` — `putPhoto` / `getPhoto` / `putPdf` / `signedPdfUrl`.
- `supabase/migrations/0001_orders.sql` — `orders` table + indexes + **RLS** (service
  role only; anon cannot read), buckets `order-photos` and `order-pdfs` (private).
- `.env.local.example` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Data / contracts

`Order` + `OrderStatus` become the shared contract every later PR imports. `inputs`
reuses the existing session types verbatim so the engine consumes it unchanged.

## Reuse

- `StorySession` / `Story2Session` types for `inputs`.
- The server-only-module discipline from `lib/session/disk.ts`.
- Id-safety guard shape from `lib/ai/paths.ts` (`isSafeSessionId`) for order ids.

## Testing

- **Unit:** the state machine — every legal transition allowed, every illegal one
  rejected; terminal states reject further moves. Order↔row mapping.
- **Manual:** create → read → transition an order; put + signed-get a photo and a PDF in
  Supabase. No paid calls.

## Done when

- [ ] An order can be created, read, and walked through the legal status path.
- [ ] Illegal transitions throw.
- [ ] A photo and a PDF round-trip through Supabase Storage via the helpers.
- [ ] Service-role key proven absent from any client bundle; `npm run build` + tests green.

## Risks / notes

- **Service-role key must never reach the client/public bundle** — server-only module +
  RLS as defence in depth. This is the security-critical part of the PR.
- Add `supabase` + `@supabase/supabase-js` deps — first new infra deps; note in the PR
  (approved via the roadmap scope decision).
