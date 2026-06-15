# Feature Spec — Story 6 Sample Set (Senior Cat) — "While You're Still Here"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-06`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 6.
> **Species: CAT (senior).**

---

## Goal

Replace Story 6's 2 placeholder images with the **full 7-illustration** senior-cat tribute
sample (gallery grows 2 → 7) + a slim preview PDF on `/books/story-6-tribute`. The
present-tense living tribute leans on photo likeness — a real senior cat with a grey muzzle
showcases exactly that differentiator.

## Input photo (decided in PR-0)

`uploads/sample-photos/cat-senior.jpg` — a front-facing older cat, distinctive coat,
visibly senior. Free-to-use; source + license in PR-0. (Deliberately a different cat from
the Story-2 cat so the two cat samples read as different animals.)

## Engine facts

- Story 6 is **Approach A**, present-tense 8-page living tribute, **7 illustration slots**:
  `TRIBUTE_SCENE_PAGE_IDS = ["tribute-cover", "tribute-page-1" … "tribute-page-6"]`
  (`lib/story/story-6.ts`) → **7 captured JPGs** = the whole gallery.
- Mixed tier: `tribute-cover` hero (→ HIGH), `tribute-page-1..6` interiors (→ MEDIUM),
  reference LOW. ≈ **$0.65** one-time.

## Deliverables

1. **Fixture — `fixtures/sample-story6-cat.json`** — complete Story-6 session (fresh
   `id: "sample-story6-cat"`), modeled on `fixtures/biscuit-tribute.json` but with the
   senior-cat `pet` (`species: "cat"`, photo `uploads/sample-photos/cat-senior.jpg`, a
   `breedColor` describing a silvered older cat), tasteful `owner` + `memories` (ageOrStage /
   quirks / stillLoves / favoriteActivity / favoriteRitual / sleepingSpot / favoriteSpots /
   ownerMessage / nicknames / dateAdopted), `toggles` (`transitionFrame: "still-here"`,
   `otherPetsInHome`). Verify zero surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story6-cat.json`.
3. **Capture** — `public/samples/story-6-tribute/` as `tribute-cover.jpg` +
   `tribute-page-1.jpg … tribute-page-6.jpg` (7 files; replaces the old
   `tribute-cover` + `tribute-page-3` pair) + slim `preview.pdf`.
4. **Catalog — `lib/catalog/products.ts`** — expand `story-6-tribute.sampleImages` from 2
   to the full 7 (`tribute-cover.jpg`, `tribute-page-1.jpg … tribute-page-6.jpg`); add
   `previewPdf: "/samples/story-6-tribute/preview.pdf"`.
5. **Tests — `lib/catalog/products.test.ts`** — update the pinned `story-6-tribute`
   sampleImages set (2 → 7) + length; assert its `previewPdf`.

## Verify / build

- `/books/story-6-tribute` stays `●` SSG; 7-tile gallery (lead-cover + grid) reads well +
  PDF link; PDF `200`; no 404s. Boundary test unaffected. `npm run test:run` +
  `npm run build` pass.

## Out of scope

- Wizard/order copy. The hard-diagnosis toggle variant (sample ships the "still-here" path).
