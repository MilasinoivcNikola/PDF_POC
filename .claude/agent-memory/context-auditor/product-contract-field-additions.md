---
name: product-contract-field-additions
description: When a branch adds an optional field to the Product contract (lib/catalog/products.ts), two docs lag — coding-standards lib/catalog blurb + new-book-playbook field list
metadata:
  type: project
---

Adding an optional field to the `Product` contract in `lib/catalog/products.ts`
(e.g. `previewPdf?` on the story1-high-sample-preview branch; earlier `audience`,
`displayTitle`) tends to leave two standing docs behind:

1. **coding-standards.md** ~L134-145 (the `lib/catalog/` "Commerce catalog" blurb)
   enumerates the contract's notable per-product fields (`illustrationCount`
   derived, `sampleImages` under `public/samples/`). A new optional field is not
   listed there. Low-priority: the blurb is illustrative, not an exhaustive schema,
   so a missing optional field rarely *misleads* — flag only as nice-to-have.
2. **new-book-playbook.md** Step 4 field list (~L201-222) + Step 6 Samples. The
   playbook owns the "adding a book" recipe. A new optional field that a future book
   *could* set should get a one-liner here. Note: `audience` was correctly added in
   PR-1 (precedent that the playbook is the right home).

**Why:** the playbook is the canonical add-a-book recipe ([[new-book-playbook-pr10]]);
coding-standards owns the contract description. Both can go stale on a contract change.

**How to apply:** on any branch touching the `Product` interface, grep
new-book-playbook.md Step 4 and coding-standards.md L134-145 for the new field name;
if absent, recommend *update doc* (playbook = real omission if the field is
book-authorable; coding-standards = nice-to-have unless the omission misleads).

**Cost-tier nuance (story1-high case):** a *one-time sample-asset HIGH run* via a
throwaway script (passing `sceneQuality/referenceQuality: "high"` explicitly) is NOT
a violation of the "low is default" rule — the engine default is unchanged; the
script is an explicit opt-in override (the rule's sanctioned `medium`/`high` case).
Don't flag it as a cost-tier contradiction. The playbook's Step 6 still says samples
are Low — that stays true for *new books*; Story 1's HIGH set is a deliberate
hero-title exception, not a recipe change. See [[rate-limit-figure-drift]] for the
related "~5/min vs 20/min" figure (this spec correctly uses the 20 IPM number).
