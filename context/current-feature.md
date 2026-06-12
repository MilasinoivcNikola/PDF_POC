# Story 5: Text, Registration & Premium Imagery

## Status

In Progress

## Goals

- Encode the Story-5 master text — **"A Letter *to* [PET_NAME]"**, the *owner's* second-person voice writing **to** the pet who died (cover + 5 letter pages) — as structured data with merge fields + variant hooks, so a `Story5Session` resolves to a full `ResolvedStory` reusing the existing `letter-cover` / `letter` layouts (feature 16), with **no `[MERGE_FIELD]` / `{token}` left literal** across the full relationship × death-type × belief-frame × species matrix.
- **Register Story 5** in `lib/story/registry.ts` (`resolve` / `illustrationSlots` / `pdfFilename` / `wizard` / `editable`) so a hand-authored fixture renders a **6-page PDF via `npm run render:test`** ($0, placeholder SVGs); `letterToPdfFilename` → `Letter-to-[PET_NAME].pdf`.
- **Generate Story 5's 2 Premium images** — `note-cover` (reference-anchored, `images.edit`) + `note-page-5` belief wash (figure-free, `images.generate`) — by **reusing Story 2's prompt builders verbatim** (`buildCoverPortraitPrompt` / `buildBeliefWashPrompt`) and adding a `storyType === "story-5"` dispatch to the orchestrator. Imagery shape is **identical to Story 2's**, not Story 4's — near-pure reuse, no new likeness risk.
- **Quality bar holds:** "died" appears plainly (Page 2); no banned euphemism ("passed away" / "went to sleep" / "lost" / "crossed the rainbow bridge" / "watching over" / "fur baby") in any combination; the Page-4 apology lifts blame, never assigns it; **no reunion promise on `secular`** (Page 5).
- Optional fields (`quirks`, `lastGoodDay`, `whatIKeep`, `nicknames`, dates) omit/fall back cleanly — no dangling separator; the date line appears only when **both** dates present.
- **Story 1, Story 2 AND Story 4 PDFs stay byte-identical** (length + timestamp-normalized SHA per existing fixture). The book is **not yet sellable or creatable** — wizard / catalog / storefront / samples land in PR 24.
- Gates: `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass; the public-boundary test still passes (no `lib/ai/story5-prompts` in the public closure).

## Notes

**Craft Areas & routing.** Spans **Craft Area 1 (PDF/story text — primary)** and **Craft Area 2 (imagery)**. `start` dispatches **`pdf-render-specialist`** as primary owner (text engine, registry, filename, sign-off) and **`ai-image-specialist`** for the imagery slice (`story5-prompts.ts` + the `generate.ts` story-5 dispatch + the regenerate-route allowlist). Milestone 9 (Story 5), **Phase 1 / PR 1 of 2**. Depends on features 14, 15, 16, 17. Branch: `feature/story5-text`.

**✅ Resolved PM decision — `[LAST_GOOD_DAY]` placement (2026-06-12).** Nikola confirmed: place it as a short **optional-with-fallback** beat at the **end of Page 3** (gratitude) — "And thank you for {lastGoodDay}." with fallback "And thank you for the last good ordinary day, the one I didn't know to memorize." Treated like `quirks`/`whatIKeep` — never a `MergeError` when blank.

**Key decisions (locked in spec).**
- Story 5 is the **inverse/companion of Story 2** (owner→pet, second person) — its own `storyType: "story-5"`, `productId: "story-5-letter-to"`, independent catalog/price/marketing — while sharing Story 2's engine internals (layout + prompts). *Not* a Story-2 variant.
- **Compose-before-merge, single-tense (past)** — no two-tense engine (that's Story 4's). `master-text.ts` holds the single-owner ("I") defaults; `composeVariants5()` layers relationship (couple → "we"/"us"/"ours", from variant text per page — not find-replace), death-type (Page 4 confession/apology), belief-frame (Page 5), species voice (Page 3 "happy sound"); **then** merge. `resolveStory5(s) = mergeStory5(composeVariants5(s), s)`.
- **Required free-text is smaller than Story 2:** only `favoriteRitual` + `favoriteSpots` are un-fallbacked live placeholders. `quirks` is optional-with-fallback here (Story 2 required it); `lastGoodDay` / `whatIKeep` optional-with-fallback. `BREED` feeds **only** the cover image prompt, never printed text → default `""`, never a `MergeError`.
- **Reuse, don't re-implement:** `clean` / `substitute` / `MergeError` / `PageLayout` / `ResolvedStory` / `ResolvedPage` from `lib/story/merge.ts`; `cleanOptional` / `appendOptionalLines` from `story2/merge.ts`; dates reuse `LetterMemories`' `dateAdopted` / `datePassed` (no new date fields). `STORY_5_LAYOUT` tags `note-cover` → `letter-cover`, `note-page-2…6` → `letter`.
- **Sign-off byte-safety:** register **"With all my love, always,"** in `LETTER_SIGNOFFS` — distinct from `"Yours, always,"` (Story 2) and `"Yours,"` (Story 4), exact-equality matched, never a standalone body paragraph ⇒ Story 2/4 splits unchanged, their PDFs byte-identical.
- **Boundary:** `NOTE_SCENE_PAGE_IDS = ["note-cover", "note-page-5"]` lives in the **product module** (`lib/story/story-5.ts`), never `lib/ai/*`, so the registry/catalog public graph stays engine-free. `story5-prompts.ts` imports the slot type from `master-text.ts`, not vice-versa.
- Page-id prefix `note-*` is an internal slug (never user-facing), distinct from `letter-*` / `talk-*`. Cosmetic — PM can override.

**Files touched.** `lib/session/{types,storage}.ts` · `lib/story/master-text.ts` (page-id union) · new `lib/story/story5/{master-text,variants,merge,editable-fields,fixtures}.ts` · `lib/pdf/filename.ts` · `lib/story/{story-5,registry,wizard-config}.ts` · `lib/pdf/pages-story2.tsx` (`LETTER_SIGNOFFS` only) · `lib/ai/{story5-prompts,generate}.ts` · `app/(operator)/api/regenerate-illustration/route.ts`.

**Out of scope (don't drift).** Wizard UI / public order form / catalog / storefront / samples / `GenerationProgress` + `illustrationLabels` story-5 branches / LS env var → **PR 24**. Any new `PageLayout` / `renderPage` case / CSS — Story 5 reuses `letter-cover` + `letter` wholesale (playbook Step 3 = just the one `LETTER_SIGNOFFS` sentinel). The companion **Stories 2 + 5 bundle** — deliberately not built (breaks the reuse guarantee; separate decision).

**Tests (test-author, $0 pure logic).** Placeholder-survival over the full variant matrix; banned-phrase + "died"-present + no-reunion-on-`secular` + Page-4-absolution guards; blank `quirks`/`lastGoodDay`/`whatIKeep` fallbacks (no dangling fragment); `species:"other"` neutral voice; both-dates-only date line; `MergeError` reporting; brace-injection regression; `letterToPdfFilename` cases; `story5-prompts.test.ts` (both slot shapes + consistency clause); `generate.story5.test.ts` (2-slot list, `images.edit` cover + `images.generate` wash at mocked boundary, default `low` + override, cache-hit = 0 calls, **Story 1/2/4 totals pinned unaffected**, `manifestToImageMap` admits `note-*`).

**QA (engine-level, not browser — no wizard yet; mirrors Story 4 PR 21).** One live Low run (~$0.012) via a tsx script + Read-tool PNG inspection: cover recognizably the pet + figure-free wash, $0 re-run cache hit, Story 1/2/4 byte-identity gate. Reuse the canonical Jack Russell photo; leave the on-disk book for PR 24's $0 sample frames; don't touch the canonical fixtures.
