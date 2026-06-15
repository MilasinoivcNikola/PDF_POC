---
name: components-dir-enumeration-lag
description: coding-standards.md line ~59 hard-lists shared-UI subdirs as {wizard,preview}; goes stale each time a new components/<area>/ lands
metadata:
  type: project
---

`context/coding-standards.md` (React & Next.js section, ~line 59) reads:
"Shared UI goes in `components/{wizard,preview}/` as named exports." The braced set
is an **enumeration**, so it goes stale whenever a new shared-UI area directory is added.

**Why:** Public Refresh PR-2 (feature/public-refresh-chrome-landing, 2026-06-15) added
`components/site/` (SiteHeader/SiteFooter, named server-component exports for shared public
chrome) — a third sibling to wizard/preview. The *rule* (shared UI in `components/<area>/`
as named exports) was followed correctly; only the literal `{wizard,preview}` list lagged.

**How to apply:** On any branch that adds a `components/<new-area>/` dir, check whether
line ~59's brace list still enumerates the live set. Severity = nice-to-have (a reader
treating it as the complete list is mildly misled, but the convention itself holds).
Recommend "update the doc" (widen the example, or make it non-exhaustive: "e.g. wizard,
preview, site"). Re-read the line live — it moves.

Related: brand single-source (`lib/brand.ts` BRAND + now TAGLINE as of PR-2) is documented
**only in the file's own header comment**, NOT in CLAUDE.md/coding-standards — so adding a
sibling constant there is self-maintaining and is NOT doc drift. See [[canonical-doc-map]].
