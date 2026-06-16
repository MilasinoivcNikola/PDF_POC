## 2026-06-16 — Fix: graceful `"other"` species noun in printed prose (Stories 1, 2, 5, 7, 8)

`fix/species-other-grammar` (f4d230b, merge daee0a5) — the first of the Tier-2/Tier-3
debt-paydown specs to land. Pays down the **medium**-severity debt row *"`species: "other"`
renders broken grammar in printed text"*. Pure text-engine correctness fix; no paid run.

### Problem

Several titles interpolated the **raw** `{species}` merge field into *printed prose* with an
article or qualifier. For `dog`/`cat`/`rabbit`/`bird` this reads fine, but `"other"` — a real
wizard option — yielded ungrammatical published copy: "just a other", "a other can love",
"every other in the whole wide world", "the new other", "a other named", "{petName} the
other". Latent only because commerce isn't live — the first `"other"`-species customer order
on any affected title would ship broken text. Stories 4, 6, 9 already handled this (Story 4
via the `climaxSpeciesNoun()` helper → "friend"; Story 9 via local `speciesNoun` page
builders); the remaining five did not.

### Mechanism — a derived `speciesNoun` merge field (uniform across all five)

Each affected story builds a `values: Record<string,string>` map and runs `substitute()`
**after** the variant layer composes the page, so one change covers lines living in both
`master-text.ts` (static data) and `variants.ts` (page builders). Added a sibling to the
existing `speciesDescriptor` derivation in each map:

```ts
speciesNoun: pet.species === "other" ? "friend" : clean(pet.species),
```

Then swapped the **printed-prose** `{species}` occurrences to `{speciesNoun}` at the
grep-verified sites only. Because `Species` is a strict 5-literal union and `clean()` is a
no-op on every literal, `speciesNoun === species` exactly for dog/cat/rabbit/bird → the swap
is byte-identical for them; only the `"other"` path renders "friend". Deliberately **not**
routed through `speciesDescriptor` (which maps to diminutives "boy"/"kitty"/"bunny" and would
have changed non-`other` output).

### Edits (19 files, +236/−29 net in the fix commit)

- **Merge maps (+1 line each):** `lib/story/merge.ts` (S1), `story2/merge.ts`, `story5/merge.ts`,
  `story7/merge.ts`, `story8/merge.ts`.
- **Prose swaps `{species}`→`{speciesNoun}`:** S1 `master-text.ts` (2); S2 `master-text.ts`
  (2, page-6 ×2); S5 `master-text.ts` (2) + `variants.ts` (4, couple/single page-2/page-3);
  S7 `master-text.ts` (4: incl. the two-occurrence "a {species}…a {species}" line) +
  `variants.ts` (4); S8 `master-text.ts` (2) + `variants.ts` (3, page-1 solo/plus + climax).
- **Out of scope (left literal `{species}`):** `illustrationBrief` strings — they prompt the
  image model, are not printed, and the catalog samples read fine; leaving them keeps output
  byte-identical (matches how Stories 4/9 scoped their fix).

### Tests

Added an `"other"`-species assertion to each story's `merge.test.ts`/`variants.test.ts`
(affected lines contain "friend"; none of "a other"/"just a other"/"the new other"/"the
other —"/"every other"/"a good other" survive; the existing "no surviving `[FIELD]`" and
byte-identity assertions still pass). **Corrected two pre-existing Story-2 tests**
(`story2/merge.test.ts`, `story2/variants.test.ts`) that were *pinning the defect* — they
looped all species incl. `"other"` against the raw word; updated to `other → "friend"` via the
Story-4 pattern + a "never `a other`" guard. Documented the convention in
`new-book-playbook.md` (Step-4 merge-values) so a new title author derives `speciesNoun` from
the start instead of reintroducing the bug.

### Verification

- `npm run test:run` → 2150 tests green (incl. the new assertions); `npm run build` passes,
  route tiers unchanged.
- **QA PASS at $0** (no image generation — text-only fix): rendered `"other"`-species sessions
  for Stories 1/7/8 to real PDFs (placeholder image slots, `OPENAI_API_KEY` unset) and read
  the printed lines — "friend" present, forbidden strings absent; non-`other` fixtures
  (dog/cat/bird) byte-unchanged. Stories 4/6/9 sanity-checked, untouched.
- Review: code-reviewer **PASS** (byte-identity confirmed via the `Species` union + `clean()`
  no-op; the corrected Story-2 tests genuinely pinned the defect), context-auditor **IN SYNC**.
  No commerce surface → no security review.

### Out of scope / not in this PR (remain as their own debt rows)

- Image-brief `{species}` tokens (byte-identical, not printed).
- Stories 4/6/9 — already handle `"other"`.
- The Story-9 Page-3 double-preposition + Page-6 copy-review rows (`debt.md`), separate specs.
