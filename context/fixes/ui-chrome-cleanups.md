# Fix: Minor UI/chrome cleanups (favicon multi-size `.ico` + download-meta size string)

> Pays down two **low**-severity presentation rows (`context/debt.md`):
> *"Favicon ships a single tuned SVG, no multi-size `.ico`"* and *"Download-meta
> hardcoded size string"*. Both are chrome/presentation, no logic or data change. Tier-3.
> Bundled as one small PR; the two halves are independent — split if either grows.

---

## Part A — Favicon multi-size `.ico` (the real item)

### Problem
The heart-book logo PR shipped one favicon-tuned `app/icon.svg` (with a
`prefers-color-scheme: dark` block) and no `.ico`. The 004 mockup flagged the **16px** as
near its legibility floor and recommended a true multi-size `.ico` (16 / 32 / 48, each a
tuned drawing). Browsers also probe `/favicon.ico` → a harmless 404.

### Decision
Add a tuned multi-size `app/favicon.ico` (16/32/48) so small-tab rendering is crisp and
the `/favicon.ico` probe stops 404-ing. Keep `app/icon.svg` as the primary
(high-DPI/scalable) icon — Next.js serves both from `app/`.

### Notes / constraints
- The 16px drawing should be simplified vs. the 32/48 (the heart-book detail is what
  reads "mushy" at 16px) — this is a **design** step. Consider routing the glyph through
  the `designer` agent to produce the three tuned sizes before generating the `.ico`,
  rather than naively downscaling `icon.svg`.
- No app code change beyond adding the asset; verify Next.js App Router picks up
  `app/favicon.ico` automatically (it does — `favicon.ico` in `app/` is a supported
  metadata file convention).
- The brand guard / `HeartBookMark` component is untouched (this is the *favicon*, not
  the in-page glyph).

---

## Part B — Download-meta hardcoded size string (optional, no current defect)

### Problem
`components/preview/BookPreview.tsx:504` and `:507` hardcode **"8.5 × 11 inches"** in the
download caption. This is **correct for every current product** — so it is not a live bug,
only a latent landmine for the day an 8×8 / A4 / 5×7 size toggle ships (see the separate
"Alternate print sizes" debt row).

### Decision (optional — include only if touching this file anyway)
Derive the printed-size string from the product/registry rather than hardcoding it, so a
future non-Letter title can't silently mislabel its download. If the registry has no size
field yet, this is a no-op today and arguably better deferred until alternate sizes exist
— in which case **drop Part B from this PR** and leave the debt row.

### If implemented
- Add the size string to the product/registry (or a small `PRINT_SIZE` lookup keyed by
  `storyType`), default "8.5 × 11 inches · Letter".
- Replace both hardcoded strings in `BookPreview.tsx` with the derived value.

---

## Verification

- `npm run build` passes; `npm run test:run` unaffected (no logic change).
- Favicon: load the app, check the browser tab at small scale; confirm
  `/favicon.ico` returns 200 (no 404 in the network panel).
- Download-meta (if done): the preview download caption still reads "8.5 × 11 inches ·
  Letter" for current products (byte-identical user-visible string).
- PDFs byte-identical (neither part touches the PDF pipeline).

## Out of scope

- The actual alternate-size feature (8×8 / A4 / 5×7) — its own debt row / future feature.
- Any change to the in-page `HeartBookMark` logo glyph.
