---
name: illustration-brief-optional-fields
description: A page's illustrationBrief is run through the SAME merge substitution as body copy — an unresolved {optionalField} placeholder in a brief throws MergeError when that field is blank
metadata:
  type: feature
---

A `MasterPage.illustrationBrief` is substituted by the merge engine exactly like
`body`/`title` (see `resolvePage` in every `story*/merge.ts`): every `{key}` in the
brief must resolve, or `mergeStory*` records it as a missing key and throws
`MergeError`.

**The trap:** if a brief embeds an **optional-with-fallback or optional-omit** merge
field (one that `buildValues` only registers when non-empty — e.g. Story 6's
`stillLoves`/`favoriteSpots`), then a perfectly valid session with that field blank
**throws** at merge time, even though the *body* fallback handled the blank
correctly. The body and the brief are resolved together; fixing the body fallback
does not fix the brief.

**Why:** Whether a customer left an optional field blank, every page's brief still
goes through `substitute`. The variant layer swaps the body to a fallback sentence
(dropping the `{placeholder}`), but it does NOT touch the brief.

**How to apply:** illustration briefs may only reference **required** merge fields
(petName, breedColor, etc.). For optional fields, describe the scene generically and
note "use the customer's <field> input from the session" — the imagery agent reads
`session.memories.*` directly, so the brief doesn't need the literal value. Caught
live in Story 6 PR-25 (the Page-3 brief embedded `{stillLoves}`/`{favoriteSpots}`,
both optional, → MergeError on a blank-stillLoves session).

Related: [[letter-wash-page-id-hardcoded]] (another "the renderer/brief silently
assumed a field shape" class of bug).
