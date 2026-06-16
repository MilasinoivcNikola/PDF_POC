# Fix: Story-9 Page-3 double-preposition + Page-4 image brief ignores `babyStatus`

> Pays down two **low**-severity Story-9 debt rows (`context/debt.md`):
> *"Story-9 Page-3 `"settles in {sleepingSpot}"` double-preposition (bird/rabbit)"* and
> *"Story-9 baby-page-4 image brief hardcodes 'expecting framing' regardless of
> `babyStatus`"*. Both live in `lib/story/story9/`; bundled as one small PR.

---

## Fix A — Page-3 double-preposition (bird/rabbit)

### Problem
`page3SleepingSentence(species)` in `lib/story/story9/variants.ts:67` returns, for
`bird`/`rabbit`:

> "When the day winds down, {petName} **settles in {sleepingSpot}**, where it is warm…"

`{sleepingSpot}` is free user text. The dog default (master-text.ts:125) uses
**"curls up {sleepingSpot}"**, which expects a *prepositional* value ("at the foot of
the bed", "on the blue couch"). But "settles in" already ends in a preposition, so the
same value renders the double-preposition **"settles in at the foot of the bed"**. The
`story-samples-09` rabbit sample dodged it by authoring a bare-noun `sleepingSpot`
("the soft hay corner…") — a fixture dodge, and that bare-noun value would conversely
break the dog default ("curls up the soft hay corner"). The two variants expect
*opposite* value shapes; this PR only fixes the bird/rabbit double-preposition, not the
deeper free-text-shape question (noted out of scope below).

### Decision
Change the bird/rabbit verb particle from **"settles in"** → **"settles down"** so it
occupies the same structural slot as the dog default's "curls up" — adverb particle
followed by the prepositional `{sleepingSpot}`. "settles down at the foot of the bed" /
"settles down on its perch" both read naturally, the double-preposition is gone, and the
bird/rabbit path now shares the dog path's value expectation (one consistent shape, one
failure mode instead of two). This honors the master template's Page-3 note (the *verb*
"settle" for birds/small mammals; the literal "in" was the bug).

### Edit
- `lib/story/story9/variants.ts:67` — "settles in {sleepingSpot}" → "settles down {sleepingSpot}".
- `lib/story/story9/variants.test.ts:~430` — the pinned assertion currently locks the
  broken "settles in …" string; update it to the corrected "settles down …" and add an
  assertion that a prepositional `sleepingSpot` (e.g. "at the foot of the bed") no longer
  produces "in at".

---

## Fix B — Page-4 image brief ignores `babyStatus`

### Problem
`baby-page-4`'s `illustrationBrief` (master-text.ts:144) always reads "The baby is not
present yet **(expecting framing)**." The `babyStatus: "arrived"` variant rewrites the
page **body** whole (via `page4Body(status, …)` in variants.ts:186) but never touches the
**brief** — so an `arrived` book briefs its Page-4 image as if still expecting. Latent in
the prompt only: the printed text is correct, and the rabbit sample's committed Page-4 JPG
reads fine, so this surfaces only when a real `arrived` customer book is generated.

### Decision
Branch the Page-4 `illustrationBrief` on `babyStatus`, alongside the existing `arrived`
body rewrite in the variant layer (so an expecting default and an arrived rewrite can
never half-mix — the same whole-page discipline the file already uses). Keep Story-9's
Approach-A rule: **the pet is photo-anchored; the baby and any adults are faceless.**

### Edit
- `lib/story/story9/variants.ts` — where the `arrived` path composes `baby-page-4`, also
  override its `illustrationBrief` with an arrived-framing version. Suggested copy:

  > "{petName} calm and gentle beside the new baby — the baby swaddled in a bassinet or
  > held by a **faceless** adult; {petName} sniffing softly or keeping watch close by.
  > The pet is curious and tender, NOT worried. Soft nursery palette. The baby **is**
  > present now (arrived framing)."

  The `expecting` default keeps master-text.ts:144 unchanged.

### Tests
- Add an `arrived`-path assertion to `lib/story/story9/variants.test.ts`: the resolved
  `baby-page-4.illustrationBrief` contains the arrived framing (baby present) and **not**
  "not present yet" / "expecting framing"; the `expecting` default still asserts the
  original brief (byte-identical).

---

## Verification

- `npm run test:run` (updated Page-3 pin + new Page-4 brief assertions) and
  `npm run build` pass.
- No paid run — pure text/brief engine; no image regenerated. The committed rabbit
  sample assets are untouched (the rabbit is `arrived`, but samples aren't re-run here).
- Spot-resolve a `bird`/`rabbit` × prepositional-`sleepingSpot` fixture and an `arrived`
  fixture; eyeball Page-3 prose + Page-4 brief.

## Out of scope

- The deeper **`sleepingSpot` free-text shape** robustness (a value may be a bare noun
  *or* a prepositional phrase; neither the dog nor bird/rabbit line handles both). This
  PR only removes the bird/rabbit double-preposition. If we later want true robustness,
  that's a normalization step worth its own debt row.
- Re-generating the rabbit sample art (current JPGs read fine).
