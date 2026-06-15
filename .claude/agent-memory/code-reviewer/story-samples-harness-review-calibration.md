---
name: story-samples-harness-review-calibration
description: story-samples PR-0 (sample-run.ts/sample-capture.ts throwaway harness) review — PASS-with-note; the story-9 harness trap (generate dispatch gap + manifestToImageMap gap) is the load-bearing finding
metadata:
  type: project
---

Feature `feature/story-samples-foundation` (Story Samples PR-0: candidate photos + capture harness) verdict: **PASS** (pure throwaway tooling + committed photos; no engine/catalog/route change). Two throwaway scripts modeled faithfully on `story1-high-run.ts` — `@/*` imports, double quotes/semicolons, throwaway-header convention, `process.exit(1)` error wrap all match. `sips` args (`-Z 1000`, `formatOptions 80`) match Story-1's documented capture. jpeg data-URL map is fine (template uses raw `<img src>`). tsc clean on scripts/tsconfig.json. No fixtures/public-samples committed (correct — per-story PRs 02–09 add those).

**THE LOAD-BEARING FINDING — the Story-9 harness trap (forward-looking, NOT a blocker against this PR's code):**
Two PRE-EXISTING story-9 gaps on `main` collide with this harness, which exists precisely to run story-9 (PR-09, rabbit):
1. `generateAllIllustrations` has branches for story-2/4/5/6/7/8 but **NO `story-9` branch** — a story-9 session falls through to the Story-1 shared path, which iterates Story-1 `SCENE_PAGE_IDS` + `buildScenePrompts` (Story-1-keyed). So a paid `proto:sample` run on a story-9 fixture generates **Story-1 page-1..12 art**, not the `baby-*` slots. `lib/ai/story9-prompts.ts` exists + is tested but is never dispatched (dead from the generation path). (Confirmed in [[mixed-tier-quality-review-calibration]] as pre-existing.)
2. `manifestToImageMap`'s allow-list (lib/ai/generate.ts ~1654) was last updated in the Story-8 PR (fe556ae) and **omits `story-9`'s `illustrationSlots`** (`baby-cover`, `baby-page-2..7`, which are namespaced/distinct — no overlap with story-1). So even given correct `baby-*` PNGs, the render routes (preview/render-pdf/approve) + `sample-run.ts`'s working PDF would filter them out → placeholder art.
Net: PR-09 will silently pay ~$1 and produce a broken Story-9 book unless story-9 generation is wired first. This belongs to a story-9 generation-wiring fix, flagged as a per-PR-09 pre-flight — NOT a defect in PR-0's two scripts.

**Notable correctness DETAIL — sample-capture's `illustratedSlotIds()` is MORE correct than the engine.** It unions all 8 stories' `illustrationSlots` (incl. story-9) + the two `adventure-*` reuse pages. So its allow-list intentionally DIVERGES from `manifestToImageMap` by *including* story-9 — meaning if story-9 generation were fixed, capture would emit the baby JPGs correctly while `manifestToImageMap` still wouldn't. Don't "fix" capture to match the engine's stale list; the engine is the one that's behind.

**Validated / refuted (don't re-litigate):** arg parsing `argv[(i+=1)]` last-token-undefined is caught by the `!id||!out` guard (fine); sample-run delegates photo-containment to the engine's own `resolveUnder` guard (line ~505, consistent with spec, not a gap); slim-preview requirement is met — `sample-capture` builds `webMap` from the DOWNSCALED JPGs (re-read off disk), never the full-res PNGs, so preview.pdf cannot embed full-res; Pexels-License photos (no attribution) committed under the new `uploads/sample-photos/` negation, ~0.8 MB total, README records each source URL.
