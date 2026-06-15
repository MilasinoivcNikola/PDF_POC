# Story Samples PR-05: "A Letter to Your Pet" (Senior Dog) Sample Set

**Date:** 2026-06-15
**Branch:** `feature/story-samples-05`
**Spec:** `context/features/story-samples-05-letter-to-dog.md`
**Milestone:** 17 — Storefront sample assets

---

## What shipped

The catalog's **second dog sample — deliberately a different breed from the Story-1
boxer** — a real **senior-dog** memorial sample for Story 5 ("A Letter to Your Pet," the
owner→pet companion of Story 2). Replaced the two placeholder tiles at
`public/samples/story-5-letter-to/` with a generated book at the locked mixed
`PRODUCTION_QUALITY` tier (HIGH `note-cover` + MEDIUM `note-page-5` + LOW reference, a
~$0.30 paid run) plus a slim downloadable `preview.pdf`, and surfaced the
"See the full book (PDF)" affordance on the detail page. The two dog samples in the
catalog now read as visibly different animals (boxer vs. senior brindle terrier-mix).

Built via the PR-0 harness (`scripts/sample-run.ts` → `scripts/sample-capture.ts`) over the
committed `uploads/sample-photos/dog-senior.jpg`.

## Deliverables

- **`fixtures/sample-story5-dog.json`** (new) — a complete Story-5 memorial session
  ("Biscuit," `she`, a small senior brindle terrier-mix, `species: "dog"`, photo
  `uploads/sample-photos/dog-senior.jpg`; owner "Margaret," single; toggles
  `deathType: "euthanasia"` + `beliefFrame: "heaven"` — deliberately distinct branches from
  the Murphy reference fixture and the cat sample). The `breedColor` describes the senior
  terrier-mix (grey muzzle, asymmetric ears) — unmistakably not the boxer. Resolves through
  `resolveStory5` with **zero surviving `[FIELD]`** and honors the "died" quality bar (no
  "passed away"). `species: "dog"`, so none of the PR-04 `"other"`-grammar traps apply.
- **`public/samples/story-5-letter-to/`** — `note-cover.jpg` + `note-page-5.jpg` (overwrote
  placeholders) + new slim 6-page `preview.pdf` (~655 KB).
- **`lib/catalog/products.ts`** — added `previewPdf: "/samples/story-5-letter-to/preview.pdf"`
  to the `story-5-letter-to` product (`sampleImages` unchanged; module stays pure/client-safe,
  no `lib/ai/*` import).
- **`lib/catalog/products.test.ts`** — added `story-5-letter-to` to the `WITH_PREVIEW` map +
  a dedicated `previewPdf` assertion (mirrors story-1/2/4).

## Paid run

Approach A / Premium, mixed `PRODUCTION_QUALITY` (HIGH `note-cover` + MEDIUM `note-page-5` +
LOW reference), 2 slots, both fresh cache misses, ≈ **$0.30**; OpenAI key verified 200 first.
The pet held **strongly on-model** — the cover is a faithful watercolor portrait of the
senior brindle terrier-mix (correct coat, grey muzzle, asymmetric ears, 3/4 pose);
`note-page-5` is the figure-free golden-hour wildflower-meadow belief wash (by design for the
heaven frame, in `LETTER_WASH_PAGE_IDS` so both illustrations render).

## Verification

- **Reviews:** code-reviewer **PASS** (catalog/test edits correct, fixture valid, module
  stays pure/client-safe); context-auditor **IN SYNC** (no doc drift — `previewPdf` already
  documented as standard, `WITH_PREVIEW` widening is the intended per-PR pattern). No
  commerce-security review — diff touches no orders/payment/auth/Supabase surface.
- **QA:** 4/4 PASS in a real browser — page loads with 0 console errors, both real tiles
  load (1000×1000, not placeholder paw art), PDF link returns 200 (`application/pdf`, 655 KB,
  6 pages). `$0` QA spend.
- **Gates:** `npm run test:run` → **1958 passed** (+1); `npm run build` → ✓ compiled
  successfully; detail page stays `●` SSG; boundary test unaffected. No new dependency, no
  engine/route/worker/state-machine change.

## Notes

A clean replay of the shipped PR-02 (cat) / PR-04 (guinea pig) pattern. Unlike PR-04 there
were no pre-existing product bugs to fold in: `note-page-5` was already in
`LETTER_WASH_PAGE_IDS` (so the PR-04 page-render gap does not recur), and Story 5's `dog`
species never touches the `"other"`-grammar or raw-`{species}` body-leak classes. No durable
deferrals.
