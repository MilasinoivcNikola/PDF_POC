## 2026-06-16 — Fix: Story-9 Page-3 double-preposition + Page-4 image brief ignores `babyStatus`

`fix/story9-page3-and-page4-brief` (cea1079, merge 2ca75fb) — the second Tier-2/Tier-3
debt-paydown spec to land after `species-other-grammar`. Pays down two **low**-severity
Story-9 debt rows, bundled as one small PR. Pure text/brief engine in `lib/story/story9/`;
no PDF template change, no image regeneration, no paid run.

### Fix A — Page-3 double-preposition (bird/rabbit)

`page3SleepingSentence(species)` returned, for `bird`/`rabbit`, "When the day winds down,
{petName} **settles in {sleepingSpot}**, where it is warm…". `{sleepingSpot}` is free user
text and the dog default (`master-text.ts`) uses "**curls up** {sleepingSpot}", which expects
a *prepositional* value ("at the foot of the bed", "on the blue couch"). But "settles in"
already ends in a preposition, so the same value rendered the double-preposition "settles in
**at** the foot of the bed". The `story-samples-09` rabbit sample only dodged it by authoring
a bare-noun `sleepingSpot` ("the soft hay corner…") — a fixture dodge that would conversely
break the dog default ("curls up the soft hay corner").

**Fix:** change the bird/rabbit verb particle "settles in" → "**settles down**" so it occupies
the same structural slot as the dog default's "curls up" (adverb particle + prepositional
`{sleepingSpot}`). "settles down at the foot of the bed" / "settles down on its perch" both
read naturally, the double-preposition is gone, and bird/rabbit now share the dog path's one
value expectation (one shape, one failure mode). Honors the master template's Page-3 note (the
*verb* "settle" for birds/small mammals; the literal "in" was the bug). One-line change at
`lib/story/story9/variants.ts:70`, plus its two in-code doc comments synced.

### Fix B — Page-4 image brief ignored `babyStatus`

`baby-page-4`'s `illustrationBrief` (`master-text.ts:144`) always read "The baby is not
present yet **(expecting framing)**." The `babyStatus: "arrived"` variant rewrites the page
**body** whole (via `page4Body(...)` in `variants.ts`) but never touched the **brief** — so an
`arrived` book briefed its Page-4 image as if still expecting. Latent in the prompt only: the
printed text was correct, and the rabbit sample's committed Page-4 JPG reads fine, so it would
surface only when a real `arrived` customer book is generated.

**Fix:** branch the Page-4 `illustrationBrief` on `babyStatus` in the variant layer, in
lockstep with the existing `arrived` body rewrite (the same whole-page discipline the file
already uses — an expecting default and an arrived rewrite can never half-mix). Added a
`setBrief()` helper alongside the existing `setBody`/`setTitle`/`setSubtitle` in-place setters,
a `PAGE_4_ARRIVED_BRIEF` constant, and a guarded `if (babyStatus === "arrived") setBrief(story,
"baby-page-4", PAGE_4_ARRIVED_BRIEF)` in `composeVariants9()`. Keeps Story-9's Approach-A rule:
the pet is photo-anchored; the baby and any adults are **faceless**. The `expecting` default
leaves `master-text.ts:144` untouched. The brief is load-bearing: `lib/ai/story9-prompts.ts`
reads `page.illustrationBrief` straight off `resolveStory9(...)` and `baby-page-4` is a real
scene slot, so the rewrite reaches the generated prompt.

### Tests

- **Fix A** — updated the pinned Page-3 assertion in `variants.test.ts` (it had locked the
  broken "settles in …" string) to "settles down …", and added a `not.toContain("settles in
  at")` double-preposition guard.
- **Fix B** — two new variant-layer tests: `arrived` asserts the resolved `baby-page-4`
  `illustrationBrief` contains the arrived framing (baby present, faceless adult) and **not**
  "not present yet"/"expecting framing"; the `expecting` default asserts the brief
  byte-identical to master-text. Plus a **prompt-layer** symmetry assertion (review nice-to-have):
  the existing "babyStatus on Pages 4/6" test in `lib/ai/story9-prompts.test.ts` covered
  expecting-Page-4 and arrived-Page-6 but skipped arrived-Page-4 — extended so the generated
  arrived prompt carries "arrived framing"/"baby is present now", never "baby is not present
  yet", and keeps the baby an abstract presence.

### Review drift resolved on-branch

The context-auditor flagged that the Story-9 masterstory (the published-wording
source-of-truth) still said "settles in" in three places, now contradicting shipped output —
a future author copying it verbatim would reintroduce the bug. Reconciled on the same branch:
`context/masterstories/story-9-master-template.md` lines 160/285/286 → "settles down", the
lingering in-code comment at `variants.ts:27`, and a new arrived-framing illustration-brief
note added to the masterstory's Page-4 (the engine now carries it; the production checklist
already forbids mixed framing). Code review **PASS**, context audit **DRIFT FOUND → resolved**.
No commerce surface → no security review.

### Verification

- `npm run test:run` → **2152 tests green** (the Page-4 brief assertions net-new; the
  prompt-layer symmetry extended an existing test). `npm run build` passes, route tiers
  unchanged.
- Pure-text change: no engine/PDF/image path touched, so all existing products' PDFs remain
  **byte-identical** (`template.story9.test.tsx` untouched and green; the zero-surviving-`[FIELD]`
  merge guard still passes). No paid run — committed rabbit sample assets untouched.

### Debt

- **Paid:** the Page-3 "settles in {sleepingSpot}" double-preposition row and the Page-4 brief
  "hardcodes expecting framing regardless of `babyStatus`" row (both removed from `debt.md`).
- **Added (out of scope, spec-flagged):** Story-9 `sleepingSpot` free-text-shape robustness —
  after this fix all species share one *prepositional* value expectation, so a bare-noun
  `sleepingSpot` ("the hay corner") now reads wrong on every species. The double-preposition is
  fixed; true input-shape normalization (strip/insert a leading preposition, or a clearer
  wizard hint) is its own low-severity row.
