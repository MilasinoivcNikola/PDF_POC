## 2026-06-14 — Story 8 (PR-A): "Amazing Adventures" Text, Variants, Registration & Approach-B Imagery

**Feature 31** · branch `feature/story8-text` (merge `85d39cc`) · the catalog's
first joyful kids' **adventure** book, and the first to run **Approach B** end-to-end
through the registry-driven worker. **PR-A of 3** — makes the engine *produce a
correct Adventure PDF from a `Story8Session`* (text → variants → merge → registration
→ Approach-B imagery), verified by the `render:test` CLI with a fixture. **Not yet
wizard / storefront / sellable** — that is PR-B (Feature 32). Mirrors the Story 7
split (specs 28 + 29).

### What shipped

**Text engine — `lib/story/story8/*` (mirrors `story7/`):**
- `master-text.ts` — the 13 pages as structured data (Backyard Mystery theme /
  age 6-8 / pet-plus / dog defaults), each scene carrying its `illustrationBrief`.
  The briefs now live in the master text (the single source) — the prompt builder
  reads the *resolved* brief, replacing PR-0's inlined `BEAT_BRIEFS` constants.
- `variants.ts` — compose-before-merge. Dimensions: **adventure-theme**
  (backyard-mystery authored to v1; the other three enum values fall back **totally**
  to backyard-mystery, never half-themed), **hero-count** (`pet-solo` rewrites every
  child-referencing body page to a child-free lone-hero voice and drops the child;
  `pet-plus` keeps the child as co-adventurer), **age-bracket** (3-5 simplifies the
  climax + gentles the wobble; 9-12 lengthens + adds wordplay + keeps the sequel
  hook; 6-8 is the master text), **species** (`[SPECIES_DESCRIPTOR]` + species-tuned
  superpower stock), and **sidekick-present** (Page 5 party line, only under
  `pet-plus` + `sidekickName` set).
- `merge.ts` — the `[SUPERPOWER]` **fallback chain** (the soul of the book: blank →
  derive from `[FAVORITE_ACTIVITY]` → else `[QUIRKS]` → else species stock; a real
  customer quirk is **never** overridden by stock) and **conditional-required
  `[CHILD_NAME]`** (`MergeError` under `pet-plus`, permitted blank under `pet-solo`,
  where the body beats are already rewritten not to reference it). Reuses the shared
  `clean`/`substitute`/`MergeError`/`cleanOptional`/`appendOptionalLines` primitives;
  owns `STORY_8_LAYOUT`.
- `editable-fields.ts`, `fixtures.ts` (canonical `biscuitSession8` + pet-solo / 3-5 /
  blank-superpower fixtures) + `merge`/`variants`/`registry`/`editable-fields` tests.

**Registration & types:**
- `lib/story/story-8.ts` — `ADVENTURE_SCENE_PAGE_IDS` (10 slots, book order) +
  `story8Definition`; registered in `registry.ts`. Scene identity lives in the product
  module (kept out of `lib/ai/*`) so the public catalog chain reaches it without a
  prompt-builder import.
- `lib/session/types.ts` — `StoryType += "story-8"`; `AdventureTheme`/`HeroCount`;
  `Story8Adventure`/`Story8Toggles`/`Story8Draft`/`Story8Session`; `WizardDraft` union.
  Reuses `Pet` + `AgeBracket`; deliberately does **not** reuse `Child` (which forces a
  required name) — carries a defaulted `childAgeBracket` + conditional `childName`.
- `lib/story/wizard-config.ts` — `STORY_8_STEPS` + the `WIZARD_CONFIG["story-8"]`
  entry (pure client-safe **data**; the UI is PR-B). Required because adding `"story-8"`
  to `StoryType` makes the `Record<StoryType,…>` non-exhaustive.
- `lib/pdf/filename.ts` — `adventurePdfFilename` → `Amazing-Adventures-of-[Name].pdf`.
- `lib/order/types.ts` — widen `Order.inputs` with `Story8Session`; `store.ts`
  re-points `OrderRow.inputs` at `Order["inputs"]` (drift-proof — that store no longer
  needs a per-book edit). `lib/session/draft.ts` — `isStory8Draft` guard; the draft
  dispatchers **fail closed**, throwing "not creatable until PR-B" rather than
  mis-defaulting a Story-8 draft to Story 1.

