---
name: claudemd-masterstory-load-lag
description: Recurring drift — CLAUDE.md's masterstory @-load list + in-progress @-load convention lags each new story milestone
metadata:
  type: project
---

CLAUDE.md (the "Load on demand" block, ~line 29) keeps an explicit list of which
`context/masterstories/story-N-master-template.md` files exist + their status
("Story 7 complete"), AND states a convention: *the in-progress story's masterstory
stays `@`-loaded for the duration of its milestone — add it to the always-loaded list
while building, remove on completion.*

**Recurring drift:** this list lags every new story milestone. Confirmed on the Story 8
PR-A branch (`feature/story8-text`, feature 31): CLAUDE.md had **zero** Story-8 mention,
yet PR-A is the branch authoring Story 8 text *from* `story-8-master-template.md` — exactly
when the convention says it should be `@`-loaded. The masterstory file exists on disk
(`context/masterstories/story-8-master-template.md`, 37KB) but appears on neither list.

**Why it recurs:** the masterstory authoring happens in the text PR (PR-A), but CLAUDE.md
edits are easy to forget there — PR-0/PR-A specs point at the masterstory by path, not via
the CLAUDE.md list, so nothing forces the edit. Story 7's entry only landed via its own PRs.

**How to apply:** on any `storyN-text` / `storyN PR-A` branch, check CLAUDE.md's load-on-demand
masterstory list — flag if (a) the new story's masterstory isn't in the list, or (b) it isn't
`@`-loaded in the always-loaded block while the milestone is in progress. Recommend *update the
doc*. Severity: blocking-ish (the convention is an explicit instruction the branch violates),
but low-stakes in practice. Pairs with [[milestone-completion-claudemd-load-cleanup]] (the
*removal* half on completion).
