# Book-Detail Redesign — PR-1: Content Foundation (questions + examples + source photos)

> **Part 1 of 3.** Foundation only — **no visible change**. Ships the client-safe
> data and the public image assets that PR-3 (questions section) consumes, plus the
> `sourcePhoto?` contract field PR-3 reads. Lands green and is dead code until PR-3
> imports it. Independent of PR-2 (gallery).
>
> Design source: `context/prototypes/002-book-detail-gallery-questions/` (the
> "questions you'll answer" + "the example we used" panels) and its `NOTES.md`.

## Goal

Give the storefront a single, client-safe source of truth for, per title:

1. **The questionnaire** a customer will be asked when creating the book — the full
   grouped list of questions, each marked required/optional, with conditional reveals
   noted. So a shopper can prepare answers and a photo before buying.
2. **The worked example** — the exact answers used to generate that title's sample
   preview PDF — pinned to the real fixture so it can never drift from the sample.
3. **The source photo** — the input photo each sample book was painted from, exposed
   as a committed public asset (`public/samples/<productId>/source-photo.jpg`) and
   surfaced via a new optional `Product.sourcePhoto?`.

This PR builds the data + assets + tests. It renders nothing — PR-3 does.

## Scope

### New module — `lib/catalog/book-questions.ts` (pure, client-safe)

The curated content map keyed by `productId`. **Must stay engine-free / client-safe**
exactly like `lib/catalog/products.ts` (the public storefront's static build imports
its graph) — plain data only, no IO, no `lib/ai/*`, no `node:`/fs, no Puppeteer.

Proposed shape (final names at author's discretion, but keep it pure data):

```ts
export interface QuestionItem {
  /** Customer-facing prompt, matching the wizard's wording. */
  label: string;
  /** Required to generate, or optional/degrades gracefully. */
  required: boolean;
  /** Optional note for a conditional reveal, e.g. "only if a gotcha-day anniversary". */
  reveal?: string;
  /** The example answer used for this title's sample PDF (see fixture-pinning below). */
  example?: string;
}

export interface QuestionGroup {
  /** Section heading, e.g. "Your pet", "The story", "Tone & options". */
  title: string;
  items: QuestionItem[];
}

export interface BookQuestions {
  productId: string;
  groups: QuestionGroup[];
  /** The example pet's display name, for the worked-example caption (neutral framing). */
  exampleSummary?: string;
}

export function getBookQuestions(productId: string): BookQuestions | undefined;
```

Populate all **8** titles. The question wording + grouping + required/optional flags +
conditional reveals are already enumerated per story in the designer brief and the
prototype's three variants — reuse those verbatim. Group sensibly (e.g. *Your pet* /
*The story details* / *Tone & options*), mirroring the wizard's step structure.

The 8 titles and their fixtures:

| productId | storyType | fixture (example answers) |
|-----------|-----------|---------------------------|
| `story-1-book` | story-1 | `fixtures/story1-high.json` |
| `story-2-letter` | story-2 | `fixtures/sample-story2-cat.json` |
| `story-4-talk` | story-4 | `fixtures/sample-story4-other.json` |
| `story-5-letter-to` | story-5 | `fixtures/sample-story5-dog.json` |
| `story-6-tribute` | story-6 | `fixtures/sample-story6-cat.json` |
| `story-7-welcome` | story-7 | `fixtures/sample-story7-bird.json` |
| `story-8-adventure` | story-8 | `fixtures/sample-story8-dog.json` |
| `story-9-newbaby` | story-9 | `fixtures/sample-story9-rabbit.json` |

### Example answers — **pinned to the fixtures, not retyped**

The `example` values in the content map are the half a shopper can be misled by, so
they must stay truthful to the actual sample PDF. Two acceptable approaches — author
picks the simpler one:

- **(A) Test-pinned literals.** Hand-author the `example` strings, then a test asserts
  each one equals the corresponding field value read from the fixture JSON. Cheapest at
  render time (the storefront imports only plain strings), strongest guarantee.
- **(B) Derived at build/import.** Read the fixtures and project the example values.
  Only viable if it stays client-safe — fixtures are plain JSON, so a static import is
  fine, but do **not** pull in any engine module to interpret them.

