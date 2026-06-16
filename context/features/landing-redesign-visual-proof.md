# Feature Spec — Landing Redesign (lead with visual proof)

## Summary

Rebuild the public landing page (`app/(public)/page.tsx`) into a full, proof-led
structure. The current landing is **all text and shows no artwork** — for a product
sold entirely on a visual transformation (your pet's photo → hand-finished
illustrated book art), that is the biggest conversion leak. This redesign leads with
real sample imagery and adds a dedicated "transformation" section that literally
shows a customer photo beside the painted page made from it.

This is **presentation-only** work in the public static route. No engine, no PDF
template, no commerce surface, no route-graph/boundary change. The page stays `○`
Static (SSG). Single PR.

**Design source of truth:** `context/prototypes/005-landing-with-proof/index.html`
+ its `NOTES.md` (the locked layout, section order, copy, and the four new CSS
patterns). Port the structure from there; do **not** port the mockup's Google-Fonts
`<link>` — the real app self-hosts via `next/font`.

## Decisions (locked with PM)

| Decision | Choice |
|----------|--------|
| Scope | **Full restructure** — all seven sections below, not a partial touch-up |
| Hero lead image | **Celebration-forward** — the corgi `adventure-cover` is the main (front) card, two other covers fan behind. (Resolves NOTES open-Q1 toward warmer/broader.) |
| Transformation pairing | **The rabbit** (Story 9 "New Baby", a living title) — its source photo beside its painted cover. A living title as the first proof, not the memorial dog. (Resolves NOTES open-Q2 toward the lighter first impression.) |
| FAQ | **Six** short Q&As (keep the designer's set) |
| Testimonials / pricing table | **Excluded** — pre-launch (no real reviews; prices still placeholder) |

## Goals

1. Replace the text-only hero with a two-column hero that shows a fanned stack of
   three real sample covers (corgi adventure lead).
2. Add the **transformation** section: rabbit source photo → painted rabbit cover,
   captioned "From your photo → The page we painted."
3. Keep the existing **two-worlds** (celebrate / remember) and **how-it-works**
   sections, reordered with how-it-works lower.
4. Add a **trust / FAQ-lite** section (six truthful Q&As) and a **closing CTA band**.
5. Use only existing design-system tokens/classes; the page stays `○` Static and the
   boundary test stays green. No PDF/engine/commerce change.

## Implementation plan

All work lands in two files: `app/(public)/page.tsx` (the new markup) and
`app/globals.css` (four new component-class blocks). The shared `SiteHeader` /
`SiteFooter` are reused unchanged.

### 1. Assets — use the web-optimized `public/` copies, NOT the mockup paths

The mockup references gitignored `generated/` and `uploads/` files for convenience.
The production React must point at the committed, web-optimized `public/samples/`
versions (all verified present):

| Use | Mockup path (gitignored) | **Production path (`public/`)** |
|-----|--------------------------|-------------------------------|
| Hero front card (lead) | `generated/sample-story8-dog/adventure-cover.png` | `/samples/story-8-adventure/adventure-cover.jpg` |
| Hero mid card | `public/samples/story-6-tribute/tribute-cover.jpg` | `/samples/story-6-tribute/tribute-cover.jpg` |
| Hero back card | `public/samples/story-7-welcome/welcome-cover.jpg` | `/samples/story-7-welcome/welcome-cover.jpg` |
| Proof — source photo | `uploads/sample-photos/rabbit.jpg` | `/samples/story-9-newbaby/source-photo.jpg` |
| Proof — painted page | `public/samples/story-9-newbaby/baby-cover.jpg` | `/samples/story-9-newbaby/baby-cover.jpg` |

`source-photo.jpg` is the `sips`-downscaled web copy of `rabbit.jpg` already committed
for the book-detail "the photo we started from" proof — reuse it, don't re-add the raw
upload.

### 2. Markup — `app/(public)/page.tsx`

Rebuild the `<main>` body to the seven sections in NOTES order. Keep the existing
catalog-derived counts pattern (`getProducts().length` /
`getProductsByAudience(...)`) so copy never hardcodes a number — the two-worlds
section already does this; preserve it.

1. **Hero** (`.hero--proof`) — eyebrow label + the sharpened headline
   *"Books that look like your actual pet."* + lede + the existing
   `.btn .btn--primary` "See the books" CTA → `/books` + `.hero__cta-meta` (counts
   derived). Right column: `.hero__stack` with three `<figure>` cards
   (`.s-front` = corgi adventure, `.s-mid` = tribute, `.s-back` = welcome). Use
   `next/image` if the rest of the public pages do; otherwise plain `<img>` to match
   the surrounding convention (check the book-detail/gallery pattern and follow it).
   Every image needs descriptive `alt`.
2. **Transformation** (`.proof`) — head (`.label` + `h2` *"Yes — it really is them."*
   + lede), then `.proof__pair`: rabbit `source-photo.jpg` (`.proof__photo`, plain
   polaroid) → arrow → painted `baby-cover.jpg` (`.proof__art`, keepsake-frame
   treatment) with the two `.proof__caption`s and the `.proof__note` ("reviewed by a
   person…").
3. **Two worlds** (`.worlds` / `.world`) — port the existing section verbatim (gold
   living / rose loss, derived counts), adding the centered `.section-head` above it.
4. **How it works** (`.how`) — port the existing 3 steps unchanged, now below proof.
5. **FAQ** (`.faq`) — the six Q&As from the mockup. Copy is truthful and already
   reconciled with `policies/page.tsx` (AI-honesty, 30-day remake-then-refund,
   privacy) and the product model (human review gate, 24–48h, print-quality PDF).
6. **Closing CTA band** (`.closing-band`) — final headline + `.btn .btn--primary` →
   `/books`.
7. `<SiteFooter />` — unchanged.

### 3. CSS — four new blocks in `app/globals.css`

Port these four patterns from the mockup's `<style>`, each built **only** from
existing `:root` tokens (no new color/font/radius):

- `.hero--proof` (+ `.hero__copy`, `.hero__eyebrow`, `.hero__stack` and its
  `.s-front`/`.s-mid`/`.s-back` positioning + `figcaption`).
- `.proof` (+ `.proof__head`, `.proof__pair`, `.proof__side`, `.proof__photo`,
  `.proof__art` incl. the `::after` screen-mirror of the print keepsake frame,
  `.proof__arrow`, `.proof__caption`, `.proof__note`).
- `.faq` (+ `.faq__grid`, item classes).
- `.closing-band`.

Place them near the existing `.hero` / `.worlds` / `.how` blocks (around
`app/globals.css:2564+`) so the landing styles stay grouped.

**Responsive adjustment (from QA, below):** the mockup collapses the hero to a single
column at `max-width:760px`. Playwright testing showed the three-card stack is cramped
in the 760–820 band (it shares that band with the still-two-column worlds). **Raise
the `.hero--proof` collapse breakpoint to ~860px** so the stack drops to the stacked
mobile layout before it gets tight. The other breakpoints (worlds 820, how/footer 720,
proof/faq 760) are fine as-is.

## Out of scope / not this PR

- No new copy beyond what the mockup locks; no pricing, no testimonials.
- No change to `/books`, book-detail, order, policies, download, or any shared
  component. `SiteHeader`/`SiteFooter` reused unchanged (landing keeps a **neutral**
  header — it spans both worlds).
- No engine, PDF, catalog-data, or commerce change. No new dependency.

## Open build-time questions (don't block starting)

1. **Closing-band CTA target** — keep all CTAs → `/books` (simplest, current mockup),
   or deep-link the closing band to `/books#living` to match the celebration-forward
   hero? Recommendation: keep `/books` for consistency; revisit if we want to bias the
   funnel. (NOTES open-Q4.)
2. **`<img>` vs `next/image`** — match whatever the existing public pages (book-detail
   gallery) already use; don't introduce a new image pattern just for the landing.

## Testing & verification

- `npm run test:run` and `npm run build` must pass.
- **Boundary test** (`lib/runtime/surface.boundary.test.ts`) green — the landing
  imports nothing new beyond the catalog selectors it already uses; it must stay in
  the public graph with no engine / `lib/supabase/server` leak. Confirm the page still
  renders `○` Static in the build output.
- No new unit tests required (pure presentational markup/CSS). The catalog-count
  helpers are already tested.
- **QA in the browser (Playwright):** the redesign was already responsively verified
  on the mockup — **no horizontal overflow at 390 / 768 / 1024 / 1440**, breakpoints
  fire in order, both swapped images render. Re-run the same viewport sweep on the
  built React page and confirm: hero stack fans correctly (corgi lead), the rabbit
  photo→painting pair renders, FAQ/closing band read correctly, and the ~860 hero
  breakpoint removes the 760–820 cramping. PDFs untouched → byte-identical (no
  re-render needed).

## Risk

Low. Presentation-only markup + four token-only CSS blocks on the public static
landing. The two things to watch: keep the image `src`s pointed at the committed
`public/samples/` copies (not the gitignored mockup paths), and confirm the page
stays `○` Static (no accidental dynamic API/data call pulled in).
