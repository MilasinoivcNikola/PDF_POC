---
name: child-rendering-copy-review-calibration
description: child-rendering-expectation-copy fix review — copy-only honesty PR (clean PASS); verbatim-string + featuresChild-scoping + byte-identity checks all held
metadata:
  type: feedback
---

The `fix/child-rendering-expectation-copy` PR (2026-06-17): copy-only honesty fix telling
buyers the uploaded photo anchors only the **pet**, and the child in the two child-featuring
titles (`story-1-book`, `story-8-adventure`) is an invented stylized character. Same family
as [[ai-honesty-copy-review-calibration]] and [[species-other-grammar-fix-review-calibration]].
**Clean PASS.**

**The load-bearing checks for a multi-surface copy PR (what to actually verify):**
- **Verbatim-string check beats eyeballing.** Five surfaces (A tagline / B child fields /
  C photo step / D prep note / E operator wizard), seven string instances. Normalize
  whitespace (JSX `{" "}` fragment-splits the sentence across lines) and substring-match each
  PM-approved spec string. All seven matched.
- **Em-dash codepoint check.** Decode the literal char — must be U+2014 (em-dash), not U+2013
  (en) or a hyphen. A find/replace or editor autocorrect silently swaps these. All real U+2014.
- **Scoping = the leakage risk.** The photo-step note is gated by ONE boolean
  `featuresChild = isStory1 || isStory8` used exactly once; non-child titles show nothing. The
  child-FIELD notes are hardcoded inside `Story1Fields`/`Story8Fields` (story-specific
  components) and the two operator wizard pages are themselves story-specific (`child/page.tsx`
  = "Story-1-only step", `adventure/page.tsx` defaults story-8) — so hardcoding there is
  correct, NO flag needed. Don't flag the operator pages for "missing the featuresChild guard."
- **Additive-field client-safety.** `QuestionItem.note?` is purely additive; prep section
  renders it via the SAME `styles.qitemNote` class as the existing `item.reveal` (pattern match,
  not ad-hoc JSX). Boundary test stayed green; book-questions.ts stayed zero-import. The
  example-pinning tests are unaffected (notes aren't examples) — 130 tests (was 129+1).
- **Byte-identity = trivially safe here** because the diff stat touches zero `lib/ai/*`,
  `lib/pdf/*`, prompt, or template files. Confirm via diff-stat, not a PDF re-render.

**The only finding (nice-to-have, not blocking):** 8 untracked QA screenshot PNGs in the repo
root (`check2-*.png` … `check5-*.png`) are NOT gitignored — a `git add -A` would commit them.
Throwaway artifacts; the committer should stage selectively. PM treats this class as cosmetic.

**Out-of-scope discipline held:** Story 8's longer `description` ("your child adventures
alongside them") left untouched per spec (narrative role, accurate); only the tagline line
changed; no "your kid" survives anywhere on the public surface.
