---
name: letter-wash-page-id-hardcoded
description: pages-story2.tsx hardcodes LETTER_WASH_PAGE_ID="letter-page-5", so a new letter-reuse book's belief wash won't render until it's generalized
metadata:
  type: project
---

In `lib/pdf/pages-story2.tsx`, the belief-frame wash only renders when
`page.id === LETTER_WASH_PAGE_ID` AND a `src` is present — and `LETTER_WASH_PAGE_ID`
is the literal string `"letter-page-5"` (Story 2's wash page id).

**Why:** the shared letter renderer was written for Story 2 first; the wash-page
check was never generalized when Stories 4 and 5 reused the `letter` layout.

**How to apply:** any NEW letter-reuse book whose belief-wash page is NOT
`letter-page-5` (e.g. Story 5's `note-page-5`, a future book's `xxx-page-N`) will
silently NOT render its generated wash image through the shared renderer until
`LETTER_WASH_PAGE_ID` is turned into a set/predicate covering each product's wash
slot. The PDF text + structure render fine (placeholder/`render:test` is unaffected
because it passes no image `src`); only the real Premium wash goes missing. This is
the imagery agent's / a render-CSS follow-up's concern, not the text/registry PR.
Sign-off detection (`LETTER_SIGNOFFS`) was already generalized to a set; the wash
page-id was the one that wasn't. See [[letter-signoff-bytesafe]].
