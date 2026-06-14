# Feature Spec — Public Refresh PR-3: Catalog (`/books`)

> **Series:** Public-pages refresh. This is **PR-3 of 4**. Depends on **PR-1**
> (`audience` + `getProductsByAudience`) and **PR-2** (shared chrome + the
> `/books#living` / `#loss` anchors the landing links to).
> Design source: `context/prototypes/001-public-pages-refresh/books.html`.

## Intent

The live [/books](../../app/\(public\)/books/page.tsx) lists all 8 titles in one
undifferentiated grid, so a grieving visitor scrolls past adventure books and a
gift-shopper scrolls past goodbye letters. Replace the single grid with **two labelled
sections** — **"To celebrate them"** (`#living`) and **"To remember them"** (`#loss`) —
driven by PR-1's `audience` field, and enrich the cards (kicker + price + illustration/page
count) per the mockup.

## Scope assessment → one PR

Single page body rewrite (`books/page.tsx` + its `page.module.css`). One PR on
`feature/public-refresh-catalog-page`.

---

## Resolved decisions
- **Two sections, anchored** `#living` / `#loss`, matching the landing's two-worlds links.
  Living section first (it's the larger, 5-title, growth half), loss second.
- **Accents:** living cards gold, loss cards rose (the PR-2 two-family system).
- **Card content:** `displayTitle` (PR-1 fallback), `tagline`, `priceUsd` via
  `formatPriceUsd`, the **count** line, and a kicker (the audience/persona line).
- **Card count line wording:** use the real metric per book — "N illustrations" for
  illustration-led books, and for the storybooks where pages are the headline figure keep
  the mockup's page framing (Story 1 shows "12 pages"). Derive the number; don't type it.
- **Graceful art fallback:** the live card already renders `sampleImages[0] ? <img> : null`
  — keep that. Books without samples yet (Story 8 / 9 until the follow-up) show the
  empty/placeholder art block, not a broken image.

---

## Implementation plan (checklist)

### A. Rewrite the catalog body — [app/(public)/books/page.tsx](../../app/\(public\)/books/page.tsx)
- [ ] Confirm `<SiteHeader current="books">` / `<SiteFooter>` are in place (from PR-2).
- [ ] Intro section: keep the `label--gold` "Made by hand" eyebrow + `display-lg` title; the
      lede stays but should read for the whole 8-title line (it currently describes only a
      few titles).
- [ ] Render **two `<section>`s** with `id="living"` and `id="loss"`, each:
  - a `cat-section__head` with the heading ("To celebrate them" / "To remember them") and a
    `label--gold` / `label--rose` count chip — count from `getProductsByAudience(a).length`.
  - a `.grid` of cards mapping `getProductsByAudience(a)`.
- [ ] Card: `card` (+ `card--joyful` for living) → art block (existing `sampleImages[0]`
      fallback) → body with kicker, `productDisplayTitle(p)`, tagline, and a `card__meta`
      row (price + count + arrow).

### B. Card kicker source
- [ ] The kicker is short persona/audience copy (mockup: "A kids' adventure", "A gotcha-day
      book", "A story for your child"…). It is **marketing copy, not catalog data** — keep
      it out of `products.ts` (which stays pure/minimal). Define a small
      `kicker`/`countLabel` lookup **local to the catalog page** keyed by `productId`
      (a `Record<string, { kicker: string; countLabel: string }>`), with a sensible fallback
      so a newly added product still renders (e.g. kicker `""` hidden, countLabel
      `"{n} illustrations"`). Document that adding a book = add one row here.

### C. Styles — `books/page.module.css`
- [ ] Port the mockup's `cat-section*`, `card__kicker`, `card__detail`, and the
      `card--joyful` accent from existing tokens. Reuse the existing `.grid` / `.card` /
      `.card__meta` where they already match to minimize new CSS.

---

## Out of scope (explicit)
- Book-detail page — PR-4.
- Pricing changes; the `audience` data itself (PR-1).
- Sorting within a section beyond catalog order; search/filter UI.
- Generating the missing Story 8 / 9 samples — the follow-up (cards degrade gracefully).

## Testing
- [ ] `npm run build` + `npm run test:run` green (catalog page stays in the public/static
      tier — boundary test unchanged).
- [ ] Manual QA (Playwright): `/books` shows two labelled sections; living has the 5 living
      titles, loss has the 3 loss titles; counts on the chips read 5 / 3 and are derived;
      `/books#living` and `/books#loss` scroll to the right section (landing panels now
      resolve correctly); cards show price + count + kicker; Story 8 / 9 cards render with
      the placeholder art block, not a broken image.
- [ ] Confirm the page is still statically rendered (`○`/`●`) in the build output — no
      accidental dynamic rendering introduced.

## Risks / notes
- The kicker/countLabel lookup is the one spot that needs a row per new book — call it out
  in the new-book playbook follow-on if we touch it, but don't expand scope here.
- Keep the empty-art block visually intentional (a soft tinted panel), since two of eight
  cards will use it until the samples follow-up ships.
