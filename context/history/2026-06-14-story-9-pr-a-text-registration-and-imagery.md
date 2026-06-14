## 2026-06-14 — Story 9 (PR-A): Text, Variants, Registration & Approach-A Imagery

**Branch:** `feature/story9-text` · **Commit:** 0cf6a51 · **Merge:** 69f468b

The catalog's family-transition keepsake — **"[PET_NAME] and the New Baby"** — gets its
engine half. After this PR the engine produces a correct **10-leaf** "New Baby" PDF from a
`Story9Session`, with every variant applied and **7** reference-anchored illustration
slots. **Not yet sellable** — no wizard step, storefront card, or public order intake
(that is PR-B / feature 33). This is the text-engine + registration + imagery half,
independently verifiable via the render CLI.

Authoring-only, per the new-book playbook: the book **reuses the Story-1 `PageLayout` set
verbatim** (`cover`, `dedication`, `narrative`, `love`, `closing`, `back-cover`), so **Step 3
was skipped** — no new `renderPage` case, no new print CSS, no screen↔PDF parity work, and
every other product's PDF stays byte-identical. Story 1's `truth` (death) layout is never
used — this is a joyful, living, growing-family book.

### What shipped

1. **Text engine — `lib/story/story9/`** (mirrors Story 6's module shape):
   - `master-text.ts` — the 10 master pages at default tone (**expecting**, no other pets,
     dog voice), each with its `illustrationBrief`. Page ids are `baby-` prefixed
     (`baby-cover`, `baby-page-1` … `baby-page-8`, `baby-back-cover`).
   - `merge.ts` — `STORY_9_LAYOUT` (page id → Story-1 `PageLayout`; page-7 → `love`,
     page-8 → `closing`) + the value builder. `{babyName}` **degrades to the literal
     "the new baby"** whenever `babyStatus` is `expecting` OR the name is blank (the
     degraded value carries its own article, so no doubled `a a` / `the the`); reuses
     Story 1's `speciesDescriptor` mapper for the "big [SPECIES_DESCRIPTOR]" phrasing.
   - `variants.ts` — `resolveStory9(session)`. Dimensions: **`babyStatus`
     (expecting | arrived)** rewrites the cover subtitle, the dedication, Page 4, Page 6,
     and the Page-8 closing between anticipatory and present framings (each affected page
     built WHOLE so the two paths never half-mix); **species** voice on Pages 2 (cat
     rewrite), 3 (bird/rabbit "settles in"), 6 (cat supervises; `other` → "a friend who
     loves" rather than the ungrammatical "a other"); **`otherPetsInHome`** appends the
     "the more, the merrier" line on Pages 2, 4, 5, 7.
   - `editable-fields.ts` + `fixtures.ts`; tests `merge.test.ts` (zero surviving
     `[FIELD]`/`{field}` + article-grammar guard over the full matrix), `variants.test.ts`,
     `registry.test.ts`, `editable-fields.test.ts`.

2. **Session contract — `lib/session/types.ts`**: `BabyStatus`, `Story9Memories`,
   `Story9Toggles` (`babyStatus`, `otherPetsInHome`), `Story9Draft`, `Story9Session`;
   root-level optional `babyName?` / `babyArrival?`; `"story-9"` added to `StoryType` +
   `WizardDraft`; `Story9PageId` (incl. `baby-page-8`) added to the `PageId` union in
   `lib/story/master-text.ts`.

3. **Registration**: `lib/story/story-9.ts` (`story9Definition` +
   `STORY_9_SCENE_PAGE_IDS` — exactly 7: cover + pages 2-7, excludes dedication/closing/
   back-cover); `newBabyPdfFilename` → `[PET_NAME]-and-the-New-Baby.pdf`; `registry.ts`,
   `wizard-config.ts` (5-step config), `draft.ts` (`isStory9Draft` + dispatcher guards
   that throw `"story-9 wizard not yet wired (PR-B)"` rather than mis-assembling as
   Story 1). `app/(operator)/create/letter/page.tsx` narrowing exclusion.

4. **Imagery — `lib/ai/story9-prompts.ts`** (Approach A): 7 per-scene prompt builders,
   importing `STORY_9_SCENE_PAGE_IDS` from `lib/story/story-9`. Only the pet is
   photo-anchored; the baby and all adult figures are forced faceless/abstract (a global
   style clause appended to every slot: "never a specific, detailed, or recognizable baby
   face"; adults in 3/4 or from-behind). Nursery-adjacent palette, golden-hour light,
   tier-agnostic so the engine's **low** default applies. Added to the public-forbidden
   (engine-only) list in `lib/runtime/surface.boundary.test.ts`.

### Review findings fixed before merge

Review surfaced three issues, all resolved on-branch:

- **Restored the distinct Page 8 "Closing"** (PM-approved). The first build wrongly
  *dropped* the masterstory's Page 8 (`closing`) and folded a compressed version into
  Page 7's `love` closer — losing "...loved when the baby is grown and gone and grey" and
  the arrived-variant closing line — on the false belief that `closing` doesn't exist. It
  does (`lib/pdf/pages.tsx` `case "closing"` → `ClosingPage`). The page was restored
  faithfully (book went 9 → **10 leaves**, matching the masterstory exactly), Page 7
  reverted to the pure `[lead, hero]` love beat. Illustration slots stayed **7**
  throughout. *(`LovePage` renders a 2-element `[lead, hero]` body cleanly; `ClosingPage`
  is titleless, matching Story 1/7.)*
- **Page-6 grammar break** for `species="other"` (`"a other who loves"`) — fixed by
  inlining a grammatical species noun (`other` → "friend"; animals unchanged).
- **Page-2 cat species variant** — specified by the masterstory and claimed in code
  comments but not implemented; implemented (with the duplicated "warm spot by the window"
  fragment de-duped by deletion, no invented copy).

Doc reconciliation: the Story-9 masterstory was added to `CLAUDE.md` (load-on-demand list
+ `@`-loaded per the in-progress-milestone convention; remove on Story 9 completion).

### Verification

- `npm run test:run` → **88 files / 1876 tests passing** (incl. the PDF byte-identity
  `template.test.tsx` / `template.story2.test.tsx` and the public/operator boundary +
  operator-gate suites — all green; Step 3 skipped, shared template untouched).
- `npm run build` → compiled successfully.
- `npm run render:test fixtures/new-baby-biscuit.json` → wrote a **10-leaf**
  `Biscuit-and-the-New-Baby.pdf` (`/Count 10`) with the closing page present; both
  `babyStatus` paths read as complete, natural books.

### Decisions / carried forward

- **`babyName` / `babyArrival` live on the session root** (not in `memories`) — they
  describe the baby, not the pet. The conditional `babyName` is gated at *generate*, not at
  the wizard step (lands in PR-B; the session contract already supports it).
- **$27** (2700 cents), default toggle **expecting** — locked with PM 2026-06-14 (price
  wiring lands in PR-B's catalog entry).
- **PM copy review** of two dev-authored variant lines (Page-2 cat list-heaviness, Page-6
  `other` → "friend") deferred to a `context/debt.md` row — taste, not correctness.
- **Out of scope (PR-B):** wizard step + conditional reveal, storefront card, public order
  intake, sample images under `public/samples/`.
</content>
