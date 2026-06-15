# Current Feature

## Status

In Progress

## Goals

- Make the parallel scene-generation in-flight cap **configurable via an environment
  variable** (`AI_SCENE_CONCURRENCY`, name to confirm) instead of the hardcoded
  `DEFAULT_CONCURRENCY = 3` in `lib/ai/retry.ts`.
- Keep `DEFAULT_CONCURRENCY = 3` as the **fallback** (unchanged name/value) so any direct
  importer keeps today's behavior.
- Add a pure, unit-testable resolver `resolveSceneConcurrency(env = process.env)`:
  reads the var, parses to int, returns `DEFAULT_CONCURRENCY` on missing/non-numeric/`<1`,
  and applies a sane upper clamp (≤16).
- Wire the Approach-A/C `mapWithConcurrency` call sites in `lib/ai/generate.ts` to the
  resolved value (pick wiring (a) per-call-site vs (b) thread-once by smallest honest diff).
- Document the var in `.env.local.example` + one line in `coding-standards.md` env area.
- Unit tests over the resolver matrix; `surface.boundary.test.ts` stays green;
  `npm run test:run` + `npm run build` pass.

## Notes

- **Craft Area 2 (ai-image-specialist)** — touches `lib/ai/retry.ts` + `lib/ai/generate.ts`.
- Single PR, branch `feature/ai-concurrency-env`. No new dependency, no stack change.
- **Out of scope:** Approach B stays sequential (unaffected); `withRetry` backoff unchanged;
  `DEFAULT_CONCURRENCY` value itself unchanged; no auto-tuning from rate-limit headers;
  no env-selectable quality tier.
- Non-secret runtime config (like `DEPLOY_TARGET`), operator/engine surface only — never
  `NEXT_PUBLIC_*`. `lib/ai/*` is banned from the public import graph.
- Validation needs **no paid run**: resolver unit tests + cache-hit reuse run (~$0). Real
  throughput measurement (set `=8`, watch 429s) is optional, can ride a future real run.
- Open items to confirm during build: final var name + upper clamp value; call-site wiring (a) vs (b).
- Full spec: `context/features/ai-concurrency-env.md`.
