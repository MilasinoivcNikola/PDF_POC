# Fix: `species: "other"` renders broken grammar in printed text (Stories 1, 2, 5, 7, 8)

> Pays down the **medium**-severity debt row *"`species: "other"` renders broken
> grammar in printed text"* (`context/debt.md`). Tier-2 pre-launch correctness.

## Problem

Several titles interpolate the **raw** `{species}` merge field into printed prose with
an article or qualifier. For `dog`/`cat`/`rabbit`/`bird` this reads fine, but `"other"`
— a real wizard option — yields ungrammatical published copy: "just a other", "a other
can love", "every other in the whole wide world", "the new other", "a other named",
"{petName} the other".

Stories **4, 6, and 9 already handle this** (Story 4 via the `climaxSpeciesNoun()`
helper → other becomes "friend"; Story 9 via a local `speciesNoun` in its page
builders; both mirror `speciesDescriptor`'s `other → "friend"`). The remaining five
titles do not. Latent only because commerce isn't live — the first `"other"`-species
customer order on any affected title ships broken text.

## Decision

- Map `"other"` to the graceful noun **"friend"** everywhere it appears in printed
  prose (consistent with the existing `speciesDescriptor` rule and the Story-4/9 fix).
  `dog`/`cat`/`rabbit`/`bird` keep their literal word.
- **Hard constraint — byte-identical for non-`other` species.** Every existing product's
  PDF must stay byte-for-byte unchanged for dog/cat/rabbit/bird. The fix only changes the
  `"other"` path.
- **Image briefs are out of scope.** The `{species}` token inside `illustrationBrief`
  strings (e.g. "a {breedColor} {species}") is *not* printed — it prompts the image
  model — and the in-catalog samples read fine. Leaving them keeps output byte-identical
  and matches how Stories 4/9 scoped their fix (printed prose only).

## Mechanism — a derived `speciesNoun` merge field (uniform across all five)

Every story builds a `values: Record<string,string>` map and runs `substitute()` **after**
the variant layer composes the page (so it works the same whether a line lives in
`master-text.ts` static data or in a `variants.ts` page builder). The merge map already
derives `speciesDescriptor`. Add a sibling:

```ts
// in each story's merge values map, beside `species: clean(pet.species)`
speciesNoun: pet.species === "other" ? "friend" : clean(pet.species),
```

Then swap the **printed-prose** `{species}` occurrences to `{speciesNoun}`. For
non-`other`, `speciesNoun === species` → byte-identical. For `other`, it renders "friend".

> **Do not reuse `speciesDescriptor`** for this — it maps to pet-y diminutives
> ("boy"/"girl"/"kitty"/"bunny"), which would change the non-`other` output. `speciesNoun`
> deliberately preserves the plain species word for non-`other`.

Why a merge field rather than the Story-4 local helper: these are multi-occurrence and
span both `master-text.ts` and `variants.ts` in several titles; a derived field is DRY,
uniform, and reuses the exact pattern `speciesDescriptor` already established. Stories 4
and 9 keep their existing local approach — don't churn working code.

## Edits (printed-prose sites — verified by grep, authoritative)

For each story: (a) add `speciesNoun` to its merge `values` map; (b) change `{species}`
→ `{speciesNoun}` at the lines below only.

### Story 1 — merge map: `lib/story/merge.ts` (beside L154 `speciesDescriptor`)
- `lib/story/master-text.ts:276` — "…there lived a {species} named {petName}." → "a friend named …"
- `lib/story/master-text.ts:394` — "{petName} was {childName}'s {species}." → "…'s friend."

### Story 2 — merge map: `lib/story/story2/merge.ts`
- `lib/story/story2/master-text.ts:159` — 'I was "just a {species}."' → '"just a friend."'
- `lib/story/story2/master-text.ts:161` — "as much as a {species} can love" → "a friend can love"

### Story 5 — merge map: `lib/story/story5/merge.ts`
- `lib/story/story5/master-text.ts:117` — "you were a {species}" → "a friend"
- `lib/story/story5/master-text.ts:138` — "You were a good {species}." → "a good friend"
- `lib/story/story5/variants.ts:102` — couple path, "you were a {species}"
- `lib/story/story5/variants.ts:111` — single path, "you were a {species}"
- `lib/story/story5/variants.ts:151` — couple path, "a good {species}"
- `lib/story/story5/variants.ts:162` — single path, "a good {species}"

### Story 7 — merge map: `lib/story/story7/merge.ts` (L138 `species`)
- `lib/story/story7/master-text.ts:125` — "every {species} in the whole wide world"
- `lib/story/story7/master-text.ts:171` — "a {species} and a family become a {species} and their family" (**two** occurrences in the line)
- `lib/story/story7/master-text.ts:200` — 'the new "{species}"'
- `lib/story/story7/variants.ts:111` — Page-3 builder (same as master 125)
- `lib/story/story7/variants.ts:174` — Page-6 builder (same as master 171, **two**)
- `lib/story/story7/variants.ts:212` — Page-8 builder (same as master 200)

### Story 8 — merge map: `lib/story/story8/merge.ts`
- `lib/story/story8/master-text.ts:94` — "…there lived a {species} named {petName}."
- `lib/story/story8/master-text.ts:230` — "{petName} the {species} —"
- `lib/story/story8/variants.ts:67` — opening (age variant)
- `lib/story/story8/variants.ts:73` — opening (age variant)
- `lib/story/story8/variants.ts:271` — "the easy, modest grace of a {species} who saves the day"

### Out of scope — image briefs left as literal `{species}` (byte-identical)
`master-text.ts:262` (S1), `:90`/`:166` (S2), `:107`/`:194` (S5), `:87` (S7), `:86` (S8).

## Tests

- Add an **`"other"`-species assertion** to each story's `variants.test.ts` /
  `merge.test.ts`: render the resolved story with `species: "other"` and assert the
  affected lines contain "friend" and that none of the broken strings ("a other",
  "just a other", "the new other", "the other —", "every other") survive. (Matches the
  Story-4 `variants.test.ts` precedent.)
- The existing "no surviving `[FIELD]`" assertions must still pass (`speciesNoun` is in
  the values map).
- **Byte-identity check:** confirm a non-`other` fixture (e.g. the committed
  `fixtures/sample-story5-dog.json`) resolves to the same text as before — the swap to
  `{speciesNoun}` is a no-op for dog/cat/rabbit/bird.

## Verification

- `npm run test:run` (incl. the new `"other"` assertions) and `npm run build` pass.
- No paid run needed — pure text engine; image briefs untouched.
- Spot-render one `"other"` fixture per affected story to `./output` and read the
  printed lines.

## Out of scope / not in this PR

- Image-brief `{species}` (see above).
- Stories 4/6/9 — already handle `"other"`.
- The Story-9 Page-3 / Page-4-brief fixes — separate spec
  (`context/fixes/story9-page3-and-page4-brief.md`).
