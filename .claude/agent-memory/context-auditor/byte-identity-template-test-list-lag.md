---
name: byte-identity-template-test-list-lag
description: coding-standards.md byte-identity rule (~L259) hard-lists only template.test.tsx / template.story2.test.tsx; each new per-story template test (story4, story6, …) makes the enumeration stale
metadata:
  type: project
---

`context/coding-standards.md` PDF-pipeline byte-identity rule (~L259-261) hard-lists the per-story
template tests as `template.story2/story4/story6.test.tsx` — a **closed enumeration** (the
`template*.test.tsx` glob is also written, but the parenthetical names specific files). Per-story
template tests accrete: `template.story7.test.tsx` now also exists (`feature/story-samples-07`,
2026-06-15) → list says story2/4/6 but disk has story2/4/6/**7** + template.test. Pre-existing lag
(started at PR-04), re-exposed by each new template-touching story PR.

**Recurring drift to expect:** any branch that adds `lib/pdf/template.storyN.test.tsx` widens the
gap. The fix direction is **update the doc** — either drop the literal file list for a glob
("`lib/pdf/template*.test.tsx`") or append the new file. Low-to-medium severity: it slightly
misleads ("only these two lock structure") but the guarantee still holds and the real test files
are discoverable.

**Companion convention — the allow-list family now has a 4th member with a NOVEL twist.** Both
coding-standards (~L262-265) + playbook Step 3 (~L184-193) enumerate the art-allow-list mechanism
as `DEDICATION_ART_PAGE_IDS` / `LOVE_ART_PAGE_IDS` / `LETTER_FEATURE_PAGE_IDS`. `feature/story-samples-07`
adds `CLOSING_COVER_FALLBACK_PAGE_IDS = ["welcome-closing"]` in `pages.tsx` — same per-story
page-id-gating pattern, but the **first that reuses the COVER art** (passed as a new `coverSrc` arg
threaded `StoryPages → renderPage → ClosingPage`, cover found by `layout === "cover"`) for a closing
page that is NOT one of the book's illustration slots — rather than the page's own slot art. Story 7
ends at `welcome-belong`; `welcome-closing` isn't a slot, so the generic placeholder face leaked.
So **both docs' allow-list enumerations are now stale** (list 3 of 4), and neither records the
"reuse cover art on a non-slot page" sub-variant. Same fix direction as the test list: update the
doc (append the constant, or generalize the prose). Non-blocking — guarantee still holds, Story 1's
`page-12` is its own slot so it's untouched/byte-identical. See [[letter-layout-reuse-renderer-touch]]
(the generalized pattern), [[masterstory-slot-id-lag]], [[new-book-playbook-pr10]].
