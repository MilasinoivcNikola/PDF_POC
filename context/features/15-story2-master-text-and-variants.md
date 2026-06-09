# 15 — Story 2: Master Text, Merge & Variants

> **Craft Area:** 1 — PDF pipeline · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 7 — Story 2 · **Phase:** 1 (the feature-03 analog) · **Depends on:** 14
> **Branch:** `feature/story2-text`

## Status

Not Started

## Goals

- Encode the Story-2 master text ("A Letter from [PET_NAME]" — cover + 5 letter pages) as structured data with merge fields + variant hooks, so a `Story2Session` becomes a fully-resolved `ResolvedStory` (carrying letter `layout` tags) with **no `[MERGE_FIELD]` left literal anywhere**.
- Apply Story-2's variant dimensions correctly: **relationship** (single / couple) → addressing throughout; **death type** → Page 4; **belief frame** → Page 5; **species voice** → Pages 3 & 6; **new-pet** → Page 6; **gift-for** → cover/dedication inscription.
- First-person voice (the pet writes "I"), owner addressed as "you" / "you both"; the pet's name in the signature; honor the master template's **quality bar** (these are product requirements, not style).

## Scope

**In scope**
- `lib/session/types.ts` — `Story2Session` / `Story2Draft` discriminated by `storyType: "story-2"`. Reuse `Pet` (drop the child entirely); add groups:
  - `Owner` — `{ names: string; relationship: "single" | "couple" }`
  - `LetterMemories` — `{ quirks: string; favoriteRitual: string; favoriteSpots: string; nicknames?: string; dateAdopted?: string; datePassed?: string }`
  - `Story2Toggles` — `{ deathType: "peaceful" | "illness" | "sudden" | "euthanasia"; beliefFrame: "rainbow-bridge" | "heaven" | "secular"; giftFor: "self" | "friend"; newPet: "yes" | "no" }`
- `lib/story/story2/master-text.ts` — the 6 pages as structured data: each page's copy with `{merge}` placeholders, its `layout` tag (feature 14), and an illustration brief for feature 17 (cover portrait + belief wash).
- `lib/story/story2/variants.ts` — compose-before-merge for all five dimensions.
- `lib/story/story2/merge.ts` (value-builder + `resolveStory2(session): ResolvedStory`) — **reuse** the merge primitives from `lib/story/merge.ts` (`clean`, `substitute`, `MergeError`, `PLACEHOLDER_PATTERN`); do not re-implement.
- Register Story-2 in `lib/story/registry.ts` (resolve fn + `pdfFilename` → `Letter-from-[PET_NAME].pdf`).
- `lib/story/story2/fixtures.ts` — a complete "Murphy" `Story2Session` + override helper (mirrors `fixtures.ts`/`otisSession()`).

**Out of scope**
- Rendering / letter CSS (feature 16). Imagery (17). Wizard inputs (18).
- The **"family"** relationship variant — punted, per the template's own "may be better redirected to Story 1." Single + couple only.

## Implementation notes

**Key decisions**
- **Compose variants, then merge** — same pattern as feature 03.
- New placeholder keys: `{petName}`, `{ownerNames}`, `{species}`, `{quirks}`, `{favoriteRitual}`, `{favoriteSpots}`, `{petNicknames}`, `{dateAdopted}`, `{datePassed}`. Pronoun-free apart from `{species}`; "you both" comes from the **couple variant text**, not a pronoun map.
- **Sparse-input fallbacks** per the template: blank/shallow `quirks` → the stock lines ("the way you always saved a bite for me…", "the way your hand found my head without looking"); per-species voice fallback for `species: "other"`.
- **Quality-bar bans are baked into the text and asserted** — across every variant combination, the output must never contain: "fur baby", "crossed the rainbow bridge", "ran free in heaven", "now an angel watching over you", any quotation, or the pet "watching over" the owner. Page 4 is never funny. Never print a date the customer didn't provide (omit the date line when `dateAdopted`/`datePassed` are blank).
- **Required vs optional:** `petName`, `ownerNames`, `species`, `quirks` (or its fallback), `favoriteRitual`, `favoriteSpots` are required for a clean letter; `nicknames`, `dateAdopted`, `datePassed` are optional and must omit cleanly (no "— —" date artifact, no empty signature line).

**Files**
- `lib/session/types.ts`
- `lib/story/story2/{master-text,variants,merge,fixtures}.ts`
- `lib/story/registry.ts` (register the `"story-2"` entry)

## References

- @context/masterstories/story-2-master-template.md — **the** source text, merge fields, variant tables, "The voice" guide, and the "Quality bar / what to avoid" list.
- @context/features/03-story-master-text-and-variants.md — the Story-1 pattern this mirrors.
- @context/features/14-multi-story-engine.md — the `ResolvedPage.layout` contract + registry to register into.

## Done when

- [ ] `resolveStory2()` returns all 6 pages with **zero** literal `[MERGE_FIELD]` tokens for a complete `Story2Session`.
- [ ] Each variant dimension verifiably changes the right page; species voice changes Pages 3 & 6; `relationship: "couple"` produces "you both" addressing.
- [ ] Optional fields (nicknames, dates) omit cleanly when blank.
- [ ] No banned phrase appears in **any** death × belief × species × relationship × new-pet combination.
- [ ] Missing required field is reported via `MergeError`, never rendered as a literal token.
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author` (high value — pure logic):
  - Assert no `[A-Z_]+` placeholder survives across the full variant matrix.
  - Each `deathType` → correct Page 4; each `beliefFrame` → correct Page 5; each `species` → correct Pages 3 & 6; `couple` → "you both"; `newPet: "yes"` → the extra Page 6 line; `giftFor: "friend"` → the inscription.
  - Blank/shallow `quirks` → fallback lines; `species: "other"` → fallback voice.
  - Banned-phrase guard across every combination; Page 4 contains no humor markers.
  - Missing required field reported (not rendered); blank optional dates omit the date line.
