---
name: ai-concurrency-env-review-calibration
description: feature ai-concurrency-env — env-tunable scene concurrency; the recurring NodeJS.ProcessEnv test-literal trap + which call sites are/aren't scene-concurrency
metadata:
  type: feedback
---

Reviewed `feature/ai-concurrency-env` (env-tunable Approach-A/C scene concurrency: new pure `resolveSceneConcurrency(env)` + `MAX_SCENE_CONCURRENCY=16` clamp in `lib/ai/retry.ts`, 6 call-site swaps in `lib/ai/generate.ts`).

**The one real finding — `NodeJS.ProcessEnv` test-literal trap (cross-feature, reusable).**
A pure resolver typed `env: NodeJS.ProcessEnv = process.env` looks correct, but this repo augments `ProcessEnv` to **require `NODE_ENV`**, so test call sites passing bare object literals (`{}`, `{ AI_SCENE_CONCURRENCY: "6" }`) fail `tsc --noEmit` with TS2345 ("Property NODE_ENV is missing"). **Vitest passes** (no full typecheck) and **`next build` passes** (Next.js typechecks only the app import graph — `*.test.ts` is excluded), so the committed gates (`npm run test:run` + `npm run build`) are both green while the test file is not type-sound under the repo's own strict tsconfig.
**Why:** the gap between "the workflow gates pass" and "tsc is clean" — run `npx tsc --noEmit` when reviewing any change that adds an injected-env param taken with an object literal in tests.
**How to apply / the fix:** type such params `Partial<NodeJS.ProcessEnv>` or `Record<string, string | undefined>` (accepts both literals and `process.env`), or follow the existing `lib/runtime/surface.ts` precedent — env resolvers there read `process.env` directly and tests mutate/restore it rather than injecting.

**Validated-as-correct (don't re-flag next time):**
- Resolver edge cases all degrade safely: unset/""/non-numeric/NaN/`<1`/0/negative → `DEFAULT_CONCURRENCY` (3); `>16` → 16; floats floored via `Number.parseInt`; `"1e2"`→1, `"0x10"`→3 (radix-10) — surprising but safe.
- All 6 `mapWithConcurrency` scene call sites in `generate.ts` rewired; zero `DEFAULT_CONCURRENCY` left there; `DEFAULT_CONCURRENCY = 3` value/name unchanged (fallback contract intact).
- Approach-B sequential paths genuinely untouched: the `for` loop in `generateAllIllustrations` (approach==="B") and the dedicated Story-8 `generateStory8Illustrations` sequential loop take no concurrency arg.
- `lib/order/worker.ts` `mapWithConcurrency(queued, ORDER_CONCURRENCY, …)` is the **order-level** batch knob — a deliberately separate cap, correctly NOT rewired; its line-339 `DEFAULT_CONCURRENCY` mention is a descriptive comment, not a dependency.
- Boundary test green (no new public-graph import); `lib/ai/*` stays operator-only.
