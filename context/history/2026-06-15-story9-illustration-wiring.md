# Wire Story-9 Illustration Generation (unblocks the rabbit sample)

**Branch:** `feature/story9-illustration-wiring`
**Date:** 2026-06-15
**Craft Area:** 2 — AI illustration (`ai-image-specialist`)
**Type:** Fix (engine wiring) — pays down a `context/debt.md` row, no paid run, no new dep, no UI/copy.

## The bug

Story-9 PR-A (feature 33) shipped the per-scene prompt builder
(`lib/ai/story9-prompts.ts` → `buildStory9SlotPrompts`), the registry entry, and the
types, but **never wired them into the orchestrator** (`lib/ai/generate.ts`). A
`Story9Session` fell through the Story-2…Story-8 dispatch branches into the **Story-1
shared body**, which builds Story-1 prompts (`buildScenePrompts`) over `SCENE_PAGE_IDS`
(`page-1..page-12`). Three concrete gaps:

1. **`generateAllIllustrations` had no `story-9` branch** — a New-Baby order would have
   generated **Saying-Goodbye art on 12 wrong slots**, and `buildStory9SlotPrompts` was
   dead code (invoked nowhere outside its own test).
2. **`regenerateSceneIllustration` had no `story-9` branch** — the admin repaint path
   would have painted the Story-1 prompt on a `baby-*` slot (the registry slot-membership
   guard gated correctly; only the prompt *source* was wrong).
3. **`manifestToImageMap` omitted Story-9's slots** — even correct `baby-*` PNGs would
   have been filtered out and fall back to placeholder art.

Latent only because commerce isn't live and no Story-9 book had ever been generated.
Surfaced in the PR-0 sample-harness review (feature: story-samples-foundation).

## Why a clean clone, not new design

Story 9 is **Story 6's exact imagery shape**: Approach A, a locked reference + N
reference-anchored brief-driven scenes, **all** via `images.edit`, **no** figure-free
wash. The only differences are the slot ids (`baby-*` not `tribute-*`) and the prompt
builder (`buildStory9SlotPrompts`). So this PR mirrors the Story-6 members in
`generate.ts` 1:1. Manifest size = `slots + 1 = 8` (7 `baby-*` slots + the separate
`reference` anchor).

## Changes — `lib/ai/generate.ts` only (all additive)

1. **Imports** — `Story9Session` (`@/lib/session/types`), `Story9PageId`
   (`@/lib/story/master-text`), `buildStory9SlotPrompts` + `Story9SlotPrompt`
   (`@/lib/ai/story9-prompts`), matching the Story-6 import lines.
2. **`generateAndSaveStory9Scene`** — clone of `generateAndSaveStory6Scene`;
   reference-anchored only (`[photo, reference]` via `generateSceneIllustration` →
   `images.edit`; `generateImageFromPrompt` never reached).
3. **`generateStory9Illustrations`** + the `storyType === "story-9"` dispatch branch in
   `generateAllIllustrations` — locked reference (cached on photo + reference prompt),
   then the 7 slots from `getStory("story-9").illustrationSlots` via
   `buildStory9SlotPrompts(session)` through `mapWithConcurrency(slots,
   resolveSceneConcurrency(), …)`, each tiered by `qualityForPage("story-9", slot, opts)`.
4. **`regenerateStory9Slot`** + the matching `story-9` branch in
   `regenerateSceneIllustration`.
5. **`manifestToImageMap`** — added `...getStory("story-9").illustrationSlots` to the
   `illustratedSlots` set + updated the doc comment to name the `baby-*` slots.

## Tests — new `lib/ai/generate.story9.test.ts` (14 tests)

Mirrors `lib/ai/generate.story6.test.ts` (OpenAI SDK mocked, real fs against a throwaway
temp cwd, the `biscuitSession9()` fixture). Covers: the 8-entry Story-9 dispatch (manifest
slot set equals `STORY_9_SCENE_PAGE_IDS`); **8 `images.edit` calls, `images.generate`
NEVER**, plus the `baby-*.png`-not-`page-*.png` filename assertion (the one the old wiring
would fail); 2-ref-per-scene anchoring on the photo; file writes to
`./generated/[id]/baby-cover.png … baby-page-7.png`; $0 cache replay; unsafe-id reject;
default tier `low` + `sceneQuality` override; `manifestToImageMap` admits the 7 `baby-*`
slots and excludes `reference` + the writing-only back cover; repaint of a `baby-page-*`
reusing the on-disk reference + back-cover rejection; and a Story-1 regression guard
(`reference` + 13 scenes via edit only — proves the new branch didn't perturb the fallback).

## Verification

- `npm run test:run` → **1991/1991** (93 files); `npm run build` → clean (only
  pre-existing unrelated lint warnings).
- No paid OpenAI run — the SDK is mocked throughout. No engine behavior change for any
  existing product (all edits additive; the Story-1 regression guard + full suite confirm).

## Review

- **code-reviewer** → PASS, no findings. Faithful Story-6 clone: correct story id,
  registry-derived slot list, no stale `tribute-*`/`story-6` references, correct
  `qualityForPage("story-9", …)` key, correct manifest set-member addition.
- **context-auditor** → IN SYNC. CLAUDE.md AI-illustration rules hold for Story 9
  (defaults `low`, quality out of cache key, pure Approach A, `PRODUCTION_QUALITY` cover
  defaults HIGH for free via `heroSlotsFor`). Pinned the two debt-ledger edits (done at
  completion).
- **commerce-security-reviewer** → not dispatched (engine-only diff, no commerce surface).

## Debt ledger

- **Removed** the row *"Story-9 illustration generation not wired (falls through to
  Story-1)"* — paid by this PR.
- *"Story-9 storefront samples missing"* row kept (still blocked on the sample run);
  dropped its *"Blocked on the Story-9 wiring gap below"* note — that blocker is gone.

## Carried forward

The live-API pet-consistency check for Story 9 (whether the model honors "faceless/abstract
baby + adults" while keeping only the pet photo-anchored) is still untested against the real
API — this PR is mocked-SDK wiring + unit tests ($0). That validates when the rabbit-sample
PR (`context/features/story-samples-09-new-baby-rabbit.md`) runs `proto:sample` on a real
photo, which this PR unblocks.
