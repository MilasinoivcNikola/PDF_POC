# 25 — Story 6: Text, Registration & Living-Tribute Imagery

> **Craft Area:** 1 — PDF pipeline / story text · **+ 2** — imagery · **Owner agent:** `pdf-render-specialist` (text/registry) / `ai-image-specialist` (prompts + dispatch)
> **Milestone:** 10 — Story 6 ("While You're Still Here, [PET_NAME]") · **Phase:** 1 (PR 1 of 2) · **Depends on:** 14, 03, 04, 07 (reuses the Story-1 narrative layouts + scene pipeline)
> **Branch:** `feature/story6-text`

## Status

Not Started

## Goals

- Encode the Story-6 master text ("While You're Still Here, [PET_NAME]" — an 8-page **living tribute**: cover + page-1 dedication + pages 2–6 + back cover, a **present-tense** narrator speaking *to and about a pet who is still alive*) as structured data with merge fields + variant hooks, so a `Story6Session` becomes a fully-resolved `ResolvedStory` (**reusing Story 1's existing `cover` / `dedication` / `narrative` / `love` / `back-cover` layouts**) with **no `[MERGE_FIELD]` left literal anywhere**.
- **Register Story 6** in `lib/story/registry.ts` (`resolve` / `illustrationSlots` / `pdfFilename` / `wizard` / `editable`) so a hand-authored fixture renders an **8-page** PDF via `render:test` ($0).
- **Generate Story 6's living-tribute imagery** — a locked reference illustration + **7 reference-anchored scene illustrations** (cover portrait, the page-1 dedication portrait, and pages 2–6), all showing the actual pet via `images.edit` (Approach A). This is **Story 1's imagery shape** (reference anchor + brief-driven scenes), *not* the letters' 2-image shape — there is **no figure-free wash**.
- **Living tribute only — the memorial re-render is dropped entirely** (PM decision, 2026-06-12). No `DEATH_TYPE`/`BELIEF_FRAME`, no second-life conversion, and the `truth` (death) layout **never appears** for a Story-6 order.
- The book is **not yet sellable** or **creatable** (catalog + wizard, PR 26) — this PR makes the engine *know* and *generate* the book.

## Scope

**In scope**
- `lib/session/types.ts`:
  - `TransitionFrame = "still-here" | "road-ahead"` (new union).
  - `Story6Memories` — `{ ageOrStage: string; quirks: string; stillLoves: string; favoriteActivity: string; favoriteRitual: string; sleepingSpot: string; favoriteSpots: string; ownerMessage?: string; nicknames?: string; dateAdopted?: string }`. `ageOrStage` / `stillLoves` / `ownerMessage` are the genuinely new fields; the rest reuse existing free-text names.
  - `Story6Toggles` — `{ transitionFrame: TransitionFrame; otherPetsInHome: OtherPetsInHome }` (reuses the existing `OtherPetsInHome` type). **No `deathType` / `beliefFrame`** — the memorial path is dropped.
  - `Story6Draft` / `Story6Session` discriminated by `storyType: "story-6"`. **Reuses `Pet` in full** (name, species, breedColor, **pronoun**, **illustrationStyle**, photo — Story 6 is a narrative book like Story 1, so it keeps pronoun + style, unlike the letter books) **+ `Owner`** (names; `relationship` defaulted `"single"` and **never read** — Story 6 has no couple voice).
  - `StoryType += "story-6"`; `WizardDraft += Story6Draft`.
- `lib/story/master-text.ts` — `Story6PageId` (`tribute-cover`, `tribute-page-1`, `tribute-page-2`…`tribute-page-6`, `tribute-back-cover`); `PageId = Story1PageId | Story2PageId | Story4PageId | Story5PageId | Story6PageId`. Existing per-product layout maps stay narrowed.
- `lib/story/story6/{master-text,variants,merge,editable-fields,fixtures}.ts` (new namespaced folder).
- `lib/pdf/filename.ts` — `tributePdfFilename(petName)` → `While-Youre-Still-Here-[PET_NAME].pdf` (reuse `slugify` + `Pet` fallback).
- `lib/story/story-6.ts` — `TRIBUTE_SCENE_PAGE_IDS = ["tribute-cover", "tribute-page-1", "tribute-page-2", "tribute-page-3", "tribute-page-4", "tribute-page-5", "tribute-page-6"]` (**7** — the page-1 dedication portrait **is** a slot, per Story 1; `tribute-back-cover` excluded as a writing page) + `story6Definition` (mirrors `story-1.ts`).
- `lib/story/registry.ts` — register the `"story-6"` entry.
- `lib/story/wizard-config.ts` — `STORY_6_STEPS` (`upload → pet → tribute → tone → generate`) + `WIZARD_CONFIG` entry. (The `tribute`/`tone` step *pages* land in PR 26; this is the ordered config + total.)
- `lib/session/storage.ts` — `newStory6Draft()` + a `newDraft("story-6")` overload.
- **Imagery (engine only):**
  - `lib/ai/story6-prompts.ts` — **brief-driven per-scene prompts** (mirror `lib/ai/prompts.ts`, not the 2-slot letter builders): build each of the 7 slot prompts from the resolved page's `illustrationBrief` + the shared consistency/style clause (reuse `buildReferencePrompt`'s "maintain the pet's exact appearance" wording). **All 7 are reference-anchored** (`useReference: true`); none are figure-free.
  - `lib/ai/generate.ts` — a `storyType === "story-6"` dispatch in `generateAllIllustrations` + `regenerateSceneIllustration` that **mirrors the Story-1 path**: generate the locked reference illustration, then the 7 scenes anchored on photo + reference via `images.edit` (Approach A), through the existing bounded worker pool + retry. `totalImages = slots + 1 = 8` (like Story 1; *unlike* Stories 2/4/5 where total = slots). Widen `manifestToImageMap`'s slot union to admit the 7 `tribute-*` page slots (still excludes the `reference` anchor + `tribute-back-cover`).
  - `app/(operator)/api/regenerate-illustration/route.ts` — widen the structural slot allowlist union to include the `tribute-*` page slots (the precise per-product gate still runs inside `regenerateSceneIllustration` after the session read).

