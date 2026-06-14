# Feature Spec — Public Refresh PR-2: Shared Chrome + Landing

> **Series:** Public-pages refresh. This is **PR-2 of 4**. Depends on **PR-1**
> (`audience` field + selectors must be merged first).
> Design source: `context/prototypes/001-public-pages-refresh/index.html` + `styles.css`.

## Intent

Two things land together because the landing is the first place they appear:

1. **Shared chrome.** The site header and footer are currently **duplicated inline** on
   every public page (`app/(public)/page.tsx`, `books/page.tsx`, …), each a hand-copied
   `<header className="site-header">` block. The refresh upgrades the header to a real nav
   cluster and the footer to a 3-column brand/links layout. To keep `main` coherent at
   every step, we extract `SiteHeader` / `SiteFooter` **once** and swap **all** public
   pages onto them in this PR — even pages whose *bodies* are redesigned later (PR-3/4).
2. **The new landing.** Replace the hand-listed 8-card chooser + single-title
   table-of-contents with: **hero → two-worlds panels → "how it works" trust strip**,
   deriving titles/counts from the catalog (kills the stale "Six keepsakes").

## Scope assessment → one PR

The chrome extraction touches every public page lightly (header/footer swap only) and the
landing body is rewritten. It's cohesive and best reviewed as a unit. One PR on
`feature/public-refresh-chrome-landing`.

> **Deliberate "slightly bigger PR" call:** unifying chrome here (rather than per-page)
> means the catalog/detail pages get the *new* header/footer in this PR while keeping their
> *old* bodies until PR-3/4. That's a clean transitional state (consistent chrome, old
> body) instead of a Frankenstein header. Approved trade-off.

---

## Resolved decisions
- **Header nav:** two links — **"The books"** → `/books`, **"How it's made"** → `/policies`.
  No new "how it's made" page; `/policies` already carries that content. The split is
  surfaced on the landing/catalog, not in the nav.
- **Two-worlds panels link to catalog anchors:** `/books#living` and `/books#loss` (PR-3
  adds the matching section ids). Until PR-3 merges they land on `/books` top — acceptable.
- **Drop the Story-1 table-of-contents from the landing.** It over-indexed on one title.
  PR-4 may reintroduce an "inside the book" section on the **detail** page; not here.
- **All counts/titles derived from the catalog** (PR-1 helpers). No literal numbers in JSX.

---

## Implementation plan (checklist)

### A. Shared chrome components
- [ ] New `components/site/SiteHeader.tsx` (named export, server component): wordmark
      (links `/`) + `<nav className="site-nav">` with the two links. Accept an optional
      `current?: "books" | "policies"` prop to set `aria-current="page"`.
- [ ] New `components/site/SiteFooter.tsx`: the 3-column `footer-rich` layout from the
      mockup — brand + tagline, "The books" column (`/books#living`, `/books#loss`,
      `/books`), "Dearbound" column (`/policies` × the three policy anchors). All wordmark
      strings use `BRAND` from [lib/brand.ts](../../lib/brand.ts) and the tagline constant.
- [ ] Add a `TAGLINE` (or reuse existing) constant if one isn't already exported beside
      `BRAND`; the footer tagline and hero must single-source it.

### B. New design-system classes → `app/globals.css`
- [ ] Port the mockup's new classes built **from existing tokens** (no new hex): `.site-nav`,
      `.footer-rich*`, `.hero*`, `.worlds`/`.world*`, `.how*`. Mirror any new spacing token
      in `tailwind.config.ts` only if the mockup introduced one (it shouldn't — it reuses
      `--s-*`). Keep `.site-header` / `.site-footer` working for unconverted operator pages.
- [ ] The two-worlds accent: **living = gold** (`label--gold` family), **loss = rose**
      (`label--rose`). This consolidates the four bespoke landing accents
      (`chooserCardLiving/Joyful/Adventure/Newbaby`) into the two-family system — those
      old classes are removed with the old landing body.

### C. Rewrite the landing body — [app/(public)/page.tsx](../../app/\(public\)/page.tsx)
- [ ] Replace the inline `<header>`/`<footer>` with `<SiteHeader>` / `<SiteFooter>`.
- [ ] Hero: ornament + `display-xl` title + `lede`, single primary CTA → `/books`, and a
      CTA-meta line that reads the count from `getProducts().length` (e.g. "Eight keepsakes,
      each made to order…" — but **rendered from the number**, not typed).
- [ ] Two-worlds section: two panels (living → `/books#living`, loss → `/books#loss`), each
      with kicker, title, body, and a count line from `getProductsByAudience(...).length`.
- [ ] "How it works" 3-step strip (tell us → we paint it → it arrives).
- [ ] **Delete** the `tocEntries` array + the `Inside the story` section and the now-unused
      `chooser*` styles in `page.module.css`.

### D. Swap chrome on the other public pages (body unchanged)
- [ ] `books/page.tsx`, `books/[productId]/page.tsx`, `order/[productId]/page.tsx` (+
      `confirmation/page.tsx`), `policies/page.tsx`, `download/[token]/page.tsx`: replace
      their inline header/footer with `<SiteHeader>` / `<SiteFooter>`. **No body changes** —
      those are PR-3 (catalog) and PR-4 (detail/policies/download). The order page keeps its
      body entirely (out of scope for the whole series).

---

## Out of scope (explicit)
- Catalog (`/books`) body, book-detail body, policies/download bodies — PR-3 / PR-4.
- The **order form** — unchanged across the whole series (per-story, from the wizard).
- Real sample art — the follow-up. Landing uses no product images (panels are typographic).
- Reintroducing a table-of-contents anywhere — deferred to PR-4's decision.

## Testing
- [ ] `npm run build` + `npm run test:run` green (boundary test must still pass — new
      `components/site/*` are client-safe, import only `lib/brand` + catalog selectors).
- [ ] Unit: a small test asserting the landing renders **no hardcoded catalog count** is
      overkill; instead rely on the catalog being the source. (Skip — visual.)
- [ ] Manual QA (qa-verifier / Playwright): load `/` — hero, two panels with correct
      living/loss counts (5 / 3), how-it-works strip, no "Six keepsakes", no TOC. Load
      `/books`, an order page, `/policies`, `/download/<token>` — confirm every page shows
      the **new** shared header/footer and nothing is visually broken.
- [ ] Check `/books#living` / `#loss` links don't 404 (they resolve to `/books`; the
      anchors arrive in PR-3).

## Risks / notes
- **Largest-surface PR of the series** (touches every public page), but each non-landing
  edit is a mechanical header/footer swap — low logic risk.
- Removing the old `chooser*` / `toc*` styles: grep `page.module.css` and the operator
  pages to be sure no other page imported those class names before deleting.
- Operator pages still use the old inline `site-header`/`site-footer` markup — leave them;
  this series is public-only. Keep both class families in `globals.css`.
