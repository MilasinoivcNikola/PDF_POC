---
name: byte-identity-template-test-list-lag
description: coding-standards.md byte-identity rule (~L259) hard-lists only template.test.tsx / template.story2.test.tsx; each new per-story template test (story4, story6, …) makes the enumeration stale
metadata:
  type: project
---

`context/coding-standards.md` PDF-pipeline byte-identity rule (~L256-261) says the structural
half is "test-enforced: `lib/pdf/template.test.tsx` / `template.story2.test.tsx`" — a **hard
two-file enumeration**. But per-story template tests accrete: `template.story4.test.tsx` (PR-04)
and `template.story6.test.tsx` (`feature/story-samples-06`, 2026-06-15) now also exist on disk.
So the prose lists 2 of 4. Pre-existing lag (started at PR-04), re-exposed by each new
template-touching story PR.

**Recurring drift to expect:** any branch that adds `lib/pdf/template.storyN.test.tsx` widens the
gap. The fix direction is **update the doc** — either drop the literal file list for a glob
("`lib/pdf/template*.test.tsx`") or append the new file. Low-to-medium severity: it slightly
misleads ("only these two lock structure") but the guarantee still holds and the real test files
are discoverable.

**Companion convention also unrecorded:** the byte-identity rule + new-book-playbook Step 3
don't name the **page-id art allow-list** mechanism (`DEDICATION_ART_PAGE_IDS` / `LOVE_ART_PAGE_IDS`
/ PR-04's `LETTER_FEATURE_PAGE_IDS`) as the canonical byte-safe way to make a SHARED layout
component carry art for one new book while keeping every other product byte-identical. Playbook
Step 3 (~L168-203) currently says "reuse a layout → skip this step, renderer already handles it" +
documents only the ONE `letter` sign-off exception — so a future reuse-book author isn't told this
second kind of in-bounds shared-renderer edit exists. See [[letter-layout-reuse-renderer-touch]]
(the generalized pattern), [[masterstory-slot-id-lag]], [[new-book-playbook-pr10]].