**Approach-B imagery — the one genuinely new engine bit:**
- `generateStory8Illustrations` + `case "story-8"` in `lib/ai/generate.ts`. It
  **self-selects Approach B internally** (does not read `options.approach`) — the worker
  calls `generateAllIllustrations(session)` bare, so the book self-selects B; this is the
  deliberate, contained exception to "every other book is Approach A," documented at the
  function. Generation order is **calm/establishing first** (`cover → ordinary → special
  → celebration`) to build the reference bank, then escalating action, **climax last**
  and at **Medium** (the PR-0-validated floor; everything else Low). Each accepted scene
  accumulates into the reference set via the now-exported shared `referencesForScene`.
  The returned manifest is reassembled in **book order**. Pages 10/11 (`adventure-home`
  ← celebration, `adventure-closing` ← cover) **reuse** existing art with **zero extra
  API calls**. Total = 1 reference + 10 slots = 11 images.
- `story8-prompts.ts` refactored from the PR-0 prototype builder to
  `buildStory8SlotPrompts(session)`, reading resolved briefs; the pose-discipline /
  dynamic-watercolor / climax side-leap clauses stay in the builder (not the brief).
  PR-0's throwaway `scripts/story8-prototype.ts` was rewired to the new builder to keep
  the build green (now redundant with the shared orchestrator; deletion deferred).

### No new layout — byte-identity held
Step 3 (layout/CSS) was **skipped**: Story 8 reuses the Story-1 narrative set
(`cover`/`narrative`/`closing`/`back-cover`; no `dedication`/`love`/`truth`, no death
page). The `renderPage` switch and both stylesheets were untouched, so **every existing
book's PDF stays byte-identical** (Otis still 873,889 bytes).

### Review & the one bug caught
Three reviewers ran in parallel. **Commerce-security: PASS** (Story 8 stays
non-sellable/non-creatable; the type widenings are additive; the draft path is
fail-closed; the public/operator boundary holds). **Code review: one blocking bug —**
pet-solo leaked the child onto **page 4** (`adventure-clue`): its master cheer line
was the only body page never rewritten, so it resolved to "cheered the child" (a
stand-in meant for illustration briefs only). Fixed by adding the page-4 pet-solo
rewrite in the authored lone-hero voice — **and closing the test gap that masked it**
(the old check only asserted the token was gone; the stand-in *resolved* it, so a new
assertion now proves no "the child" stand-in survives in any pet-solo body, on any
page). **Context audit: one drift —** CLAUDE.md never listed the Story 8 masterstory;
per its own "in-progress masterstory stays `@`-loaded for the milestone" convention,
this branch `@`-loaded `story-8-master-template.md` for Milestone 12 and added it to
the load-on-demand list (to be de-`@`-loaded at PR-B completion).

### Verification
`npx tsc --noEmit` clean · `npm run test:run` **1698 tests / 83 files** green (Story 8
surface: 5 files / 78 tests, incl. the 240-combo variant matrix, the tone guard
sweeping the whole matrix for grief/euphemism/filler/emoji, and the wobble-resolves-
safely check) · `npm run build` green · public-boundary test green ·
`render:test fixtures/amazing-adventures-biscuit.json` → a 13-page
`Amazing-Adventures-of-Biscuit.pdf` with placeholder art ($0).

### Carried forward (see `context/debt.md`)
- **Story 8 cost floor — climax at Medium + live B run unverified** (updated row):
  PR-A shipped with Medium locked **without** the spec's §9 live single-book worker run
  or the Low-vs-Medium climax comparison (deferred to keep PR-A at $0). A first live
  run (one near-$0 reuse of PR-0's pet) should confirm B self-selects with no worker
  edit and test whether Low alone holds the climax.
- **Story-8 repaint approximates B as A** — `regenerateStory8Slot` anchors a single
  repaint only on `[photo, reference]` (no accumulated siblings as B priors); the
  full-book path runs true B, only per-page repaint degrades. Story 8's #1 gate is
  per-scene likeness, so this is the path the operator leans on hardest.
- **Boundary-test parity (nice-to-have):** add `lib/ai/story8-prompts` to the boundary
  test's `FORBIDDEN_LOCAL` list — a latent drift-guard gap (Story 8 has no public
  consumer until PR-B), to be enforced in PR-B as Story 7 did.

### Out of scope (→ PR-B / Feature 32)
Catalog entry, price wiring ($34 recommended, recorded only), Lemon Squeezy variant +
env, wizard step UIs + draft→session bridge + `/api/session` validation, the public
order-form branch, the landing story-picker card, `illustrationLabels`,
`REFERENCE_ANCHOR_STORIES` registration, samples. Additional adventure themes
(sea-voyage / space-rescue / enchanted-forest) are follow-on authoring after Story 8
ships — each a `variants.ts` reskin.
