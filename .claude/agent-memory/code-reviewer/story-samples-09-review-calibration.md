---
name: story-samples-09-review-calibration
description: Story-samples-09 rabbit New-Baby sample PR — clean PASS; fixture-phrasing-around-template-constraint is in-scope; brief stutters are out-of-scope (already-consumed prompts)
metadata:
  type: feedback
---

Feature `story-samples-09` (Story 9 "And the New Baby", rabbit "Clementine") — data-only sample-set replay. Verdict: clean PASS.

**Load-bearing check that passed:** ran `resolveStory9` on the fixture → 0 `[FIELD]` AND 0 `{brace}` tokens; 7 disk filenames == catalog `sampleImages` == products.test 7-file set; previewPdf real; boundary test green; only the story-9 block changed in products.ts.

**Calibration — what is in vs out of scope for a sample-PR fixture:**
- IN scope (correct to do): phrasing fixture fields *around* a known live-template constraint. Here Story-9's rabbit Page-3 template is `"settles in {sleepingSpot}"`, so a `sleepingSpot` starting with "in" double-ups ("in in"). The agent phrased `sleepingSpot` as "the soft hay corner…" to avoid it. Acceptable — touching the template would risk byte-identity. NOT a blocker.
- OUT of scope (don't block on): issues that only affect the **illustration brief** (the image prompt), because the paid run is already done and the committed JPGs are what ship. Two such pre-existing LIVE-product traits surfaced here and are nice-to-haves, not blockers:
  - master-text.ts cover brief `(a {breedColor} {species})` + a full-sentence `breedColor` → "a a … rabbit" stutter.
  - baby-page-4 brief hardcodes "expecting framing / baby not present yet" regardless of `babyStatus: "arrived"`.

**Why:** the diff under review is fixture JSON + catalog data + test; the engine/template is untouched and the prompts were already consumed. Brief-text imperfections are a debt row against the live Story-9 product, not a gate on the sample PR.

Pattern continues from [[story-samples-08-review-calibration]] (corgi) — same 3-list slot-id cross-check + run-the-resolver-on-the-fixture technique. Story 9 generation IS wired (the 2026-06-15 wiring fix); not the old Story-9 trap.
