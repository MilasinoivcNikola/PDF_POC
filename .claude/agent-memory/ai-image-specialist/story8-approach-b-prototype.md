---
name: story8-approach-b-prototype
description: Story 8 is the FIRST real Approach-B (accumulating refs) book; PR-A's generateStory8Illustrations self-selects B internally, reuses exported referencesForScene, climax-Medium floor, pages 10/11 reuse imagery, repaint approximates B as A
metadata:
  type: project
---

Story 8 ("The Amazing Adventures of [PET_NAME]") is the catalog's first book that
actually uses **Approach B** (accumulate each accepted scene as a reference for the
next generation). Every prior book (Stories 1–7) ships **Approach A** only — the
batch worker calls `generateAllIllustrations(session)` bare, so nothing in
production ran B before Story 8. The B-loop existed only in the Story-1 code path
(`generate.ts`, the `approach === "B"` branch).

**Why:** Story 8's whole moat is the pet staying on-model across dynamic action
poses (running/leaping/sneaking). Approach A lets each pose drift independently;
B anchors each new pose to accumulated in-character examples. The 16-ref ceiling
(`MAX_REFERENCE_IMAGES`) comfortably covers a 10-slot book.

**How to apply (reuse vs fork):** `referencesForScene` and `generateAndSaveScene`
in `generate.ts` are **module-private** AND coupled to a real `StorySession` + the
per-session image cache (`findCachedImage` against `session.images`). A session-less,
cache-less one-shot (like feature 30's prototype script) **cannot** reuse them — so
the prototype REPLICATES the small B-loop inline (`[photo, reference, ...recent
priorScenes]`, trimmed to the cap) and reuses only the genuinely shared exported
primitives (`generateReferenceIllustration`, `generateSceneIllustration`,
`MAX_REFERENCE_IMAGES`). PR-A (feature 31) is expected to promote the accumulation
into a shared `generateStory8Illustrations` orchestrator.

**Gate verdict (feature 30, 2026-06-14): GO.** Likeness held across all 10 dynamic
poses under Approach B. Cost floor LOCKED = 9 Low scenes + 1 Low reference + climax
(`adventure-climax`) at **Medium** (the single non-Low slot, the highest-drift pose).
Whether Low alone holds the climax was never tested (only Medium rendered) — still an
open low-sev debt row.

**PR-A (feature 31, 2026-06-14): the B-loop is now REAL engine code.**
`generateStory8Illustrations` in `generate.ts` is the shared orchestrator that
self-selects Approach B INTERNALLY (does NOT read `options.approach` — the batch
worker calls `generateAllIllustrations(session)` bare, so the book must self-select;
the deliberate contained exception to "every other book is Approach A"). It reuses
the now-EXPORTED `referencesForScene("B", …)` rather than forking. Generation order =
calm first (`cover→ordinary→special→celebration`) to build the ref bank → escalating
action → climax LAST at Medium; manifest reassembled in book order. Pages 10/11
(`adventure-home`/`adventure-closing`) REUSE existing images (celebration / cover) via
manifest entries pointing at the source path — NO extra API call; `manifestToImageMap`
includes those two reuse page ids. `story8-prompts.ts` refactored from PR-0's inlined
`BEAT_BRIEFS` to read each scene's resolved `illustrationBrief` from `resolveStory8`
(Story-6/7 shape); pose-discipline + dynamic-watercolor + climax side-leap clauses
stayed in the builder. The PR-0 throwaway `scripts/story8-prototype.ts` was rewired to
the new session-driven builder (fed the Biscuit fixture) to stay compiling.

**Repaint caveat (debt row added):** `regenerateStory8Slot` (admin repaint)
approximates B as A — a single repaint has no priors to accumulate. The full-book path
is true B; only per-page repaint degrades. Climax keeps its Medium floor even on repaint.

See [[api-surface-and-cost-tiers]] for the Low-default rule.
