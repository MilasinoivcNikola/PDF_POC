---
name: sample-fixture-text-workarounds
description: Recurring drift on story-samples PRs — the fixture sidesteps a latent template-grammar bug instead of fixing it; the latent bug must be debt-logged, not buried in fixture word choice
metadata:
  type: project
---

A `story-samples-NN` PR authors a sample fixture and runs one paid image gen. When the
sample species hits a **latent text-grammar bug**, the implementing agent often picks
fixture field values that *dodge* the bug rather than fixing the template — leaving the
bug live for real customers who won't be so careful.

**Why this is drift:** the bug stays unrecorded. The sample looks fine (the fixture was
hand-tuned around it), but the next customer with a normal input hits the broken line.
The project's own debt convention (`debt.md` header + step-10) says durable deferrals
get a ledger row; a fixture-level dodge is a conscious not-fix that outlives the branch.

**How to apply:** on any samples PR, check whether the fixture's free-text fields were
shaped to avoid a template seam for that species/toggle. If a bare-noun-phrase value
hides a double-preposition / article / pluralization defect, that's a
**staleness/omission finding → recommend: add a debt.md row** (update doc), not a code
change in this PR.

**Concrete instance — Story 9 Page-3 "settles in {sleepingSpot}":**
`lib/story/story9/variants.ts:67` uses `"settles in {sleepingSpot}"` for **bird + rabbit**
(vs `"curls up {sleepingSpot}"` for dog/cat/other). With a typical `sleepingSpot` like the
canonical fixture's `"at the foot of the bed"` this renders **"settles in at the foot of
the bed"** — a double preposition. `lib/story/story9/variants.test.ts:430` actually
asserts that broken string as expected. The `feature/story-samples-09` rabbit fixture
sidesteps it with `sleepingSpot: "the soft hay corner beneath the window"` (no leading
preposition). The fix is per-species composition (drop the redundant "in", or strip a
leading "at/in" from the value); related-but-distinct from the existing
[[masterstory-slot-id-lag]]/`"other"`-grammar row already in debt.md (different species,
different seam). See [[debt-ledger-deferral-recording]] for the recommend-direction logic.
