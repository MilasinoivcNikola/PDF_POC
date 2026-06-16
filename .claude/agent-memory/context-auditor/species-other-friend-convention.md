---
name: species-other-friend-convention
description: Canonical "other" → "friend" graceful-noun rule for printed prose, and which doc owns it — for auditing any story-text/new-book branch
metadata:
  type: project
---

The catalog-wide rule: a pet's `species: "other"` (a real wizard option) must render a
graceful noun in **printed prose**, never the raw word "other" (which yields "a other",
"just a other", "Emma's other"). The chosen noun is **"friend"**, mirroring
`speciesDescriptor`'s existing `other → "friend"` rule.

**Three coexisting mechanisms in code (all → "friend" for `other`):**
- **Story 4** — `climaxSpeciesNoun()` local helper in `story4/variants.ts` (the Page-6
  "as much as a {species} can love" line is composed at the variant layer, so the static
  `master-text.ts:180` `{species}` never reaches output for `other`).
- **Story 9** — local `speciesNoun` in its page builders.
- **Stories 1, 2, 5, 7, 8** — a derived `speciesNoun` merge field in each story's
  `buildValues` map (`fix/species-other-grammar`, 2026-06-16):
  `speciesNoun: pet.species === "other" ? "friend" : clean(pet.species)`. Printed-prose
  `{species}` sites swapped to `{speciesNoun}`; **image briefs left as literal `{species}`
  (out of scope** — not printed, keeps output byte-identical for all species).
- **Story 6** — no `{species}` in its printed prose, so nothing to fix.

**Byte-identity:** for dog/cat/rabbit/bird the swap is a no-op (`speciesNoun === species`);
only the `other` path changes. Every existing product's PDF stays byte-for-byte unchanged.

**Canonical ownership:** the masterstories own the rule and already record it as a
graceful fallback in their species-variant sections — e.g. `story-5-master-template.md`
("`other` falls back to the species-neutral default line"), `story-7` ("`[SPECIES]`/
`[SPECIES_DESCRIPTOR]` carry the rest"), `story-4` line 311 ("other → species-neutral
phrasing"). So `other → "friend"` is in-spec, not a new undocumented convention. The
masterstory literal `[SPECIES]` text is NOT contradicted (non-other still renders the
plain word).

**What is NOT recorded anywhere (low-pri, recurring):** `coding-standards.md`'s "Story
text (`lib/story/`)" section is generic — it names `SPECIES_DESCRIPTOR` mapping as a
unit-test target but does NOT enumerate per-field merge conventions, so it neither
contradicts nor records `speciesNoun`. `new-book-playbook.md` has **zero** mention of
species/`speciesDescriptor`/`speciesNoun`/the values-map merge convention. A new title
author copying an existing story gets `speciesNoun` for free (it's in the copied
`buildValues`), so the omission isn't actively misleading — nice-to-have at most.

**Debt row paid:** the medium-severity `context/debt.md` row *"`species: "other"`
renders broken grammar in printed text"* (files: `lib/story/{story1,story2,story5,
story7,story8}/{master-text,variants}.ts`) is **fully satisfied** by this branch — all
five named stories fixed, `"other"` assertions added to each species test. The row scopes
ONLY printed prose for these five (image briefs + the separate Story-9 Page-3/Page-4-brief
rows are distinct debt rows, not this one). So on `complete`: **remove this row** (don't
narrow it — its scope was exactly these five). See [[debt-ledger-deferral-recording]]
(dual-direction: a branch that pays a row → the `complete` step removes it; auditor
confirms the row exists with exact wording + the code pays it). See [[canonical-doc-map]].
