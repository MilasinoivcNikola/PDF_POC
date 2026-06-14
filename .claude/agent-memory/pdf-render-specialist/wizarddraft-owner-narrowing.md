---
name: wizarddraft-owner-narrowing
description: Adding a new story to the WizardDraft union that carries an `owner` group breaks owner-bearing wizard narrowing + isStory1Draft fallthrough
metadata:
  type: project
---

When a new narrative book is added to the `WizardDraft` union (lib/session/types.ts) and it
REUSES the Story-2 `Owner` group (like Story 6/7/9 do), two things break the build even in an
authoring-only PR with no wizard UI:

**Why:** several create-wizard pages narrow "which draft has letter-shaped memories" with
`"owner" in draft && !isStory6Draft(draft) && !isStory7Draft(draft)` (e.g.
`app/(operator)/create/letter/page.tsx`). A new owner-bearing draft slips through that guard
and widens `draft.memories` to a union that lacks the letter fields → `Property 'favoriteRitual'
does not exist`. Separately, `isStory1Draft` (lib/session/draft.ts) is defined as "not any of
the others", so a new draft type silently falls into the Story-1 bucket and the
`missingRequiredFieldsForDraft` / `draftToSessionForDraft` dispatchers mis-treat it as Story 1.

**How to apply:** when registering a new owner-bearing story (registration-only PR, wizard
deferred to a later PR): (1) add `isStoryNDraft` in draft.ts and exclude it from `isStory1Draft`;
(2) guard the two dispatchers to `throw new Error("story-N wizard not yet wired")` for it (don't
let it fall through to the Story-1 assembler); (3) add `!isStoryNDraft(draft)` to every
owner-bearing narrowing in the create wizard pages. `npm run build` is the only thing that finds
all the narrowing sites — `npm run test:run` passes without them. Story 8 did NOT hit this (it has
an `adventure` group, not `owner`).
