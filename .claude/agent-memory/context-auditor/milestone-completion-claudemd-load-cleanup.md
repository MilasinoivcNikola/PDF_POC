---
name: milestone-completion-claudemd-load-cleanup
description: When a story-milestone's final PR (the sellable PR-B) lands, CLAUDE.md still @-loads that story's masterstory with a "Remove on milestone completion" note — flag the cleanup as now-due
metadata:
  type: feedback
---

CLAUDE.md keeps the **in-progress** story's masterstory in its always-loaded `@` set
"for the duration of its milestone" and annotates it `Remove on milestone completion`
(CLAUDE.md line ~22 + the convention line ~30). When auditing the PR that **completes**
that story (the sellable PR-B — e.g. feature 29 completed Story 7), this cleanup is now
**due**: the `@`-load line + the "(in-progress milestone …)" note should be removed/moved
to the load-on-demand list, per CLAUDE.md's own note.

**Why:** it's a CLAUDE.md `@`-load hygiene item, not a code/doc contradiction — but it's
genuinely would-mislead (a future session is told the milestone is in-progress when it's
done, and keeps a finished masterstory in the lean always-loaded set, defeating feature 27's
lean-context goal). Surfaced on the Story 7 PR-B audit.

**How to apply:** this fires on **milestone-completing** PRs (the PR-B / "completes Story N"
ones), and the cleanup itself happens at **workflow step 10 (`/feature complete`) on merge**,
not in the code diff — so report it as a **nice-to-have / on-merge** action, not a code
blocker. Recommend *update the doc* (move the masterstory line from the `@`-loaded set to the
load-on-demand list, drop the in-progress annotation). See [[canonical-doc-map]].
