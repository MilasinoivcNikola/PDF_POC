---
name: mixed-tier-quality-review-calibration
description: feature mixed-tier-quality (heroSlots/qualityForPage/PRODUCTION_QUALITY) review — clean PASS; the story-9 generate-dispatch gap is PRE-EXISTING, not this feature's
metadata:
  type: project
---

Feature `feature/mixed-tier-quality` (mixed-tier illustration quality) review verdict: **PASS**.

**What it did:** registry `heroSlots?` + `heroSlotsFor()` (defaults to `illustrationSlots[0]` = cover for every story), pure `qualityForPage(storyType,page,opts)` in `lib/ai/generate.ts`, shared `PRODUCTION_QUALITY` const (medium interior / high hero / low ref) passed by worker + operator repaint route, Story-8 climax folded into `atLeastMedium()` floor.

**Verified correct (don't re-litigate):**
- `illustrationSlots[0]` is the cover (namespaced) for ALL 8 stories — checked each scene-id array. `heroSlotsFor` default is sound.
- Story-8 reconciliation: dev (no opts) → all-LOW + climax MEDIUM (matches old); production → cover HIGH, interiors MEDIUM, climax MEDIUM. `atLeastMedium` does not double-apply or regress.
- Back-compat: `heroSceneQuality` unset → `qualityForPage` collapses to `sceneQuality ?? "low"` uniform.
- Cache key is `promptHash`+`referenceHash` ONLY (lib/ai/cache.ts) — quality is NOT keyed, so flipping tiers does NOT invalidate the committed `public/samples/story-1-book` images. No byte-identity issue (samples are static files anyway).
- Boundary test green; registry stays pure (heroSlots is data). tsc clean. 80 affected tests pass.

**Refuted / out-of-scope trap (important):** Story-9 (and the resolveStory/buildScenePrompts default path) has NO `story-9` dispatch branch in `generateAllIllustrations` — a `story-9` session falls through to the Story-1 shared path which iterates Story-1 `SCENE_PAGE_IDS`/`buildScenePrompts` (filters by Story-1 ids), so `baby-*` ids would yield empty prompts. This is a **PRE-EXISTING gap on `main`** (verified via `git show main:`), NOT introduced by this feature. Story 8 has a branch; Story 9 does not. The feature's `qualityForPage("story-9",...)` pure-helper tests are self-consistent (heroSlotsFor("story-9")=["baby-cover"] is correct for story-9's real ids). Do not flag the story-9 dispatch gap against a quality/tier feature — if it's ever raised, it belongs to a story-9 generation-wiring fix, not here.
