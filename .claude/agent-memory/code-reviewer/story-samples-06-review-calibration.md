---
name: story-samples-06-review-calibration
description: Story 6 senior-cat sample PR + folded-in shared-renderer fix (dedication/love pages dropped 3 of 7 Story-6 illustrations) — clean PASS
metadata:
  type: project
---

`feature/story-samples-06` — Story 6 ("While You're Still Here") senior-cat living-tribute sample set, PLUS a PM-approved shared-renderer fix folded in. Verdict: **PASS**, no blockers.

**The risky part = a shared-renderer (`lib/pdf/pages.tsx`) change, not just sample data.** Story 6 reuses Story 1's `dedication`/`love` layouts, but unlike Story 1 its `tribute-page-1` (dedication) and BOTH `tribute-page-5`/`tribute-page-6` (love) ARE illustration slots — they were silently dropped from the PDF (generated + shown in gallery, never reached print/preview). Fix: two page-id allow-lists `DEDICATION_ART_PAGE_IDS = ["tribute-page-1"]` + `LOVE_ART_PAGE_IDS = ["tribute-page-5","tribute-page-6"]`, gated `includes(page.id) && Boolean(src)`, src now threaded through `renderPage` dispatch to `DedicationPage`/`LovePage`. This is the **exact PR-04 `LETTER_FEATURE_PAGE_IDS` pattern** (see [[story-samples-04-review-calibration]]) — the validated way to add art to a shared layout without breaking byte-identity.

**Byte-identity verified safe (the headline check):**
- Story 1's `page-1`/`page-10` are NOT in either allow-list → `showArt` false → render exactly as before (ornament / text-only). `template.test.tsx:178` ("page-10 ignores a manifest src") STILL PASSES — that's the direct byte-identity lock and it's green.
- The two allow-lists are disjoint; `tribute-page-*` ids are owned exclusively by Story 6 (the shared `lib/story/master-text.ts` `Story6PageId` union; distinct `tribute-` prefix, no collision with any other product). No cross-leak.
- New `.dedication__art`/`.love__art` CSS added to BOTH `lib/pdf/styles.css` (print) + `app/globals.css` (screen, incl. `.preview-page` true-scale pin). The full stylesheet is inlined into every product's `<head>` (template.tsx:85 strips comments then inlines all), so unused rules DO grow the inlined `<style>` text for Story 1 — but this is the accepted PR-04 precedent: byte-identity is about RENDERED output (markup/layout tags, which the structural tests pin), and unused CSS rules don't change rendering. Don't flag added-but-unused shared CSS as a byte-identity break.
- `template.test.tsx` + `.story2` + `.story4` + new `.story6` = 115 tests green; full suite 1969.

**New `template.story6.test.tsx` is solid:** locks all 7 slots emit `<img>` (imgCount===7, no placeholder ellipse), src-absent → ornament/no-img on each gated page, no leak between page-5/page-6, structure (8 sections). `alt={page.illustrationBrief}` matches the file's existing pattern.

**Story 6 generation IS wired (NOT the Story-9 trap):** `generate.ts:485` has a real `story-6` dispatch branch → `generateStory6Illustrations`; `manifestToImageMap` admits the 7 `tribute-*` slots (generate.story6.test.ts). So the committed `preview.pdf` legitimately embeds the 7 illustrations (14 image XObjects incl. SMask/alpha layers) — unlike Story 9 which has no dispatch branch (debt-logged).

**Sample data validated as correct (PR-02/04/05 pattern):**
- `fixtures/sample-story6-cat.json` ("Hazel," senior cat, grizzled muzzle) — deliberately distinct from the Story-2 cat; all required Story-6 memory fields present; photo `uploads/sample-photos/cat-senior.jpg` (tracked); living/present-tense so no "died" needed. Resolves clean.
- `products.ts`: `sampleImages` 2→7 (cover + page-1..6) + `previewPdf` added — matches catalog pattern.
- `products.test.ts`: WITH_PREVIEW map +story-6 entry, dedicated assertion, sampleImages pinned to the exact 7 + length 7. Mirrors story-1/2/4/5.
