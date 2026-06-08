# Current Feature

Fix: Preview ↔ PDF image parity (landscape crop + Page 7 art size)

## Status

In Progress

## Goals

Two confirmed defects found on `/create/preview` and in the downloaded PDF
(reproduced live with the cached Otis fixture `b41b8df0`):

1. **PDF crops landscape illustrations far more than the preview.** Source
   images are square (1024×1024) rendered with `object-fit: cover`, but the two
   render targets disagree on slot aspect ratio:
   - Screen `.story-art--landscape`: 460×345 = **4:3** → shows ~75% of the square
   - Print `.story-art--landscape`: 7.0in × 3.2in = **2.19:1** → shows only ~46%
     (a wide letterbox strip; the pet's body gets cut off)

   **Fix:** make the print landscape slot a centered **4:3** box — keep
   `height: 3.2in`, set `width: 4.27in; margin: 0 auto`, add `aspect-ratio: 4/3`.
   Keeping height at 3.2in adds **zero page height** (no clipping / no 15th page).
   PDF then crops identically to the preview. Screen CSS already 4:3 — add the
   matching `aspect-ratio` so the two can't silently drift again.

2. **Page 7 (the "gentle truth" / `TruthPage`) art is ~⅓ the size of the others.**
   It uses a bespoke small slot (`.story-page--truth .story-art` = 3.5×2.2in
   print / 200×133 screen) inherited from the prototype.

   **Fix:** enlarge page 7's art to the same landscape slot the other narrative
   pages use (it then inherits the 4:3 fix above). **Keep page 7's centered,
   vertically-centered "quiet" death-page text treatment** — only the image
   grows. Page 7's body is short, so the ~1in taller image has ample room.

Both changes must be **mirrored across print (`lib/pdf/styles.css`) and screen
(`app/globals.css`)** so the shared template renders identically in both targets.

3. **Follow-up — preview image proportion didn't match the PDF.** After fix (1),
   the print landscape art is a centered 4.27in box (≈61% of the 7in content),
   but the screen art was still full-column-width (`width: 100%`) — so the
   preview showed the illustrations larger (relative to the page) than the PDF.
   **Fix:** set screen `.story-art--landscape` to `width: 61%` centered
   (mirrors the print 4.27in/7in fraction; a % so it holds across the responsive
   padding), keeping `aspect-ratio: 4/3`. Preview now shows art at the same
   proportion of the page as the printed book (screen ~53% of page vs print
   ~50%; 61% of the content area in both). Screen-only change; PDF unchanged.

4. **Follow-up 2 — preview is not a true scale-model of the PDF (font/page off).**
   Root cause: the body text is the SAME 16.8px in both targets (`1.05rem`,
   `html{font-size:16px}` in both), but the preview page is only ~65% of the
   print page (532px vs 816px), so on the smaller preview the text reads ~1.5×
   larger relative to the page. Matching the image (3) exposed it. Per-element
   font patching would just move the mismatch to the next element.

   **Fix (PM chose "true-scale preview"):** make each preview `.story-page` a
   uniformly-scaled miniature of the printed page — render it at the PDF's real
   geometry (8.5×11in, 0.75in padding, the print font/spacing values) and scale
   the whole page down by ONE factor to fit its spread column, so text, image,
   padding and spacing all match the PDF automatically and permanently. The
   `renderPage` book content is already a separate sibling from the
   `.preview-page__controls`/`__editor` chrome, so the page scales while the
   edit/regenerate controls stay full-size and usable. Screen-only; PDF unchanged.

5. **Follow-up 3 — larger illustrations + page-7 top spacing (PM request).**
   (a) Bumped `.story-art--landscape` from 4.27×3.2in to **6.27×5.2in** (≈6:5,
   ~74% of page width) in BOTH print + preview. (b) `.story-page--truth` changed
   `justify-content: center` → `flex-start` in both, so page 7's illustration
   starts at the **same top spacing** as the narrative pages (text still centered).
   **Height-safety verified** (the 5.2in image is +2in vs before): rendered the
   real Otis book AND a worst-case variant (age 9-12 + euthanasia + other-pets,
   the max-paragraph case) — **no text clipping, exactly 14 pages** in both. On
   the single most text-heavy page (page-11) of the extreme variant the flex
   layout shrinks the image to ~4.56in to preserve the text (content-safe trade);
   the real book renders every image at a uniform 5.2in.

## Notes

- **Craft Area 1 — `pdf-render-specialist`.** Touches `lib/pdf/styles.css`
  (print), `app/globals.css` (screen mirror), and possibly
  `lib/pdf/pages.tsx` (`TruthPage` art class) — markup change only if a class
  swap is cleaner than a CSS-selector override; prefer not forking page markup.
- Hard constraints (unchanged from the typography pass): **exactly 14 Letter
  pages**, no surviving `{placeholder}`/`__FONT_*__` tokens, the "died" rule,
  and **screen↔PDF parity** (every new/changed selector must exist in both
  stylesheets; tokens single-sourced via `var()`, no hardcoded hex).
- No story copy, no merge/variant logic, no generation-pipeline change.
- **QA at $0**: reuse the ready cached Otis fixture `b41b8df0` (re-render is a
  free cache hit) — never a fresh Medium book. Compare preview vs downloaded
  PDF on page-5 (sleeping dog, the clearest crop case) and page-7.
