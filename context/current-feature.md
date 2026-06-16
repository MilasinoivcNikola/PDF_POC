# Current Feature

## Status

In Progress

## Goals

Fix two **low**-severity Story-9 debt rows (bundled as one small PR). Both live in
`lib/story/story9/`; pure text/brief engine — no image regenerated, no paid run.

- **Fix A — Page-3 double-preposition (bird/rabbit).**
  `page3SleepingSentence(species)` returns "settles **in** {sleepingSpot}" for
  bird/rabbit, but `{sleepingSpot}` is prepositional free text (matching the dog
  default's "curls up {sleepingSpot}"), so it renders the double-preposition
  "settles in at the foot of the bed". Change the particle "settles in" →
  "settles **down**" so bird/rabbit occupies the same structural slot as the dog
  default (adverb particle + prepositional `{sleepingSpot}`) — one consistent value
  shape, one failure mode.
  - Edit `lib/story/story9/variants.ts:67`.
  - Update the pinned assertion in `variants.test.ts` (currently locks the broken
    "settles in …") to "settles down …"; add an assertion that a prepositional
    `sleepingSpot` no longer produces "in at".

- **Fix B — Page-4 image brief ignores `babyStatus`.**
  `baby-page-4`'s `illustrationBrief` always reads "The baby is not present yet
  (expecting framing)." The `arrived` variant rewrites the page **body** but never
  the **brief**, so an `arrived` book briefs its Page-4 image as if still expecting
  (latent in the prompt only; printed text is correct). Branch the Page-4
  `illustrationBrief` on `babyStatus` in the variant layer, alongside the existing
  `arrived` body rewrite (whole-page discipline — expecting default and arrived
  rewrite never half-mix). Keep Approach-A: pet photo-anchored; baby + adults faceless.
  - Edit `lib/story/story9/variants.ts` where the `arrived` path composes
    `baby-page-4`; override its `illustrationBrief` with the arrived-framing copy
    (see spec). `expecting` default keeps `master-text.ts:144` unchanged.
  - Add an `arrived`-path assertion in `variants.test.ts`: resolved
    `baby-page-4.illustrationBrief` contains arrived framing (baby present) and
    **not** "not present yet" / "expecting framing"; `expecting` default still
    asserts the original brief byte-identical.

## Notes

- Spec: `context/fixes/story9-page3-and-page4-brief.md`.
- Craft Area 1 (story text/merge/variants) — owned by **pdf-render-specialist**
  (the `lib/story/` master-text/merge/variants surface), though it's a pure-text
  fix with no PDF-template change.
- Verification: `npm run test:run` + `npm run build` pass; spot-resolve a
  bird/rabbit × prepositional-`sleepingSpot` fixture and an `arrived` fixture and
  eyeball Page-3 prose + Page-4 brief. No paid run; committed rabbit sample assets
  untouched.
- **Out of scope:** deeper `sleepingSpot` free-text-shape robustness (bare noun vs
  prepositional phrase — its own debt row if pursued later); re-generating the
  rabbit sample art.
