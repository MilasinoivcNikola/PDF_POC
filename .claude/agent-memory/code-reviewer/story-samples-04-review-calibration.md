---
name: story-samples-04-review-calibration
description: Story 4 guinea-pig sample PR (species "other") review — the raw-{species} "a other can love" Page-6 climax leak now shipped in a paid public sample
metadata:
  type: project
---

`feature/story-samples-04` — Story 4 ("If Your Pet Could Talk") guinea-pig sample set, first catalog sample to exercise `species: "other"`. Same shape as PR-02 cat: new fixture + `previewPdf` on the product + WITH_PREVIEW map entry + a dedicated assertion + 2 web JPGs + slim preview.pdf. Verdict: **CHANGES NEEDED** (one should-fix, no crash blockers).

**Load-bearing finding — the Story-9 "a other" body-grammar trap, now realized in a paid sample.** Story 4 Page-6 (talk-page-6) climax line is `"...As much as a {species} can love..."` in `lib/story/story4/master-text.ts:180` + `variants.ts:337/348` — **raw `{species}`, not `speciesDescriptor`**. For dog/cat/rabbit/bird it reads fine ("a dog can love"); for `"other"` it renders **"As much as a other can love"** on the book's emotional payoff line. This is the *same defect class* as [[story9-text-review-calibration]] Trap 1, BUT here it's worse: Story 9 wasn't sellable yet, whereas this PR generates and commits a customer-facing storefront sample (preview.pdf + talk JPGs) that renders the broken line. The spec's mitigation (a `breedColor` that names the guinea pig) does NOT help — Page 6 uses `{species}`, never `{breedColor}`. Story 4 uses raw `{species}` everywhere and `speciesDescriptor` (which maps other→"friend") nowhere.
**Why tests are green:** `lib/story/story4/variants.test.ts:43` SPECIES list includes "other" and line 567 asserts `As much as a other can love` is present — the test *pins the ungrammatical output as expected*, masking the defect (placeholder/no-doubled-article checks pass on "a other").
**How to apply:** when a sample PR is the first to run `species:"other"` through a story whose body copy uses raw `{species}` behind an indefinite article, the sample will ship the grammar break. The fix is engine-side (descriptor/special-case "other" in Story-4 text) — flag it as the gating concern even though merge has "zero surviving [FIELD]." Don't accept "tests pass" or "no surviving placeholder" as proof the sample reads correctly.

**Validated as correct (don't re-flag):**
- Catalog change: `previewPdf: "/samples/story-4-talk/preview.pdf"` added, `sampleImages` untouched — matches PR-02 pattern exactly.
- Test invariant updated correctly: new entry in the WITH_PREVIEW present/absent loop (products.test.ts:161) AND a dedicated assertion (line 187), mirroring story-1/story-2. The omits-elsewhere half still holds.
- Fixture shape matches `fixtures/biscuit-living.json` (Story-4 living model): living path, all required memory fields present (incl. favoriteActivity), photo `uploads/sample-photos/other.jpg`, breedColor names the animal, zero surviving `[FIELD]`, no "passed away". species/pronoun consistent.
- PR-02 cat fixture is clean (no "a other"), confirming the leak is specific to the "other" path this PR introduces. tsc + products.test (63) + story4 tests (104) green.
