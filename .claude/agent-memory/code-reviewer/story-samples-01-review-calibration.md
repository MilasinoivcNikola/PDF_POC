---
name: story-samples-01-review-calibration
description: Story-1 pug sample PR (retired the flagship HIGH run) — data-only refresh, clean except a self-documented doc-drift class; the retirement-doc-drift is the recurring trap
metadata:
  type: feedback
---

Story Samples PR-01 (`feature/story-samples-01-pug`, reviewed uncommitted). Replaced
Story 1's Bo-boxer flagship-HIGH sample with a pug "Mango" example on the **standard
mixed-tier harness** — retiring the one-time `proto:story1-high` exception. Diff:
new `fixtures/sample-story1-dog.json`, `book-questions.ts` Story-1 examples + test
pin repointed `story1-high.json`→`sample-story1-dog.json`, `package.json` drops
`proto:story1-high`, `coding-standards.md` retires the HIGH-preview line, regenerated
binary assets. Verdict: **CHANGES NEEDED** (doc-drift nits only; no code blocker).

**Load-bearing checks that held (re-run these on any sample PR):**
- Ran `getStory(s.storyType ?? "story-1").resolve(s)` over the new fixture: zero
  surviving `[FIELD]`, "passed away" ABSENT, "died" PRESENT, "love" present. Quality bar met.
- All 13 fixture pins resolve to strings AND match the `book-questions.ts` examples
  byte-for-byte (incl. the deliberate comma-not-em-dash in `favoriteMemory`). The
  `book-questions.test.ts` suite (129 tests) passes.
- Fixture shape == `StorySession` (Story 1), field-for-field == sibling `story1-high.json`
  / `sample-story5-dog.json`. No `storyType` is CORRECT (reads as story-1 via `?? "story-1"`).
- `id: "sample-story1-dog"` + filename follow the `sample-story{N}-{species}` sibling
  convention; photo `uploads/sample-photos/story-1.jpg` tracked via gitignore negation.
- `package.json` valid JSON, no dangling alias. The kept `scripts/story1-high-run.ts`
  (PM chose to keep as historical record — DO NOT flag as dead code) references the
  removed `proto:story1-high` only in a comment + is still runnable via raw `tsx`.

**The recurring trap on a "retire an exception" PR — doc-drift across parallel docs.**
The PR updated `coding-standards.md` (good) but the retired claim ("Story 1 *additionally*
carries a one-time full-res HIGH preview via `proto:story1-high`/~31 MB") also lives in
**`new-book-playbook.md` L314 + L412-413** — left stale, now FALSE on merge. And the
in-code **`book-questions.ts:58` comment still says `Example pinned to fixtures/story1-high.json`**
while the test repointed to `sample-story1-dog.json` — every sibling block names its OWN
sample fixture, so this is the one block out of step. **On any retire/rename PR: grep the
RETIRED fact-string (here "full-res HIGH" / "proto:story1-high" / "31 MB"), not just the
file you edited — the same claim is usually duplicated in `new-book-playbook.md` +
`coding-standards.md` + an in-code comment.** Both flagged as nice-to-haves (docs, not
behavior); PM treats doc-drift as non-blocking but worth a one-line fix while in-branch.
The context-auditor's own memory note (in this same diff) independently corroborated both.
