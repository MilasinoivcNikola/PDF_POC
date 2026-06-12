---
name: story5-wizard-review-calibration
description: PR-24 Story-5 wizard/storefront/order — the |story-5 widening + three-way-ternary pattern is byte-safe; what was verified clean
metadata:
  type: feedback
---

PR-24 (feature 24, "A Letter to [PET_NAME]" wizard + storefront + order intake) — the
Story-4 (PR-22) precedent repeated almost exactly. Reviewed clean, PASS, no blockers.

**Validated-as-safe pattern (don't re-flag on the next book PR):** the "make a letter
product creatable + sellable" diff is a mechanical family of `|| storyType === "story-N"`
widenings + `isStoryN ? <new> : <existing>` three-way ternaries. Existing Story-1/2/4
strings are preserved verbatim inside the ternaries. Verification that this is byte-safe:
the full `test:run` stays green (1258 here) and the three-way ternaries only ADD a branch.
The `WizardProvider` per-group merge is generic (merges pet/memories/toggles always +
child/owner when present), so a new product flows through it with zero edit.

**Story-5's one real divergence from Story 2 (the thing to actually check):** required
set is **6 not 7** — `quirks` is optional-with-fallback (stored as `""`, the variant layer
fires the stock Page-3 line), unlike Story 2 where it's required. Confirmed consistent
across `missingRequiredFieldsStory5` / `draftToSessionStory5` / server `validateStory5` /
the client `requiresQuirks = !isStory5` gate. The round-trip test asserts the blank-quirks
→ fallback (no surviving token) path, and that the dispatcher reports `favoriteRitual` not
`quirks` for a Story-5 draft.

**Why per-storyType dispatch can't fall through:** `isStory2/4/5Draft` key on the exact
`storyType` literal; `isStory1Draft` explicitly `!isStory2 && !isStory4 && !isStory5`. The
public `/api/order` route + `/api/session` + preview/update-text are all registry- or
dispatcher-driven, so a new product needs no route fork — `Order.inputs` union widening +
`AnySession` (disk.ts) + the `OrderRow.inputs` mapper are the only type-only commerce touches
(same as PR-22 did for Story 4). `getStory(storyType).editable` / `.pdfFilename` carry the
inline-edit + download filename with no per-product code.

**Non-issue noticed (don't raise):** `fallbackFilename` returns a name-less `"Letter-to.pdf"`
for story-5 — only used if the `Content-Disposition` parse fails; the real download name comes
from `getStory().pdfFilename(session)` → `Letter-to-[PET_NAME].pdf` in the render-pdf route.
Shape matches the other fallbacks. The boundary test's `lib/ai/story5-prompts` ban was already
added in PR-23, so it's not in this PR's diff despite being listed in scope.

See [[story4-wizard-review-calibration]] (the PR-22 precedent this mirrors).
