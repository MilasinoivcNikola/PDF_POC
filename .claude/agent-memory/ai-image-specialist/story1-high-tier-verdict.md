---
name: story1-high-tier-verdict
description: HIGH-tier Story-1 full-book run held pet consistency well (boxer on-model across 13 scenes); HIGH is the visible-quality ceiling and looks markedly cleaner than Low for sample assets
metadata:
  type: project
---

A one-time PAID HIGH-tier Story-1 run (feature `story1-high-sample-preview`,
2026-06-15) generated the full book — 1 reference + 13 scenes at `quality: "high"`,
both `sceneQuality` and `referenceQuality` HIGH — from a real boy-and-boxer photo
(`uploads/high-run-candidates/test-image.jpg`), Approach A, default concurrency 3.

**Verdict — pet consistency held at HIGH.** The distinctive fawn-and-white boxer
(dark mask, white chest blaze, red collar) stayed on-model across all 13 scenes:
calm sitting/porch poses, a sleeping curl, a full running action pose, and the
from-behind embrace all read as the same dog. The mask + blaze + collar are a
strong anchor — a high-contrast, distinctive coat anchors far better than a generic
one. The child (boy in green shirt) stayed consistent as a *stylized* fair/brown-haired
kid, NOT a precise likeness — which is the agreed bar (Story-1 prompts deliberately
draw the child 3/4 or from behind; the locked reference is pet-only).

**Why:** confirms HIGH is safe to use for sample/cover assets where visible quality
matters; it does NOT change the customer-run default (Low stays the default per the
cost rule — see [[api-surface-and-cost-tiers]]). HIGH PNGs land ~2MB each at
1024×1024; downscaled to ~1000px JPG q80 they are ~325–400KB.

**How to apply:** when a future title wants HIGH sample assets, this run is the
template — fresh session id (quality is NOT in the cache key, so a fresh
`./generated/<id>/` is mandatory or it serves cached Low), `generateAllIllustrations`
at HIGH for both tiers, then `manifestToImageMap` → `renderStoryPdf`, then sips
downscale. ~$3 for a 14-image Story-1 book at HIGH. Do not raise concurrency for a
one-time run — speed-irrelevant and the conservative cap protects consistency.
