---
name: story-samples-08-review-calibration
description: Story Samples PR-08 (corgi, Story 8 Amazing Adventures) — clean PASS; the load-bearing checks for this sample-set series
metadata:
  type: feedback
---

Story Samples PR-08 (`feature/story-samples-08`, Story 8 corgi sample set) reviewed **clean PASS** — 7th in the identical PR-02..PR-07 series shape (catalog `[]`→N paths + previewPdf, fixture, test pin update, binary assets).

**Why:** these sample-set PRs are data-only on the code side (catalog + test + JSON fixture; the JPGs/preview.pdf are binary). The one bug class that actually matters is a sampleImages path → 404 mismatch.

**How to apply (the four load-bearing checks, all passed here):**
1. `sampleImages` basenames must equal the story's slot ids in order. Cross-check three lists: `ADVENTURE_SCENE_PAGE_IDS` in `lib/story/story-8.ts` (10) == products.ts paths == `ls public/samples/story-8-adventure/*.jpg`. All matched.
2. Catalog stays pure/client-safe — products.ts imports only `@/lib/session/types` (type) + `@/lib/story/registry`. No engine/Supabase.
3. Test assertions match wired data: 10-image array in slot order + `toHaveLength(10)` + previewPdf string + story-8 added to `WITH_PREVIEW` map. The lone surviving `toEqual([])` at products.test.ts is for **story-9-newbaby** (correct — still placeholder, not this PR).
4. Fixture resolves zero `[FIELD]` via `resolveStory8` (from `lib/story/story8/variants`, NOT `lib/story/story-8`); childName "Nora" set (required under heroCount "pet-plus"). The only "null" in the resolved JSON is `"pageNumber":null` on the cover — benign structural, not body text.

**Story-8-specific facts confirmed (distinct from the [[story9-text-review-calibration]] trap):** Story 8 generation IS fully wired — `generate.ts` line ~491 has the `storyType === "story-8"` dispatch → `generateStory8Illustrations`, and `manifestToImageMap` includes all 10 adventure slots. So the preview.pdf is a real Approach-B book, not a Story-1 fallthrough. Story 8 was never the Story-9 trap.
