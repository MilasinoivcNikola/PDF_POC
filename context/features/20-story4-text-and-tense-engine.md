# 20 — Story 4: Text, Two-Tense Engine & Registration

> **Craft Area:** 1 — PDF pipeline / story text · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 8 — Story 4 ("If [PET_NAME] Could Talk") · **Phase:** 1 (PR 1 of 3) · **Depends on:** 14, 15, 16
> **Branch:** `feature/story4-text`

## Status

Not Started

## Goals

- Encode the Story-4 master text ("If [PET_NAME] Could Talk" — cover + 5 letter pages, a *living* pet's voice) as structured data with merge fields + variant hooks, so a `Story4Session` becomes a fully-resolved `ResolvedStory` (reusing the existing `letter-cover` / `letter` layouts from feature 16) with **no `[MERGE_FIELD]` left literal anywhere**.
- Build the **two-tense engine** — the headline `[LIVING_OR_MEMORIAL]` toggle (default **living**, present tense, celebration / **memorial**, past tense, grief). The single biggest risk is a **tense leak**: a present-tense sentence surviving into a memorial letter, or vice versa.
- **Register Story 4** in `lib/story/registry.ts` (`resolve` / `illustrationSlots` / `pdfFilename` / `wizard` / `editable`) so a hand-authored fixture renders a 6-page PDF via `render:test` ($0). The book is **not yet sellable** (catalog, PR 22) or **creatable** (wizard, PR 22), and has **no imagery** (PR 21) — this PR makes the engine *know* the book.

## Scope

**In scope**
- `lib/session/types.ts`:
  - `LivingOrMemorial` — `"living" | "memorial"`.
  - `Story4Memories` — `LetterMemories` **+** `favoriteActivity: string` (Story 1's field, reused).
  - `Story4Toggles` — `{ livingOrMemorial: LivingOrMemorial; giftFor: GiftFor; deathType: LetterDeathType; beliefFrame: LetterBeliefFrame }`. **Reuses** `GiftFor` / `LetterDeathType` / `LetterBeliefFrame`; **drops** `newPet` (no Story-2 new-pet beat here).
  - `Story4Draft` / `Story4Session` discriminated by `storyType: "story-4"` (reuse `Pet` + `Owner`; no `child`).
  - `StoryType += "story-4"`; `WizardDraft += Story4Draft`.
- `lib/story/master-text.ts` — `Story4PageId` (`talk-cover`, `talk-page-2`…`talk-page-6`); `PageId = Story1PageId | Story2PageId | Story4PageId`.
- `lib/story/story4/{master-text,variants,merge,editable-fields,fixtures}.ts` (new namespaced folder).
- `lib/pdf/filename.ts` — `talkPdfFilename(petName)` → `If-[PET_NAME]-Could-Talk.pdf` (reuse `slugify` + `Pet` fallback).
- `lib/story/story-4.ts` — `TALK_SCENE_PAGE_IDS = ["talk-cover", "talk-page-4"]` + `story4Definition` (mirrors `story-2.ts`).
- `lib/story/registry.ts` — register the `"story-4"` entry.
- `lib/story/wizard-config.ts` — `STORY_4_STEPS` (`upload → pet → owner → letter → tone → generate`) + `WIZARD_CONFIG` entry.
- `lib/session/storage.ts` — `newStory4Draft()` + a `newDraft("story-4")` overload.

**Out of scope**
- AI imagery (PR 21). Wizard UI / public order form / catalog / storefront / samples (PR 22).
- **Any new `PageLayout` / `renderPage` case / CSS** — Story 4 reuses the `letter-cover` + `letter` layouts wholesale; **playbook Step 3 is skipped entirely**.
- The **"family"** relationship variant — single + couple only (the master template redirects family to Story 1).

## Implementation notes

**Key decisions**
- **Separate registry entry, not a toggle on Story 2** (the master template's recommendation). `storyType: "story-4"`, `productId: "story-4-talk"` — keeps catalog, price, marketing, and samples independent of the Story-2 grief listing while sharing the engine internally.
- **The two-tense engine — compose-before-merge.** `master-text.ts` holds the **living (present)** default bodies. `variants.ts` `composeVariants4()` swaps in the **full memorial (past-tense) bodies** when `livingOrMemorial === "memorial"`, *then* layers relationship (couple → "you both" / "my favorites"), species voice (pages 2/3/4), and the gift-for cover inscription; **memorial only** adds the death-type seam line + belief-frame closing on Page 5. `resolveStory4(s) = mergeStory4(composeVariants4(s), s)`.
- **Adding `StoryType += "story-4"` forces the non-partial `Record<StoryType, …>` maps** (`WIZARD_CONFIG`, and any other) to be filled — which is why the full registration scaffolding (wizard-config, storage default, editable contract, filename) ships in *this* PR, not a later one.
- **Reuse, don't re-implement:** `clean` / `substitute` / `MergeError` / `PageLayout` / `ResolvedStory` / `ResolvedPage` from `lib/story/merge.ts`. `STORY_4_LAYOUT: Record<Story4PageId, PageLayout>` tags `talk-cover` → `letter-cover` and `talk-page-2…6` → `letter`.
- **Dates reuse `LetterMemories`' `dateAdopted` / `datePassed`** (no new fields): living cover line `together since {dateAdopted}` (when present); memorial `{dateAdopted} — {datePassed}` **only when both** are present (never print a date the customer didn't give). Optional `petNicknames` line in the signature when present. Use the `cleanOptional` / `appendOptionalLines` pattern from `story2/merge.ts`.
- **Sparse-input fallback:** blank/shallow `quirks` → the stock Page-3 lines. `species: "other"` → species-neutral voice ("the kind of happy that doesn't need a reason").
- **Quality bar (product requirement, asserted):** **both paths** ban "fur baby", any "watching over you", and quotations. **Memorial path** uses **"died"** — never "passed away" / "went to sleep" / "lost" / "crossed the rainbow bridge". **Living path** never says "died" and never closes in past-tense valediction. Page 5's memorial death-type line is never funny.
- **`TALK_SCENE_PAGE_IDS` lives in the product module** (`lib/story/story-4.ts`), **never** in `lib/ai/*` — so the registry/catalog public graph stays engine-free (the boundary guard bans `lib/ai/*` from the public closure).

**Files**
- `lib/session/types.ts`
- `lib/story/master-text.ts` (page-id union)
- `lib/story/story4/{master-text,variants,merge,editable-fields,fixtures}.ts`
- `lib/pdf/filename.ts` · `lib/story/story-4.ts` · `lib/story/registry.ts` · `lib/story/wizard-config.ts` · `lib/session/storage.ts`

## References

- @context/masterstories/story-4-master-template.md — **the** source text, merge fields, the `[LIVING_OR_MEMORIAL]` toggle, full past-tense rewrites (pages 2 & 5), variant tables, "The voice" guide, and the "Quality bar / what to avoid" list.
- @context/new-book-playbook.md — Steps 1, 1a, 2 (author the text + extend the page-id union + register).
- @context/features/15-story2-master-text-and-variants.md — the closest analog (the Story-2 text engine this mirrors).
- @context/features/14-multi-story-engine.md — the `ResolvedPage.layout` contract + the registry to register into.
- @context/features/16-story2-letter-template-and-css.md — the `letter-cover` / `letter` layouts being reused (no CSS work here).

## Done when

- [ ] `resolveStory4()` returns all 6 pages with **zero** literal `[MERGE_FIELD]` tokens for a complete `Story4Session`, in **both** the living and memorial paths.
- [ ] **Tense engine verified:** the memorial path contains no present-tense "I am" / "I love" on pages 2/4/5; the living path never says "died" and never closes in a past-tense valediction.
- [ ] Each variant changes the right page: `relationship: "couple"` → "you both" / "my favorites"; species → pages 2/3/4; gift-for → cover inscription; memorial death-type → the Page-5 seam line; memorial belief-frame → the Page-5 closing frame.
- [ ] Optional fields (`nicknames`, `dateAdopted`, `datePassed`) omit cleanly (no dangling dash, no empty line); the memorial date line appears only when **both** dates are present.
- [ ] Missing required field → `MergeError`, never a literal token.
- [ ] `getStory("story-4")` resolves; a hand-authored Story-4 fixture renders a **6-page** PDF via `npm run render:test` ($0, placeholder SVGs).
- [ ] **Story 1 AND Story 2 PDFs are byte-identical** (no shared renderer/CSS touched — verify both fixtures: length + timestamp-normalized SHA).
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test still passes.

## Tests

- `test-author` (high value — pure logic, $0):
  - No `[A-Z_]+` / `{token}` placeholder survives across the **full** living × memorial × relationship × species × death-type × belief-frame matrix.
  - **Tense-leak guards:** memorial path has no present-tense "I am" / "I love" on pages 2/4/5; living path contains no "died" and no past-tense valediction (the master template's Notes #1 requirement).
  - Banned-phrase guard across every combination ("fur baby" / "watching over you" / "crossed the rainbow bridge" / "passed away" / "went to sleep"); Page-5 memorial line carries no humor markers.
  - Blank/shallow `quirks` → fallback; `species: "other"` → neutral voice; optional-field omission (no dangling dash, date line only when both dates present); `MergeError` reporting; brace-injection regression.
  - `talkPdfFilename` cases (convention, slug, diacritics, empty → `Pet`).
- **No `qa`** (nothing user-facing renders yet — like feature 15). The byte-identity of Story 1/2 is a render:test + normalized-SHA gate, not a browser step.
