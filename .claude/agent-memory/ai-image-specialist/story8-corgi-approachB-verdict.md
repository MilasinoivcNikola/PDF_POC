---
name: story8-corgi-approachB-verdict
description: Approach B (accumulating refs) HELD a corgi on-model across all 10 Story-8 dynamic action poses incl. the climax leap — the catalog's hardest consistency case passed, no re-pick
metadata:
  type: project
---

The Story-8 "Amazing Adventures" sample (corgi, `uploads/sample-photos/dog-corgi.jpg`) **held on-model across all 10 dynamic action scenes** under **Approach B** (the engine self-selects B for `story-8` — sequential, accumulating reference stack) + the locked mixed `PRODUCTION_QUALITY` (HIGH cover / MEDIUM interiors / LOW reference; climax floors to MEDIUM via `atLeastMedium()`), one paid run, ~$0.86, zero re-pick.

**Why this matters:** Story 8 is the catalog's **hardest** consistency case — 10 *dynamic* poses (sniffing, trotting, a 3/4 side leap at the climax), exactly where AI pet-likeness drifts most, vs. the calmer Approach-A scenes of Stories 1/6/7. This is the first full **production** Approach-B run validated against a real distinctive specimen (the PR-0 prototype gate proved the *test* pet only). **Verdict: the accumulating-reference path holds the hero across action poses — the moat is real.**

**What carried it:** a *distinctive silhouette*. The photo is a **tricolor** Pembroke corgi (red/white/black saddle, white nose blaze, big upright ears, short-legged "loaf" body). That short-legged tricolor silhouette is an unmistakable, repeatable anchor — it rendered correctly in every scene including the highest-drift money shot (`adventure-climax`, a clean 3/4 *side* leap, no foreshortening, full profile visible). Same distinctive-specimen rule as [[bird-consistency-verdict]] and [[story1-high-tier-verdict]]: bold, recognizable markings/silhouette = the anchor.

**Fixture-authoring gotchas (Story-8 text layer, caught pre-spend by resolving the fixture):**
- `breedColor` must be a **bare noun phrase** (no leading "a/an") — the Page-1 template renders "Pickle was a {breedColor}", so a leading "a" doubles the article.
- `superpower` is used inline as a noun on the clue page ("put {pronounPossessive} amazing {superpower} to work") — keep it a **tight noun phrase** ("the Great Round-Up"), not a long descriptive clause, or it reads clumsily. Let `favoriteActivity`/`quirks` carry the specificity.
- The model anchors to the **photo**, not `breedColor` prose: I wrote "red-and-white" but the photo was tricolor and every scene came out tricolor (correct behavior — photo wins).

**Capture gotcha (Story-8 specific):** `sample-capture.ts`'s `illustratedSlotIds()` hardcodes the two reuse pages `adventure-home` + `adventure-closing` so the preview PDF can render pages 10/11 — so capture emits **12** JPGs, but the gallery wants exactly the **10** real slot ids. Delete `adventure-home.jpg` (dup of celebration) + `adventure-closing.jpg` (dup of cover) after capture; the preview.pdf is already correct (13 pages, all art). No other sample set has this because only Story 8 has reuse pages.

See [[story8-approach-b-prototype.md]] (the gate) and [[mixed-tier-production-policy]].
