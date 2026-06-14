---
name: story9-new-baby-imagery
description: Story 9 ("New Baby") imagery = Story 6's exact shape (reference + 7 reference-anchored brief-driven scenes, all images.edit, no wash); the distinguishing rule is Approach-A abstract-human (only the PET is photo-anchored, baby + adults faceless/abstract)
metadata:
  type: project
---

Story 9 ("[PET_NAME] and the New Baby", feature 33 / PR-A) imagery is a **byte-for-byte mirror of Story 6's module shape** (`lib/ai/story9-prompts.ts` ↔ `story6-prompts.ts`): a locked reference illustration + **7 brief-driven reference-anchored scenes** (`baby-cover`, `baby-page-2`…`baby-page-7`), ALL `useReference: true`, NO figure-free `images.generate` wash. `buildStory9SlotPrompts` resolves once via `resolveStory9`, maps `STORY_9_SCENE_PAGE_IDS` (imported from `lib/story/story-9`, NOT lib/ai). Slot type `Story9SlotPrompt`. Pages 1 (dedication) + back-cover excluded (writing/treatment pages).

**The ONE distinguishing rule vs Story 6 — Approach-A abstract-human (hard spec rule):** ONLY the pet is photo-anchored. The baby + ALL adult/family figures must stay ABSTRACT — swaddled bundle, tiny reaching hand, soft silhouette, 3/4 or from-behind, **NEVER a specific/recognizable/detailed face**. The per-page briefs already encode this (generic figures, "no specific baby face"), but I ALSO baked it into the shared `styleAndConsistencyClause` so it rides every human-bearing scene regardless of brief wording: "only photo-anchored subject", "never a specific, detailed, or recognizable baby face", "no identifiable human face", "3/4 view or from behind". Palette is **nursery-adjacent** (creams, dusty rose, sage, gentle gold, powder blue/buttercup accents) — softer than Story 6's, per the masterstory style guide.

**babyStatus is handled in the TEXT layer, not here:** `resolveStory9` rewrites Pages 4/6 briefs (expecting = "baby is not present yet"; arrived = bundle present). The prompt builder is status-agnostic — it just wraps whatever brief comes out. The faceless/abstract rule holds under BOTH statuses.

**Tier:** module is tier-agnostic by design (builds prompt strings only, sets no tier) — the orchestrator's Low default applies, the project hard rule. No medium/high wording anywhere (test-pinned).

**NOT live-validated:** this was PROMPT-BUILDER + UNIT-TEST work only ($0), per spec — no real gpt-image-2 call. Pet-consistency was not run live for Story 9; Approach A is inherited from Story 6's verified verdict (A held cleanly across 7 reference-anchored scenes). The live QA risk for Story 9 specifically is whether the model honors "faceless abstract baby" — untested against the API as of feature 33. 1864 tests green, build clean. See [[story6-living-tribute-imagery]], [[api-surface-and-cost-tiers]].
