---
name: story-samples-07-review-calibration
description: feature story-samples-07 — Story-7 closing cover-fallback shared-template fix; clean PASS, byte-identity holds via allow-list gate
metadata:
  type: feedback
---

Story-samples-07 (bird Welcome Home sample + closing-page cover-fallback fix). Clean PASS.

The shared-template fix (`lib/pdf/pages.tsx` `ClosingPage`): closing pages reuse the COVER
image circled when they have no own `src`, gated by `CLOSING_COVER_FALLBACK_PAGE_IDS =
["welcome-closing"]` — same allow-list pattern as DEDICATION_ART_PAGE_IDS / LOVE_ART_PAGE_IDS
/ LETTER_FEATURE_PAGE_IDS. **Why byte-identity holds:** `useCoverFallback = !src &&
allowlist.includes(page.id) && Boolean(coverSrc)`. Story 1 closing `page-12` has own src →
branch 1. Story 8 `adventure-closing` / Story 9 `baby-page-8` NOT in allow-list → false →
identical placeholder branch. `coverSrc` is computed-but-unused for them (inert). Confirmed by
all 5 `lib/pdf/template*` tests green (56) incl. the byte-identity locks + full suite 1976.

**Refuted / validated-as-fine concerns (don't re-flag):**
- `coverSrc = story.find(layout === "cover")` — exactly ONE `cover` mapping per story
  (verified via grep). Letter stories (2/5) use `letter-cover` layout AND `letter` closing
  layout, so `coverPage` is undefined there but their closing is never a `closing` layout →
  coverSrc unused → graceful, no crash. Missing-cover degrades to placeholder.
- `rgba(168, 129, 71, 0.4)` box-shadow literal (= `--gold` #A88147) is NOT a token violation:
  the EXISTING `.closing__art` base block already uses `rgba(168,129,71,...)` literals (lines
  713/724) — plain CSS can't put alpha on a `var()` without color-mix; matches local precedent.
- CSS specificity at preview scale: `.preview-page .closing__art--circle` (0,2,0) ties the
  base `.preview-page .closing__art` (0,2,0) and wins by source order (comes later). Correct.
- `alt={page.illustrationBrief}` on the reused cover img = closing page's brief on cover image:
  contextually fine (brief asks "rhyme with cover"), not a bug.

Only non-code note = stale `context/debt.md` row 27 still lists Story-7 samples as placeholders
(cleared by `/feature complete`, not a code blocker).
