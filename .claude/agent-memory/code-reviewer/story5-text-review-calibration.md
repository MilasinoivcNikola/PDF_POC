---
name: story5-text-review-calibration
description: Feature-23 (Story-5 "A Letter to [PET_NAME]" text/registry/imagery) review — PASS; validated the two shared-letter-renderer set-membership changes as byte-safe and refuted the usual unwired-throw / spec-said-reuse concerns
metadata:
  type: project
---

Feature 23 ("A Letter to [PET_NAME]", PR 1 of 2, Milestone 9) — the owner→pet
companion of Story 2 (single-tense past, second person TO the pet). Reviewed clean
(PASS, no blockers). Durable judgment calls so I don't re-derive next time a letter
product is added. See [[story4-text-review-calibration]] + [[story4-wizard-review-calibration]]
— Story 5 is the same shape as those.

**Two shared-renderer changes in `lib/pdf/pages-story2.tsx`, both byte-safe by construction:**
1. `LETTER_SIGNOFFS` gained `NOTE_SIGNOFF = "With all my love, always,"` — matched via
   `findIndex(line => LETTER_SIGNOFFS.includes(line))`, **exact string equality** (not
   prefix/substring/startsWith). It is distinct from `"Yours, always,"` (S2) and `"Yours,"`
   (S4) and is never a standalone body paragraph in another product, so neither mis-splits.
2. `LETTER_WASH_PAGE_ID` (a single string `"letter-page-5"`) was generalized to
   `LETTER_WASH_PAGE_IDS = ["letter-page-5","note-page-5"]`, gated via `.includes(page.id)`.
   Story 2's `letter-page-5` stays in the set (wash unchanged); Story 4 has NO wash slot and
   its page ids aren't in the set, so it's untouched. `showWash` also requires `Boolean(src)`,
   so a body page with no wash src renders nothing regardless.
   **How to apply (canonical byte-identity check whenever a claim spans the shared
   `pages-story2.tsx`/`pages.tsx`):** render the existing fixtures via `render:test` and compare
   **length + timestamp-normalized SHA** (strip `/CreationDate`+`/ModDate`). Known baselines:
   Otis (S1) 873889, Murphy (S2) 119398. The `generate.story5.test.ts` also pins S1=14 /
   S2=`LETTER_SCENE_PAGE_IDS.length` / S4=`TALK_SCENE_PAGE_IDS.length` unaffected.

**Refuted concerns (do not re-flag):**
- The `missingRequiredFieldsForDraft` / `draftToSessionForDraft` **`throw "Story-5 draft bridge
  not wired yet (PR 24)"`** is unreachable in production: no catalog/SSG `/order/[productId]`
  route mints a Story-5 draft until PR 24. Same pattern Story 4 used at PR-20. Not a blocker.
- `isStory1Draft` correctly excludes story-5 now (`!isStory2 && !isStory4 && !isStory5`) — a
  Story-5 draft narrows to neither story1 nor story2. Correct, mirrors the Story-4 fix.
- **Spec said "reuse `cleanOptional`/`appendOptionalLines` from `story2/merge.ts`."** They were
  NEVER exported — they are module-private in BOTH `story2/merge.ts` AND `story4/merge.ts`. So
  Story 5 re-implementing them locally is **consistent with the established precedent**, not a
  missed reuse. The 3-way (now 4-way) consolidation is a standing deferred nice-to-have across
  all letter products, not a Story-5 regression. (Same family as the per-module `STYLE_PHRASE`
  copies the codebase already keeps side by side.)
- **`hasSubstantial` (len≥3, MIN_LENGTH) vs `cleanOptional` (len>0) threshold mismatch** for
  lastGoodDay/whatIKeep is HARMLESS, not an orphan: the variant body only emits the
  `{lastGoodDay}`/`{whatIKeep}` placeholder when `hasSubstantial` is true (len≥3), and len≥3 ⇒
  len>0 ⇒ `buildValues` registers the value. The reverse (placeholder emitted, value
  unregistered) can't happen. A 1-2 char value just uses the fallback line + registers an
  unused values key. No surviving `{token}`.
- **Couple Page-6 signature-tail slice is safe:** `applyClosing` slices the master body's last
  2 (`[NOTE_SIGNOFF, "{ownerNames}"]`) and prepends couple prose, and it runs in
  `composeVariants5` BEFORE `mergeStory5` calls `appendOptionalLines` (which pushes nickname/date
  AFTER `{ownerNames}`). So the slice always sees exactly the 2-line tail.
- The `session as unknown as Story5Session` casts in `generate.ts` + `story-5.ts` are each
  preceded by a runtime `storyType === "story-5"` guard (generate) or reached only via the
  registry seam after `storyType` already routed (story-5.ts) — sound, same as S2/S4.

**Authored gap-fill copy flagged as copy-review (NOT code blockers):** the couple "we"
rewrites of Pages 2/3/4/5/6 and the couple quirks/last-good-day fallbacks are composed (the
template only gives the single/dog default in full) — PM/grief-counselor copy review per the
template's own ghostwriter notes. Same disposition as Story 4's memorial gap-fills.
