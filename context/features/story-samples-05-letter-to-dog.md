# Feature Spec — Story 5 Sample Set (Senior Dog) — "A Letter to Your Pet"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-05`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 5.
> **Species: DOG (senior, a different breed from the Story-1 boxer).**

---

## Goal

Replace Story 5's 2 placeholder images with a real **senior-dog** memorial sample (a
deliberately different breed from Story 1's boxer, so the two dog samples don't look like
the same animal) + a slim preview PDF on `/books/story-5-letter-to`.

## Input photo (decided in PR-0)

`uploads/sample-photos/dog-senior.jpg` — a front-facing senior dog (grey muzzle reads well
for a memorial letter), distinctive coat, clearly **not** a boxer. Free-to-use; source +
license in PR-0.

## Engine facts

- Story 5 is the **owner→pet memorial letter** (companion to Story 2), Approach A/Premium, 2
  slots: `NOTE_SCENE_PAGE_IDS = ["note-cover", "note-page-5"]` (`lib/story/story-5.ts`) →
  **2 captured JPGs**.
- Mixed tier: `note-cover` hero (→ HIGH), `note-page-5` interior (→ MEDIUM), reference LOW.
  ≈ **$0.30**.

## Deliverables

1. **Fixture — `fixtures/sample-story5-dog.json`** — complete Story-5 session (fresh
   `id: "sample-story5-dog"`), modeled on `fixtures/letter-to-murphy.json` but with the
   senior-dog `pet` (`species: "dog"`, photo `uploads/sample-photos/dog-senior.jpg`, a
   `breedColor` matching the photo — not the boxer), tasteful `owner` + `memories` (quirks /
   favoriteRitual / favoriteSpots / lastGoodDay / whatIKeep / nicknames / dateAdopted /
   datePassed), `toggles` (`deathType`, `beliefFrame`). Honor the quality bar ("died");
   verify zero surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story5-dog.json`.
3. **Capture** — `public/samples/story-5-letter-to/` as `note-cover.jpg` + `note-page-5.jpg`
   (overwrite placeholders) + slim `preview.pdf`.
4. **Catalog** — `sampleImages` unchanged; add `previewPdf:
   "/samples/story-5-letter-to/preview.pdf"`.
5. **Tests** — assert `story-5-letter-to.previewPdf`; adjust the presence invariant.

## Verify / build

- `/books/story-5-letter-to` stays `●` SSG; 2 tiles + PDF link; PDF `200`. Boundary test
  unaffected. `npm run test:run` + `npm run build` pass.

## Out of scope

- Wizard/order copy. The Stories 2↔5 companion bundle SKU.
