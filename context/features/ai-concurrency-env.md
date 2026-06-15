# Feature Spec — Env-Tunable Scene Generation Concurrency

> **Status:** Drafted, awaiting sign-off (not started).
> **Branch (proposed):** `feature/ai-concurrency-env`
> **Scope:** Single PR. Small, contained config change + tests. No new dependency.

---

## Goal

Make the parallel scene-generation in-flight cap **configurable via an environment
variable** instead of the hardcoded `DEFAULT_CONCURRENCY = 3` in `lib/ai/retry.ts`, so we
can dial throughput up for routine generation runs without a code change — and back off
instantly if we see 429s — now that the org's real `gpt-image` limit is known to be far
higher than the `~5/min` the current default was sized against.

## Why

- **Time-to-ship vs. long-term cost:** the current cap of 3 was deliberately conservative
  for an assumed **~5 image-input/min** ceiling. On **Tier 2** the verified `gpt-image`
  limits are **20 images/min** and **250,000 TPM** (platform limits page, 2026-06-15) —
  roughly **4× the headroom** we engineered around. Raising the cap to ~6–8 should cut real
  minutes off Approach-A/C book runs.
- **Operator/dev impact, not customer-facing:** generation is a **batch step** behind the
  24–48h "hand-finished" promise (`commerce-roadmap.md`), so this is *not* on the customer's
  critical path. The win is faster QA iteration and faster batch drains for the operator —
  a nice-to-have, deliberately scoped small. Framed honestly so we don't oversell it.
- **Reversible by design:** an env var (not a new constant default) lets us experiment
  during a live run and revert with one value, and keeps it from silently changing the
  behavior of one-time paid runs like the Story 1 HIGH sample run
  (`context/features/story-1-high-sample-preview.md`).

## What does NOT change

- **Approach B stays sequential.** The accumulating-reference chain (Story 8, and Story 1
  when run under B) is sequential *by nature* — it cannot parallelize, so this var has no
  effect on it. Only the Approach A/C `mapWithConcurrency` path is touched.
- **`withRetry` backoff is unchanged** — it remains the safety net that absorbs the
  occasional 429 if we set the cap too high.
- **No new dependency, no stack change.** Pure config read of an existing pattern.

---

## Engine facts this spec relies on (verified)

- `DEFAULT_CONCURRENCY = 3` is exported from `lib/ai/retry.ts:213` and consumed by every
  Approach-A/C call site in `lib/ai/generate.ts` (`mapWithConcurrency(..., DEFAULT_CONCURRENCY, ...)`)
  — Story 1, Story 6/7/9 scene loops, etc. (the `grep` for `DEFAULT_CONCURRENCY` is the
  authoritative call-site list).
- `mapWithConcurrency` already clamps with `Math.max(1, Math.floor(concurrency))`, so a
  garbage value degrades safely to 1 rather than throwing.
- Generation is **operator/engine-only** (`lib/ai/*` is banned from the public import graph
  by `surface.boundary.test.ts`). So this env var is read **only on the operator surface**
  and is **non-secret runtime config** (like `DEPLOY_TARGET`) — never `NEXT_PUBLIC_*`.

---

## Deliverables (the work)

### 1. Resolve the cap from env in `lib/ai/retry.ts`
- Keep `DEFAULT_CONCURRENCY = 3` as the **fallback** (unchanged name/value, so any direct
  importer keeps today's behavior).
- Add a small pure resolver, e.g. `resolveSceneConcurrency(env = process.env): number`:
  - Reads `AI_SCENE_CONCURRENCY` (proposed name — confirm during build).
  - Parses to an integer; if missing / non-numeric / `< 1`, returns `DEFAULT_CONCURRENCY`.
  - Apply a sane **upper clamp** (e.g. ≤ 16, matching the model's per-minute image ceiling
    headroom) so a fat-fingered `AI_SCENE_CONCURRENCY=500` can't trigger a 429 storm.
  - Pure and unit-testable (env passed in), no IO — consistent with the codebase's
    "pure functions, IO out" rule.
- The orchestrator call sites use the resolved value. Two options — **pick during build**:
  - (a) call `resolveSceneConcurrency()` at each `mapWithConcurrency` call site, or
  - (b) compute once at the top of the orchestrator entry point and thread it down.
  Prefer whichever keeps the diff smallest and matches how `generate.ts` already reads
  config; default to (a) for locality unless it duplicates the read awkwardly.

### 2. Document the var
- Add `AI_SCENE_CONCURRENCY` to `.env.local.example` with a comment: non-secret, operator
  surface only, default 3, suggested 6–8 on Tier 2, clamp ≤16.
- One line in `coding-standards.md` *Secrets / env* area noting it as non-secret runtime
  config (alongside `DEPLOY_TARGET` / `PUBLIC_SITE_URL`), so the env inventory stays in sync.

### 3. Tests
- Unit-test `resolveSceneConcurrency` over the matrix: unset → 3; `"6"` → 6; `"0"`/`"-2"` →
  3 (or clamp-to-1, match the implemented contract); non-numeric → 3; above clamp → clamp.
- Confirm `surface.boundary.test.ts` stays green (no new import into the public graph).
- `npm run test:run` + `npm run build` must pass.

---

## Validation (no paid run required)

- The change is verifiable **without spending**: unit tests cover the resolver, and a
  cache-hit reuse run of an existing session (per the "QA Low-tier cost control" memory)
  exercises the call sites at ~$0. A real throughput measurement (set `=8`, drain a queued
  order, watch for 429s) is **optional** and can ride a future real generation, not gated
  to this PR.

## Out of scope / deferred

- Auto-tuning concurrency from live rate-limit headers — over-engineering at this volume;
  a static env knob + `withRetry` backoff is sufficient.
- Changing `DEFAULT_CONCURRENCY`'s value itself — we leave the safe default and override via
  env, so nothing changes unless an operator opts in.
- Making image **quality** tier env-selectable — unrelated; quality stays per-call as today.

## Open items to confirm during build (non-blocking)

- Final env var name (`AI_SCENE_CONCURRENCY` proposed) and upper clamp value.
- Call-site wiring choice (a) vs (b) above — decide by smallest honest diff.
