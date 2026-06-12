---
name: story4-both-reference-anchored
description: Story-4 imagery — both slots (talk-cover + talk-page-4) are reference-anchored, the deliberate divergence from Story-2's figure-free wash
metadata:
  type: project
---

Story 4 ("If [PET_NAME] Could Talk", feature 21) generates exactly 2 Low images and BOTH are reference-anchored (the pet appears in both): `talk-cover` (cover portrait) and `talk-page-4` (the pet *doing* the favorite activity in the favorite spot, golden hour — the one full scene in the book).

**Why:** PM call. This is the ONE divergence from Story 2's imagery shape, whose Page-5 belief wash was abstract + photo-free (`generateImageFromPrompt`). Story 4 has no figure-free slot — both its slots route through `generateSceneIllustration` (photo passed as `image:` to `images.edit`). The master template's Page-4 brief says "single subject or figureless joy," but the PM chose single-subject (the real pet) over figureless.

**How to apply:** if QA or a future change touches Story-4 art, keep both `useReference: true`. The trade-off accepted: a full-width scene of the real pet makes likeness drift MORE visible than a cover portrait, so the QA likeness check must scrutinize `talk-page-4` specifically. If the pet drifts there, the held-in-reserve lever is **Approach B (accumulating refs) / `input_fidelity: "high"`** (feature-07 playbook) — not yet needed/tested for Story 4.

**Path-independence (load-bearing):** the `[LIVING_OR_MEMORIAL]` tense affects only the letter TEXT, never the art. `buildJoyScenePrompt` / `buildStory4SlotPrompts` must NOT branch on `toggles.livingOrMemorial` — a living and a memorial session with identical pet+memories produce byte-identical prompts (and thus a shared cache key). Asserted in the prompt tests.

The cover prompt reuses Story-2's `buildCoverPortraitPrompt` (→ `buildReferencePrompt`'s "maintain the pet's exact appearance" clause), so it inherits the same "book of poems, not a children's book" framing Story 2's cover uses — intentional, not a regression. See [[api-surface-and-cost-tiers]].

**Live-QA verdict:** NOT YET RUN as of feature-21 implementation (the `qa` step does the one Low run, ~$0.012, and leaves the on-disk book for PR-22 reuse). Update this with the page-4 likeness verdict once QA runs.
