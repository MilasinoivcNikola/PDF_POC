# Feature Spec — Story 4 Sample Set (Rabbit) — "If Your Pet Could Talk"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-04`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 4.
> **Species: RABBIT.**

---

## Goal

Replace Story 4's 2 placeholder images with a real **rabbit** sample book at the mixed
production tier + a slim preview PDF, so `/books/story-4-talk` shows true quality and proves
a small/non-canine pet works.

## Input photo (decided in PR-0)

`uploads/sample-photos/rabbit.jpg` — a front-facing rabbit with distinctive fur (strong
anchor), free-to-use. Source + license in PR-0.

## Engine facts

- Story 4 is a **living/joyful letter**, Approach A/Premium, 2 slots: `TALK_SCENE_PAGE_IDS =
  ["talk-cover", "talk-page-4"]` (`lib/story/story-4.ts`) → **2 captured JPGs**.
- Two-tense engine; we use the **living** path (`livingOrMemorial: "living"`). Species voice
  derives automatically.
- Mixed tier: `talk-cover` hero (→ HIGH), `talk-page-4` interior (→ MEDIUM), reference LOW.
  ≈ **$0.30**.

## Deliverables

1. **Fixture — `fixtures/sample-story4-rabbit.json`** — complete Story-4 session (fresh
   `id: "sample-story4-rabbit"`), modeled on `fixtures/biscuit-living.json` but: `pet` =
   rabbit (`species: "rabbit"`, photo `uploads/sample-photos/rabbit.jpg`, a `breedColor`
   describing the coat), `toggles.livingOrMemorial: "living"`, tasteful `owner` + `memories`
   (quirks / favoriteRitual / favoriteSpots / favoriteActivity / nicknames / dateAdopted).
   Verify zero surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story4-rabbit.json`.
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
