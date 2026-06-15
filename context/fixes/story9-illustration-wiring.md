# Fix Spec — Wire Story-9 Illustration Generation (unblocks the rabbit sample)

> **Status:** Drafted, awaiting sign-off (not started).
> **Branch (proposed):** `feature/story9-illustration-wiring`
> **Scope:** Single PR. Engine wiring only — no paid run, no new dep, no UI/copy.
> **Pays down:** `context/debt.md` row **"Story-9 illustration generation not wired
> (falls through to Story-1)"** (medium). **Unblocks:** `context/debt.md` row
> **"Story-9 storefront samples missing"** and the sample spec
> `context/features/story-samples-09-new-baby-rabbit.md`.

---

## The bug

`Story9` PR-A (feature 33) shipped the per-scene prompt builder
(`lib/ai/story9-prompts.ts` → `buildStory9SlotPrompts`) and the registry entry, but
**never wired them into the orchestrator.** Two gaps:

1. **`generateAllIllustrations` has no `story-9` dispatch branch**
   ([lib/ai/generate.ts:475-493](../../lib/ai/generate.ts#L475-L493)). A `Story9Session`
   falls past the Story-2…Story-8 branches into the **Story-1 shared body** (line 495+),
   which calls `buildScenePrompts(session)` (Story-1 prompts) over `SCENE_PAGE_IDS`
   (`page-1..page-12`). Result: a New-Baby order would generate **Saying-Goodbye art on
   12 wrong slots**, and `buildStory9SlotPrompts` is dead code (invoked nowhere outside
   its own test).

2. **`manifestToImageMap` omits Story-9's slots**
   ([lib/ai/generate.ts:1654-1667](../../lib/ai/generate.ts#L1654-L1667)). The illustrated-slot
   allow-list unions Story-1,2,4,5,6,7,8 but **not** `getStory("story-9").illustrationSlots`.
   So even if correct `baby-*` PNGs existed, every one would be filtered out and the renderer
   would fall back to placeholder art.

There is a **third, parallel** instance of gap #1 that the debt row doesn't call out but
must be fixed in the same PR for consistency:

3. **`regenerateSceneIllustration` has no `story-9` branch**
   ([lib/ai/generate.ts:1319-1376](../../lib/ai/generate.ts#L1319-L1376)). The admin repaint
   path dispatches per `storyType` (Story-2…Story-8) and otherwise falls through to the
   Story-1 default body (line 1378+), which uses `buildScenePrompts` — so a Story-9 repaint
   would also paint the wrong prompt. (The slot-membership guard at line 1320-1323 uses the
   registry, so it correctly *gates* on the `baby-*` slots; only the prompt source is wrong.)

Latent today only because commerce isn't live and no Story-9 book has been generated.

## Why this is a clean clone, not new design

Story 9 is **Story 6's exact imagery shape**: Approach A, a locked reference + N
reference-anchored brief-driven scenes, **all** via `images.edit`, **no** figure-free
wash. The only differences from Story 6 are the slot count (**7**, not 7 — same), the
slot ids (`baby-*` not `tribute-*`), and the prompt builder (`buildStory9SlotPrompts`).
So this PR mirrors the Story-6 members already in `generate.ts` 1:1.

Engine facts (verified against the code):

- `STORY_9_SCENE_PAGE_IDS` = `["baby-cover", "baby-page-2" … "baby-page-7"]` (7 slots) —
  [lib/story/story-9.ts:83](../../lib/story/story-9.ts#L83); `illustrationSlots` is that list.
- Every slot is `useReference: true` (`buildStory9SlotPrompts` —
  [lib/ai/story9-prompts.ts:130](../../lib/ai/story9-prompts.ts#L130)).
- Manifest size = `slots + 1 = 8` (the +1 is the separate `reference` anchor — same as
  Story 1's 14, Story 6's 8).

## Changes — `lib/ai/generate.ts` only

All four edits are in one file; the prompt builder, registry, and types already exist.

1. **Imports.** Add `Story9Session` (from `@/lib/session/types`), `Story9PageId` (from
   `@/lib/story/master-text`), and `buildStory9SlotPrompts` (from `@/lib/ai/story9-prompts`),
   matching the existing Story-6 import lines.

2. **`generateAndSaveStory9Scene`** — clone of `generateAndSaveStory6Scene`
   ([lib/ai/generate.ts:835-853](../../lib/ai/generate.ts#L835-L853)), substituting the
   Story-9 types. (Reference-anchored only → always `[photo, reference]` via
   `generateSceneIllustration`; `generateImageFromPrompt` is never reached.)

3. **`generateStory9Illustrations`** — clone of `generateStory6Illustrations`
   ([lib/ai/generate.ts:874-944](../../lib/ai/generate.ts#L874-L944)): locked reference
   (cached on photo + reference prompt), then the 7 slots from
   `getStory("story-9").illustrationSlots` via `buildStory9SlotPrompts(session)` through
   `mapWithConcurrency(slots, resolveSceneConcurrency(), …)`, each tiered by
   `qualityForPage("story-9", slot, options)`. Add the **dispatch branch** in
   `generateAllIllustrations`:
   ```ts
   if (storyType === "story-9") {
     return generateStory9Illustrations(session as unknown as Story9Session, options);
   }
   ```

4. **`regenerateStory9Slot`** — clone of `regenerateStory6Slot`
   ([lib/ai/generate.ts:1510-1538](../../lib/ai/generate.ts#L1510-L1538)) + the matching
   `storyType === "story-9"` branch in `regenerateSceneIllustration` (alongside the
   Story-6 branch at line 1354).

5. **`manifestToImageMap`** — add `...getStory("story-9").illustrationSlots` to the
   `illustratedSlots` set ([lib/ai/generate.ts:1654-1667](../../lib/ai/generate.ts#L1654))
   and update the doc comment to name Story-9's `baby-*` slots.

## Tests — new `lib/ai/generate.story9.test.ts`

Mirror `lib/ai/generate.story6.test.ts` (OpenAI SDK mocked, real fs against a throwaway
temp cwd, the `biscuitSession9()` fixture from `lib/story/story9/fixtures.ts`):

- `generateAllIllustrations` Story-9 dispatch → `reference` + 7 `baby-*` slots (8 entries),
  the manifest's slot set equals `STORY_9_SCENE_PAGE_IDS`, every entry has hashes/paths.
- **8 `images.edit` calls, `images.generate` NEVER** (no wash) — the assertion that proves
  the dispatch routes to the Story-9 path, not the Story-1 fallback (which would also be
  edit-only, so *also* assert the scene **prompts** carry the New-Baby brief, or that the
  written filenames are `baby-*.png` not `page-*.png` — that is the assertion the old wiring
  would fail).
- Reference anchors on the photo; each scene passes 2 reference images.
- Files written to `./generated/[id]/baby-cover.png … baby-page-7.png`.
- Re-run with the persisted manifest → pure $0 cache hit (no new calls).
- Unsafe session id rejected before any call.
- Default tier `low`; explicit `sceneQuality` override honored.
- `manifestToImageMap` admits all 7 `baby-*` slots, excludes `reference` + the writing-only
  back cover.
- `regenerateSceneIllustration` repaints a `baby-page-*` slot via `images.edit` reusing the
  on-disk reference; a non-slot page (the back cover) is rejected.
- **Regression guard:** a Story-1 session still produces `reference` + 13 scenes (14) via
  edit only — proves the new branch didn't perturb the fallback.

## Verify / build

- `npm run test:run` + `npm run build` pass. No paid run (`PRODUCTION_QUALITY` is exercised
  only later by the sample PR). No engine behavior change for any existing product — all
  edits are additive (a new branch + a clone + one set-member addition).
- After this lands, `context/features/story-samples-09-new-baby-rabbit.md` can run
  `npm run proto:sample fixtures/sample-story9-rabbit.json` and get **New-Baby** art on the
  7 `baby-*` slots (not Saying-Goodbye art).

## Out of scope

- The sample run / fixture / capture / catalog wiring — that is the *separate* rabbit-sample
  PR this unblocks (`story-samples-09-new-baby-rabbit.md`).
- The Story-9 repaint-as-A approximation note that affects Story 8 (`regenerateStory9Slot`
  is a true single-slot Approach-A repaint — Story 9 *is* Approach A, so there is no
  Approach-B degradation to log here, unlike Story 8's debt row).
- Any prompt/copy change to `story9-prompts.ts` (already shipped + tested in PR-A).

## Debt ledger

On completion, in `context/debt.md`:
- **Remove** the row *"Story-9 illustration generation not wired (falls through to Story-1)"* —
  paid by this PR (note the fix in the history entry).
- The *"Story-9 storefront samples missing"* row keeps its **"Blocked on the Story-9 wiring
  gap below"** note **dropped** (the blocker is gone) but the row itself stays until the
  rabbit-sample PR generates the frames.
