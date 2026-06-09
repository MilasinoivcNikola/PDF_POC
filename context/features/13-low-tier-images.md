# 13 — Switch Scene Generation to Low Tier

> **Craft Area:** 2 — AI illustration · **Owner agent:** `ai-image-specialist`
> **Milestone:** 6 (polish, pulled from `11-polish-and-iteration.md`) · **Depends on:** 07, 09
> **Branch:** `feature/low-tier-images`

## Status

Not Started

## Goals

- Generate the book's scene illustrations at **Low** quality instead of **Medium**, so we can judge Low-tier image quality and pet consistency on a real, full Story-1 book — and decide whether Low is good enough to keep as the default.
- Cut a real generation from ~$0.70 to ~$0.07 per book and shorten the run, **if** the quality holds up.

This is a small, reversible config change. The *point* is the QA judgment that follows it: is a Low-tier book acceptable? Keep it if yes, revert the one tier change if no.

## Scope

**In scope**
- Switch the scene tier used by the live generation flow from `medium` → `low`. The reference illustration is already Low and stays Low.
- Keep single-page **regenerate** ([regenerateSceneIllustration](../../lib/ai/generate.ts#L460)) at the same tier as the book, so a repainted page matches the rest (Low).
- Update the cost/quality copy the user sees so it isn't lying: [GenerationProgress.tsx](../../components/wizard/GenerationProgress.tsx#L193-L195) — "Medium quality" → "Low quality", "~$0.58 per book" → "~$0.07 per book".

**Out of scope**
- The whole draft→final / "make print-ready" flow — explicitly dropped (a Low draft can't be upgraded to Medium without a full, second paid regeneration; not worth it for this single-user tool).
- Per-tier choice in the wizard UI (no tier picker — one project default).
- High-tier cover rendering, photo downscale (feature 12), and any caching changes.

## Implementation notes

**Where to flip the tier — pick one, prefer the lib default:**
1. **Change the defaults in `lib/ai/generate.ts`** — `generateAllIllustrations`'s `sceneQuality` default ([line 353](../../lib/ai/generate.ts#L353)) and `regenerateSceneIllustration`'s ([line 472](../../lib/ai/generate.ts#L472)) from `"medium"` → `"low"`. Cleanest single source of truth; makes "Low is the project default" explicit. The orchestration route relies on these defaults, so no route change needed beyond the stale comment.
2. Pass `sceneQuality: "low"` explicitly from [app/api/generate-illustrations/route.ts](../../app/api/generate-illustrations/route.ts#L84) and the regenerate route — leaves the lib default at Medium. More places to keep in sync; not recommended.

Use option 1, and fix the now-stale comment at [route.ts:82](../../app/api/generate-illustrations/route.ts#L82) that says "sceneQuality medium".

**Keep docs from drifting (coding-standards rule).** `coding-standards.md` currently states the hard rule "low while iterating, **medium for real book runs**". If Low becomes the standing default, update that line in the **same PR** so the doc matches the code (the standards' own "fix the code or fix this doc together" rule). If we treat this as a temporary experiment, say so in `current-feature.md` and leave the standard — but the code default is the source of truth either way.

**Cache note:** quality is **not** in the cache key, so flipping the tier does **not** invalidate existing cached PNGs — an already-generated `./sessions/` fixture stays a free cache hit regardless of tier. Only a genuinely new Low book costs the ~$0.07.

**Files**
- [lib/ai/generate.ts](../../lib/ai/generate.ts) — the two `sceneQuality` defaults.
- [app/api/generate-illustrations/route.ts](../../app/api/generate-illustrations/route.ts) — stale comment only.
- [components/wizard/GenerationProgress.tsx](../../components/wizard/GenerationProgress.tsx) — cost/quality footer copy.
- `context/coding-standards.md` — the "medium for real book runs" line, if Low is adopted.

## References

- @context/local-prototype-plan.md — the cost-tier table (Low ~$0.006/img ~$0.07/book; Medium ~$0.053/img ~$0.58/book).
- @context/coding-standards.md — "Cost tiers are a hard rule"; the `lib/ai/` craft-area section.
- @context/history.md — 2026-06-08 "Scene Pipeline" entry: live Medium book held pet consistency at ~$0.70; this is the Low comparison point.

## Done when

- [ ] A fresh generation produces a full book at Low tier; the saved PNGs reflect Low quality.
- [ ] Single-page regenerate also renders at Low (matches the book).
- [ ] The generating-screen footer reads Low / ~$0.07, not Medium / ~$0.58.
- [ ] `coding-standards.md` matches the new default (or `current-feature.md` records this as a temporary experiment).
- [ ] `npm run build` and `npm run test:run` pass.

## QA — the actual point of this feature

- Generate **one** real Low-tier book on a real pet photo (~$0.07) and judge against the documented Medium baseline: **is the pet recognizably the same animal across pages? Is the watercolor style still pleasant at Low?** Note any drift, mushiness, or artifacts.
- Reuse an existing `./sessions/` fixture for the flow/plumbing checks (free cache hits) so only the one Low book costs anything.
- **Record the verdict in `history.md`:** keep Low as default, or revert to Medium. That decision is the deliverable.

## Tests

- `test-author`: assert the production generation path defaults to `sceneQuality: "low"` (and regenerate likewise) — a small guard so the tier can't silently drift back. **Mock all OpenAI calls.**