**Out of scope**
- Wizard UI / public order form / catalog / storefront / samples / `GenerationProgress` + `illustrationLabels` story-6 branches / LS env var (PR 26).
- **Any new `PageLayout` / `renderPage` case / CSS** — Story 6 reuses Story 1's `cover` / `dedication` / `narrative` / `love` / `back-cover` wholesale; **playbook Step 3 is skipped entirely**. It is **not** a letter — no `LETTER_SIGNOFFS`, no single-column treatment.
- **The memorial re-render / second life / `DEATH_TYPE` / `BELIEF_FRAME` / the `truth` death layout — dropped entirely per PM (2026-06-12).** The template's "later memorial path", "Memorial conversion" variant, and memorial-conversion fields are **not built**; annotate the template that they are out of scope so a future agent doesn't re-introduce them.

## Implementation notes

**Key decisions**
- **First narrative-layout new book since Story 1.** Story 6 reuses Story 1's `cover` / `dedication` / `narrative` / `love` / `back-cover` layout values — so the preview will be the **facing-page spread** (the Story-1 path), not the single-column letter. Confirmed: no new `PageLayout`, no `renderPage` case, no CSS, no `LETTER_SIGNOFFS` (Step 3 fully skipped).
- **Imagery is Story 1's shape, not the letters'.** A locked reference illustration (`generateReferenceIllustration`) + 7 **reference-anchored** brief-driven scenes via `images.edit`. All 7 slots show the pet — **no figure-free wash** (unlike Story 2/5's belief wash). `totalImages = slots + 1 = 8`. This is the heaviest imagery work since feature 07, and **pet-consistency across 7 pages is the real QA risk** (the template's style guide explicitly calls for locking a reference before any page art) — the reason Story 6's PR-1 is heavier than Story 5's PR 23. Approach B / `input_fidelity` are the in-reserve levers if a pet drifts.
- **Brief-driven prompts** (mirror `lib/ai/prompts.ts`): each slot prompt derives from the resolved page's `illustrationBrief`, so art and text are single-sourced from `resolveStory6`. Not a per-slot hardcode.
- **Slot accounting (resolve the template's slot-list nit):** the template's "Slot list" line reads `cover, page-2…page-6` (6) but its prose adds the page-1 dedication portrait to reach 7. `TRIBUTE_SCENE_PAGE_IDS` must contain **all 7** (incl. `tribute-page-1`). `tribute-back-cover` is the writing page — excluded, exactly as Story 1 excludes `back-cover`.
- **Present-tense, single-tense engine + one toggle** (no two-tense engine — that's Story 4). `master-text.ts` holds the present-tense default bodies; `variants.ts` `composeVariants6()` layers:
  - `transitionFrame` — `still-here` (default) ends Page 5 on gratitude with **no mention of the future**; `road-ahead` replaces Page 5's final paragraph with a **single** plain forward-looking sentence (finitude named once, **no euphemism, death never named in the living book**).
  - `ageOrStage` — very-senior (15+) appends the Page-2 "long enough I can't remember the house before you" line; younger-but-diagnosed softens the Page-5 opener ("a hard turn earlier than either of us expected"), gratitude register unchanged.
  - species voice (Pages 2–4: cat stillness / rabbit binky / bird song), `otherPetsInHome: yes` appends the Page-4 line.
  - then merges. `resolveStory6(s) = mergeStory6(composeVariants6(s), s)`.
- **Reuse, don't re-implement:** `clean` / `substitute` / `MergeError` / `PageLayout` / `ResolvedStory` / `ResolvedPage` from `lib/story/merge.ts`. `STORY_6_LAYOUT: Record<Story6PageId, PageLayout>` tags `tribute-cover` → `cover`, `tribute-page-1` → `dedication`, `tribute-page-2..4` → `narrative`, `tribute-page-5`/`6` → `love`, `tribute-back-cover` → `back-cover`.
- **Live placeholders (required, no fallback):** `petName`, `breedColor` (Page 2 text + cover prompt), `ageOrStage` (Pages 2 & 5), `ownerNames`, `favoriteRitual` + `favoriteActivity` (Page 3). **Optional-with-fallback:** `stillLoves` (Page 3), `quirks` (Page 4) — apply the template's stock fallback lines when blank. **Optional-omit:** `ownerMessage` (dedication line + em-dash dropped when blank), `nicknames`, `dateAdopted`, `favoriteSpots` / `sleepingSpot` (feed art briefs + the `stillLoves` fallback). Use `cleanOptional` / `appendOptionalLines` from `story2/merge.ts`. (PR 26 owns the wizard required gate.)
- **`TRIBUTE_SCENE_PAGE_IDS` lives in the product module** (`lib/story/story-6.ts`), **never** in `lib/ai/*` — so the registry/catalog public graph stays engine-free (the boundary guard bans `lib/ai/*` from the public closure). `story6-prompts.ts` (in `lib/ai/`) imports the slot/page types from `master-text.ts`, not the reverse.
- **Page-id prefix `tribute-*` is an internal slug** (never user-facing), distinct from `page-N` (Story 1), `letter-*`, `talk-*`, `note-*`. Reusing a *layout value* ≠ reusing a *page id* — keep ids prefixed per the established convention. Cosmetic; PM may override.

**Files**
- `lib/session/types.ts` · `lib/session/storage.ts`
- `lib/story/master-text.ts` (page-id union)
- `lib/story/story6/{master-text,variants,merge,editable-fields,fixtures}.ts`
- `lib/pdf/filename.ts` · `lib/story/story-6.ts` · `lib/story/registry.ts` · `lib/story/wizard-config.ts`
- `lib/ai/story6-prompts.ts` · `lib/ai/generate.ts` · `app/(operator)/api/regenerate-illustration/route.ts`

## References

- @context/masterstories/story-6-master-template.md — **the** source text, merge fields (incl. the new `AGE_OR_STAGE` / `STILL_LOVES` / `OWNER_MESSAGE` + the `TRANSITION_FRAME` toggle), the "Pipeline fit & build notes", the present-tense "Quality bar / what to avoid" banned-phrase list, and the style guide's reference-lock requirement. **Ignore the memorial-conversion sections — out of scope per PM.**
- @context/new-book-playbook.md — Steps 1, 1a, 2 (author + extend the page-id union + register), Step 3 skip condition (reusing existing layouts), Step 4's client-safe boundary, and the imagery-shape (reference-anchored vs figure-free) choice.
- @context/features/03-story-master-text-and-variants.md + @context/features/04-pdf-template-and-print-css.md — the **narrative-layout** text + layout engine Story 6 reuses (`cover`/`dedication`/`narrative`/`love`/`back-cover`).
- @context/features/07-scene-pipeline-and-pet-consistency.md — **the imagery analog**: the reference-anchor + brief-driven scene pipeline, Approach A, the bounded worker pool + retry, `manifestToImageMap`'s reference/back-cover exclusion, `totalImages = slots + 1`.
- @context/features/20-story4-text-and-tense-engine.md — the most recent playbook text PR + the **tense-discipline test guards** to reuse (Story 6 is single-tense, but the present-tense leak guard mirrors Story 4's tense-leak guard).
- @context/features/14-multi-story-engine.md — the `ResolvedPage.layout` contract + the registry to register into.

## Done when

- [ ] `resolveStory6()` returns all **8** pages with **zero** literal `[MERGE_FIELD]` / `{token}` for a complete `Story6Session`, across the full `transitionFrame` × `ageOrStage`-band × species × `otherPetsInHome` matrix.
- [ ] Each variant changes the right page: `road-ahead` replaces only Page 5's final paragraph (one forward-looking sentence); very-senior appends the Page-2 line; younger-diagnosed softens the Page-5 opener; species tweaks land on Pages 2–4; `otherPetsInHome: yes` appends the Page-4 line.
- [ ] **The living-tribute quality bar holds:** the book is **present tense throughout** (no past-tense slip, no speaking of the pet as gone); **none** of the banned phrases appear in any combination ("passed away" / "put to sleep" / "lost" / "crossing over" / "rainbow bridge" / "better place" / "watching over" / "fur baby"); **death is never named** in the living path; `road-ahead` names finitude exactly once, plainly, with no euphemism; the `truth` death layout is **never** present.
- [ ] Optional fields (`stillLoves`, `quirks`, `favoriteSpots`, `sleepingSpot`, `ownerMessage`, `nicknames`, `dateAdopted`) omit/fall back cleanly — no dangling separator, no empty fragment.
- [ ] Missing required field → `MergeError`, never a literal token.
- [ ] `getStory("story-6")` resolves; a hand-authored Story-6 fixture renders an **8-page** PDF via `npm run render:test` ($0, placeholder SVGs); `tributePdfFilename` → `While-Youre-Still-Here-[PET_NAME].pdf`.
- [ ] **Imagery:** a live Low run generates **8** images — a reference anchor + **7 reference-anchored scenes** (`tribute-cover`, `tribute-page-1`…`tribute-page-6`), each recognizably the **same uploaded pet** via `images.edit`, **no figure-free wash**, with age signs (grey muzzle) honored and **never** elegiac/clinical; the route reports `total: 8` for story-6 (vs 14 / 2 / 2 / 2); a re-run is a **$0 cache hit**.
- [ ] **Story 1, Story 2, Story 4 AND Story 5 PDFs are byte-identical** (no shared CSS / `PageLayout` / `renderPage` switch touched) — verified by render:test: length + timestamp-normalized SHA on each existing fixture.
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test still passes (no `lib/ai/story6-prompts` in the public closure).

## Tests

- `test-author` (high value — pure logic, $0):
  - No `[A-Z_]+` / `{token}` placeholder survives across the **full** `transitionFrame` × `ageOrStage` × species × `otherPetsInHome` matrix.
  - **Present-tense guard** across every combination (assert no past-tense memorial markers; no banned-phrase; death never named in the living path; the `truth` layout never assigned). Mirror Story 4's tense-leak test, scoped to "no past / no farewell".
  - `road-ahead` names the future once (forward-looking sentence present) and `still-here` never does (the default Page 5 contains no future reference); per-variant page isolation + no state leakage between calls (fresh-copy guard).
  - Blank `stillLoves` / `quirks` → fallback (no dangling fragment); `species: "other"` → neutral voice; optional `ownerMessage` / `nicknames` / date omission; `MergeError` reporting; brace-injection regression.
  - `tributePdfFilename` cases (convention, slug, diacritics, empty → `Pet`); `STORY_6_LAYOUT` double-locked against an independently-authored expected map.
  - `lib/ai/story6-prompts.ts` — all 7 slots `useReference: true`, the consistency clause present, brief-driven (page text changes ⇒ prompt changes), no surviving placeholder.
  - `lib/ai/generate.story6.test.ts` — registry-driven 7-slot list → 8 generations (reference + 7) at the mocked SDK boundary, all via `images.edit` (`images.generate` never called — no wash); default `low` + override honored; manifest shape; cache hit = 0 calls; **Story 1 (14) / Story 2 (2) / Story 4 (2) / Story 5 (2) totals pinned unaffected**; `manifestToImageMap` admits the 7 `tribute-*` slots, excludes `reference` + `tribute-back-cover`.
- `qa` (engine-level, not browser — no wizard yet; mirrors Story 4 PR 21 / Story 5 PR 23): one live Low run (~$0.05 for 8 images) via a tsx script + Read-tool PNG inspection — the 7-scene pet-consistency check (the same animal, grey allowed, never elegiac), the $0 re-run, and the Story 1/2/4/5 byte-identity gate. Reuse the canonical Jack Russell photo; leave the on-disk book for PR 26's $0 sample frames; don't touch the canonical fixtures. Per [[qa-low-tier-cost-control]] keep it Low, once.
