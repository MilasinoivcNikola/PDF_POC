# 21 — Story 4: Imagery (Cover Portrait + Pet-in-Scene Page 4)

> **Craft Area:** 2 — AI illustration · **Owner agent:** `ai-image-specialist`
> **Milestone:** 8 — Story 4 · **Phase:** 2 (PR 2 of 3) · **Depends on:** 20 (and the 14/17 orchestration patterns)
> **Branch:** `feature/story4-imagery`

## Status

Not Started

## Goals

- Generate Story 4's **2 Low images**, both **photo-anchored** (the PM call): a **cover portrait** of the actual pet (looking back, alert, happy) and a **page-4 scene** of the actual pet *doing* `[FAVORITE_ACTIVITY]` in `[FAVORITE_SPOTS]`, warm golden light. Two images, not thirteen.
- Drive generation off the registry's `illustrationSlots` (set in PR 20: `["talk-cover", "talk-page-4"]`) so the orchestration, progress polling, caching, retry/concurrency, and traversal guards from features 07/09/17 work **unchanged**.

## Scope

**In scope**
- `lib/ai/story4-prompts.ts` (new) — pure slot prompt builders:
  - `buildStory4SlotPrompts(session): Partial<Record<Story4PageId, Story4SlotPrompt>>` → `talk-cover` (`useReference: true`) + `talk-page-4` (`useReference: true`).
  - Cover prompt **reuses** `buildCoverPortraitPrompt` (from `story2-prompts.ts`) / `buildReferencePrompt`'s style + "maintain the pet's exact appearance" consistency clause.
  - `buildJoyScenePrompt(session, style)` — the page-4 scene: the pet doing the favorite activity in the favorite spot, golden hour, same consistency clause. **Path-independent** (the memorial tense affects only the text, not the art).
- `lib/ai/generate.ts` — `(session.storyType ?? "story-1") === "story-4"` dispatch → `generateStory4Illustrations` + `generateAndSaveStory4Slot` (clone of the Story-2 path). **Both slots are reference-anchored**, so both route through `generateSceneIllustration` (the photo as a reference) — *not* the photo-free `generateImageFromPrompt` Story 2's belief wash used. Confirm `manifestToImageMap` admits `talk-cover` / `talk-page-4` (the union of all products' `illustrationSlots`).
- `components/wizard/illustrationLabels.ts` — `TALK_ILLUSTRATION_SLOTS` + `illustrationSlotsFor` / `illustrationLabel` story-4 branches (warm, present-tense labels).
- `components/wizard/GenerationProgress.tsx` — story-4 subtitle + cost footer (2 images, ~$0.012).
- `app/(operator)/api/generate-illustrations/route.ts` + `regenerate-illustration/route.ts` — confirm the per-story slot count / regenerate allowlist reports `total: 2` for story-4 (already registry-driven — verify, don't fork).

**Out of scope**
- Wizard UI / order form / catalog / storefront (PR 22). Story-1/2 generation (unchanged). Sample-frame commit (lands in PR 22 with the catalog that references it — this PR's QA run *produces* the on-disk book PR 22 reuses).

## Implementation notes

**Key decisions**
- **Both images reference-anchored** (PM call: the pet appears in the page-4 scene, not a figureless wash). This is the one divergence from Story 2's imagery shape (whose Page-5 wash was figure-free). Trade-off accepted: a **full-width** scene of the real pet makes likeness drift more visible than the cover portrait, so QA includes an explicit "is this still the same animal?" check on page 4, and **Approach B (accumulating references) / `input_fidelity` tuning** is the lever held in reserve (the feature-07 playbook).
- **Low default tier**; a re-run with an unchanged session is a pure cache hit ($0); quality is **not** in the cache key.
- The orchestrator reads its slot list from the **registry** per `storyType` (PR 20), never a hardcoded `SCENE_PAGE_IDS`.

**Files**
- `lib/ai/story4-prompts.ts` (new)
- `lib/ai/generate.ts` · `components/wizard/illustrationLabels.ts` · `components/wizard/GenerationProgress.tsx`
- `app/(operator)/api/generate-illustrations/route.ts` · `app/(operator)/api/regenerate-illustration/route.ts` (verify only)

## References

- @context/masterstories/story-4-master-template.md — the per-page illustration briefs (the cover "hello, it's me" portrait; the Page-4 scene wash; "white space is the design") + Pipeline-fit notes (2 slots, Low, ~$0.012).
- @context/features/17-story2-imagery.md — the registry-slot orchestration / cache / `manifestToImageMap` pattern this mirrors.
- @context/features/07-scene-pipeline-and-pet-consistency.md — the cache (`hash(prompt + refs)`) / retry / concurrency surface + Approach A→B for drift.
- @context/features/20-story4-text-and-tense-engine.md — the `TALK_SCENE_PAGE_IDS` slot list + `Story4Session` shape.

## Done when

- [ ] A Story-4 session generates exactly **2** images, saved under `./generated/[id]/`, with manifest entries carrying `promptHash` + `referenceHash`.
- [ ] The cover portrait **and** the page-4 scene are both recognizably the **same pet** (the headline check — page 4 especially, being full-width).
- [ ] A re-run is a pure cache hit ($0); Low is the default tier.
- [ ] Story-1 (14 images) and Story-2 (2 images) generation are unaffected; the route reports `total: 2` for story-4.
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass.

## Tests

- `test-author` (mocked `images.edit`, **$0**): the orchestrator's slot list comes from the registry per `storyType`; **both** story-4 slots have `useReference: true` and route through `generateSceneIllustration`; default quality is `low`; manifest shape; `manifestToImageMap` admits `talk-*`; Story-1/2 paths unaffected.
- `qa`: **one** live **Low** run (~$0.012) on a hand-built Story-4 session pointed at an existing photo — inspect both images, with the explicit **page-4 likeness** check; confirm a re-run is a $0 cache hit; **leave the on-disk book** (`./sessions/` + `./generated/`) for PR 22's $0 reuse + sample frames. (Standing cost rule: Low, once — see the QA cost-control memory.)
