---
name: deferred-decisions-blocking-prs
description: The PM "Deferred product decisions" tables (00-overview + commerce-roadmap) flag refund/remake, AI-honesty, pricing as blocking at specific PRs — audit whether the named PR actually settled it
metadata:
  type: project
---

Two docs carry a **Deferred product decisions** list keyed to a blocking PR:
`context/features/00-overview.md` (table, names the PR — e.g. "Refund/remake policy —
blocking at **PR-09**") and `context/commerce-roadmap.md` (a bullet list + a
**Resolved (PR-NN, date)** block-quote appended as each lands, e.g. PR-08's admin-auth).

**Why:** these are *product* decisions the PM owns, not code; they don't show up in a diff,
so the audit step is the natural place they get checked off (or flagged still-open).

**How to apply:** when auditing the PR a deferred item is keyed to, check both:
1. Did the code actually settle it? (PR-09 surfaced a *link* to `/policies` in the
   delivery email + download page, but `/policies` refund/remake copy is still
   `PLACEHOLDER — PM sign-off before launch` — so the **decision** is NOT settled, only
   the plumbing that will display it. current-feature.md itself says "Flag for Nikola
   before complete.")
2. Are the docs updated? If settled, the roadmap should gain a `Resolved (PR-NN, date)`
   note (like PR-08's admin-auth) and 00-overview's table row should be marked done.
   If still-open (PR-09 case), the blocking line is a fair, real "still open before
   launch" flag — note it as a non-blocking PM item, not doc drift.

Settled supersessions already recorded as Resolved: **PR-08 → Admin auth method =
Supabase Auth** (roadmap block-quote, 2026-06-11). Still open after PR-09: refund/remake
policy *copy*, AI-honesty disclosure copy — both gate launch, both display through
`/policies` placeholders. See [[deploy-surface-secrets-lag]] for the lib/structure side.
