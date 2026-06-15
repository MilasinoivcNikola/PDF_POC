---
name: cost-tier-rule-canonical
description: The LOW-default cost-tier rule is now nuanced (mixed-tier production policy); two doc spots restate it and drift independently
metadata:
  type: project
---

The AI cost-tier rule changed from "LOW for everything (dev AND real book runs)"
to a **two-part rule** (feature `mixed-tier-illustration-quality`, branch
`feature/mixed-tier-quality`, 2026-06-15):

1. **LOW is the *engine default*** — for dev/prototype iteration and bare
   `generateAllIllustrations(session)` calls (and sample generation).
2. **Real production book runs use the locked MIXED policy** — `PRODUCTION_QUALITY`
   in `lib/ai/generate.ts`: hero slots (`heroSlots`, default = title's own cover
   `illustrationSlots[0]`) → HIGH, interiors → MEDIUM, reference → LOW. ~$1/book
   (vs ~$3 all-HIGH). Passed explicitly by the worker (`lib/order/worker.ts`) and
   the operator repaint route. Per-page tier = pure `qualityForPage()`.

**Why this matters for audits:** the phrase "LOW is the default for real book runs"
is now WRONG. The rule is restated in **multiple doc spots that drift independently**:
- `coding-standards.md` AI-illustration section (the canonical owner — updated in-branch).
- `new-book-playbook.md` Step 6 "Samples" (~L273) — said "Low is the default cost tier
  **for real book runs**". On a mixed-tier audit this was stale: LOW is right for *samples*,
  wrong for *real book runs* (those go through the worker w/ PRODUCTION_QUALITY).

**How to apply:** on any AI-tier branch, grep both `coding-standards.md` AND
`new-book-playbook.md` (Step 6) for "real book run" / "default cost tier" / "defaults
scenes to `low`" wording and check it distinguishes engine-default (LOW) from
production-policy (mixed). The `heroSlots` default is the title's OWN cover
(`illustrationSlots[0]`, e.g. `letter-cover`), NOT a literal `["cover"]` — an early
draft said `["cover"]`; that wording is stale if it survives. See [[canonical-doc-map]].
