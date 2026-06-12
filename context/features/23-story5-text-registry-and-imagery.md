# 23 — Story 5: Text, Registration & Premium Imagery

> **Craft Area:** 1 — PDF pipeline / story text · **+ 2** — imagery · **Owner agent:** `pdf-render-specialist` (text/registry) / `ai-image-specialist` (prompts + dispatch)
> **Milestone:** 9 — Story 5 ("A Letter to [PET_NAME]") · **Phase:** 1 (PR 1 of 2) · **Depends on:** 14, 15, 16, 17
> **Branch:** `feature/story5-text`

## Status

Not Started

## Goals

- Encode the Story-5 master text ("A Letter *to* [PET_NAME]" — cover + 5 letter pages, the **owner's** second-person voice writing *to* the pet who died) as structured data with merge fields + variant hooks, so a `Story5Session` becomes a fully-resolved `ResolvedStory` (reusing the existing `letter-cover` / `letter` layouts from feature 16) with **no `[MERGE_FIELD]` left literal anywhere**.
- **Register Story 5** in `lib/story/registry.ts` (`resolve` / `illustrationSlots` / `pdfFilename` / `wizard` / `editable`) so a hand-authored fixture renders a 6-page PDF via `render:test` ($0).
- **Generate Story 5's 2 Premium images** — the cover portrait (reference-anchored) + the Page-5 belief wash (figure-free) — by **reusing Story 2's prompt builders verbatim** and adding a `storyType === "story-5"` dispatch to the orchestrator. **Story 5's imagery shape is identical to Story 2's** (reference cover + photo-free wash) — *not* Story 4's (both reference-anchored), so this is near-pure reuse.
- The book is **not yet sellable** (catalog, PR 24) or **creatable** (wizard, PR 24) — this PR makes the engine *know* and *generate* the book.

## Scope

**In scope**
- `lib/session/types.ts`:
  - `Story5Memories` — `LetterMemories` **+** `lastGoodDay?: string` **+** `whatIKeep?: string` (the two genuinely new fields; both optional → have fallbacks).
  - `Story5Toggles` — `{ deathType: LetterDeathType; beliefFrame: LetterBeliefFrame }`. **Reuses** `LetterDeathType` / `LetterBeliefFrame`; **drops** `giftFor` and `newPet` (a letter *to* the pet is never a sympathy gift, and has no new-pet beat) — and has **no** `livingOrMemorial` (that is Story 4's).
  - `Story5Draft` / `Story5Session` discriminated by `storyType: "story-5"` (reuse `Pet` + `Owner`; no `child`). **Reuses `Relationship` (single | couple)** — family is punted (master template redirects family to Story 1).
  - `StoryType += "story-5"`; `WizardDraft += Story5Draft`.
- `lib/story/master-text.ts` — `Story5PageId` (`note-cover`, `note-page-2`…`note-page-6`); `PageId = Story1PageId | Story2PageId | Story4PageId | Story5PageId`.
- `lib/story/story5/{master-text,variants,merge,editable-fields,fixtures}.ts` (new namespaced folder).
- `lib/pdf/filename.ts` — `letterToPdfFilename(petName)` → `Letter-to-[PET_NAME].pdf` (reuse `slugify` + `Pet` fallback; distinct from Story 2's `letterPdfFilename` → `Letter-from-…`).
- `lib/story/story-5.ts` — `NOTE_SCENE_PAGE_IDS = ["note-cover", "note-page-5"]` + `story5Definition` (mirrors `story-2.ts`).
- `lib/story/registry.ts` — register the `"story-5"` entry.
- `lib/story/wizard-config.ts` — `STORY_5_STEPS` (`upload → pet → owner → letter → tone → generate`) + `WIZARD_CONFIG` entry.
- `lib/session/storage.ts` — `newStory5Draft()` + a `newDraft("story-5")` overload.
- `lib/pdf/pages-story2.tsx` — register Story 5's sign-off **`"With all my love, always,"`** in `LETTER_SIGNOFFS` (the only shared-renderer touch; byte-safe — see Key decisions).
- **Imagery (engine only):**
  - `lib/ai/story5-prompts.ts` — `buildStory5SlotPrompts(session)` returning `note-cover` (`useReference: true`, **reuses `buildCoverPortraitPrompt`** from `lib/ai/story2-prompts.ts`) + `note-page-5` (`useReference: false`, **reuses `buildBeliefWashPrompt`** keyed by `toggles.beliefFrame`).
  - `lib/ai/generate.ts` — a `storyType === "story-5"` dispatch in `generateAllIllustrations` + `regenerateSceneIllustration` (a near-clone of the Story-2 path: cover via `images.edit`, wash via `images.generate`); widen `manifestToImageMap`'s slot union to admit `note-cover` / `note-page-5`.
  - `app/(operator)/api/regenerate-illustration/route.ts` — widen the structural slot allowlist union to include the `note-*` slots (the precise per-product gate still runs inside `regenerateSceneIllustration` after the session read).

**Out of scope**
- Wizard UI / public order form / catalog / storefront / samples / `GenerationProgress` + `illustrationLabels` story-5 branches / LS env var (PR 24).
- **Any new `PageLayout` / `renderPage` case / CSS** — Story 5 reuses `letter-cover` + `letter` wholesale; **playbook Step 3 is skipped entirely** (it adds one sentinel to `LETTER_SIGNOFFS`, not a layout).
- The **companion Stories 2 + 5 bundle** — net-new multi-product commerce work that breaks the reuse guarantee; **deliberately not built** (a separate decision, not part of Story 5).

## Implementation notes

**⚠️ Spec gap to resolve before authoring — `[LAST_GOOD_DAY]`.** The master template's merge-field table introduces `LAST_GOOD_DAY` (and the production checklist references its fallback), but the page-by-page text **never places it in any page body**. Resolve before writing `master-text.ts`. *Recommended:* a short beat at the end of **Page 3** (gratitude) — "And thank you for [LAST_GOOD_DAY]." with a fallback ("And thank you for the last good ordinary day, the one I didn't know to memorize.") — so it's optional-with-fallback like `quirks`/`whatIKeep`. **PM to confirm placement or drop the field.**

**Key decisions**
- **Story 5 is the inverse/companion of Story 2** (owner→pet, second person), not a Story-2 variant: its own `storyType: "story-5"`, `productId: "story-5-letter-to"` — independent catalog/price/marketing — while sharing Story 2's engine internals (layout + prompts).
- **Imagery == Story 2's shape exactly:** `note-cover` reference-anchored (reuse `buildCoverPortraitPrompt`); `note-page-5` figure-free belief wash (reuse `buildBeliefWashPrompt`, keyed by `LetterBeliefFrame`). No new prompt logic — `story5-prompts.ts` re-keys Story 2's builders to Story 5's slot ids. This is why imagery is folded into this PR rather than getting its own (unlike Story 4's PR 21, whose full-width reference-anchored scene was a real new likeness risk).
- **Compose-before-merge** (no two-tense engine — Story 5 is single-tense, past): `master-text.ts` holds the single-owner ("I") default bodies; `variants.ts` `composeVariants5()` layers relationship (couple → "we"/"us"/"ours", composed from variant **text** per page, the Story-2 approach — not a find-replace), death-type (Page 4 confession/apology), belief-frame (Page 5), and species voice (Page 3's "happy sound" clause), **then** merges. `resolveStory5(s) = mergeStory5(composeVariants5(s), s)`.
- **Required free-text is smaller than Story 2:** only `favoriteRitual` + `favoriteSpots` are un-fallbacked live placeholders (Pages 3 & 5). `quirks` is **optional-with-fallback** here (Story 2 required it) — the variant layer applies the stock Page-3 lines when blank, reusing Story 2's existing blank/shallow-`quirks` fallback pattern. `lastGoodDay` / `whatIKeep` are optional-with-fallback. (The full required set is owned by PR 24's draft bridge.)
- **`BREED` feeds only the cover image prompt, never printed text** — so it's not a merge-required field. Default it to `""` like Story 2's `breedColor` (the table marks it Required, but an empty value only yields a less-specific cover prompt, never a `MergeError`).
- **Reuse, don't re-implement:** `clean` / `substitute` / `MergeError` / `PageLayout` / `ResolvedStory` / `ResolvedPage` from `lib/story/merge.ts`. `STORY_5_LAYOUT: Record<Story5PageId, PageLayout>` tags `note-cover` → `letter-cover` and `note-page-2…6` → `letter`.
- **Dates reuse `LetterMemories`' `dateAdopted` / `datePassed`** (no new date fields): cover + Page-6 date line `{dateAdopted} — {datePassed}` **only when both** are present. Optional `nicknames` line in the Page-6 signature when present. Use `cleanOptional` / `appendOptionalLines` from `story2/merge.ts`.
- **Sign-off byte-safety:** `"With all my love, always,"` is distinct from `"Yours, always,"` (Story 2) and `"Yours,"` (Story 4), and is never a standalone existing-body paragraph — `LETTER_SIGNOFFS` matches by exact equality, so adding it cannot mis-split Story 2/4 letters (their PDFs stay byte-identical).
- **`NOTE_SCENE_PAGE_IDS` lives in the product module** (`lib/story/story-5.ts`), **never** in `lib/ai/*` — so the registry/catalog public graph stays engine-free (the boundary guard bans `lib/ai/*` from the public closure). `story5-prompts.ts` (in `lib/ai/`) imports the slot type from `master-text.ts`, not the other way around.
- **Page-id prefix `note-*` is an internal slug** (never user-facing), chosen distinct from `letter-*` (Story 2) and `talk-*` (Story 4). Cosmetic — PM can override.

**Files**
- `lib/session/types.ts` · `lib/session/storage.ts`
- `lib/story/master-text.ts` (page-id union)
- `lib/story/story5/{master-text,variants,merge,editable-fields,fixtures}.ts`
- `lib/pdf/filename.ts` · `lib/story/story-5.ts` · `lib/story/registry.ts` · `lib/story/wizard-config.ts`
- `lib/pdf/pages-story2.tsx` (`LETTER_SIGNOFFS` only)
- `lib/ai/story5-prompts.ts` · `lib/ai/generate.ts` · `app/(operator)/api/regenerate-illustration/route.ts`

## References

- @context/masterstories/story-5-master-template.md — **the** source text, merge fields (incl. the two new `LAST_GOOD_DAY` / `WHAT_I_KEEP`), the relationship/death/belief variant tables, "The voice" guide, and the "Quality bar / what to avoid" banned-phrase list.
- @context/new-book-playbook.md — Steps 1, 1a, 2 (author + extend the page-id union + register), Step 3's `LETTER_SIGNOFFS` exception, and the imagery-shape (figure-free vs reference-anchored) choice.
- @context/features/15-story2-master-text-and-variants.md — the closest text analog (the Story-2 letter engine this mirrors).
- @context/features/17-story2-imagery.md — the imagery shape being reused (reference cover + photo-free belief wash; `buildCoverPortraitPrompt` / `buildBeliefWashPrompt`).
- @context/features/20-story4-text-and-tense-engine.md — the most recent letter-reuse precedent (registration scaffolding, `LETTER_SIGNOFFS`, byte-identity gate).
- @context/features/14-multi-story-engine.md — the `ResolvedPage.layout` contract + the registry to register into.

## Done when

- [ ] `resolveStory5()` returns all 6 pages with **zero** literal `[MERGE_FIELD]` / `{token}` for a complete `Story5Session`, across the full relationship × death-type × belief-frame × species matrix.
- [ ] Each variant changes the right page: `relationship: "couple"` → "we"/"us"/"ours" (Page 4 absolution reads as shared); death-type → Page 4 confession; belief-frame → Page 5 (**no reunion promise on `secular`**); species → Page 3's "happy sound" clause.
- [ ] The owner-voice quality bar holds: **"died"** appears (Page 2, plainly); none of the banned euphemisms ("passed away" / "went to sleep" / "lost" / "crossed the rainbow bridge" / "watching over" / "fur baby") appear in any combination; the apology page (Page 4) lifts blame, never assigns it.
- [ ] Optional fields (`quirks`, `lastGoodDay`, `whatIKeep`, `nicknames`, dates) omit/fall back cleanly — no dangling separator, no empty "I'm keeping ." fragment; the date line appears only when **both** dates are present.
- [ ] Missing required field → `MergeError`, never a literal token.
- [ ] `getStory("story-5")` resolves; a hand-authored Story-5 fixture renders a **6-page** PDF via `npm run render:test` ($0, placeholder SVGs); `letterToPdfFilename` → `Letter-to-[PET_NAME].pdf`.
- [ ] **Imagery:** a live Low run generates exactly **2** images — `note-cover` (recognizably the uploaded pet, reference-anchored via `images.edit`) + `note-page-5` (figure-free belief wash, **no pet**, via `images.generate`); 2-entry manifest, no reference anchor; a re-run is a **$0 cache hit**.
- [ ] **Story 1, Story 2 AND Story 4 PDFs are byte-identical** (no shared CSS / `PageLayout` / `renderPage` switch touched; `LETTER_SIGNOFFS` generalized in a byte-preserving way) — verified by render:test: length + timestamp-normalized SHA on each existing fixture.
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test still passes (no `lib/ai/story5-prompts` in the public closure).

## Tests

- `test-author` (high value — pure logic, $0):
  - No `[A-Z_]+` / `{token}` placeholder survives across the **full** relationship × death-type × belief-frame × species matrix.
  - Banned-phrase guard across every combination; the **"died" present** + **no-reunion-on-`secular`** rules; Page 4 absolution present in every death-type variant.
  - Blank `quirks` → fallback; blank `lastGoodDay` / `whatIKeep` → fallback (no dangling fragment); `species: "other"` → neutral voice; optional date omission (line only when both dates present); `MergeError` reporting; brace-injection regression.
  - `letterToPdfFilename` cases (convention, slug, diacritics, empty → `Pet`).
  - `lib/ai/story5-prompts.test.ts` — both slots' shape (`note-cover` `useReference: true`; `note-page-5` `useReference: false`, keyed by belief frame), the consistency clause on the cover, no surviving placeholder.
  - `lib/ai/generate.story5.test.ts` — registry-driven 2-slot list; cover via `images.edit` + wash via `images.generate` at the mocked SDK boundary; default `low` + override honored; manifest shape; cache hit = 0 calls; **Story 1 (14) / Story 2 (2) / Story 4 (2) totals pinned unaffected**; `manifestToImageMap` admits `note-*`.
- `qa` (engine-level, not browser — no wizard yet; mirrors Story 4 PR 21): one live Low run (~$0.012) via a tsx script + Read-tool PNG inspection — the cover/wash check above, the $0 re-run, and the Story 1/2/4 byte-identity gate. Reuse the canonical Jack Russell photo; leave the on-disk book for PR 24's $0 sample frames; don't touch the canonical fixtures.
