---
name: story7-stray-thankyou-and-yearshome-guard
description: Story 7 (Welcome Home) — two non-obvious merge/variant decisions resolving master-template gaps
metadata:
  type: project
---

Story 7 ("Welcome Home — Gotcha Day") text engine, PR-A (feature 28). Two
master-template gaps were resolved in the variant/merge layer — not obvious from
the template alone:

1. **found-as-stray thank-you line.** The template's variants quick-ref groups
   found-as-stray with shelter/rescue as carrying the "whoever had you before,
   thank you" line, but the verbatim found-as-stray *origin sentence* (Page 3) has
   no thank-you (a stray has no prior owner). The spec's test requires thank-you
   gating on shelter/rescue/found-as-stray, so the stray origin sentence in
   `story7/variants.ts` was extended with "To whoever fed you or kept you safe out
   there before we met — thank you." (Avoid "watched over" near this — the tone
   guard bans the substring "watching over"; "watched over" is technically safe but
   was changed to "kept you safe" to be unambiguous.)

2. **anniversary requires yearsHome.** The Page-7 opener + Page-9 closing
   anniversary reframes consume `{yearsHome}`. The master template says anniversary
   "requires [YEARS_HOME]; falls back / omits when absent." `composeVariants7`
   guards this: occasion=anniversary BUT yearsHome blank → the BODY pages fall back
   to new-arrival wording (so no `{yearsHome}` placeholder ever survives to throw
   MergeError). The cover subtitle ("Happy Gotcha Day") + back-cover prompt reframes
   carry no `{yearsHome}` and always apply. `{yearsHome}` is formatted in
   `story7/merge.ts` with 1-year-singular / N-years-plural agreement.

**Why:** keep the byte-identity/merge invariant (no surviving placeholder, no
spurious MergeError) while honoring the spec's variant-test matrix.
**How to apply:** PR-B (wizard) must collect `yearsHome` only when occasion =
anniversary, and may leave it blank — the engine degrades gracefully. The imagery
agent (next) consumes `WELCOME_SCENE_PAGE_IDS` (8 slots) + `resolveStory7`'s
populated `illustrationBrief` per scene page; `welcome-before` is the figure-free
slot (pet deliberately absent).
