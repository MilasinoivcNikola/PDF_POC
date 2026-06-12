---
name: api-surface-and-cost-tiers
description: gpt-image-2 API surface (images.edit vs images.generate), the Low-tier default verdict, and the per-product image plan/cost across Stories 1/2/4
metadata:
  type: project
---

The verified gpt-image-2 surface and cost-tier judgment for the illustration pipeline.

**Why:** the original plan sketch was wrong on the API (`images.generate({ reference_images })` does not exist), and the cost tier is a hard rule the whole project's budget rests on — both bit earlier features (06/13) and are easy to re-get-wrong.

**How to apply:** before writing any new generation path, reuse these decisions instead of re-deriving them; verify the API detail against the installed SDK only if the SDK version changed.

- **Reference images go through `images.edit`** with `image: Uploadable | Uploadable[]` (≤16). `images.generate` is the **prompt-only / photo-free** path (Story 2's figureless belief wash used it). Verified against `openai@6.42.0` (`node_modules/openai/resources/images.d.ts`). Both always return base64 → read `result.data[0].b64_json`.
- **Low is the default tier for real book runs**, not just prompt iteration (feature-13 verdict: Low ≈ Medium for these scenes, ~10× cheaper). `medium`/`high` are deliberate opt-in overrides. **Quality is NOT in the cache key** (`lib/ai/cache.ts` keys on prompt + reference bytes), so flipping tiers does not invalidate on-disk PNGs — existing `./sessions/` fixtures stay free cache hits.
- **Per-product image plan + cost (registry-driven via `getStory(storyType).illustrationSlots`):**
  - Story 1 = 13 scene slots + 1 separate `reference.png` anchor = **14 images** (~$0.07/book at Low). Route reports `slots + 1`.
  - Story 2 = **2 images** (`letter-cover` reference-anchored + `letter-page-5` figure-free wash, ~$0.02). No separate reference anchor — the cover IS the portrait. Route reports `slots`.
  - Story 4 = **2 images** (`talk-cover` + `talk-page-4`), **BOTH reference-anchored** (~$0.012). See [[story4-both-reference-anchored]].
  - Story 5 = **2 images** (`note-cover` reference-anchored + `note-page-5` figure-free wash, ~$0.012). Imagery shape is **identical to Story 2's** (NOT Story 4's) — `story5-prompts.ts` just re-keys Story 2's `buildCoverPortraitPrompt`/`buildBeliefWashPrompt` to the `note-*` slots; near-pure reuse, no new likeness risk. The Page-5 wash render needed `LETTER_WASH_PAGE_IDS` (in `pages-story2.tsx`) generalized from the single `"letter-page-5"` to a set admitting `"note-page-5"` (feature-17's wiring lesson repeating) — byte-safe, Story 1/2/4 PDFs verified identical.
- The orchestrator dispatches on `session.storyType ?? "story-1"`; each `session as unknown as StoryXSession` cast is guarded by a runtime `storyType === "..."` check first. `manifestToImageMap` filters against the **union of all products' `illustrationSlots`** — when adding a product, extend that union or its slots silently drop from the renderer.
- **`.env.local` OPENAI_API_KEY** flipped 401→valid(200) around 2026-06-09 and was valid again at feature-13/18. Re-check with `curl /v1/models` before declaring a live QA blocked — don't assume it's dead.
