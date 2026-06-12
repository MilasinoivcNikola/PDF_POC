---
name: story4-wizard-review-calibration
description: PR-22 (feature 22) Story-4 wizard/storefront review — isStory2→isLetter generalizations are byte-safe; the empty-enum-on-living-path trap is inert at the merge layer
metadata:
  type: feedback
---

Reviewing the Story-4 wizard/storefront/order-intake PR (feature 22, the UI/commerce
twin of features 18+19). Verdict was **PASS, no blockers**. Durable judgment calls so I
don't re-derive or re-flag next time a letter-product is generalized:

**The `isStory2 → isLetter` (story-2 ∨ story-4) generalization is byte-safe by construction.**
Every such conditional is `isLetter ? A : B`. Story-2 was already in branch A and stays in A;
story-1 was in B and stays in B (story-1 is neither). The ONLY new behavior is story-4. So a
wholesale `isStory2`→`isLetter` swap across `pet`/`generate`/`preview` steps + `OrderForm` +
`BookPreview` does NOT change story-1 or story-2 — don't flag it as a regression. The remaining
`isStory2` usages are correct three-way COPY ternaries (`isStory4 ? x : isStory2 ? y : z`), not
structural mis-routes. **How to apply:** when a future Story-N reuses the letter surface, the
diff will look alarming (every letter conditional rewritten) but is inert for existing products
— verify by confirming each `isLetter ? A : B` keeps story-2 in A.

**Byte-identity technique works for extracted subcomponents too.** The `tone` step was split
`TonePage` → `Story2Tone` + `Story4Tone`. Confirmed `Story2Tone`'s JSX body is byte-identical to
the original via: extract both `return (...)` blocks, `diff`. Calling `useWizard()` a second time
inside the extracted child (instead of prop-drilling `updateDraft`) is semantically identical, not
a finding.

**The "living path persists a stale/garbage enum" trap is INERT here — refuted, don't flag.**
`draftToSessionStory4` always fills `deathType`/`beliefFrame` with valid defaults even on the
living path. That looks like the classic "empty merge field → fatal MergeError downstream" trap,
but it is NOT: (1) the assembler fills a *valid* default (never ""), and (2) `lib/story/story4/
variants.ts` `page5Body(living,...)` consults `deathType`/`beliefFrame` ONLY on the memorial
branch — on living they are never read. So a defaulted-but-unused enum is harmless. The draft.test
even round-trips a complete living AND memorial draft through `resolveStory4` asserting no
MergeError (lines ~1243-1259). That round-trip test is the right guard for this whole product
family — its presence is what makes the empty-merge-field trap a non-issue.

**Catalog/boundary invariants held (the usual commerce checks):** `illustrationCount` derived via
`getStory("story-4").illustrationSlots.length` (=2), not literal; `lsVariantId: undefined` (env
resolved server-side, never in the client-safe module); the public storefront/order graph stays
engine-free (boundary test added `lib/ai/story4-prompts` to FORBIDDEN_LOCAL; story-4's registry
slot ids live in `lib/story/story-4.ts`, not `lib/ai/*`). Production build kept `/books/story-4-talk`
+ `/order/story-4-talk` SSG (`●`) — if the engine had leaked, that SSG build would fail.

**`lib/order/{types,store}.ts` widening `inputs: ... | Story4Session` is minimal & sound** — a
required type-only consequence of making story-4 sellable; row-mapper handles it verbatim, no
story-1/2 row behavior change. Not scope creep even though it's a commerce-surface touch beyond a
literal "wizard" PR.

See [[story4-text-review-calibration]] for the PR-20 text-engine review of the same product.
