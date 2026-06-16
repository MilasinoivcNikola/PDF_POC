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
**Resolved by 2026-06-15:** line ~59 now reads `{wizard,preview,site}` and the gloss says
"`site/` holds the public SiteHeader / SiteFooter chrome." NOTE the gloss is now an
*enumeration of site/'s contents* — book-detail PR-2 (2026-06-16) adds a third file to
`site/`, `BookGallery.tsx` (a `"use client"` leaf island), so "holds SiteHeader/SiteFooter"
is now under-stating site/'s membership. Low-pri nice-to-have (the convention holds; a
reader isn't misled into doing the wrong thing) — recommend widening the gloss or making it
non-exhaustive ("e.g. SiteHeader/SiteFooter chrome, the BookGallery island"), not blocking.

**How to apply:** On any branch that adds a `components/<new-area>/` dir, check whether
line ~59's brace list still enumerates the live set. Severity = nice-to-have (a reader
treating it as the complete list is mildly misled, but the convention itself holds).
Recommend "update the doc" (widen the example, or make it non-exhaustive: "e.g. wizard,
preview, site"). Re-read the line live — it moves.

Related: brand single-source (`lib/brand.ts` BRAND + now TAGLINE as of PR-2) is documented
**only in the file's own header comment**, NOT in CLAUDE.md/coding-standards — so adding a
sibling constant there is self-maintaining and is NOT doc drift. See [[canonical-doc-map]].
