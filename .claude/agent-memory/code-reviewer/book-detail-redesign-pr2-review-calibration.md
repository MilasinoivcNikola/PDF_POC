---
name: book-detail-redesign-pr2-review-calibration
description: Book-detail PR-2 BookGallery client island (single-image carousel + lightbox) — clean PASS; refuted concerns + the load-bearing checks
metadata:
  type: feedback
---

Feature 49 / book-detail redesign PR-2 (`feature/book-detail-redesign-pr2-gallery`): replaced the
flat `sampleImages` grid on the detail page with a `components/site/BookGallery.tsx` client island
(single featured image + on-image arrows + lightbox carousel + thumb strip). Presentation-only,
no commerce/server/engine touch. Verdict: clean PASS.

**Why / what was load-bearing to verify (so don't re-flag next time):**
- **SSG preserved.** Detail page has `generateStaticParams`, no `force-dynamic`. A `"use client"`
  leaf island does NOT make the route dynamic — it renders into static HTML. The page is in
  `surface.boundary.test.ts` PUBLIC_ENTRIES, so the closure walk auto-covers BookGallery for
  engine/server-only leaks. Don't demand extra boundary wiring.
- **Pure helpers split out** into `galleryCaption.ts` (`wrapIndex`, `captionForImage`) with their
  own test — matches the codebase "test pure utils not the React tree" discipline. `wrapIndex`
  uses `((n%total)+total)%total` with a `total<=0 → 0` guard; correct for all wrap cases incl.
  2-image and empty.
- **Tokens all exist** in globals.css (gold-soft/rose-soft/sage-soft/rose-faint/cream-deep/
  border-soft/paper/gold/rose/ink-soft). `--gold-faint` correctly does NOT exist and the CSS
  comment documents using `--gold-soft` instead — not a missing-token bug.
- **Old gallery CSS + PawMark fully removed** from page.module.css and page.tsx; grep for
  `styles.gallery*` in page.tsx returns nothing. No orphaned styles.
- **Focus trap is complete** for every count: single-image (only Close focusable) and multi-image
  (Close→prev→thumbs→next) both cycle correctly; initial focus moves to the `tabIndex={-1}` dialog
  via a second effect; keydown listener + body-overflow lock both cleaned up in the effect return
  (no leak); focus restored to `triggerRef` on close.

**Refuted / non-issues (don't raise):**
- `captionForImage("letter-page-5.jpg", 1)` → "Page 5" (Story 2's 2nd image): reads the real slot
  stem, not a sequential count. Looks odd but matches the asset name and is intentional. The test's
  describe label ("falls back to Illustration") is mislabeled but the assertion is correct.
- `index` persists across lightbox close/reopen — intended (featured index carries through), not a
  stale-state bug; `current`/`caption` are always re-derived from the wrapped `index`.
- Raw `<img>` (no next/image): matches existing `app/(public)/books/page.tsx` precedent.
