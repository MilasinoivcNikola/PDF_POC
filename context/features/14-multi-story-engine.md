# 14 — Multi-Story Engine Generalization

> **Craft Area:** 1 — PDF pipeline (+ 2/3 surface) · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 7 — Story 2 · **Phase:** 0 (keystone refactor) · **Depends on:** 10
> **Branch:** `feature/multi-story-engine`

## Status

Not Started

## Goals

- Introduce a `storyType` discriminant so the app can host more than one product, **without changing any Story-1 output**. The Story-1 PDF must stay **byte-identical** and all existing tests must stay green — this is an architecture change, not an output change.
- Add a `layout` tag to `ResolvedPage` and make `renderPage`/`StoryPages` dispatch on `layout` instead of literal Story-1 page ids (`"page-7"`, `"page-10"`, …), so a non-book product (a letter) never falls through to the children's-book `NarrativePage`.
- Stand up `lib/story/registry.ts` — the single place each product registers its resolver, illustration plan, and PDF-filename builder — and route Story-1's render + API paths through it.

## Scope

**In scope**
- `lib/session/types.ts` — add `export type StoryType = "story-1" | "story-2"` and a `storyType: StoryType` field on `StoryDraft`/`StorySession`. Default to `"story-1"`. **Back-compat:** sessions/fixtures written before this change have no `storyType`; readers must treat a missing value as `"story-1"` (`session.storyType ?? "story-1"`) — no migration of `./sessions/*.json`.
- `lib/story/merge.ts` — add a `layout` field to `ResolvedPage` (a string-literal union of layout kinds, e.g. `"cover" | "narrative" | "truth" | "love" | "closing" | "back-cover"` for Story 1, extensible for Story 2's letter layouts). Populate it during Story-1 merge so every page carries its render layout. Page **ids stay stable** (`cover`, `page-1`…`page-12`, `back-cover`) so the image manifest / cache / regenerate keys are unaffected.
- `lib/pdf/pages.tsx` — change the `renderPage` switch to dispatch on `page.layout`; remove the literal Story-1 page-id cases. Story-1 pages map to the same components → identical markup.
- `lib/story/registry.ts` (new) — a `StoryDefinition` interface (`resolve(session): ResolvedStory`, `illustrationSlots`, `pdfFilename(session): string`, room for `wizardSteps` later) and `getStory(storyType): StoryDefinition`. Register the existing Story-1 functions (`resolveStory`, `SCENE_PAGE_IDS`, `storyPdfFilename`) as the `"story-1"` entry — **re-export, no logic change**.
- `lib/pdf/render.ts` and the routes `app/api/{render-pdf,preview,generate-illustrations,regenerate-illustration}/route.ts` — resolve story + filename + illustration slots via `getStory(session.storyType)` instead of importing Story-1 modules directly.

**Out of scope**
- Any Story-2 content, text, pages, or imagery (features 15–17). The `"story-2"` registry entry stays absent/stubbed until 15.
- Wizard and landing-page changes (feature 18).
- Renaming Story-1 ids or files for cosmetic symmetry — minimize the diff to protect byte-identity.

## Implementation notes

**Key decisions**
- **Behavior-preserving is the hard requirement.** Reuse feature 10's byte-identical-PDF check as the gate: render the Otis fixture before and after the refactor and assert identical length + SHA. Existing 373 tests stay green; the only allowed churn is *additive* (a test that now also sees a `layout` on a page it already asserts).
- **Dispatch on `layout`, not on ids.** This is the seam that lets one renderer serve both products. Adding Story-2 ids to the old id-switch would be the wrong move — a letter page would silently render as a storybook page.
- Keep the existing `resolveStory(session)` export working (delegate to `getStory(session.storyType).resolve(session)`), so Story-1 callers and tests don't need rewrites.
- `storyType` optional-on-read (`?? "story-1"`) is what makes the change zero-migration for on-disk sessions.

**Files**
- `lib/session/types.ts`
- `lib/story/merge.ts` (add + populate `ResolvedPage.layout`)
- `lib/story/registry.ts` (new)
- `lib/story/story-1.ts` (new — thin registry entry wrapping existing master-text/variants/merge) *or* register inline from existing modules
- `lib/pdf/pages.tsx` (switch on `layout`)
- `lib/pdf/render.ts` (resolve + filename via registry)
- `app/api/{render-pdf,preview,generate-illustrations,regenerate-illustration}/route.ts`

## References

- @context/history.md — the feature-10 byte-identical PDF verification (the gate to reuse here).
- @context/features/03-story-master-text-and-variants.md — the resolver/merge surface being generalized.
- @context/features/04-pdf-template-and-print-css.md — the `pages.tsx`/`renderPage` dispatch being changed.
- @context/masterstories/story-2-master-template.md — the product that motivates the new layouts (so the `layout` union is designed with the letter in mind).

## Done when

- [ ] Story-1 PDF for the Otis fixture is **byte-identical** pre/post refactor (length + SHA match).
- [ ] `renderPage` dispatches on `page.layout`; no literal Story-1 page-id remains in the switch.
- [ ] `getStory("story-1")` returns a definition that resolves a full 14-page `ResolvedStory`; the four routes use the registry.
- [ ] A session written before this change (no `storyType`) still renders as Story 1.
- [ ] `npm run build` + `npm run test:run` pass with no non-additive assertion changes.

## Tests

- `test-author`: registry lookup returns the Story-1 definition; `resolveStory` still returns 14 pages each carrying the correct `layout`; `storyType` defaulting when the field is absent on a `StorySession`; filename built via the registry equals `Saying-Goodbye-to-[PET_NAME].pdf`.
- `qa`: byte-identical Otis PDF check (reuse a cached ready session, **$0**); Story-1 end-to-end (preview + download) still works on an existing ready session.
