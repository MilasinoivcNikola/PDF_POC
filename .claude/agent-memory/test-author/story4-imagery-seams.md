---
name: story4-imagery-seams
description: PR-21 Story-4 imagery test seams + the divergence-from-Story-2 invariants (both-useReference, both-images.edit, page-4 path-independence, registry-driven slots)
metadata:
  type: project
---

Story 4 ("If [PET_NAME] Could Talk") imagery (PR-21) is the direct analog of Story 2's
imagery (PR-17) with ONE load-bearing divergence: **both** Premium slots are
reference-anchored, so the test invariants differ from Story 2's exactly there.

**Pure seam — `lib/ai/story4-prompts.ts`** (no mocks; test from a fixture):
- `buildStory4SlotPrompts(session)` → exactly `talk-cover` + `talk-page-4`, **both
  `useReference: true`** (Story 2's `letter-page-5` wash was `false` — the headline
  divergence; assert it explicitly).
- `buildJoyScenePrompt(session, style)` (page-4) carries favoriteActivity +
  favoriteSpots + golden-hour framing + the verbatim "Maintain the pet's exact
  appearance — color, markings, and breed characteristics — from the reference photo."
  clause (reused from `buildReferencePrompt`).
- **Page-4 path-independence:** prompt is byte-identical for `livingOrMemorial:
  "living"` vs `"memorial"` — assert `memorial === living`. Tense affects text only.
- Cover reuses `buildCoverPortraitPrompt` from `story2-prompts.ts` (assert `.toBe(expected)`).

**Orchestration seam — `lib/ai/generate.ts`** (mock at the `images.edit`/`images.generate`
boundary, the exact same mock block as `generate.story2.test.ts`):
- A `Story4Session` reaches `generateAllIllustrations`/`regenerateSceneIllustration` AS a
  `StorySession` (cast `as unknown as StorySession` in the test helper — the production
  routes do the same; the `storyType` discriminant drives dispatch).
- Slot list from the registry: `TALK_SCENE_PAGE_IDS` from `@/lib/story/story-4` ==
  `getStory("story-4").illustrationSlots` == `["talk-cover","talk-page-4"]` → 2 generations.
- **Both slots route through `images.edit`; `images.generate` is NEVER called** (the
  divergence — Story 2's wash used `images.generate`). Assert `editMock` called 2×,
  `generateMock` not called.
- Default scene quality `low`; explicit `{ sceneQuality: "medium" }` honored.
- Cache hit on unchanged session = 0 calls; a memorial session reusing a living run's
  manifest also 0-call (page-4 path-independence ⇒ same prompt hash ⇒ cache hit).
- `manifestToImageMap` admits `talk-cover`/`talk-page-4`, still excludes Story-1
  `reference` anchor + writing-only `back-cover`.
- regenerate `talk-page-4` → `images.edit` (NOT generate, unlike Story-2's wash).
  Reject a non-illustrated page id (`talk-page-2` is a real `Story4PageId`).
- Keep Story-1 (14, reference + 13) and Story-2 (2: edit cover + generate wash)
  assertions in the same file so a shared-orchestrator regression fails here.

**Labels — `components/wizard/illustrationLabels.ts`:** `TALK_ILLUSTRATION_SLOTS` ==
`getStory("story-4").illustrationSlots` (drift guard, mirrors `LETTER_ILLUSTRATION_SLOTS`);
`illustrationSlotsFor("story-4")` + `illustrationLabel(slot, name, "story-4")` give 2 warm
labels; 2-arg call stays Story-1 default.

Test files: `lib/ai/story4-prompts.test.ts`, `lib/ai/generate.story4.test.ts`, extend
`components/wizard/illustrationLabels.test.ts`. Fixture: `biscuitSession()` /
`story4SessionWith()` from `lib/story/story4/fixtures.ts`. PR-21 added +45 tests (999→1044).
See [[commerce-payment-seams]] for the Story-2 imagery pattern this mirrors.
