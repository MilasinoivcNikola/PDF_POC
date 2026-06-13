---
name: story7-text-review-calibration
description: feature 28 Story-7 "Welcome Home" text/registry/imagery (PR-A) — PASS; mixed-set imagery (ref+7+1 wash), boundary-test denylist gap is latent-not-active, byte-identity reconfirmed
metadata:
  type: project
---

Feature 28 ("Welcome Home — [PET_NAME]'s Gotcha Day", PR-A of 2, Milestone 11) —
the catalog's FIRST joyful/non-memorial book. Narrative-layout sibling of Story 6.
Reviewed clean (PASS, no blockers). Durable judgment calls:

**Mixed-set imagery is the structural novelty (ref + 7 anchored + 1 figure-free wash).**
`welcome-before` is the empty-house wash → `useReference:false` → routes through
`generateImageFromPrompt` (Story-2 belief-wash path); the other 7 + cover are
`images.edit` reference-anchored (Story-1/6 path). `generateStory7Illustrations`
combines both shapes in one `mapWithConcurrency` keyed on the slot's `useReference`.
totalImages = 1 (reference anchor) + 8 slots = 9. Cache contract identical (figure-free
wash's reference set is `[]`, so its referenceHash = hash of empty array). `low` default
tier honored. This is correct — don't flag the empty-references branch as a bug.

**Boundary-test denylist gap — latent, NOT an active leak (judged a nice-to-have, not a blocker).**
`lib/runtime/surface.boundary.test.ts` `FORBIDDEN_LOCAL` lists each `lib/ai/storyN-prompts`
by name (story2/4/5/6) but `lib/ai/story7-prompts` was NOT added. The guard still PASSES
because it walks the public closure and the closure is currently clean (story-7.ts imports
only pure modules: resolveStory7, welcomeHomePdfFilename, getWizardConfig, story7/editable-fields
— never lib/ai/*). So no engine leak today. BUT if a future change pulled story7-prompts into
the public graph, the by-name denylist wouldn't catch it (though it's pure, so harmless in
itself; a real openai/generate import behind it WOULD still be caught by `lib/ai/generate`/
`lib/ai/client`/`openai` entries). Recommend adding the line for parity with siblings.
PR-B (which adds the catalog/storefront entry) is the natural place to enforce it. Verified
106 boundary+story7 tests green, full suite 1549 green.

**Byte-identity reconfirmed: Story-1 Otis = 873889 bytes** (same baseline as the Story-4/5/6
reviews) after the three shared-file touches: `master-text.ts` PageId union widen (type-only),
`registry.ts` story7 registration (additive), `scripts/render-test.ts` product-aware filename.

**`scripts/render-test.ts` product-aware filename is a correct latent-bug fix** (out-of-spec
edit #3): was hardcoded `storyPdfFilename` (Story-1 "Saying-Goodbye-…") for ALL fixtures; now
`getStory(session.storyType ?? "story-1").pdfFilename(session)`. Otis still → Saying-Goodbye-to-Otis.pdf
(verified), and Story 2/6/7 now get their own checklist names. render:test runs via
`npm run render:test` (needs scripts/tsconfig.json for JSX) — raw `tsx scripts/render-test.ts`
fails "React is not defined"; use the npm script. Story-7 fixture renders Welcome-Home-Biscuit.pdf.

**Refuted/validated (do not re-flag):**
- The `draft.ts` `throw "Story-7 draft handling is not wired yet (lands in PR-B)"` in both
  `missingRequiredFieldsForDraft` + `draftToSessionForDraft` (out-of-spec edit #1) is the
  established Story-4/5 unreachable-throw pattern, compile-forced by the new union member.
  Clean, clearly PR-B-deferred. Not a gap.
- `letter/page.tsx` adding `!isStory7Draft(draft)` to the memories narrow (edit #2) is correct:
  Story 7 has an `owner` group but is NOT a letter product (no `letter` wizard step). Story 2/4/5
  (real letter products) still pass through — same shape as the prior `!isStory6Draft` exclusion.
- Order.inputs / OrderRow.inputs widening with Story7Session (edit #4) is pure additive type-only.
- The two intentional master-template deviations are TESTED + sound: (a) found-as-stray carries
  the thank-you line (grouped with shelter/rescue per the gating test); (b) anniversary-without-
  yearsHome → `bodyOccasion` falls back to new-arrival wording AND `dedicationDatedLine` returns
  null, so no `{yearsHome}` token ever survives. `formatYearsHome` parses leading int → "1 year"/
  "N years"; non-numeric returns cleaned-as-is (never crashes).
- Happy-book tone guard (banned grief phrases across the matrix) is in merge.test.ts, green.
- The `as unknown as Story7Session` casts in story-7.ts + generate.ts are each behind a runtime
  storyType guard or the registry seam — sound, same as S2/4/5/6.
