---
name: new-book-wizard-seams
description: Easy-miss seams a new sellable book's PR-B must touch beyond the spec (storage.newDraft, disk/order.ts session unions, REFERENCE_ANCHOR_STORIES + illustrationLabels, root-level draft fields, gate-at-generate)
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
  `StoryNSession`, or `writeSession` won't accept it.
- **`lib/order/types.ts`** — the `Order.inputs` session union must include the new
  `StoryNSession`. Confirmed Story 9 (feature 33): the engine PR-A did NOT widen it,
  so the public `/api/order` route fails tsc (`draftToSessionForDraft` returns the
  wider union than `Order.inputs` accepts). The memory's old "may already have been
  widened in PR-A" hedge is WRONG for a PR-A that skips Step-3/render work — widen it
  yourself in PR-B. (`lib/order/store.ts` rowToOrder/orderToRow needed no change —
  it round-trips `inputs` as opaque JSON.)

**Why:** these are generic, product-agnostic seams, so the per-book spec author
forgets them; tsc only catches the `disk.ts` one, not the `storage.ts` fallthrough
(it's a runtime wrong-shape, not a type error). **How to apply:** when implementing
any new book's wizard/order PR, grep `newStory6Draft`/`AnySession` and mirror, even
if the spec didn't list `storage.ts`/`disk.ts`.

Related: the hand-maintained `REFERENCE_ANCHOR_STORIES` set in
`app/(operator)/api/generate-illustrations/route.ts` is another easy-miss seam — a
reference-anchored book must be added there or the progress bar undercounts by one
(`slots + 1`). The spec usually *does* flag this one. **Approach A counts too:** Story
9 (feature 33) is Approach A (only the PET is photo-anchored, baby/adults generic) and
STILL writes a `reference.png` anchor, so it belongs in the set just like the Approach-B
Story 8. Don't assume "Approach A → no anchor". Mirror it in TWO client-safe places:
the route's set above AND `components/wizard/illustrationLabels.ts` (a new
`*_ILLUSTRATION_SLOTS` list whose FIRST entry is `"reference"` + a `storyNLabelsFor`
map + both dispatch branches `illustrationSlotsFor` / `illustrationLabel`).

**Root-level draft fields are a third seam (new with Story 9).** Story 9's
`babyName`/`babyArrival` live on the draft/session ROOT, not in a group. The
`WizardProvider.updateDraft` shallow-merge only touches NAMED groups, so a root field
needs: (1) a top-level optional key on `DraftPatch`, and (2) an explicit
`if (patch.X !== undefined) merged.X = patch.X` line in the merge — otherwise
`updateDraft({ babyName })` is silently dropped. The wizard step calls
`updateDraft({ babyName: ... })` directly (no group wrapper).

**Gate-at-generate for conditional fields (Story 7 yearsHome / 8 childName / 9
babyName):** collect the conditional field on its step with NO step-level block; gate
it only in `missingRequiredFields*` at generate, by which point the toggle it depends
on is known. Story 9's `babyName` goes further — it's NEVER required (degrades to
"the new baby" on the expecting path AND when blank), so it isn't in the gate at all;
only the variant layer handles it. Don't add a step-level required check for it.

**Boundary-test is a no-op for a normal new-book PR-B** (confirmed Story 7 & 8):
the public storefront/order surface lives entirely in the *generic* dynamic routes
`/books/[productId]` + `/order/[productId]`, which are already registered in
`lib/runtime/surface.boundary.test.ts`. A new book adds a *catalog entry* + an
`isStoryN` branch inside those existing files — no NEW public page/route file — so
nothing needs adding to `PUBLIC_ENTRIES`/`PUBLIC_API_ENTRIES`. The only new file
(`app/(operator)/create/<step>/page.tsx`) is operator-side, not public. Don't go
hunting for a boundary registration that isn't needed; just re-run the test green.
