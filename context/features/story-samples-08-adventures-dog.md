# Feature Spec — Story 8 Sample Set (Corgi) — "The Amazing Adventures of Your Pet"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-08`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 8.
> **Species: DOG (an energetic breed, e.g. corgi) — Story 8 currently has NO samples.**

---

## Goal

Give Story 8 its first real sample set: the **full 10-illustration** adventure book (gallery
grows from empty → 10) + a slim preview PDF on `/books/story-8-adventure`. Replaces the
placeholder paw block the card/detail currently degrade to.

## Input photo (decided in PR-0)

`uploads/sample-photos/dog-corgi.jpg` — a front-facing energetic dog with a distinctive
silhouette (a corgi's short legs + big ears read instantly across action poses), clearly
different from the Story-1 boxer and the Story-5 senior dog. Free-to-use; source + license
in PR-0.

## Engine facts

- Story 8 is the catalog's only **Approach B** book (sequential, accumulating reference
  stack — `generateAllIllustrations` self-selects it by `storyType`, no harness change).
  **10 illustration slots:** `ADVENTURE_SCENE_PAGE_IDS = ["adventure-cover",
  "adventure-ordinary", "adventure-special", "adventure-call", "adventure-clue",
  "adventure-deeper", "adventure-discovery", "adventure-wobble", "adventure-climax",
  "adventure-celebration"]` (`lib/story/story-8.ts`) → **10 captured JPGs** = the gallery.
  (The 13-page PDF reuses art on pages 10/11 — the preview PDF still renders all pages.)
- Mixed tier under `PRODUCTION_QUALITY`: `adventure-cover` hero (→ HIGH); interiors → MEDIUM;
  Story 8's climax already floors to MEDIUM via `atLeastMedium()`, so the mixed policy is
  consistent. Reference LOW. ≈ **$0.86** one-time. Approach B is sequential, so this run is
  the slowest — be patient.

## Deliverables

1. **Fixture — `fixtures/sample-story8-dog.json`** — complete Story-8 session (fresh
   `id: "sample-story8-dog"`), modeled on `fixtures/amazing-adventures-biscuit.json` but
   with the corgi `pet` (`species: "dog"`, photo `uploads/sample-photos/dog-corgi.jpg`, a
   `breedColor` describing a corgi). `adventure` group (superpower / favoriteActivity /
   quirks / sidekickName / childName / nicknames) + `toggles` (`adventureTheme`, `heroCount:
   "pet-plus"`, `childAgeBracket`). **Note:** under `heroCount: "pet-plus"`, `childName` is
   required — set it (the wizard gates this at generate; the fixture must include it). Verify
   zero surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story8-dog.json`.
3. **Capture** — `public/samples/story-8-adventure/` as `adventure-cover.jpg` +
   `adventure-ordinary.jpg … adventure-celebration.jpg` (10 files, named by slot id) + slim
   `preview.pdf`.
4. **Catalog — `lib/catalog/products.ts`** — set `story-8-adventure.sampleImages` from `[]`
   to the full 10; add `previewPdf: "/samples/story-8-adventure/preview.pdf"`.
5. **Tests — `lib/catalog/products.test.ts`** — Story 8 was pinned to `[]` (PR-3 relaxation);
   update it to the 10-file set + length; assert its `previewPdf`.

## Verify / build

- `/books/story-8-adventure` stays `●` SSG; the placeholder-paw fallback is replaced by a
  10-tile gallery + PDF link; PDF `200`; no 404s. Boundary test unaffected. `npm run
  test:run` + `npm run build` pass.

## Out of scope

- Wizard/order copy. The `pet-only` hero-count variant + reading-level variants beyond the
  one sampled.
