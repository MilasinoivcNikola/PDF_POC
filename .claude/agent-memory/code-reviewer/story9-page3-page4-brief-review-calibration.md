---
name: story9-page3-page4-brief-review-calibration
description: fix/story9-page3-and-page4-brief — illustrationBrief is single-sourced through resolveStory9 into the AI prompt path, so a variant-layer setBrief actually reaches generation; clean PASS
metadata:
  type: project
---

Two-fix Story-9 text/brief PR (`fix/story9-page3-and-page4-brief`), clean PASS.

**Load-bearing cross-file fact (the thing that makes Fix B correct, not cosmetic):**
`lib/ai/story9-prompts.ts` `buildScenePromptFromPage()` reads `page.illustrationBrief`
*directly from `resolveStory9(session)`* — i.e. the variant-composed-then-merged story.
So a `setBrief()` applied inside `composeVariants9` **flows into the actual AI prompt**
(verified: `baby-page-4` is in `STORY_9_SCENE_PAGE_IDS`). This is the single-source that
keeps art and text from drifting. **Why it matters for review:** when a Story-9 (or any
narrative story that mirrors this shape — story1/6 prompt builders do the same) variant
fix touches `illustrationBrief`, you do NOT need a separate prompt-layer change; testing
the brief at the variant/merge layer transitively covers the prompt layer. Don't flag
"the AI path wasn't updated" — it reads the resolved brief.

**`setBrief` is the right altitude:** it extends the existing `setBody`/`setTitle`/
`setSubtitle` in-place-mutation helper family in `variants.ts` (same `pageIndex` lookup),
and the arrived-brief rewrite is gated by the *same* `if (babyStatus === "arrived")` whole-
page discipline as the body rewrite. Not a special-case bandaid.

**Refuted / non-blocking concerns I checked:**
- Master template (`story-9-master-template.md:160,285,286`) still literally says "settles
  in" while the code now emits "settles down". This is **spec-acknowledged** (the fix doc
  says it honors the master's *verb* intent "settle", and "in"→"down" only fixes the
  double-preposition against the prepositional `{sleepingSpot}` value). Doc-sync of the
  master template is a nice-to-have, NOT a blocker — masterstories are load-on-demand docs.
- No prompt-layer test asserts the *arrived* Page-4 brief (the existing
  `story9-prompts.test.ts` "babyStatus on Pages 4/6" test covers expecting-Page-4 +
  arrived-Page-6, conspicuously skipping arrived-Page-4 — the exact slot that was broken).
  Coverage was added at the variant layer instead. Acceptable given single-sourcing; a
  prompt-layer arrived-Page-4 assertion would be marginally stronger. Nice-to-have only.

**Anti-tautology checks that passed:** fixture `sleepingSpot` = "at the foot of the bed"
(prepositional, exercises the bug); Fix-A guard `not.toContain("settles in at")` would have
caught the old output; expecting-brief byte-identical pin matches `master-text.ts:144` exactly.

Scope clean: no PDF template/pages touch (existing products byte-identical, pdf suite green),
no secrets, no deletions. Full suite 2152 green, tsc --noEmit clean.
