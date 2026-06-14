---
name: playbook-prototype-exception-lag
description: Story 8's spec + masterstory both cite an "illustration-prototype exception" in new-book-playbook.md that the playbook does not actually contain — staleness/omission
metadata:
  type: project
---

Drift surfaced on `feature/story8-prototype` (feature 30, PR-0): both the spec
(`context/features/30-story8-prototype-gate.md` line 5) and the Story 8 master
template (`context/masterstories/story-8-master-template.md` lines ~25, ~54) cite
`context/new-book-playbook.md` as **naming an illustration-prototype phase as the
exception** to the lightweight authoring path ("Do not greenlight this as a lightweight
authoring branch", "per new-book-playbook.md Step 3 new PageLayout work is near-zero").

**But the playbook has no such exception text.** As of 2026-06-14 it has exactly one
"exception" callout (line 166, the `letter`-layout shared-renderer note). There is no
prototype/go-no-go/illustration-risk-gate section anywhere in it. So the cross-references
point at content that does not exist.

**Severity: nice-to-have, not blocking.** Story 8 PR-0 itself is in-spec (it touches only
`lib/ai/*` + `scripts/` + `package.json`, all expected). The playbook is the canonical
add-a-book recipe; a future high-risk book (or Story 8 PR-A/PR-B) would benefit from the
playbook actually carrying the "if the illustration is the moat, prototype it FIRST as a
deletable PR-0 gate before authoring" recipe. Recommend: when PR-A/PR-B land (or now),
add a short "illustration-prototype exception" section to the playbook so the citation
resolves.

**How to apply:** if a future audit sees the playbook updated with a prototype-exception
section, this is resolved — drop the finding. See [[new-book-playbook-pr10]],
[[playbook-undocumented-conventions]] (same pattern: playbook lags conventions code
already follows).

Related env-file precedent (separate, lower): `proto:story8` is the FIRST CLI script in
package.json to use `--env-file-if-exists=.env.local` (a built-in Node 22 / tsx flag, NOT
a new dependency — no standards violation). `render:test` + `process:orders` lack it and
rely on ambient env. Latent inconsistency worth a debt.md one-liner, not a doc fix.
