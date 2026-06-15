---
name: letter-layout-reuse-renderer-touch
description: Reusing a shared PDF layout (letter / dedication / love) can still legitimately edit the shared renderer (pages-story2.tsx OR pages.tsx) via a per-story page-id allow-list — so "reuse = Step 3 skipped, no renderer touched" wording goes stale
metadata:
  type: feedback
---

**Generalized pattern (confirmed 3x): "reuse an existing layout" does NOT mean "no shared
renderer edit."** Three layout families have now needed a shared-renderer change on a reuse book
because Story 1/2 baked in an assumption the reusing book breaks:
- **`letter`** (Story 4/5 reuse): sign-off sentinel split in `pages-story2.tsx` →
  `LETTER_SIGNOFFS` list (below).
- **`dedication` + `love`** (Story 6 `feature/story-samples-06`, 2026-06-15): Story 1's
  `dedication`/`love` pages are NEVER illustrated, so `DedicationPage`/`LovePage` in the SHARED
  `lib/pdf/pages.tsx` ignored `src`. Story 6's `tribute-page-1` (dedication portrait) +
  `tribute-page-5/6` (`love` hero scenes) ARE illustration slots → art was silently dropped from
  the PDF/preview. Fix: per-story page-id allow-lists `DEDICATION_ART_PAGE_IDS = ["tribute-page-1"]`
  / `LOVE_ART_PAGE_IDS = ["tribute-page-5","tribute-page-6"]` in `pages.tsx` + net-new
  `.dedication__art`/`.love__art` CSS in BOTH `styles.css` + `globals.css` (parity held) +
  `template.story6.test.tsx`. Byte-identity for Story 1 preserved because its page ids aren't in
  the set and the art only shows when a `src` is present — the **exact `LETTER_FEATURE_PAGE_IDS`
  pattern from PR-04** (see [[masterstory-slot-id-lag]] for the talk-page-4 sibling).

This allow-list-scoped-to-one-product is the **canonical byte-safe way** to teach a shared layout
component to carry art for a new book. Future shared-renderer edits should follow it; no doc
records it as a named convention yet (drift — see below).

---

When a new book reuses Story 2's `letter` / `letter-cover` layout wholesale (playbook Step 3
skipped), it can still **legitimately edit the shared sibling renderer `lib/pdf/pages-story2.tsx`** —
because that renderer splits the Page-6 body at a sign-off **sentinel**, and each product owns its
own sentinel (`LETTER_SIGNOFF = "Yours, always,"` for Story 2, `TALK_SIGNOFF = "Yours,"` for Story
4). Adding a product means generalizing the sentinel from one literal to a list
(`LETTER_SIGNOFFS = [LETTER_SIGNOFF, TALK_SIGNOFF]`, `indexOf` → `findIndex`). This is
byte-preserving for existing books **iff** the new sentinel never appears as a standalone body
paragraph in an existing book before its own full sign-off (true here: Story 2 bodies never contain
a bare `"Yours,"` paragraph).

**Why this matters for drift:** Feature 20's spec/Goals justified byte-identity with the phrase
**"no shared renderer/CSS touched"** — which became literally false once `pages-story2.tsx` was
edited. The *guarantee* (byte-identical Story 1/2 PDFs) still holds and is independently gated by a
render:test normalized-SHA check, but the *stated mechanism* drifts. The right fix is almost always
**update the doc** to "no shared CSS/`renderPage` switch/`PageLayout` touched; the sibling letter
renderer's sign-off detection was generalized in a byte-preserving way," not change the code.

**How to apply:** on any future `letter`-reusing book branch, expect a `pages-story2.tsx` sentinel
edit and check (a) the new sign-off literal is distinct and never a standalone existing-book
paragraph, (b) any doc that says "no shared renderer touched" is corrected. Also: the playbook (Step
3, line ~154) says letter components live in `pages-story2.tsx` but doesn't yet say *editing* it is
in-bounds for a reuse book — a candidate clarification if a third letter-book reuses it. See
[[new-book-playbook-pr10]], [[canonical-doc-map]].
