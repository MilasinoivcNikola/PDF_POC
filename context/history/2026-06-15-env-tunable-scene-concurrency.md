# Env-Tunable Scene Generation Concurrency

**Date:** 2026-06-15
**Branch:** `feature/ai-concurrency-env`
**Craft Area:** 2 (AI illustration) — `ai-image-specialist`
**Spec:** [`context/features/ai-concurrency-env.md`](../features/ai-concurrency-env.md)

## What & why

The parallel scene-generation in-flight cap was hardcoded to `DEFAULT_CONCURRENCY = 3`
in `lib/ai/retry.ts`, sized against an assumed ~5 image-input/min ceiling. Tier 2's
verified `gpt-image` limit is **20 images/min** (~4× the headroom we engineered around),
so the cap is now **tunable via the `AI_SCENE_CONCURRENCY` env var** — operators can dial
throughput up for routine/QA runs without a code change and back off instantly on 429s.
Operator/dev-facing only: generation is the batch step behind the 24–48h "hand-finished"
promise, not on the customer's critical path. Reversible by design — one env value, no
redeploy.

## What changed

- **`lib/ai/retry.ts`** — new pure `resolveSceneConcurrency(env = process.env)`:
  reads `AI_SCENE_CONCURRENCY`, `Number.parseInt`s it, falls back to `DEFAULT_CONCURRENCY`
  on missing / non-numeric / `< 1`, floors fractional values, and clamps above a new
  `MAX_SCENE_CONCURRENCY = 16` (headroom under the 20/min limit for `withRetry` retries).
  `DEFAULT_CONCURRENCY = 3` kept byte-identical as the fallback. Param typed
  `Record<string, string | undefined>` so the pure resolver is callable with test literals
  (the repo augments `NodeJS.ProcessEnv` to require `NODE_ENV`).
- **`lib/ai/generate.ts`** — wiring choice **(a)**: swapped `DEFAULT_CONCURRENCY` →
  `resolveSceneConcurrency()` at all **6** Approach-A/C `mapWithConcurrency` call sites
  (Story 1/9 shared scene path + Stories 2/4/5/6/7). Smallest honest diff vs. threading a
  value down through 6+ helper signatures. **Approach B's sequential accumulating-reference
  path (Story 8) untouched** — it can't parallelize. `withRetry` backoff unchanged. The
  order-worker's separate `ORDER_CONCURRENCY` knob correctly left alone.
- **`.env.local.example`** — `AI_SCENE_CONCURRENCY=3` with a non-secret / operator-only /
  default-3 / suggested-6–8 / clamp-≤16 comment.
- **`context/coding-standards.md`** — one line listing it as non-secret runtime config
  alongside `DEPLOY_TARGET` / `PUBLIC_SITE_URL`.
- **`lib/ai/retry.test.ts`** — resolver matrix: unset→3, `"6"`→6, `"0"`/`"-2"`→3,
  `"abc"`→3, `"500"`→16, `"16"`→16, `"6.9"`→6.

## Review findings (both fixed in-branch)

- **code-reviewer (blocking):** resolver param `NodeJS.ProcessEnv` made all 8 test call
  sites fail `tsc` (the repo requires `NODE_ENV` on `ProcessEnv`). Slipped past committed
  gates (Vitest doesn't full-typecheck; app graph doesn't import test files). Fixed by
  widening to `Record<string, string | undefined>`; `npx tsc --noEmit` now clean.
- **context-auditor (drift):** `commerce-roadmap.md:29` still cited the superseded `~5/min`
  ceiling. Corrected to the verified 20 images/min (conclusion — "instant impossible,
  automated-async wins" — preserved, since per-image latency keeps a book in minutes
  regardless). Also brought the now-stale `DEFAULT_CONCURRENCY` docstring in line with the
  adjacent `MAX` docstring's 20/min figure.

No commerce surface touched → no security review. No paid run: resolver unit-covered;
real throughput measurement (set `=8`, watch 429s) deferred to a future real run.

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:run` — 1934 passed / 89 files (incl. `surface.boundary.test.ts`, green —
  changes confined to already-operator-only `lib/ai/*`)
- `npm run build` — clean (only pre-existing unrelated warnings)
