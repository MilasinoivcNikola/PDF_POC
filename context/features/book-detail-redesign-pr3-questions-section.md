# Book-Detail Redesign — PR-3: "Questions you'll answer" + worked example

> **Part 3 of 3.** Visible. Adds the prep section below the existing detail-page
> content: the full questionnaire a shopper will be asked, plus "the example we used"
> panel (the fixture answers + the original source photo). **Depends on PR-1** (the
> `lib/catalog/book-questions.ts` content map, the `Product.sourcePhoto?` field, and
> the committed `source-photo.jpg` assets) — must merge after PR-1. Independent of PR-2
> (gallery); coordinates with it only as a same-file rebase on
> `books/[productId]/page.tsx`.
>
> Design source: `context/prototypes/002-book-detail-gallery-questions/` — the
> `.prep` (questions) + `.example` (worked example + polaroid source photo) sections in
> all three variants and their CSS.

## Goal

Reduce purchase friction in a grief-adjacent product by letting a shopper see, before
buying:

1. **Every question** they'll be asked when creating this title — grouped, with
   required vs optional clearly marked and conditional reveals noted — so they can
   gather answers and a photo up front.
2. **A worked example** — the exact answers behind that title's sample preview PDF,
   paired with the **original source photo** it was painted from — so they see what good
   answers look like ("this photo → these answers → this book").

## Scope

### Page section — `app/(public)/books/[productId]/page.tsx`

Add a new section **below** the existing `article` (info column / CTA / companion), still
inside `<main>`. The page stays a Server Component; it reads the content map at render:

```ts
import { getBookQuestions } from "@/lib/catalog/book-questions";
// ...
const questions = getBookQuestions(product.productId); // PR-1 guarantees one per title
```

Render two blocks, matching the prototype:

**A. "The questions you'll answer"** (`.prep`)
- Heading + the locked lede (already finalized in the prototype, all three variants):
  > Set aside 5–10 minutes and have one good photo ready. Here's everything we'll ask —
  > gather your answers first, or simply read the example we used to paint the sample
  > above.
- The **full** grouped questionnaire from `questions.groups`: each group as a titled
  block; each item showing its label, a required/optional indicator (rose dot vs faint
  dot + a mono "optional" tag + a legend — per the prototype), and the `reveal` note
  inline where present.
- Audience accent (gold living / rose loss) consistent with the rest of the page.

**B. "The example we used"** (`.example`)
- Neutral framing — **"The example we used" / "The answers behind the sample"** (NOT a
  pet-named heading; the PM chose neutral).
- The **source photo** as the polaroid-style snapshot from the prototype
  (`.example__polaroid` / `.example__source`), captioned "The photo we started from" /
  "The original", sourced from `product.sourcePhoto`.
- Each question paired with its `example` answer (the fixture-pinned values from PR-1),
  laid out as the worked-example panel (sticky on wide viewports per the prototype, at
  author's discretion).

### Styles

- Port the `.prep` + `.example` + polaroid CSS from the prototype's `styles.css` into
  the page's CSS module, reusing existing design tokens.

## Constraints

- **Depends on PR-1.** Do not author the questions/example data here — import it from
  `lib/catalog/book-questions.ts` and read `product.sourcePhoto`. If PR-1 isn't merged,
  this PR can't build.
- Page stays **`●` SSG** and in the **public** route group — `book-questions.ts` is
  pure/client-safe (PR-1), so the boundary test stays green. No engine import.
- Pure presentation — no new data, no IO. The only new logic is rendering.
- The source photo references the committed `public/samples/<productId>/source-photo.jpg`
  (PR-1) — confirm the path resolves (the prototype's production note: `uploads/` is not
  web-served, which is exactly why PR-1 copies the photo into `public/`).

## Tests / QA

- The data correctness is already locked by PR-1's fixture-pinning + coverage tests;
  this PR adds no data, so no new data tests are needed.
- **qa-verifier (Playwright)** on the running app:
  - the questions section renders the full grouped list with correct required/optional
    marks and the reveal notes (spot-check a rich title — Story 7 or Story 1 — and a
    simple one — Story 5);
  - the example panel shows the source photo (200, not a 404) and the paired example
    answers matching that title's sample;
  - neutral framing — no pet-named heading;
  - audience tint correct on a living (Story 7) vs loss (Story 1/5) title;
  - the lede reads the finalized 5–10 minute wording.
- `npm run test:run` + `npm run build` pass; route still `●` SSG; boundary green.

## Out of scope

- The gallery — **PR-2**.
- The content map / `sourcePhoto` field / assets — **PR-1**.
- Any per-book "inside the book" TOC (separately deferred in `debt.md`).

## Acceptance

- The detail page shows the full questionnaire (grouped, required/optional, reveals) and
  the worked-example panel (source photo + fixture answers) below the existing content,
  for all 8 titles.
- Neutral example framing; finalized lede; audience accents correct.
- Route stays static; build + tests + boundary pass.
