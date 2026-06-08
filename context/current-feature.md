# Current Feature

## Status

In Progress

## Goals

Let users edit **their own free-text inputs** directly on the in-browser preview
(`/create/preview`), per page, beside the existing per-page Regenerate control —
so a typo or a reworded memory can be fixed without restarting the wizard.

- **Editable fields** (the customer's own free-text + names — never the fixed
  template prose, never the enum/toggle answers):
  | Edited on | Field(s) |
  | --- | --- |
  | Cover / Dedication (Page 1) | `petName`, `childName`, `parentDedication` |
  | Page 2 | `breedColor` |
  | Page 4 | `favoriteActivity` |
  | Page 5 | `sleepingSpot` |
  | Page 6 | `favoriteMemory` |
- Names appear on nearly every page, so they're editable **once** on the
  cover/dedication spread; the edit propagates book-wide on re-render.
- An edit updates the session field → re-runs `resolveStory` → re-renders the
  affected page(s) in place. The **next PDF download reflects edits
  automatically** (it re-reads the session from disk; no template/render change).
- **Cannot blank a required field**: re-resolve must not throw `MergeError`; an
  emptied required field is rejected with a gentle message.
- **Text-only**: editing an image-affecting field (description / activity /
  sleeping spot / memory) does NOT auto-regenerate the illustration and shows no
  mismatch nudge — the user can use the existing Regenerate control if they want.

## Notes

**Decision — Option A (edit inputs → re-merge), not Option B (WYSIWYG override).**
A keeps every edit inside the merge pipeline, so the "died"/no-euphemism rule and
the age/death/belief variant logic stay enforced, and screen↔PDF parity is
automatic (both render `resolveStory(session)`). Full free-form override editing
(B) is deferred to a possible later feature.

**Craft Area 3 — `nextjs-ui-builder`** (App Router page, preview components,
React state, one new API route, session persistence).

**Files**
- `lib/story/editable-fields.ts` (new, pure + unit-tested) — the page→field map
  above + the required-field set that can't be blanked.
- `app/api/update-text/route.ts` (new) — `POST { id, field, value }`: traversal-
  guard the id (`isSafeSessionId`), write the field into the session, re-run
  `resolveStory` and reject `MergeError`, `writeSession`, return the full
  re-resolved `pages`. Near-clone of `app/api/regenerate-illustration/route.ts`
  minus the AI call. House JSON shape (`{ ok }` / `{ ok:false, error }`).
- `components/preview/PageView.tsx` + `components/preview/BookPreview.tsx` — an
  "Edit text" affordance beside Regenerate; textarea(s) for the page's field(s);
  on save POST and swap the returned `pages` into state (whole-book refresh
  covers the global name fields).
- Tests: the new route (happy path, required-field rejection, traversal, 404,
  invalid field) + the `editable-fields` map helper.

**Constraints / re-use**
- Apply the same `clean()` semantics merge uses (trim, collapse whitespace, strip
  `{}` braces) so an edit can't reintroduce a placeholder injection or a double-
  article glitch.
- Reuse `isSafeSessionId` traversal guard, `readSession`/`writeSession` from
  `lib/session/disk.ts`, and the existing house JSON error shape.
- Don't touch `lib/pdf/template.tsx` or `lib/pdf/render.ts` — parity & PDF come
  for free from re-reading the session.

**Out of scope**
- Editing the fixed master-template prose (that's Option B).
- Editing enum/toggle answers (species, pronoun, ageBracket, deathType,
  beliefFrame, otherPetsInHome).
- Auto-regenerating illustrations when an image-affecting field changes.
