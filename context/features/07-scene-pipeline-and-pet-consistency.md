# 07 — Scene Pipeline & Pet Consistency

> **Craft Area:** 2 — AI illustration · **Owner agent:** `ai-image-specialist`
> **Milestone:** 3 (the "wow" moment) · **Depends on:** 05, 06
> **Branch:** `feature/scene-pipeline`

## Status

Not Started

## Goals

- From a pet photo + reference illustration, generate **all** the illustrations a Story-1 book needs (cover + ~10–12 scenes) where the pet looks like the *same animal* on every page.
- Run the full end-to-end pipeline: `StorySession` + photo → reference → all scenes → saved images → a complete PDF (feature 05) with real illustrations of the actual pet. This is **Milestone 3's "done"**.
- Make regeneration cheap and idempotent via caching, so re-running only re-calls the API for what changed.

## Scope

**In scope**
- `lib/ai/prompts.ts` — per-scene prompt builders, one per illustration the book needs, derived from each page's **illustration brief** (feature 03) + session inputs. Scenes include: cover, front door (P2), bond/together (P3), favorite activity (P4), sleeping spot (P5), the memory (P6), the gentle-truth rest (P7, mirrors P5), feelings (P8), comfort frame (P9), love-stays (P10), the P11 triptych, closing (P12). Match the set shown in `prototypes/generating.html`.
- `lib/ai/generate.ts` — `generateSceneIllustration(...)` + an orchestrator `generateAllIllustrations(session): Promise<PageImageMap>` that:
  - generates the reference illustration (feature 06), then all scenes,
  - passes references per the chosen **consistency approach** (see below),
  - saves each image to `./generated/[session-id]/[page].png`,
  - returns the manifest (page → image path + the prompt/reference hashes used).
- **Pet-consistency strategy**, implementing the plan's approaches and making the active one configurable:
  - **A** (default): each scene gets [original photo + reference illustration] + scene prompt.
  - **B**: accumulate prior scenes as additional references (cap 16 total) to drift-compensate.
  - **C**: photo-only baseline (cheapest) for comparison.
- **Caching:** key each image by `hash(prompt + reference-image set)`; skip regeneration on cache hit. Expose a single-page regenerate path (feeds feature 10's "regenerate this illustration").
- Quality tier handling: Low while iterating, **Medium** (~$0.58/book) for real generations; High reserved for cover/finals.
- Concurrency: generate independent scenes in parallel where the chosen approach allows (Approach B is sequential by nature).

**Out of scope**
- The generation **progress UI** and the HTTP route that drives it (feature 09).
- Wizard input collection (feature 08).
- The PDF render itself (reuse feature 05).

## Implementation notes

**Key decisions**
- **Start with Approach A**; keep B and C switchable so consistency can be tuned empirically on Milestone 3 (an open question the plan explicitly wants tested). Don't hard-wire one approach.
- Reference-image cap is 16 per call — enforce it (photo + reference + up to 14 prior scenes for Approach B).
- Cache is essential for cost and for the regenerate feature — design the manifest (feature 02's session type) to store the hashes so a cache hit is a pure lookup.
- Verify `images.generate` params/limits against current SDK docs (context7) — same caveat as feature 06.
- Keep prompts driven by the per-page illustration briefs so text and art stay in sync; don't duplicate scene descriptions in two places.
- Respect the style guide: warm pastels / golden-hour, no harsh black, child rendered 3/4 or from behind, consistent breed markings/eye color/posture.

**Files**
- `lib/ai/prompts.ts`
- `lib/ai/generate.ts` (extends feature 06)
- caching helper (e.g. `lib/ai/cache.ts`) keyed by prompt + reference hash.

## References

- @context/local-prototype-plan.md — "Craft Area 2" Approaches A/B/C, `generateSceneIllustration` sketch, caching guidance ("cache by prompt hash + reference image hash"), Milestone 3 definition of done, and the open questions on consistency.
- @prototypes/generating.html — the exact scene list/labels to produce.
- @context/masterstories/story-1-master-template.md — every page's illustration brief + the illustration style guide.

## Done when

- [ ] `generateAllIllustrations(session)` produces every page image into `./generated/[session-id]/` and returns a complete manifest.
- [ ] The pet is recognizably the same animal across pages (Approach A baseline; B available if A drifts).
- [ ] Cache hit skips API calls; single-page regeneration works.
- [ ] Full pipeline → feature 05 → a complete PDF with real illustrations of the actual pet.
- [ ] A real Medium-tier book lands near the ~$0.58 budget.
- [ ] `npm run build` passes.

## Tests

- `test-author`: prompt builders (each scene's string from a session), the cache key (stable hash of prompt + reference set), reference-cap enforcement (≤16), manifest shape. **Mock all OpenAI calls.**
- `qa` / manual: run the end-to-end pipeline on a real photo, inspect consistency across pages (the Milestone-3 check). Compare Approach A vs B on a drift-prone pet.
