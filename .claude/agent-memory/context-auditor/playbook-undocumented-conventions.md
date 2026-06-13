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

**Why:** both surfaced as low-priority nice-to-haves in the PR-25 (Story 6) audit —
in-spec work the doc just doesn't yet name. Not blockers; PR-25 was correct without them.

**How to apply:** on the next new-book branch that reuses a narrative layout or is
reference-anchored, propose adding these one-liners to the playbook (Step 1a + the
imagery-shape note) so the convention stops living only in code. See
[[canonical-doc-map]] (playbook = canonical add-a-book recipe) and
[[masterstory-slot-id-lag]] (related: template slot-id guesses vs the registry).
