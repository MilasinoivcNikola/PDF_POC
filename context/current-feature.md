# Current Feature

Feature 28 — Story 7 (PR-A): "Welcome Home" Text, Variants, Registration & Imagery

## Status

In Progress

## Goals

Make the engine **produce a correct "Welcome Home — [PET_NAME]'s Gotcha Day" PDF
from a `Story7Session`** — the catalog's **first joyful, non-memorial** book —
verified by the `render:test` CLI with a fixture. No wizard, no storefront, **not
yet sellable** (that's PR-B / Feature 29). Mirrors the Story 5/6 split.

Spec: [context/features/28-story7-text-registry-and-imagery.md](features/28-story7-text-registry-and-imagery.md)
Master template: [context/masterstories/story-7-master-template.md](masterstories/story-7-master-template.md)

- **Text engine** `lib/story/story7/*` — `master-text.ts` (11 pages as structured
  data, new-arrival default), `variants.ts` (`composeVariants7` over **6 dimensions**:
  occasion, adoption-source, life-stage, species, child-present, family-present),
  `merge.ts` (`resolveStory7`, reuse shared primitives, own `STORY_7_LAYOUT`,
  fallbacks + `[YEARS_HOME]` singular/plural), `editable-fields.ts`, `fixtures.ts`.
- **Session types** `lib/session/types.ts` — `StoryType += "story-7"`; new
  `Occasion`/`AdoptionSource`/`LifeStage` unions; `Story7Memories`/`Story7Toggles`/
  `Story7Draft`/`Story7Session`; extend `WizardDraft`.
- **Step 1a** `lib/story/master-text.ts` — `Story7PageId` union (11 ids), `PageId +=`.
- **Registration** `lib/story/story-7.ts` (`WELCOME_SCENE_PAGE_IDS` = 8 slots,
  `story7Definition`) + register in `lib/story/registry.ts`.
- **Wizard-config coupling** `lib/story/wizard-config.ts` — `STORY_7_STEPS` +
  `WIZARD_CONFIG["story-7"]` (pure data only; UI lands in PR-B) to keep the
  `Record<StoryType,…>` exhaustive.
- **PDF filename** `lib/pdf/filename.ts` — `welcomeHomePdfFilename` → `Welcome-Home-[Name].pdf`.
- **AI imagery** `lib/ai/story7-prompts.ts` (`buildStory7SlotPrompts`, palette
  modifier + emotional progression, `welcome-before` → `useReference:false`) +
  `lib/ai/generate.ts` `case "story-7"` (1 reference + 8 slots = 9 images, Low tier).
- **Order types** `lib/order/types.ts` — widen `Order.inputs` union with `Story7Session`.

## Notes

**Owner / Craft Area:** primarily **pdf-render-specialist** (text engine, merge,
variants, registration, filename) + **ai-image-specialist** (story7-prompts +
generate dispatch). Authoring-mostly, **LOW build effort** per the playbook.

**Reuse guarantee (hard):** zero changes to Supabase, the worker, the admin desk,
delivery, or the order state machine. **Step 3 (page layout/CSS) is SKIPPED** —
Story 7 reuses the Story-1 narrative set wholesale (`cover`, `dedication`,
`narrative`, `closing`, `back-cover`; **no `truth`/death page**). `renderPage`
switch + both stylesheets untouched → **every existing book's PDF stays byte-identical**.

**Tone is the headline risk** — this is the opposite of every sibling title (a
*happy* book). Standing guard: **no grief/memorial language leaks in** ("rainbow
bridge", "watching over", "gone too soon", "passed away", "fur baby", "forever home"
filler, "purrfect", "pawsome", "meant to be", "a match made in heaven"). Encoded as
whole-matrix test assertions. (No "died" rule — it's the opposite book.)

**Decisions locked (PM, 2026-06-13):**
- Price **$29 (`2900`)** placeholder — set in PR-B; recorded for fixture/marketing.
- `[YEARS_HOME]` **asked directly** (numeric field, only when `occasion =
  gotcha-day-anniversary`), not derived from `[DATE_ADOPTED]`. PR-A's merge consumes
  `yearsHome` + handles 1-year singular/plural; PR-B collects it.
- **8 illustration slots** — `cover` + 7 narrative scene pages (2–8). Dedication
  **reuses the locked reference** (not a slot); closing is decorative/reused.
  `welcome-before` is **figure-free** (empty house, pet absent by design →
  `generateImageFromPrompt`); cover + pages 3–8 reference-anchored (`images.edit`).
  Total API images/book = **9** (1 reference + 8 slots).

**Created (12):** `lib/story/story7/{master-text,variants,merge,editable-fields,fixtures}.ts`,
`lib/story/story7/{merge,variants,registry,editable-fields}.test.ts`, `lib/story/story-7.ts`,
`lib/ai/story7-prompts.ts`, `lib/ai/story7-prompts.test.ts`, `fixtures/welcome-home-biscuit.json`.
**Edited (7):** `lib/session/types.ts`, `lib/story/master-text.ts`, `lib/story/registry.ts`,
`lib/story/wizard-config.ts`, `lib/pdf/filename.ts`, `lib/ai/generate.ts`, `lib/order/types.ts`.

**Test guards:** full variant-matrix merge (zero surviving placeholders, optional
omit clean, `MergeError`, brace-injection), per-dimension variants (5 origin
sentences + thank-you gating, senior/puppy beats, species swaps, child/family
beats, fallbacks, `[YEARS_HOME]` 1-year singular vs plural), **happy-book tone
guard** across whole matrix, registry (8 slots, layouts never `truth`), editable
+ prompt tests (`welcome-before` `useReference:false`), **byte-identity of all
existing books' PDFs**, public-boundary test green, `build`/`test:run`/`tsc --noEmit`.

**Out of scope (→ PR-B / Feature 29):** catalog entry, price wiring, Lemon Squeezy
variant + env, wizard step UIs + draft→session bridge + `/api/session` validation,
public order-form branch, landing story-picker card, `illustrationLabels`, samples.