Prefer **(A)**: it keeps `book-questions.ts` pure literals (client-safe by construction)
and the test does the anti-drift work.

### New `Product` field — `sourcePhoto?`

Add to the `Product` interface in `lib/catalog/products.ts`:

```ts
/**
 * Optional public web path to the ORIGINAL input photo this title's sample book
 * was painted from (served from `public/samples/<productId>/source-photo.jpg`).
 * The storefront's "the photo we started from" proof. Plain string path only, so
 * this module stays pure and client-safe. Omitted on titles without a sample.
 */
sourcePhoto?: string;
```

Set it on all 8 titles: `sourcePhoto: "/samples/<productId>/source-photo.jpg"`.

### Public source-photo assets

Commit a web-optimized `source-photo.jpg` (~1000px long edge, JPEG q≈80, via `sips` —
no new dep, same treatment as the existing samples) into each
`public/samples/<productId>/` directory, downscaled from the real input photo:

| productId | source input photo |
|-----------|--------------------|
| `story-1-book` | `uploads/high-run-candidates/test-image.jpg` (Bo, the boxer — gitignored dir; this is the same one-time-asset situation as Story 1's other HIGH assets) |
| `story-2-letter` | `uploads/sample-photos/cat.jpg` |
| `story-4-talk` | `uploads/sample-photos/other.jpg` |
| `story-5-letter-to` | `uploads/sample-photos/dog-senior.jpg` |
| `story-6-tribute` | `uploads/sample-photos/cat-senior.jpg` |
| `story-7-welcome` | `uploads/sample-photos/bird.jpg` |
| `story-8-adventure` | `uploads/sample-photos/dog-corgi.jpg` |
| `story-9-newbaby` | `uploads/sample-photos/rabbit.jpg` |

### Capture-script step (so future titles get it for free)

In `scripts/sample-capture.ts`, after the web JPGs + `preview.pdf` are written, also
downscale the session's input photo (`session.photo`, already recorded in the
captured `generated/<id>/session.json`) with the existing `sipsToWebJpg` helper and
write it to `public/samples/<out>/source-photo.jpg`. This means every NEW title's
sample run produces the source photo automatically. For the **existing 8** titles
(whose `generated/<id>/` dirs may be gone), populate the assets in this PR as a
one-time manual `sips` copy from the table above — same pattern as the already-committed
samples.

Update `context/new-book-playbook.md`: the sample step now also yields `source-photo.jpg`
and a `sourcePhoto` catalog entry, and a `book-questions.ts` entry is now required per
title (add it to the per-title checklist).

## Tests

- **Example-fixture pinning** (`lib/catalog/book-questions.test.ts`): for each title,
  assert each `example` value matches the corresponding field in that title's fixture
  JSON. This is the anti-drift guarantee — it fails if anyone edits an example without
  the sample actually changing.
- **Coverage**: every catalog `Product` has a `getBookQuestions(productId)` entry, and
  every entry's `productId` is a real product (no orphans). A new title can't ship
  without its questionnaire.
- **`sourcePhoto` coverage**: every product sets `sourcePhoto`, and the asset exists on
  disk at the referenced public path.
- **Client-safety**: the boundary test (`lib/runtime/surface.boundary.test.ts`) already
  walks the public import closure — confirm `book-questions.ts` is reachable from the
  public graph without dragging in the engine. If it isn't auto-covered, add it to the
  asserted public set.

## Out of scope (deferred to later PRs)

- Any change to `books/[productId]/page.tsx` or its CSS — **PR-2/PR-3**.
- The gallery — **PR-2**.
- Rendering the questions/example/photo — **PR-3**.

## Acceptance

- `npm run test:run` and `npm run build` pass; no visible change to any page.
- All 8 titles have a `book-questions.ts` entry, a `sourcePhoto`, and a committed
  `source-photo.jpg`.
- The fixture-pinning test genuinely fails if an example is edited to a value the
  fixture doesn't contain (mutation-verify once).
- The module stays pure/client-safe (boundary test green).
