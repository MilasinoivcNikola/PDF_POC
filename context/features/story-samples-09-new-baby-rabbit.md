# Feature Spec — Story 9 Sample Set (Rabbit) — "And the New Baby"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-09`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 9.
> **Species: RABBIT — has NO samples today.**

---

## Goal

Give Story 9 its first real sample set: the **full 7-illustration** new-baby book (gallery
grows from empty → 7) + a slim preview PDF on `/books/story-9-newbaby`. A rabbit as the
resident family pet meeting the new baby is a warm, relatable fit, and adds a non-canine
species to the catalog's sample coverage.

## Input photo (decided in PR-0)

`uploads/sample-photos/rabbit.jpg` — a front-facing rabbit with distinctive fur (strong
anchor), free-to-use. Source + license in PR-0.

## Engine facts

- Story 9 is **Approach A**, family-transition keepsake, **7 illustration slots:**
  `STORY_9_SCENE_PAGE_IDS = ["baby-cover", "baby-page-2" … "baby-page-7"]`
  (`lib/story/story-9.ts`) → **7 captured JPGs** = the whole gallery. Pet is photo-anchored;
  baby + adults are drawn faceless (engine policy) — no human-likeness concern.
- `species: "rabbit"` flows through the merge's `speciesDescriptor`; set a `breedColor` that
  names the coat so prompts read naturally.
- Mixed tier: `baby-cover` hero (→ HIGH), `baby-page-2..7` interiors (→ MEDIUM), reference
  LOW. ≈ **$0.65** one-time.

## Deliverables

1. **Fixture — `fixtures/sample-story9-rabbit.json`** — complete Story-9 session (fresh
   `id: "sample-story9-rabbit"`), modeled on `fixtures/new-baby-biscuit.json` but with the
   rabbit `pet` (`species: "rabbit"`, photo `uploads/sample-photos/rabbit.jpg`, a
   `breedColor` naming the coat), `owner` (names + relationship), tasteful
   `memories` (favoriteActivity / sleepingSpot / quirks / nicknames), `toggles`
   (`babyStatus`, `otherPetsInHome`), and `babyArrival`. Pick a `babyStatus` (`expecting`
   or `arrived`) + tasteful baby copy; if `expecting`/blank baby name, the text degrades to
   "the new baby" (intended). Verify zero surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story9-rabbit.json`.
3. **Capture** — `public/samples/story-9-newbaby/` as `baby-cover.jpg` +
   `baby-page-2.jpg … baby-page-7.jpg` (7 files, named by slot id) + slim `preview.pdf`.
4. **Catalog — `lib/catalog/products.ts`** — set `story-9-newbaby.sampleImages` from `[]` to
   the full 7; add `previewPdf: "/samples/story-9-newbaby/preview.pdf"`. Leave the existing
   `displayTitle: "Your Pet and the New Baby"` override untouched.
5. **Tests — `lib/catalog/products.test.ts`** — Story 9 was pinned to `[]`; update it to the
   7-file set + length; assert its `previewPdf`.

## Verify / build

- `/books/story-9-newbaby` stays `●` SSG; placeholder-paw fallback replaced by a 7-tile
  gallery + PDF link; PDF `200`; no 404s. Boundary test unaffected. `npm run test:run` +
  `npm run build` pass.

## Out of scope

- Wizard/order copy. The `arrived` vs `expecting` variant beyond the one sampled.
