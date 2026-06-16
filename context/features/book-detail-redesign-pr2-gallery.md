# Book-Detail Redesign — PR-2: Gallery (single-image carousel lightbox)

> **Part 2 of 3.** Visible improvement, self-contained. Replaces the detail page's
> current flat sample grid with a single-image viewer that opens into a one-at-a-time
> carousel lightbox. **Independent of PR-1 and PR-3** — touches only the gallery region
> of `books/[productId]/page.tsx` and uses the `sampleImages` that already exist. Can
> merge in any order relative to PR-1; coordinates with PR-3 only as a same-file rebase.
>
> Design source: `context/prototypes/002-book-detail-gallery-questions/` —
> `index.html` (13 images), `variant-living.html` (8), `variant-sparse.html` (2), and
> the gallery CSS in its `styles.css`.

## Problem

The current gallery (`app/(public)/books/[productId]/page.tsx`, the `styles.gallery`
block) renders **all** `sampleImages` at once as a grid. It looks cluttered for
image-heavy titles (Story 1 = 13, Story 8 = 10, Story 7 = 8) and sparse for the 2-image
letters. The PM wants a **single-image** experience: see one illustration at a time,
click to enlarge, arrow through the rest.

## Goal

A `<BookGallery>` client component that:

1. **On the page** shows ONE large featured illustration (the cover/first sample by
   default), with prev/next arrows on the image, an image counter (`1 / 13`), a
   floating page tag, and a "View all N illustrations" trigger. Arrows step through the
   set in place.
2. **In a lightbox overlay** (opened by clicking the featured image or "View all"):
   the selected image large, **left/right arrows + counter** (`4 / 13`) to move through
   the entire set one at a time, a "← → to browse · Esc to close" hint, a close button,
   backdrop-click-to-close, and keyboard nav (←/→/Esc). An optional thin quick-jump
   thumbnail strip along the bottom is acceptable (it's in the prototype) but the core
   interaction is one-image-at-a-time, **not** a contact-sheet grid.
3. **Degrades** across all counts: 13 / 10 / 8 (image-heavy), and the 2-image pair
   (a 2-stop cover→interior carousel — arrows still apply). Single-image titles hide
   the arrows. The existing **paw-mark placeholder** fallback (Story 8/9 had none,
   though all 8 now ship samples) is preserved for any sample-less title.

## Scope

### New client component — `components/site/BookGallery.tsx` (`"use client"`)

- Props: the `sampleImages: string[]`, the resolved `title` (for alt text), and the
  `audience` (`"living" | "loss"`) to carry the gold/rose accent the prototype uses.
- Owns the featured-index state, the lightbox open/close state, keyboard listeners
  (mount/unmount cleanup), and focus handling (trap focus in the open lightbox, restore
  on close, `aria-modal`, labelled controls — it's an overlay, do it accessibly).
- Renders the page-level featured viewer; portals/renders the overlay when open.
- Keep `"use client"` at this leaf only — the page stays a Server Component and passes
  plain props (coding-standards: push interactivity down to the leaf).

### Page wiring — `app/(public)/books/[productId]/page.tsx`

- Replace the inline `styles.gallery` block (lines ~86–118) with
  `<BookGallery sampleImages={product.sampleImages} title={title} audience={product.audience} />`.
- The `PawMark` placeholder logic moves into `BookGallery` (it owns the empty-samples
  case now). Remove the now-unused `PawMark`/placeholder markup from the page.
- Everything else on the page (info column, facts, CTA, PDF link, companion callout)
  is **untouched**.

### Styles

- Port the gallery + lightbox CSS from the prototype's `styles.css` into the page's
  CSS module (`page.module.css`) or a co-located module for the component, reusing the
  existing design tokens (no hardcoded hexes that already have tokens — coding-standards).
- Keep the audience accent convention (gold living / rose loss) on the viewer chrome.

## Constraints

- Page tier must stay **`●` SSG** (static prerender). `BookGallery` is a client island
  inside the static page — that's fine and standard; verify the route still prerenders
  (no server-only imports leak in).
- The page remains in the **public** route group — boundary test must stay green
  (`BookGallery` imports nothing engine-side; it's pure presentation).
- Image paths are the existing `/samples/<productId>/...` public assets — no asset work
  here (that was PR-1 for the source photo; sample illustrations already exist).

## Tests / QA

- Unit-test any pure helper the component factors out (e.g. index clamping / wrap-around
  `next`/`prev`), per coding-standards (test pure utilities, not the React rendering).
- **qa-verifier (Playwright)** on the running app — this is an interactive, user-facing
  change, so verify in a real browser:
  - the featured image renders and the on-image arrows cycle the set;
  - clicking opens the lightbox at the right image;
  - ←/→ and the overlay arrows move one image at a time with a correct counter;
  - Esc / close button / backdrop click all close and restore focus;
  - the 2-image (Story 5), 8-image (Story 7), and 13-image (Story 1) cases all behave;
  - a sample-less case (force-test) shows the paw placeholder, no broken image.
- `npm run test:run` + `npm run build` pass; route still `●` SSG.

## Out of scope

- The questions / example / source-photo section — **PR-3**.
- Any catalog/data change — done in **PR-1**.

## Acceptance

- The detail page shows a single featured illustration with working prev/next + a
  lightbox carousel, verified across the 2 / 8 / 13-image titles.
- Keyboard + focus accessibility works (←/→/Esc, focus trap/restore).
- Route stays static; boundary test green; build + tests pass.
