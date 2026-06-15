# Feature Spec — Story 4 Sample Set (Guinea Pig) — "If Your Pet Could Talk"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-04`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 4.
> **Species: OTHER (e.g. guinea pig) — exercises the `"other"` species path.**

---

## Goal

Replace Story 4's 2 placeholder images with a real **guinea pig** sample book at the mixed
production tier + a slim preview PDF, so `/books/story-4-talk` shows true quality. Using a
guinea pig (the `"other"` species) on this playful "if my pet could talk" title proves the
catalog handles pets outside the dog/cat/rabbit/bird set.

## Input photo (decided in PR-0)

`uploads/sample-photos/other.jpg` — a front-facing small pet that reads clearly as itself
(a guinea pig with distinctive coat patches works well; a hamster/ferret is an acceptable
alternative). Free-to-use; source + license in PR-0. Confirm the species choice with the PM
at photo approval, since `"other"` is open-ended.

## Engine facts

- Story 4 is a **living/joyful letter**, Approach A/Premium, 2 slots: `TALK_SCENE_PAGE_IDS =
  ["talk-cover", "talk-page-4"]` (`lib/story/story-4.ts`) → **2 captured JPGs**.
- Two-tense engine; we use the **living** path (`livingOrMemorial: "living"`). Species voice
  derives automatically.
- `species: "other"` flows through the merge's `speciesDescriptor`; set a `breedColor` that
  names the animal so prompts read naturally (e.g. "a tri-colour guinea pig with a white
  blaze"). The `"other"` path is exercised but well-trodden.
- Mixed tier: `talk-cover` hero (→ HIGH), `talk-page-4` interior (→ MEDIUM), reference LOW.
  ≈ **$0.30**.

## Deliverables

1. **Fixture — `fixtures/sample-story4-other.json`** — complete Story-4 session (fresh
   `id: "sample-story4-other"`), modeled on `fixtures/biscuit-living.json` but: `pet` =
   guinea pig (`species: "other"`, photo `uploads/sample-photos/other.jpg`, a `breedColor`
   naming the animal + coat), `toggles.livingOrMemorial: "living"`, tasteful `owner` +
   `memories` (quirks / favoriteRitual / favoriteSpots / favoriteActivity / nicknames /
   dateAdopted). Verify zero surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story4-other.json`.
3. **Capture** — `public/samples/story-4-talk/` as `talk-cover.jpg` + `talk-page-4.jpg`
   (overwrite placeholders) + slim `preview.pdf`.
4. **Catalog** — `sampleImages` unchanged (same 2 files); add `previewPdf:
   "/samples/story-4-talk/preview.pdf"`.
5. **Tests** — assert `story-4-talk.previewPdf`; adjust the previewPdf-presence invariant.

## Verify / build

- `/books/story-4-talk` stays `●` SSG; 2 tiles + PDF link render; PDF `200`. Boundary test
  unaffected. `npm run test:run` + `npm run build` pass.

## Out of scope

- The memorial (past-tense) variant — the sample ships the living path only. Wizard copy.
