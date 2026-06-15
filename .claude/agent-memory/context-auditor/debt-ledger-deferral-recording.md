---
name: debt-ledger-deferral-recording
description: Recurring drift check — a spec that says "note in context/debt.md if still wanted" must actually add the row in the same branch; verify it landed
metadata:
  type: project
---

When a feature spec defers work with language like *"note in `context/debt.md` if we
still want it"* or *"deferred (see Decisions)"*, the branch is expected to **add the
debt.md row in the same PR** — that is the project's own step-10 convention
(`ai-interaction.md` workflow + `debt.md` header: "when a feature defers something that
outlives the branch, add a row here").

**Why:** the debt ledger is the single home for durable deferrals (feature 27 seeded it
precisely so deferrals stop getting buried). A deferral that lives only in the feature
spec disappears once the spec is archived/superseded — future work won't see it.

**How to apply:** for any audited branch, grep `context/debt.md` for the deferred item.
If the spec's "Out of scope / Resolved decisions" defers something with a debt.md
pointer and no matching row exists, that's a staleness/omission finding —
**recommend: update the doc (add the debt.md row)**, not change code.

Seen on `feature/public-refresh-detail-pages` (Public Refresh PR-4): the per-book
"inside the book" TOC was deferred with "note in debt.md if still wanted" — no row was
added. See [[canonical-doc-map]] (debt.md owns durable deferrals).
