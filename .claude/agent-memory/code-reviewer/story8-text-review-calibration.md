---
name: story8-text-review-calibration
description: Feature 31 Story-8 "Amazing Adventures" PR-A (text engine, Approach-B imagery) — CHANGES NEEDED; the pet-solo body-leak class (one un-rewritten page resolves the brief-only "the child" stand-in into a body); validated B-imagery + byte-identity
metadata:
  type: project
---

Feature 31 ("The Amazing Adventures of [PET_NAME]", Story 8 PR-A of 3, Milestone 12) —
catalog's first APPROACH-B book + first happy adventure with real jeopardy. Reviewed
CHANGES NEEDED (one blocking correctness bug). Work was UNCOMMITTED in the working tree
(branch feature/story8-text had no commits past main 5edbfec) — review `git diff HEAD`,
not `main...HEAD` (range was empty).

**BLOCKER found — the pet-solo body-leak class (recurring trap for any hero-count/voice
book).** `lib/story/story8/merge.ts` registers `childName = "the child"` in pet-solo as a
stand-in *intended for illustration briefs only* (cover/page briefs still name the child as
a soft scene presence). This is safe ONLY if every BODY page's `{childName}` was rewritten
child-free by the variant layer. `composeBackyardMystery` rewrites cover + pages 1,2,3,5,6,9,10
but MISSES page 4 (`adventure-clue`) — its master body line `"You found it!" cheered {childName}`
is not rewritten, so in pet-solo it resolves to `cheered the child` (or `cheered Emma` if a
name was supplied), leaking the child as a speaking character into a body page. The whole
suite (1695) is GREEN because the "no surviving placeholder" test only checks the `{token}`
is gone — the stand-in MASKS the leak. Lesson: for a voice-toggle book, a "no surviving
placeholder" assertion is NOT sufficient; you also need an explicit "no child stand-in in any
pet-solo BODY" assertion. The fix is a one-line page4Body(heroCount) builder + wiring it in
composeBackyardMystery (mirrors the other 8 rewrites). Proven via temp tests dumping the
resolved page-4 body both with childName undefined and ="Emma".

**Validated as correct (don't re-flag):**
- **Approach-B imagery is faithful** (`lib/ai/generate.ts` generateStory8Illustrations):
  self-selects B internally (ignores options.approach — worker calls bare), gen order
  calm(cover,ordinary,special,celebration)→action→climax LAST, climax at Medium via
  STORY8_MEDIUM_SLOT (= PR-0's locked cost floor: 9 Low + 1 Low ref + 1 Medium climax),
  reuses the now-EXPORTED referencesForScene (shared Story-1 B accumulation), manifest
  reassembled in book order. Pages 10/11 reuse via STORY8_REUSE ({home←celebration,
  closing←cover}) with ZERO extra API calls; manifestToImageMap adds adventure-home/
  -closing to the illustrated set so the reused art resolves. Cache-by-hash preserved.
- **regenerateStory8Slot approximates B as A** (one repaint has no priors) — documented,
  carried to debt.md, explicitly a PR-A non-blocker per spec. Climax keeps Medium on repaint.
- **Byte-identity holds: Story-1 Otis = 873889 bytes** (same baseline as S4/5/6/7 reviews).
  Shared template.tsx / pages.tsx / merge.ts / globals.css / renderPage switch all UNTOUCHED
  in the diff; the only shared-file edit is the type-only Story8PageId union widen in
  master-text.ts + additive registry registration. tsc clean, build clean, 83 files/1695 green.
- **Scope-guard out-of-spec edits all minimal/correct:** draft.ts isStory8Draft + the two
  `throw "not yet creatable (wired in PR-B)"` dispatchers = the established Story-4/5/7
  unreachable-throw pattern (compile-forced by the new union member); store.ts OrderRow.inputs
  re-pointed at Order["inputs"] (DRY, drops 6 now-redundant imports — pure refactor); Order.inputs
  + AnyEditableSession widened with Story8Session (additive type-only); WizardProvider defensive
  conditional adventure/memories merge (narrows the old unconditional `memories: {}` to
  present-only — safe, Story 1 still merges since its draft carries memories).
- editable-fields.ts mirrors story7 (childName/superpower nested in `adventure`, blank
  childName→MergeError on pet-plus re-render, blank superpower re-triggers fallback chain).

**Nice-to-have (not blocking, same as the Story-7 finding — now half-closed):**
- `lib/ai/story8-prompts` is NOT in surface.boundary.test.ts FORBIDDEN_LOCAL (story7-prompts
  WAS added since the feature-28 review). Latent-not-active: story-8.ts imports only pure
  modules so the public closure is clean and the test passes. Add the line for parity; PR-B
  (catalog entry) is the natural enforcement point.
