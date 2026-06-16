# 002 — Book detail: scalable gallery + "Questions you'll answer" + worked example

> **Revision (2026-06-16b):** the worked-example panel now shows the **real uploaded
> source photo** each sample book was painted from — see *"Source-photo revision"* below.
> Applied to all three variants.

> **Revision (2026-06-16):** the gallery was redesigned per PM review — see
> *"Gallery revision"* below. The PM also locked: show the **full** questionnaire (not a
> condensed gist), use **neutral** framing on the example panel ("The example we used" /
> "The answers behind the sample" — no pet-named "Bo's book"), and confirmed the
> **lightbox overlay** for "view all". Those are applied across all three variants.

## What this iteration tries

Redesigns the public **book-detail** page (`app/(public)/books/[productId]/page.tsx`)
to fix three things the current page (and iteration 001's flat 2-column gallery) doesn't
handle:

1. **A single-image gallery that scales from 2 to 13 images** (see *Gallery revision*
   below for the current design). The shopper sees **one illustration at a time, large**,
   and steps through the set with prev/next arrows — both on the page and, blown up, in a
   carousel lightbox. The placeholder-paw fallback is preserved for any sample-less case
   (`.gallery__stage.ph`).

2. **A "Questions you'll answer" section.** A full-width band below the hero that lists
   the title's *actual* create-wizard questionnaire, **grouped** (Your pet / The story /
   Tone & options), with **required vs optional** marked two ways (a rose vs faint dot +
   a small mono tag) and a legend. **Conditional reveals are called out inline** as
   italic notes (e.g. Story 7's "choosing *anniversary* reveals one more question:
   *how many years home*"). This makes "a few gentle questions and a photo" concrete and
   lets a shopper prepare before buying.

3. **A worked example** — a sticky side panel pairing each question with the **exact
   fixture answer** used to generate that title's sample PDF, including a thumbnail of the
   input photo. Shows what good, short answers look like and ties the abstract
   questionnaire to the concrete sample gallery above it. **Neutrally framed** per the PM:
   the panel is headed "The example we used" / "The answers behind the sample" (never
   "Bo's book") — important in a grief context where naming a stranger's pet could read
   slightly off.

## Gallery revision (the main change in this pass)

The PM did **not** want an all-at-once view (the old lead + thumbnail-strip + grid
lightbox). The gallery is now a **single-image viewer that opens into a carousel
lightbox** — one image per view throughout, never a contact sheet:

- **On the page:** one large featured image (the cover by default), with **prev/next
  arrows on the image itself**, a **counter** ("1 / 13"), a floating "cover / page N" tag,
  and a "View all N illustrations" trigger below. The arrows step through the whole set
  **in place**, without opening anything.
- **Clicking the featured image** (or "View all") opens the **lightbox overlay**: the same
  one image, large, with **left/right arrow controls + a counter** ("4 / 13"), a
  "← → to browse · Esc to close" hint, and a Close button. A thin **quick-jump thumb
  strip** runs along the bottom (optional convenience — the core interaction is
  one-at-a-time arrows, not the strip).
- **Keyboard:** ← / → navigate, Esc closes (live in the mockup). Clicking the dim backdrop
  also closes.
- **Scales across all three cases.** 13-image (Story 1, `index.html`), 8-image living
  (Story 7, `variant-living.html`), and the 2-image pair (Story 5, `variant-sparse.html`)
  all use the identical viewer — the 2-image case just has a 2-stop carousel
  (cover → interior). Arrows self-hide if a title ever had a single image. Sparse covers
  render `object-fit: contain` so the un-cropped pair reads intentionally.
- **Audience accents kept:** rose (loss) vs gold (living) on the stage gradient, arrow
  hover, "view all" hover, and the lightbox's active thumb + hint colour.

The interaction is driven by a small **inline vanilla script** per file (each page
declares its image set in an inline `application/json` block; the script wires the
on-page viewer + the lightbox off one shared index). **In React this becomes one small
`"use client"` `<BookGallery images={...} />` component** (state for the active index,
arrow/keyboard handlers, a focus trap) — flagged for the `nextjs-ui-builder`, not shipped
here. The on-disk `/samples/{productId}/...` paths are the real ones so it looks true.

## Source-photo revision (2026-06-16b)

The worked-example panel's photo slot previously showed the sample book's painted
**cover** (an illustration). It now shows the **actual input photo** the customer-equivalent
fixture uploaded — so the panel reads literally as *"this photo → this book,"* pairing the
raw snapshot with the painted gallery above it. This is the single most concrete way to show
a shopper what we do with their photo.

- **New treatment** (`.example__source` / `.example__polaroid`): a small **polaroid-style
  snapshot** — paper border, a faint −2.5° tilt that straightens on hover, soft drop shadow,
  a mono "The original" label under the image. It deliberately reads as a *real uploaded
  photo*, visually distinct from the painted sample illustrations (which are flat, framed,
  full-bleed). Headed **"The photo we started from."** Gold-accented label on the living
  variant (`.example--gold`), rose-neutral elsewhere — consistent with the audience accents.
- **Per-variant real photos wired in** (verified to load in headless Chrome at full natural
  resolution):
  - `index.html` — Story 1 / Bo the boxer → `../../../uploads/high-run-candidates/test-image.jpg` (853×1280)
  - `variant-living.html` — Story 7 / Kiwi the cockatiel → `../../../uploads/sample-photos/bird.jpg` (1024×1536)
  - `variant-sparse.html` — Story 5 / Biscuit the senior dog → `../../../uploads/sample-photos/dog-senior.jpg` (1024×1035)
- **Path note:** the relative prefix is `../../../` (three levels up — the folder sits at
  `context/prototypes/002-…/`), not the four levels the brief sketched. Verified resolving on
  disk and rendering in-browser.

### ⚠️ Open implementation note for the React build (do NOT act on in the mockup)

These source photos currently live under **`uploads/`** — `uploads/sample-photos/*` (tracked
via a `.gitignore` negation) and the Story-1 photo under `uploads/high-run-candidates/`. **`uploads/`
is NOT web-served** (only `public/` is served by Next.js), so the real
`app/(public)/books/[productId]/page.tsx` **cannot reference `uploads/` paths** — they'd 404
in production. The build will need to:

1. **Copy each title's source photo into `public/samples/{productId}/source-photo.jpg`**
   (alongside the existing generated samples + `preview.pdf`), then reference *that* path from
   the detail page — the same pattern the gallery images and `previewPdf?` already use.
2. Add the copy step to the **sample-capture harness** (`scripts/sample-capture.ts`) so each
   new title's source photo is emitted as a web asset reproducibly, and surface the path on the
   client-safe `Product` contract (e.g. an optional `sourcePhoto?: string`, mirroring
   `previewPdf?`) so it stays pure/engine-free.
3. The full per-title source-photo mapping the build should use:
   Story 1 → `uploads/high-run-candidates/test-image.jpg`; Story 2 → `sample-photos/cat.jpg`;
   Story 4 → `sample-photos/other.jpg`; Story 5 → `sample-photos/dog-senior.jpg`;
   Story 6 → `sample-photos/cat-senior.jpg`; Story 7 → `sample-photos/bird.jpg`;
   Story 8 → `sample-photos/dog-corgi.jpg`; Story 9 → `sample-photos/rabbit.jpg`.

## Three variants (open each)

- **`index.html`** — Story 1 "Saying Goodbye", **13 images, rose/loss accent**. The
  image-heavy stress case: single-image viewer ("1 / 13" + arrows) → carousel lightbox
  through all 13. Full questions + neutral example.
- **`variant-living.html`** — Story 7 "Welcome Home", **8 images, gold/living accent**.
  Proves the gold audience tint across the gallery viewer/lightbox, CTA (`.btn--gold`),
  eyebrow, tagline, and the conditional-reveal hint. Full questions + neutral example.
- **`variant-sparse.html`** — Story 5 "A Letter to Your Pet", **2 images, rose**. The
  2-stop carousel (cover → interior) + the **Story 2↔5 companion callout** kept intact.
  Lighter questionnaire + neutral example.

A fixed bottom pill switches between the three (mockup-only chrome — not part of the page).

## Design decisions / trade-offs

- **Kept everything that works** from the current page: eyebrow, display title, tagline,
  description, the price / illustration-count / 24–48h facts list, primary "Order this
  book" CTA, "See the full book (PDF)" ghost link, and the companion callout — all
  restyled, not replaced.
- **Stays on-brand.** Reuses existing tokens + classes (`.label`, `.btn`, `.display-md`,
  `.facts`, `.companion`, `.footer-rich`, Fraunces/Lora/JetBrains Mono, gold=living /
  rose=loss). New CSS is scoped to genuinely new patterns: the gallery viewer
  (`.gallery__stage/__nav/__count/__viewall`), the carousel lightbox
  (`.lightbox__stage/__figure/__nav/__strip/__dot`), the `.prep`/`.qgroup`/`.qitem`
  question list, and the `.example` panel.
- **The gallery interaction is real inline JS** (so the click → big image → arrow-through
  actually works on double-click) — not CSS `:target` any more, because a true one-at-a-time
  carousel with a live counter needs state. In React this is one small `"use client"`
  `<BookGallery>` component (active-index state, arrow/keyboard handlers, focus trap) —
  flagged for the builder.
- **Per-title question + example data is page-local content** in the mockup, not in the
  pure `lib/catalog/products.ts` (which must stay client-safe and engine-free). **Locked
  by the PM:** this lives in a curated **client-safe content map keyed by `productId`**,
  with example answers **pinned to the fixtures** — so the mockup's data shape already
  matches what ships.

## Locked PM decisions applied in this pass

1. **Full questionnaire shown** (not a condensed gist) — the complete grouped list is kept.
2. **Neutral example framing** — "The example we used" / "The answers behind the sample";
   no pet-named heading on any variant.
3. **Lightbox overlay confirmed** for "view all" — now a one-image-at-a-time carousel.
4. **Gallery redesigned** to a single-image viewer + carousel lightbox (this pass).
5. **Data source locked** — curated client-safe content map keyed by `productId`, example
   answers pinned to fixtures (no visual change; the mockup assumes this shape).

## Open questions for the PM

1. **Where does the question content map live in code** — a new file in the public page
   layer, or derived from a shared wizard-field schema so the detail page and the create
   wizard can't drift? (Deriving is more work but removes the drift risk.) This is the
   one remaining "how to build it" call before a spec.
2. **Quick-jump thumb strip in the lightbox — keep or drop?** It's a convenience on the
   13-image title but adds chrome; the core arrow-through works without it. Easy to remove
   if you want the lightbox even more minimal.
3. **Sparse covers render `contain` (un-cropped) in the gallery stage** so the 2-image
   pair reads intentionally; the image-heavy titles render `cover` (filled). Confirm that
   mixed treatment is acceptable, or standardize on one.
