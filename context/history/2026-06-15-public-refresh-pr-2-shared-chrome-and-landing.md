## 2026-06-15 — Public Refresh PR-2: Shared Chrome + Landing

**Branch:** `feature/public-refresh-chrome-landing` · **Craft Area 3 (UI)** ·
PR-2 of 4 in the public-pages refresh series (depends on PR-1's `audience` field +
selectors). Spec: `context/features/public-refresh-pr-2-chrome-and-landing.md`.
Design source: `context/prototypes/001-public-pages-refresh/index.html` + `styles.css`.

### What shipped

Two things landed together because the landing is the first place they appear:

1. **Shared chrome, extracted once.** The site header/footer were duplicated inline
   on every public page. Two new client-safe server components replace them:
   - `components/site/SiteHeader.tsx` — wordmark (→ `/`, from `BRAND`) + `<nav
     className="site-nav">` with two links: **"The books"** → `/books`, **"How it's
     made"** → `/policies`. Optional `current?: "books" | "policies"` prop sets
     `aria-current="page"` on the matching link.
   - `components/site/SiteFooter.tsx` — the 3-column `footer-rich` layout: brand +
     tagline, a "The books" column (`/books#living`, `/books#loss`, `/books`), and a
     "Dearbound" column (three `/policies` links). Tagline single-sourced from a new
     `TAGLINE` constant.
   Both import only `lib/brand` + `next/link` — they enter the public import graph,
   so the deploy-surface boundary test (which walks the public page closure) covers
   them transitively with no entries-list change.

2. **New landing body** (`app/(public)/page.tsx`), rewritten from the hand-listed
   8-card chooser + single-title table-of-contents to: **hero → two-worlds panels →
   "how it works" 3-step strip.** All counts/titles derive from the catalog (PR-1
   helpers) — a `numberWord()` helper spells `getProducts().length` ("Eight"),
   `getProductsByAudience("living").length` ("Five"), and `…("loss").length`
   ("Three"). No literal catalog numbers in JSX; the stale "Six keepsakes" is gone.
   Two-worlds accent: **living = gold** (`.world--living`), **loss = rose** (default
   `.world`). The old `chooser*`/`toc*` styles + `tocEntries` array were deleted, and
   `app/(public)/page.module.css` removed entirely (it became fully unused; confirmed
   no other importer).

3. **Chrome swapped on every other public page** (bodies unchanged — those redesigns
   are PR-3/4): `books/page.tsx`, `books/[productId]/page.tsx`, `policies/page.tsx`,
   `order/[productId]/confirmation/page.tsx`, `download/[token]/page.tsx`. `current`
   passed where it applies (books → `"books"`, policies → `"policies"`). Orphaned
   `Link`/`BRAND`/`wordmark` consts left by the swaps were removed.

4. **New design-system classes → `app/globals.css`**: `.site-nav`, `.footer-rich*`,
   `.hero*`, `.worlds`/`.world*`, `.how*` — all built from existing `--s-*` / color
   tokens, no new hex, `tailwind.config.ts` untouched. The old `.site-header` /
   `.site-footer` classes are kept for the unconverted operator pages (both families
   coexist).

5. **`lib/brand.ts`** gains `TAGLINE = "Custom illustrated books starring your pet."`
   (wording dates to the M14 Dearbound rename; lifted into a shared constant here so
   the footer single-sources it).

### Decisions made

- **Order page (`/order/[productId]`) deliberately keeps its OWN focused checkout
  header** (the contextual "Ordering · {title}" header in `OrderForm.tsx`, on the old
  `.site-header`/`.site-footer`), not the shared nav. The spec's QA-checklist line
  ("every page shows the new shared header/footer") was read as covering the standard
  pages; surfacing the full nav (with links pulling people *out* of checkout) would
  hurt conversion. Approved as-is.
- **Hero uses bespoke prose, not the `TAGLINE` constant.** The footer single-sources
  `TAGLINE`; the hero lede is intentionally longer marketing copy. Both reviewers
  judged forcing the constant in cosmetic/worse. Kept as-is.
- **Living world class named `.world--living`** (not the mockup's `.world--joyful`) to
  align with the `audience` semantics introduced in PR-1.
- **Policy anchor hrefs** all point to `/policies` (its sections expose no `id`s yet),
  matching the mockup.

### Review / QA

- **Code review: PASS**, no blockers. Three cleanups applied on-branch after review:
  removed dead `.label--sage` + `.label--rose` CSS (the new accent system uses
  `.world*` directly; `.label--gold` is the pre-existing, widely-used one and was
  untouched) + their misleading comment; corrected the `lib/brand.ts` TAGLINE
  provenance comment.
- **Context audit: DRIFT FOUND (one doc lag, no contradictions)** — resolved
  on-branch: `context/coding-standards.md:59` widened from `components/{wizard,preview}/`
  to `components/{wizard,preview,site}/`.
- **Commerce-security review: not dispatched** — the diff modifies no commerce surface
  (consumes catalog selectors only; no order/Supabase/payment/webhook/delivery/auth).
- **QA (Playwright, $0 — no generation): PASS on all 7 checks** — new landing body,
  catalog-derived counts (8 / 5 / 3, no "Six keepsakes"), gold/rose accents,
  `/books#living`/`#loss` resolve 200, shared chrome on every public page,
  `aria-current` correct, order page keeps its own header, no console errors. Public
  pages stay static/SSG; `/download/[token]` stays dynamic.

### Out of scope (held)

Catalog/detail/policies/download **bodies** (PR-3/4), the order form (unchanged across
the whole series), real sample art, and reintroducing a TOC. `/books#living`/`#loss`
anchors arrive in PR-3 (they resolve to `/books` top until then).
