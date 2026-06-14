---
name: story8-approach-b-prototype
description: Story 8 adventure book is the FIRST real Approach-B (accumulating refs) path; engine's referencesForScene/generateAndSaveScene are private + session/cache-coupled so a prototype must replicate the B-loop
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

**Gate verdict status (as of feature 30, 2026-06-14):** prototype built but NOT yet
run — the actual GO/NO-GO is the PM's manual `npm run proto:story8` step (it spends
on the paid API). Climax leap (`adventure-climax`) is the single highest-drift pose,
generated LAST at **Medium** (the only non-Low slot) to test whether a tier bump
rescues it. If GO holds only at Medium for the climax, that sets the cost floor.
See [[api-surface-and-cost-tiers]] for the Low-default rule.
