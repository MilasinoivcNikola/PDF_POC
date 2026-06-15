## 2026-06-15 — Public Refresh PR-3: Catalog (`/books`)

**Branch:** `feature/public-refresh-catalog-page` · **Craft Area 3 (UI)** ·
PR-3 of 4 in the public-pages refresh series (depends on PR-1's `audience` field +
`getProductsByAudience`, and PR-2's shared chrome + the `/books#living` / `#loss`
anchors the landing/footer link to). Spec:
`context/features/public-refresh-pr-3-catalog-page.md`. Design source:
`context/prototypes/001-public-pages-refresh/books.html` + `styles.css`.

### What shipped

The `/books` catalog stopped being one undifferentiated 8-title grid — where a
grieving visitor scrolled past adventure books and a gift-shopper scrolled past
goodbye letters — and became **two labelled, anchored sections** driven by PR-1's
`audience` field.

1. **Two audience sections** (`app/(public)/books/page.tsx`, body rewrite). The single
   `getProducts().map` grid was replaced with two `<section>`s:
   - `id="living"` — **"To celebrate them"**, gold count chip, maps
     `getProductsByAudience("living")` (5 titles). Rendered **first** (the larger,
     growth half).
   - `id="loss"` — **"To remember them"**, rose count chip, maps
     `getProductsByAudience("loss")` (3 titles).
   The `#living` / `#loss` ids match exactly what PR-2's landing two-worlds panels and
   the `SiteFooter` link to, so those anchors now resolve. Count chips derive `n` from
   `getProductsByAudience(a).length` ("· 5 titles" / "· 3 titles") — not typed.

2. **Richer cards.** Each card (still a `<Link href={/books/${productId}}>`) gained, in
   order: a kicker (persona copy) → `productDisplayTitle(p)` (so Story 9 shows "Your
   Pet and the New Baby", not the bare "And the New Baby") → tagline → a meta row with
   `formatPriceUsd(priceUsd)` + a derived count line + the arrow. Living cards carry a
   `cardJoyful` modifier (gold kicker/arrow tint vs the default rose).

3. **The count line — derived, with one page-framed exception.** Illustration-led books
   read "N illustrations" where **N is the registry-derived `illustrationCount`** (so it
   can't drift from the engine); the page-framed storybook **Story 1 reads "12 pages"**,
   a fixed product fact that isn't a derivable catalog value. Both live in a page-local
   `CARD_COPY` lookup keyed by `productId` (`{ kicker, countLabel }`, `{n}` substituted
   with `illustrationCount`), with a `FALLBACK_COPY` (`""` kicker hidden, `"{n}
   illustrations"`) so a newly added product renders without a lookup row. Kept OUT of
   `lib/catalog/products.ts` (which stays pure/minimal) — this is marketing copy, the
   same category as the kicker. **Adding a book = add one row here.**

4. **Graceful placeholder art** (`page.module.css`). Cards keep the existing
   `sampleImages[0] ? <img> : placeholder` fallback; the placeholder is now an
   intentional tinted panel with a centered paw mark (`PawMark`, the wordmark path),
   ported from the prototype's `.ph` / `.ph--joyful` / `.ph__paw`. Living placeholders
   use the gold tint, loss the rose/sage.

5. **Data correction** (`lib/catalog/products.ts`). Story 8 and Story 9 declared
   `sampleImages` paths for files that **don't exist on disk** (`public/samples/
   story-8-adventure/` + `story-9-newbaby/` are empty) — so the card rendered a 404
   broken `<img>`, exactly what the spec's QA bullet forbids. Both arrays were emptied
   to `[]` so the placeholder branch fires. The two colocated
   `products.test.ts` "non-empty sample images" assertions were relaxed to expect `[]`
   exactly (still meaningful — a regression to a dead path fails), documented in place.

6. **Intro lede** broadened to read for the whole 8-title line (it had named only a few
   titles).

### Notable decisions / process

- **The count-line call, corrected in review.** `start` initially rendered "13
  illustrations" for Story 1 (a deviation flagged to the PM at the time), on the
  reasoning that "12 pages" wasn't derivable. `/feature review` (code-reviewer) flagged
  it against the spec's resolved decision. The right reconciliation: "derive, don't
  type" governs the registry-derived counts (so they can't drift), while a fixed page
  count is copy — restored the spec's `countLabel` design with "12 pages" as a literal
  for Story 1 only.
- **Boundary held.** No `"use client"`, no dynamic rendering, no engine /
  `lib/supabase/server` import — `/books` stays statically rendered (`○`), the
  deploy-surface boundary test unchanged. `products.ts` stays pure/client-safe.
- **Doc freshness** (context-auditor nice-to-have): `context/new-book-playbook.md`
  Step 6 gained a "samples are optional / backfillable" note — a book may ship with
  `sampleImages: []` and degrade to the placeholder, as long as the array stays empty
  until the files exist (a path to a missing file = a 404 `<img>`).

### Verification

- `npm run build` green; `/books` renders `○` Static (no tier regression).
- `npm run test:run` green — 1927/1927 (boundary + catalog suites pass).
- QA (Playwright, `DEPLOY_TARGET=public`): all 8 acceptance criteria PASS — two
  sections, 5/3 partition + derived chips, `#living`/`#loss` anchor scroll, Story 1
  "12 pages" + others "N illustrations", Story 8/9 placeholder with **zero** sample
  404s, the Story 9 `displayTitle` override, and card → detail links.

### Out of scope / follow-ups

- Book-detail page redesign — **PR-4** (the last in the series).
- Generating the missing **Story 8 / 9 web samples** — a follow-up; cards degrade to
  the placeholder until then (see `context/debt.md`).
- A reusable global `label--rose` utility (only `label--gold` is global today; the rose
  chip tint is scoped locally in the module) — candidate for a later PR.
