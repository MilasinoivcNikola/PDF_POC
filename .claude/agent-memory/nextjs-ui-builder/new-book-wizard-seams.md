---
name: new-book-wizard-seams
description: Hidden draft-seam files a new sellable book must touch beyond the spec's list (storage.ts newDraft, disk.ts AnySession)
metadata:
  type: project
---

When wiring a new sellable book's wizard/order surfaces (the Story-N PR-B pattern),
two seam files are load-bearing but are routinely **missing from the feature spec's
"files to edit" list** — both bit Story 7 (feature 29):

- **`lib/session/storage.ts`** — must add `newStory<N>Draft()` + an overload +
  the dispatch in `newDraft()`. Without it, `newDraft("story-N")` silently falls
  through to `newStory1Draft()` and returns the WRONG draft shape (Story 1's
  `child` group), so the order form / wizard seed the wrong product. Pre-seed the
  same defaults the first wizard step's radios show (`species: "dog"`,
  `illustrationStyle`, and the book's toggle defaults) so the draft matches what the
  user sees before they touch a control.
- **`lib/session/disk.ts`** — the `AnySession` union must include the new
  `StoryNSession`, or `writeSession` won't accept it. (Note `lib/order/types.ts` +
  `lib/order/store.ts` may already have been widened in the engine PR-A.)

**Why:** these are generic, product-agnostic seams, so the per-book spec author
forgets them; tsc only catches the `disk.ts` one, not the `storage.ts` fallthrough
(it's a runtime wrong-shape, not a type error). **How to apply:** when implementing
any new book's wizard/order PR, grep `newStory6Draft`/`AnySession` and mirror, even
if the spec didn't list `storage.ts`/`disk.ts`.

Related: the hand-maintained `REFERENCE_ANCHOR_STORIES` set in
`app/(operator)/api/generate-illustrations/route.ts` is another easy-miss seam — a
reference-anchored book must be added there or the progress bar undercounts by one
(`slots + 1`). The spec usually *does* flag this one.
