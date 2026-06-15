# Feature Spec — Story 7 Sample Set (Bird) — "Welcome Home"

> **Status:** Drafted, awaiting sign-off (not started). **Depends on PR-0.**
> **Branch (proposed):** `feature/story-samples-07`
> **Scope:** Single PR. One paid mixed-tier run → durable public sample set for Story 7.
> **Species: BIRD (parrot/cockatiel) — the catalog's first feathered sample.**

---

## Goal

Replace Story 7's 2 placeholder images with the **full 8-illustration** bird gotcha-day
sample (gallery grows 2 → 8) + a slim preview PDF on `/books/story-7-welcome`. A bird is the
strongest possible "we really do support all kinds of pets" proof point.

> **Photo-consistency note:** birds are a harder anchor than mammals (less facial
> structure, busy plumage). Choose the candidate photo carefully and **eyeball pet
> consistency across the 8 scenes before committing** — if the bird drifts badly, fall back
> to a more distinctive specimen (or, with PM sign-off, swap Story 7's species). This is the
> one sample where the species is a mild risk; budget for one re-pick.

## Input photo (decided in PR-0)

`uploads/sample-photos/bird.jpg` — a front-facing parrot or cockatiel with bold, distinctive
plumage (the more saturated/patterned, the better the anchor). Free-to-use; source +
license in PR-0.

## Engine facts

- Story 7 is **Approach A**, joyful gotcha-day storybook, **8 illustration slots**:
  `WELCOME_SCENE_PAGE_IDS = ["welcome-cover", "welcome-before", "welcome-choosing",
  "welcome-drive-home", "welcome-first-night", "welcome-learning", "welcome-now-ours",
  "welcome-belong"]` (`lib/story/story-7.ts`) → **8 captured JPGs** = the whole gallery.
- Mixed tier: `welcome-cover` hero (→ HIGH), the 7 interiors (→ MEDIUM), reference LOW.
  ≈ **$0.72** one-time.

## Deliverables

1. **Fixture — `fixtures/sample-story7-bird.json`** — complete Story-7 session (fresh
   `id: "sample-story7-bird"`), modeled on `fixtures/welcome-home-biscuit.json` but with the
   bird `pet` (`species: "bird"`, photo `uploads/sample-photos/bird.jpg`, a `breedColor`
   describing the plumage), tasteful `owner` + `memories` (favoriteActivity / sleepingSpot /
   quirks / homecomingMemory / familyMembers / childName / nicknames / dateAdopted),
   `toggles` (`occasion`, `adoptionSource`, `lifeStage`, `yearsHome`). Pick homecoming copy
   that fits a bird (e.g. an adoption/rehoming, a perch instead of a couch). Verify zero
   surviving `[FIELD]`.
2. **Run** — `npm run proto:sample fixtures/sample-story7-bird.json`.
3. **Capture** — `public/samples/story-7-welcome/` as `welcome-cover.jpg` +
   `welcome-before.jpg … welcome-belong.jpg` (8 files, named by **real slot id**). This
   **replaces** the existing `welcome-cover.jpg` + the misnamed `welcome-page-7.jpg` (which
   never matched a real slot). Render the slim `preview.pdf`.
4. **Catalog — `lib/catalog/products.ts`** — replace `story-7-welcome.sampleImages` (the old
   2, incl. the bogus `welcome-page-7.jpg`) with the full 8 real-slot-id files; add
   `previewPdf: "/samples/story-7-welcome/preview.pdf"`.
5. **Tests** — update the pinned `story-7-welcome` sampleImages set (2 → 8) + length; assert
   its `previewPdf`.

## Verify / build

- `/books/story-7-welcome` stays `●` SSG; 8-tile gallery + PDF link; PDF `200`; no 404s
  (the old `welcome-page-7.jpg` reference is gone). Boundary test unaffected.
  `npm run test:run` + `npm run build` pass.

## Out of scope

- Wizard/order copy. The annual-gotcha-day occasion variants beyond the one sampled.
