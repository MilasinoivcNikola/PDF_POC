---
name: letter-signoff-bytesafe
description: Each letter-reuse book registers a DISTINCT sign-off sentinel in LETTER_SIGNOFFS; byte-identity gate confirms it never mis-splits an existing book
metadata:
  type: project
---

The shared letter renderer (`lib/pdf/pages-story2.tsx`) splits the Page-6 body into
prose + signature block at the FIRST paragraph that exactly equals one of
`LETTER_SIGNOFFS` (a set, matched by `===`). Each letter-reuse book adds its own
sign-off string: Story 2 = "Yours, always,", Story 4 = "Yours,", Story 5 = "With
all my love, always,".

**Why:** the renderer must find the signature start WITHOUT coupling to a page id
or to resolved copy (variants change the prose). A sign-off sentinel carries no
merge field, so it's invariant across that product's variants.

**How to apply when adding a new letter book:**
- Pick a sign-off string that is (a) distinct from every existing sentinel and (b)
  never a standalone existing-body paragraph in ANY other letter product. If it
  collides with or appears mid-body in another book, adding it to `LETTER_SIGNOFFS`
  would mis-split that book and change its PDF bytes.
- Keep the sentinel RELATIONSHIP-INVARIANT: even the couple ("we"/"our") variant
  keeps the same sign-off line, so the master template's suggested "With all our
  love" couple valediction is intentionally NOT used — the single sentinel stays
  the split point. (Minor voice divergence; flagged for review each time. Story 4's
  couple "Yours," is the same precedent.)
- The byte-identity gate is what proves no mis-split: render every existing letter
  fixture and compare length + timestamp-normalized SHA against clean `main` — the
  established Story-1/2/4 byte-identity method (raw SHA differs per render by the
  Chrome `/CreationDate`+`/ModDate`; normalize `D:\d{14}` → fixed before hashing).
  Confirmed lengths at feature 23: Story 1 = 873889, Story 2 = 119398, Story 4 =
  122588 bytes (all unchanged by adding Story 5's sentinel).

See [[letter-wash-page-id-hardcoded]] for the one letter-renderer constant that was
NOT generalized the same way.
