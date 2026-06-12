---
name: story4-text-review-calibration
description: Feature-20 (Story-4 two-tense text engine) review — validated the shared-letter-renderer set-membership change as byte-safe; refuted unreachable-throw concerns
metadata:
  type: project
---

Feature 20 ("If [PET_NAME] Could Talk", PR 1 of 3, Milestone 8) — Craft Area 1 authoring-only. Reviewed clean (PASS, no blockers). The validated judgment calls worth not re-deriving:

**Shared letter-renderer change (`lib/pdf/pages-story2.tsx`) is byte-safe — verified, not assumed.**
- The implementer generalized signature detection from a single `LETTER_SIGNOFF` sentinel to a set `LETTER_SIGNOFFS = [LETTER_SIGNOFF, TALK_SIGNOFF]`, matched via `findIndex(line => LETTER_SIGNOFFS.includes(line))` — **exact string equality**, not prefix/substring. `"Yours, always,"` (Story 2) ≠ `"Yours,"` (Story 4), so neither mis-splits the other.
- **Why:** the spec said "no shared renderer touched" but this one file was; the load-bearing question is whether Story-2 output changes.
- **How to apply (byte-identity technique for letter-renderer changes):** render the Story-2 Murphy fixture on-branch (`npm run render:test` with a `storyType:"story-2"` JSON) and compare **length + timestamp-normalized SHA** (strip `/CreationDate`+`/ModDate` before `shasum`) against a pre-branch `output/Letter-from-Murphy.pdf` baseline. I confirmed identical: 119398 bytes, same normalized SHA. Story-1 Otis = 873889 bytes (only type-only `PageId` widening + additive filename touch its path). This is the canonical check whenever a "byte-identical" claim spans the shared `pages-story2.tsx` / `pages.tsx`.

**Refuted concerns (do not re-flag):**
- The `draftToSessionForDraft` / `missingRequiredFieldsForDraft` **throw "Story 4 not wired yet (PR 22)"** is unreachable in production: the catalog has no `story-4` entry, so `/order/[productId]` only SSGs `story-1-book`/`story-2-letter`, and a Story-4 draft never reaches these dispatchers on the public path. Not a blocker.
- `OrderForm.tsx`'s `story1 = isStory1Draft(draft) ? draft : null` (replacing `!isStory2Draft`) is a real fix: the old form would have mis-narrowed a Story-4 draft into `story1`. The new `isStory1Draft` (`!isStory2 && !isStory4`) is correct.
- `STORY_1_LAYOUT`/`STORY_2_LAYOUT` stay `Record<Story1PageId/Story2PageId, PageLayout>` (narrowed) while only the umbrella `PageId` widened to include `Story4PageId` — so their maps don't need `talk-*` keys and `tsc --noEmit` stays clean. Same shape as the feature-14/15 generalization.

**Two-tense engine — the tense-leak guard scope is legitimate, not masking.** The memorial Page-5 belief-frame closing line IS intentionally present-tense in all three frames (verbatim template lines 262-264, "Wherever I am now, I'm not tired…", mirroring Story 2's "Where I Am Now" page). The leak-guard test correctly slices off the last Page-5 line before asserting past-tense; a separate sanity test confirms that excluded line genuinely carries the present-tense frame. Confirmed against the master template — real requirement, not a leak being hidden.

**Authored gap-fill copy flagged as copy-review items (NOT code blockers):** memorial couple Page-2 line, memorial non-dog species Page-2 lines, memorial Page-3 fallback, couple Page-5 favorites — all composed (not verbatim template) since the template only gives the dog/single memorial rewrite in full. PM/grief-counselor copy review, per the template's own "Notes for the ghostwriter."
