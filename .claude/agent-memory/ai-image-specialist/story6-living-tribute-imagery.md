---
name: story6-living-tribute-imagery
description: Story 6 imagery is Story 1's shape (reference + 7 reference-anchored brief-driven scenes, 8 total, all images.edit, no wash); Approach A held across 7 pages
metadata:
  type: project
---

Story 6 ("While You're Still Here") imagery = **Story 1's reference-anchored shape**, NOT the letters' 2-image shape. The divergence from Story 2/4/5: a locked reference illustration + **7 brief-driven scenes** (cover, page-1 dedication portrait, pages 2-6), **ALL via `images.edit`** (`useReference: true` on every slot) — `images.generate` is NEVER called (no figure-free wash). `totalImages = slots + 1 = 8` (the +1 is the separate `reference.png` anchor, gated to the reference-anchor products story-1 + story-6).

**Why:** the pet is alive and shown on every page; the living tribute is a narrative book, so it mirrors `generateAllIllustrations`' Story-1 body (reference first, then scenes anchored on `[photo, reference]` through the bounded worker pool + withRetry). `buildStory6SlotPrompts` is brief-driven (mirrors `lib/ai/prompts.ts`, not the slot builders) — each prompt = the resolved page's `illustrationBrief` (single-sourced from `resolveStory6`) + the shared "same animal as the reference" consistency clause.

**Pet-consistency verdict (live Low run, PR-25, ~$0.05, 8 imgs in ~107s, canonical Jack Russell):** **Approach A held cleanly across all 7 scenes** — same animal recognizable on every page (white JRT body, brown/grey forehead-and-muzzle patch, asymmetric brown ears, amber eyes, brown nose). The grey/silver senior muzzle was honored and HONEST — never elegiac/clinical. The `love`-layout pages 5/6 correctly show the dog **awake, eyes-open, content** (not the eyes-closed memorial rest). People rendered from-behind/3-4 per the style guide. **No Approach B / `input_fidelity` escalation needed** — this was the heaviest consistency test since feature 07 and A passed.

**How to apply:** the in-reserve levers (Approach B accumulating refs / `input_fidelity: "high"`) stay available if a future drift-prone pet needs them on the 7-page set, but the default A + Low is the verified baseline. Re-run with unchanged session = $0 cache hit (reference uses photo-only refHash; all 7 scenes share the `[photo, reference]` refHash). See [[api-surface-and-cost-tiers]], [[story4-both-reference-anchored]].
