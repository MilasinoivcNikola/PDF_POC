# PR-07 — Local Batch Worker (Phase 3a)

> **Branch:** `feature/order-worker` · **Phase:** 3a · **Depends on:** PR-06
> **Status:** Planned · Part of the [commerce plan](./00-overview.md). Operator-side, local-only.

## Goal

A local command that drains `queued` orders, generates the book with the existing engine,
and parks each at `awaiting_review` (or `failed`). No manual generation step — this is
where the automation moat replaces per-order labour.

## Scope (in this PR)

- A `process-orders` command (operator-side).
- Claim → `generating`, download photo, run the engine, set `awaiting_review`.
- Failure handling → `failed` + stored message.
- Bounded concurrency + retry honouring the gpt-image-2 rate limit.

## Out of scope

- The admin review UI (PR-08), delivery (PR-09).

## What to build

- `scripts/process-orders.ts` — query Supabase for `queued`; for each (bounded
  concurrency): **atomically claim** → `generating`; download the photo from Supabase to
  local scratch under `./uploads/[orderId]/`; run `generateAllIllustrations(session, …)`
  at **Low**; on success → `awaiting_review`; on error → `failed` + message.
- `package.json` script `process:orders`.
- **Storage decision:** keep generated page PNGs in **local scratch** (operator machine)
  for review; upload only the **final approved PDF** later (PR-08/09). Less storage churn;
  the admin (PR-08) reads local images.

## Data / contracts

Consumes `queued` orders; produces `awaiting_review`/`failed`. Inputs → the engine
unchanged (the `inputs` field is a `StorySession`/`Story2Session`).

## Reuse

- `generateAllIllustrations`, `mapWithConcurrency` + `withRetry` (the feature-07 rate-limit
  fix), the registry-driven slot list, manifest + cache (a re-run of an unchanged order is
  a **$0 cache hit**), traversal guards.

## Testing

- **Unit:** claim/transition logic, the `failed` path, idempotent re-claim (OpenAI mocked, $0).
- **Live (one time, per cost rule):** one real `queued` order generates its book at Low
  (~$0.08) → `awaiting_review`; a second `process:orders` run is a **$0 cache hit**; an
  injected failure → `failed` with a message.

## Done when

- [ ] `npm run process:orders` turns every `queued` order into `awaiting_review`/`failed`
      with the book generated, no manual step.
- [ ] A re-run costs $0 (cache); a failure is recorded, not crashing the batch.
- [ ] Runs operator-side only (key local); build + tests green.

## Risks / notes

- **Atomic claim** so two worker runs don't double-generate (the feature-09 TOCTOU
  lesson — claim before the first await).
- Honour the **~5 img/min** rate limit via the existing concurrency cap.
- Operator-only: never reachable from the public deploy (PR-03 gate).
