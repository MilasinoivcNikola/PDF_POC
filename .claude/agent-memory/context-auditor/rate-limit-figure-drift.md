---
name: rate-limit-figure-drift
description: The "~5 image-input/min" gpt-image ceiling figure is stale (real Tier-2 limit is 20/min) — lives in commerce-roadmap.md and was an in-code comment; check it on any AI-throughput branch
metadata:
  type: project
---

The `~5 image-input/min` gpt-image rate-limit figure is **stale** as of the
`feature/ai-concurrency-env` branch (2026-06-15): the org's verified Tier-2 limit
is **20 images/min** (250k TPM). The concurrency-tuning feature is built on this 4×
headroom.

Where the old figure lives / lived:
- `context/commerce-roadmap.md:29` — "gpt-image-2's ~5/min ceiling = 4–8 min" — **still
  says ~5/min** (low-priority drift: illustrative of "instant is impossible," not a
  decision the code honors, so the argument survives at 20/min; flag as nice-to-have).
- `lib/ai/generate.ts` orchestration docstring — was "~5 image-input/min," **correctly
  softened** to "live image-input/min" in that branch.
- User-scope auto-memory `gpt-image-rate-limit.md` — also still ~5/min, but that's the
  harness's user memory, **not an in-scope standing doc** — don't flag it as a branch
  finding (mention as awareness only).

**Why:** recurring pattern — a hardcoded engineered-around number (here 5/min, and the
`DEFAULT_CONCURRENCY=3` sized against it) outlives the assumption once the real limit is
verified higher.
**How to apply:** on any AI-throughput / rate-limit / concurrency branch, grep docs for
`5/min` / `5 image` and judge whether the doc figure now misleads. The roadmap line is a
known low-priority stale figure — only escalate if a branch starts treating ≤5/min as a
binding constraint somewhere. See [[canonical-doc-map]].
