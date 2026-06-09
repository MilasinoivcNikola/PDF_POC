# 17 — Story 2: Premium Imagery (Cover Portrait + Belief Wash)

> **Craft Area:** 2 — AI illustration · **Owner agent:** `ai-image-specialist`
> **Milestone:** 7 — Story 2 · **Phase:** 3 · **Depends on:** 14, 16
> **Branch:** `feature/story2-imagery`

## Status

Not Started

## Goals

- Generate Story-2's minimal **Premium** imagery: a soft **cover portrait / silhouette** of the pet (reusing the reference-illustration path) and an abstract **belief-frame wash** (sunlit meadow / quiet object — **no pet figure**). Two images, not thirteen.
- Register a Story-2 illustration plan in the registry so the orchestration, progress polling, caching, and traversal guards from features 07/09 work **unchanged** — the slot list comes from the story, not from a hardcoded `SCENE_PAGE_IDS`.

## Scope

**In scope**
- Story-2 illustration slots (e.g. `cover-portrait`, `belief-wash`) + their prompt builders (in `lib/ai/story2-prompts.ts` or provided by the registry's `StoryDefinition`).
  - **Cover portrait:** uses the uploaded pet photo as a reference (consistency matters, but it's a single image — essentially `generateReferenceIllustration`). "Looking back / gentle silhouette, single subject, lots of white space," per the cover brief.
  - **Belief wash:** abstract, **photo-free** (no pet → no consistency concern). Prompt varies by `beliefFrame`: rainbow-bridge/heaven → an abstract sunlit meadow; secular → a quiet object (leash hook, empty bed by a window).
- Hook these into `generateAllIllustrations` via the registry's illustration plan (`getStory(storyType).illustrationSlots`) — so the orchestrator reads slots from the story.
- Reuse the cache (`hash(prompt + refs)`), **Low** default tier, the retry/concurrency helpers, `manifestToImageMap`, and the `isSafeSessionId`/`resolveUnder` guards.

**Out of scope**
- Story-1 scene logic (unchanged).
- A text-only/Basic tier — we chose Premium.
- New letter layout work (feature 16 owns the slots in the template).

## Implementation notes

**Key decisions**
- The orchestrator must read its slot list from the registry, not from `SCENE_PAGE_IDS`. If feature 14 didn't already expose `illustrationSlots` on `StoryDefinition`, add it here.
- Cover-portrait prompt reuses `buildReferencePrompt`'s style/consistency clause; belief-wash prompts are a small per-`beliefFrame` map and pass **no** pet reference.
- **Cost discipline** (standing rule): QA at **Low**; reuse a `./sessions/` fixture for the $0 cache-hit checks, and do **one** real Low run for the visual judgment. A full Story-2 book is ~2 images, so a fresh run is ~$0.01–0.02.

**Files**
- `lib/ai/story2-prompts.ts` (new) — slot prompt builders
- `lib/ai/generate.ts` — slot list sourced from the registry per `storyType`
- `lib/story/registry.ts` — `illustrationSlots` on the Story-2 definition
- `app/api/generate-illustrations/route.ts` + `app/api/regenerate-illustration/route.ts` — slot count / gating via the registry (so `TOTAL_IMAGES` and the regenerate allowlist are per-story)

## References

- @context/masterstories/story-2-master-template.md — the per-page illustration briefs + the "Illustration" notes ("white space is the design", no figure on the wash) + the Pricing tiers (Premium = cover illustration + belief-frame wash).
- @context/features/06-openai-client-and-reference-illustration.md — the reference-illustration path the cover reuses.
- @context/features/07-scene-pipeline-and-pet-consistency.md — the orchestration / cache / retry surface to reuse.
- @context/features/14-multi-story-engine.md — the registry's `illustrationSlots`.

## Done when

- [ ] A Story-2 session generates its ~2 images, saved under `./generated/[id]/`, with manifest entries carrying `promptHash` + `referenceHash`.
- [ ] The cover portrait is recognizably the same pet; the belief wash matches the frame and contains **no pet figure**.
- [ ] A re-run is a pure cache hit ($0); Low tier is the default.
- [ ] Story-1 generation is unaffected (its slots still come from `SCENE_PAGE_IDS`).
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author` (mocked `images.edit`, **$0**): the orchestrator's slot list comes from the registry per `storyType`; belief-wash prompt builder branches per `beliefFrame` and passes no reference; default quality is `low`; manifest shape.
- `qa`: one live **Low** run (~$0.01–0.02), inspect the 2 images and that they place correctly in the letter PDF from feature 16; confirm a re-run is a cache hit.
