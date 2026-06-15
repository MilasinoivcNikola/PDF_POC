# Feature Spec — Story 2 Sample Set (Cat) — "A Letter from Your Pet"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0**
> (`story-samples-00-photos-and-harness.md`) for the harness + the committed cat photo.
> **Branch (proposed):** `feature/story-samples-02`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 2.
> **Species: CAT** (the catalog's first non-dog sample).

---

## Goal

Replace Story 2's 2 placeholder sample images with a real **cat** sample book generated at
the locked mixed production tier, and add a slim downloadable preview PDF — so
`/books/story-2-letter` shows true quality and visibly proves a non-dog pet works.

## Input photo (decided in PR-0)

`uploads/sample-photos/cat.jpg` — a clearly front-facing cat with distinctive markings
(strong pet anchor), free-to-use, no costume props. Source URL + license recorded in PR-0.

## Engine facts

- Story 2 is **Approach A/Premium**, 2 illustration slots: `LETTER_SCENE_PAGE_IDS =
  ["letter-cover", "letter-page-5"]` (`lib/story/story-2.ts`) → **2 captured JPGs**.
- 6-page letter, no child; first-person pet voice. The merge derives `speciesDescriptor`
  from `species`, so "a good dog" → "a good cat" automatically — no text changes needed.
- Mixed tier: `letter-cover` is the hero slot (→ HIGH), `letter-page-5` interior (→ MEDIUM),
  reference LOW. ≈ **$0.30** one-time.

## Deliverables

1. **Fixture — `fixtures/sample-story2-cat.json`** — a complete `Story2Session` (fresh
   `id: "sample-story2-cat"`, empty `./generated/`). Mirror the field shape of
   `lib/story/story2/fixtures.ts`: `pet` = cat (`species: "cat"`, a `breedColor` describing
   the photo's coat, `illustrationStyle: "watercolor"`, `photo:
   "uploads/sample-photos/cat.jpg"`), `owner` (names + relationship), tasteful `memories`
   (quirks / favoriteRitual / favoriteSpots / nicknames / dateAdopted / datePassed),
   `toggles` (`deathType`, `beliefFrame`, `giftFor`, `newPet`). **Public copy** — honor the
   master-template quality bar ("died", never "passed away"); verify zero surviving
   `[FIELD]` via a `resolveStory2` call.
2. **Run** — `npm run proto:sample fixtures/sample-story2-cat.json` (PR-0 harness, paid).
3. **Capture** — downscale → `public/samples/story-2-letter/` as `letter-cover.jpg` +
   `letter-page-5.jpg` (overwrite the placeholders); render the slim
   `public/samples/story-2-letter/preview.pdf`.
4. **Catalog — `lib/catalog/products.ts`** — `story-2-letter.sampleImages` already lists
   those 2 files (unchanged); add `previewPdf: "/samples/story-2-letter/preview.pdf"`.
5. **Tests — `lib/catalog/products.test.ts`** — assert `story-2-letter.previewPdf` is set;
   relax/adjust the "only Story 1 has a previewPdf" invariant (it becomes per-product as the
   series lands — assert presence on the products shipped so far rather than Story-1-only).

## Verify / build

- Detail page `/books/story-2-letter` stays `●` SSG; gallery (2 tiles) + "See the full book
  (PDF)" link render; PDF serves `200 application/pdf`; no 404s, no console errors.
- `surface.boundary.test.ts` unaffected (`previewPdf` is a plain string). `npm run test:run`
  + `npm run build` pass.

## Out of scope

- Story 2's wizard/order copy. Other titles (their own PRs). The Stories 2↔5 bundle SKU.
