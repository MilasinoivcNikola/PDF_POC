---
name: letter-layout-reuse-renderer-touch
description: A book that reuses Story 2's `letter` layout legitimately edits the shared `lib/pdf/pages-story2.tsx` sibling renderer — so "no shared renderer touched" byte-identity wording goes stale
metadata:
  type: feedback
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
