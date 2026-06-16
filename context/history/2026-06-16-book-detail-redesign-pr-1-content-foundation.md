# Book-Detail Redesign PR-1: Content Foundation

**Date:** 2026-06-16
**Branch:** `feature/book-detail-redesign-pr1`
**Spec:** [context/features/book-detail-redesign-pr1-content-foundation.md](../features/book-detail-redesign-pr1-content-foundation.md)
**Series:** Book-detail redesign (PR-1 of 3). Design source:
`context/prototypes/002-book-detail-gallery-questions/`. Independent of PR-2 (gallery);
consumed by PR-3 (questions section).

## What & why

The book-detail page will gain two new shopper-facing panels — **"the questions you'll
answer"** (so a customer can prepare answers + a photo before buying) and **"the example
we used"** (the exact inputs behind that title's sample preview, with the source photo).
Before any of that can render, the storefront needs a **client-safe source of truth** for
the questionnaire, the worked-example answers, and the input photo — per title, for all 8.

This PR is **data + assets + tests only — zero visible change**. It lands green and is
**dead code** until PR-3 imports it. No page, component, or CSS was touched.

## What shipped

- **`lib/catalog/book-questions.ts`** (new) — a **pure-literal, zero-import** content map
  keyed by `productId`: `QuestionItem { label; required; reveal?; example? }` /
  `QuestionGroup { title; items }` / `BookQuestions { productId; groups; exampleSummary? }`
  + `getBookQuestions(productId)` (and `getAllBookQuestions()` for tests). All 8 titles
  populated, grouped to mirror each story's `/create` wizard steps (Your pet / The story /
  Tone & options), with required flags and conditional `reveal` notes (e.g. Story 7's
  anniversary→years-home, Story 8's childName-only-when-the-child-adventures, Story 9's
  babyName-degrades-to-"the new baby"). It is the **second module** in `lib/catalog/`
  alongside `products.ts`, held to the same client-safe discipline (it imports nothing
  at all).
- **`Product.sourcePhoto?`** (new field in `lib/catalog/products.ts`) — optional plain
  web path to the original input photo a sample was painted from
  (`/samples/<id>/source-photo.jpg`). Set on all 8 titles. Plain string keeps the module
  pure/client-safe.
- **8 × `public/samples/<id>/source-photo.jpg`** — web-optimized (~1000px long edge,
  q≈80, via `sips`, no new dep), one-time committed for the existing catalog, downscaled
  from each title's real input photo (`uploads/sample-photos/*` + Bo's
  `uploads/high-run-candidates/test-image.jpg` for Story 1).
- **`scripts/sample-capture.ts`** — after the web JPGs + `preview.pdf`, it now also
  downscales the run's input photo to `source-photo.jpg`, so every **new** title's sample
  run produces the source photo for free. (Used the real `session.pet.photo` field; the
  spec's `session.photo` was wrong.)

## Example answers — fixture-pinned (approach A)

The `example` strings are hand-authored literals (keeps the module pure literals,
client-safe by construction). The anti-drift guarantee is `book-questions.test.ts`: a
per-title `FIXTURE_PINS` map (question label → dotted fixture field path) asserts each
`example` equals the verbatim value read from that title's `fixtures/*.json`. If anyone
edits an example without the sample actually changing, the test fails. Mutation-verified
once (`"Bo"`→wrong value → exactly that pin failed → reverted).

## Tests

`lib/catalog/book-questions.test.ts` (+129): example-fixture pinning (anti-drift),
coverage (every `Product` has an entry, no orphan ids), `sourcePhoto` coverage (every
product sets it + asset exists on disk), and an **in-test client-safety closure walk**
(mirrors `surface.boundary.test.ts`). The shared boundary test legitimately won't auto-walk
the module while it's dead code, and adding it to `PUBLIC_ENTRIES` — a page-entry list —
would be wrong; the in-test walk is the right substitute and future-proofs against a bad
import. The boundary test auto-covers it once PR-3 imports it from a public page.

## Review

- **code-reviewer: PASS** — purity confirmed (zero imports), fixture-pinning genuine and
  mutation-verified, coverage solid, no scope creep. Both spec deviations
  (`session.pet.photo`, in-test closure walk) judged correct/adequate.
- **context-auditor: DRIFT FOUND → resolved** — folded two doc updates into
  `context/coding-standards.md`: the `lib/catalog/` passage now documents
  `book-questions.ts` (pure-literal, fixture-pinned second module), and the sample-asset
  lines name `source-photo.jpg` + the `sourcePhoto?` field. `new-book-playbook.md` was
  already updated by the implementation (source-photo output + `sourcePhoto` entry +
  required per-title `book-questions.ts` entry).
- No commerce surface touched → no security review.

## Gates

`npm run test:run` 2127 pass (95 files, +129), `npm run build` succeeds, render tiers
unchanged (storefront `○`/`●` static, operator `ƒ`). No visible change to any page.
