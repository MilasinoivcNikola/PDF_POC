---
name: story9-new-baby-spec-vs-masterstory
description: Story 9 ("New Baby") settled facts — page-count + closing-layout supersessions the masterstory template still contradicts; what's correct vs stale
metadata:
  type: project
---

Story 9 = "[PET_NAME] and the New Baby", the #7 niche family-transition keepsake.
Authoring-only, narrative-layout reuse of Story 1 (NO `truth`, NO new PageLayout/CSS).
Built across PR-A (feature 33, `feature/story9-text`: text+registration+Approach-A imagery)
and PR-B (wizard/storefront/intake, the catalog `buildProduct` + sample images).

**Two PM-settled supersessions the build is correct on; the MASTERSTORY TEMPLATE lags:**

1. **9 leaves, not "8".** Code renders cover + page-1 dedication + pages 2-7 + back-cover
   = 9 leaves (`Story9PageId` union in lib/story/master-text.ts; `masterStory9()` in
   lib/story/story9/master-text.ts). The masterstory template
   (context/masterstories/story-9-master-template.md) still says "8-10 pages" / "cover +
   dedication + 7-8 illustrated story pages + back cover" (lines 4, 354, 366 customer copy).
   The spec also loosely said "8-page" but its own page-id list resolves to 9 — code wins.

2. **No `closing` layout.** The masterstory specifies a separate **Page 8 — Closing —
   `closing`** (template lines 240-251) and lists `closing` as a reused Story-1 layout
   (lines 39, 348). The build DROPPED it: there is no `closing` PageLayout in this repo at
   all, and the master Page 8's "room for everyone / there always was" closing echo was
   FOLDED into Page 7's `love` layout closer (`baby-page-7`, the love layout's
   lead/hero/closer triple — hero = "Love does not divide. It multiplies."). So Story 9
   uses `cover`/`dedication`/`narrative`/`love`/`back-cover` only. The template's
   `closing`-layout references (incl. style-guide line 348 listing `closing`) are stale.

**Build is CORRECT on the headline quality bar** (verified PR-A): pet security established
Pages 2-3 before baby (Page 4); no "fur baby"; no memorial language; baby/adults abstract
(never a face) in both the per-page briefs AND the shared `styleAndConsistencyClause` in
lib/ai/story9-prompts.ts; `{babyName}` degrades to "the new baby" (resolveBabyName).

**More masterstory-vs-engine wording drift, added by `fix/story9-page3-and-page4-brief`
(2026-06-16):**

3. **Page-3 sleeping verb is now "settles DOWN", not "settles in".** The fix changed the
   bird/rabbit Page-3 line `"settles in {sleepingSpot}"` → `"settles down {sleepingSpot}"`
   to kill a double-preposition ("settles in at the foot of the bed") and share the dog
   default's prepositional `{sleepingSpot}` slot. The masterstory template still says
   "settles **in**" in THREE places (template lines ~160 Page-3 variant note, ~285 rabbit
   voice, ~286 bird voice). The fix honors the template's *intent* (the verb "settle" for
   birds/small mammals; the literal "in" was the bug) but the wording now contradicts the
   product source-of-truth → update those 3 masterstory lines to "settles down". Code wins;
   doc is stale.

4. **Page-4 illustration brief now has an arrived-framing variant the masterstory lacks.**
   Fix B branches `baby-page-4`'s `illustrationBrief` on `babyStatus` (new
   `PAGE_4_ARRIVED_BRIEF` const + a `setBrief` in-place setter, sibling of `setBody`/
   `setSubtitle` — internal, no doc needed). In-spec: the masterstory consistency checklist
   (template line ~301) already mandates the `[BABY_STATUS]` framing be applied consistently
   across pages "no mix of coming/arrived in one book" — the brief was the one place that DID
   mix. BUT the masterstory pattern is that `arrived` variants only rewrite **body text**;
   no page (incl. Page 6, whose arrived body says the baby is present) documents an
   arrived-framing *illustration brief*. So the Page-4 brief variant is a low-pri OMISSION
   the masterstory's Page-4 `*Illustration brief:*` (template ~line 174) could record. Not
   misleading (briefs are never printed, only steer the prompt) — nice-to-have, not blocker.

Both fixes pay down debt.md rows (Page-3 double-prep row ~L41, Page-4 expecting-brief row
~L40) — removal/update is the `complete` step's job, flag if left stale at merge.

**Recurring template-vs-build drift confirmed again** (see [[masterstory-slot-id-lag]]):
the template was written before the build and over-specifies structure the build then
simplifies. Fix direction = update the masterstory template (it's the wording/structure
source-of-truth, but the registry + built layouts own actual page identity/layout). These
template lines became actively misleading on THIS branch (PR-A is the layout decision),
so they're same-PR fixes per coding-standards. NOT code changes — the simplification is
the PM-intended design.

See [[canonical-doc-map]], [[playbook-undocumented-conventions]], [[new-book-playbook-pr10]].
