---
name: playbook-undocumented-conventions
description: Two new-book conventions followed in code (Story 4/5/6) but never recorded in new-book-playbook.md — flag on the next new-book branch
metadata:
  type: project
---

Recurring drift pattern: the new-book recipe (`context/new-book-playbook.md`) lags
two conventions that books keep following from code precedent, not from the doc.

**1. Page-id prefix even when reusing a layout value.** Each book prefixes its page
ids with a distinct slug — `page-N` (Story 1), `letter-*` (Story 2), `talk-*` (Story 4),
`note-*` (Story 5), `tribute-*` (Story 6) — *even when it reuses an existing
`PageLayout` value*. Reusing a layout value ≠ reusing a page id. Playbook **Step 1a**
(extend the `<Book>PageId` union) never states this rule; the only doc trace is the
incidental `talk-page-4` example. Story 6 (PR-25) is the first narrative-layout-reuse
book since Story 1 and still got it right from code, not the doc.

**2. Story-1-shape reference-anchor accounting (`slots + 1`).** A reference-anchored
*narrative* book (Story 1, Story 6) locks a separate `reference.png` anchor that is NOT
one of its `illustrationSlots`, so its image count is `slots + 1`, while the letter
books (figure-free or 2-slot) are exactly `slots`. `generate-illustrations/route.ts`
encodes this as `REFERENCE_ANCHOR_STORIES = {story-1, story-6}`. The playbook's
imagery-shape note (lines ~113–118) frames only figure-free vs reference-anchored per
slot, not the separate-reference-anchor count a Story-1-shaped book needs. Story 6 is
the first reference-anchored new book since Story 1.

**2b. `REFERENCE_ANCHOR_STORIES` is a hand-maintained set, not derived.** The `slots + 1`
accounting in `app/(operator)/api/generate-illustrations/route.ts` (the WIZARD progress
endpoint) is gated on a hardcoded `REFERENCE_ANCHOR_STORIES = {story-1, story-6}`. A new
reference-anchored narrative book must be ADDED to that set or its wizard progress UI
under-counts by one (the separate `reference.png`). Story 7 (feature 28 PR-A) is
reference-anchored (`slots + 1 = 9`) but was NOT added — latent, because PR-A makes the
book non-creatable (draft handling throws "not wired yet in PR-B"), so the wizard route
never fires. It bites in PR-B (feature 29) when Story 7 becomes creatable. The worker
(`lib/order/worker.ts`) does NOT duplicate this count — it relies on
`generateAllIllustrations` directly — so only the wizard route is affected.

**Why:** all surfaced as low-priority nice-to-haves in the Story 6 (PR-25) + Story 7 (PR-A,
feature 28) audits — in-spec work the doc just doesn't yet name. Not blockers; the PRs were
correct without them. Story 7 is also the FIRST **mixed** imagery set (reference-anchored +
one figure-free `welcome-before` wash) — the playbook's imagery-shape note frames per-slot
figure-free vs reference but never names a mixed-set book; worth a one-liner too.

**How to apply:** on the next new-book branch that reuses a narrative layout or is
reference-anchored, propose adding these one-liners to the playbook (Step 1a + the
imagery-shape note) so the convention stops living only in code, AND check whether the new
story needs adding to `REFERENCE_ANCHOR_STORIES` (flag for the PR that makes it creatable).
See [[canonical-doc-map]] (playbook = canonical add-a-book recipe) and
[[masterstory-slot-id-lag]] (related: template slot-id guesses vs the registry).
