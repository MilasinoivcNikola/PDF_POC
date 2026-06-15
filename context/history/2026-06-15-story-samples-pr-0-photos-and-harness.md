# Story Samples PR-0: Candidate Photos + Capture Harness

**Date:** 2026-06-15
**Branch:** `feature/story-samples-foundation`
**Scope:** Single PR — pure tooling + committed assets. No paid generation, no engine /
catalog / route code change, no visible storefront change.

## What & why

Today only Story 1 has a real, durable storefront sample set; the other 7 titles ship 2
placeholder images or none. The goal of the *Story Samples* series (PRs 02–09) is a full
example book for every title, each starring a different pet species ("we support all kinds
of pets"). This PR-0 lays the shared foundation those per-story PRs reuse, so each later PR
is a tiny fixture + run + wire.

## Delivered

1. **Tracked sample-photo dir.** `.gitignore` negation (`!uploads/sample-photos/` +
   `/**`) makes the reference photos version-controlled — fixing the Story-1 pattern where
   the boxer photo lives in gitignored `uploads/` and its run isn't reproducible. The
   exception is documented in `coding-standards.md` (*Files, IO, and persistence*).
2. **Candidate photos (7).** One royalty-free Pexels photo per species — `cat.jpg`,
   `cat-senior.jpg`, `dog-senior.jpg`, `dog-corgi.jpg`, `bird.jpg` (cockatiel),
   `rabbit.jpg`, `other.jpg` (guinea pig) — committed under `uploads/sample-photos/`,
   each visually vetted (single, front-facing, distinctive markings) with source URL +
   Pexels License recorded in `uploads/sample-photos/README.md`. ~0.8 MB total (≤1024px).
3. **`scripts/sample-run.ts`** — story-agnostic generalization of `story1-high-run.ts`:
   takes a fixture path, runs `generateAllIllustrations(session, PRODUCTION_QUALITY)` (the
   *same* constant the batch worker passes, so samples can't drift from customer output),
   persists PNGs + manifest + `session.json` under `./generated/<id>/`, renders the
   full-res working PDF to `./output/`. Throwaway/kept like the prototypes.
4. **`scripts/sample-capture.ts`** — `sips`-downscales the PNGs → web JPGs (~1000px, q80,
   named by slot id; no new dependency), renders a **slim** web-res `preview.pdf` from the
   *downscaled* JPGs (the size trick — vs Story 1's 31 MB full-res), writes everything to
   `public/samples/<productId>/`. $0 (no API calls).
5. **`proto:sample`** npm script (mirrors `proto:story8` / `proto:story1-high`, with
   `--env-file-if-exists=.env.local`).
6. **Docs** — `coding-standards.md` (tracked-dir exception + `previewPdf` now standard at
   PRODUCTION_QUALITY) and `new-book-playbook.md` (the standard "ship the storefront sample
   set" recipe).

## Species swap (mid-PR, PM-directed)

Story 4 and Story 9 photo assignments were swapped: **Story 4 → `other.jpg` (guinea pig)**,
**Story 9 → `rabbit.jpg`**. Because the per-story specs are species-coupled, the swap was
propagated everywhere: the two spec files were renamed
(`story-samples-04-could-talk-other.md`, `story-samples-09-new-baby-rabbit.md`) and rewritten
(titles, `species:`, fixture ids, photo paths, the "exercises the `other`-path" rationale
moved to Story 4), and the PR-0 + README species tables updated. Species coverage unchanged —
still exactly one rabbit and one `other` across the catalog, just on swapped titles.

## Review

- **Code review: PASS** — scripts follow the throwaway-tooling pattern; slim-PDF requirement
  correctly met; `sample-capture.ts`'s slot allow-list is actually ahead of the engine's.
- **Context audit: DRIFT FOUND → fixed** — the branch had introduced a Step-6
  self-contradiction in `new-book-playbook.md` (old "LOW is the sample tier" text vs the new
  PRODUCTION_QUALITY standard path); reframed so the shipped storefront set is
  PRODUCTION_QUALITY and LOW is the dev/QA-frame default only. `previewPdf` wording in both
  the playbook and `coding-standards.md` updated from "flagship/HIGH-tier, Story 1 only" to
  "standard for any title via the PRODUCTION_QUALITY run; Story 1's full-res HIGH preview is
  the lone exception."

## Notable finding (recorded, not fixed here — see debt.md)

The review surfaced and we independently confirmed a **pre-existing latent gap: Story-9
illustration generation is not wired.** `generateAllIllustrations` has no `story-9` dispatch
branch — a `Story9Session` falls through to the Story-1 shared path and would generate
`page-1..12` Saying-Goodbye art with Story-1 prompts; `buildStory9SlotPrompts`
(`lib/ai/story9-prompts.ts`, written + tested in PR-A) is never invoked, and
`manifestToImageMap`'s allow-list omits story-9's slots. PR-A's "correct New Baby PDF"
verified the story-agnostic text/layout render + the prompt builder in isolation, not the
generation wiring. Latent only because commerce isn't live. Out of scope for this
tooling-only PR; recorded in `context/debt.md` as a **medium pre-flight gate** that must be
fixed before the Story-9 sample run (PR-09) spends ~$1 on the wrong art, and before Story-9
go-live. The stale "Low-tier (~800px)" remediation wording in the Story 7/8/9 sample-debt
rows was also corrected to the PRODUCTION_QUALITY harness path.

## Verification

`npm run test:run` → 1951 passed / 89 files. `npm run build` → success, tiers intact
(`●` SSG storefront / `ƒ` operator). `tsc -p scripts/tsconfig.json` clean. No paid run.
