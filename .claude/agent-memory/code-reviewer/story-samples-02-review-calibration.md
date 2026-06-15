---
name: story-samples-02-review-calibration
description: Story-2 cat sample-set PR — the load-bearing check is running resolveStory2 on the fixture (zero placeholders + no "passed away"); Story 2 never says "died" literally and that's fine
metadata:
  type: feedback
---

Story-sample PRs (one paid mixed-tier run → fixture + overwritten sample JPGs + slim
preview.pdf + a one-line `previewPdf` in `lib/catalog/products.ts` + a test relax) are a
recurring small shape. Calibration for reviewing them:

**The one check that actually matters: run the resolver on the fixture.**
`tsx --tsconfig scripts/tsconfig.json` a 10-line script that JSON-loads the fixture, calls
`resolveStory2`/`resolveStoryN`, `JSON.stringify`s the pages, and asserts
`/\[[A-Z][A-Z0-9_]*\]/` → NONE and `/passed away/i` → false. Everything else (enum values,
shape) the tsc/vitest pass already covers; the placeholder/quality-bar bar does not.

**Story 2 letter voice never uses the literal word "died"** — it says "I know how it ended."
So a "HAS_DIED: false" result is NOT a quality-bar miss. The bar is *absence of "passed
away"*, not *presence of "died"*. Do not flag the missing "died" on the letter stories.

**`previewPdf` is data-only** — `Product.previewPdf?: string` + the `buildProduct` pick list
(~line 157/173 of products.ts) already exist since Story 1, and the detail page already
conditionally renders the link. So a sample PR adds ZERO type/import/JSX change — just a
catalog string + a slim PDF under `public/samples/<id>/`. Confirm no new import in
products.ts (keeps it pure/client-safe). The slim preview.pdf is ~700K (vs Story 1's
deliberate 31MB full-res HIGH exception) — slim is correct here, not a regression.

**Test relax pattern (sound):** replace the "only story-1 has a previewPdf" count invariant
with a `WITH_PREVIEW` Map<id,path> + per-product assert-or-undefined. Verify the map has
EXACTLY the set of products that carry `previewPdf:` in products.ts (grep it) — a missing id
makes a real product fail the else-branch. Not brittle; next PR just adds its id.

**Validated non-blockers:** committed sample JPGs/PDF under `public/` are correctly
NOT gitignored (verify with `git check-ignore`); the fixture photo
`uploads/sample-photos/cat.jpg` is the PR-0 `.gitignore`-negation tracked file (verify
`git ls-files`). No secrets in fixtures (free-text memories only).
