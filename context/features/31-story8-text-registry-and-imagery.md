# Feature 31 — Story 8 (PR-A): "Amazing Adventures" Text, Variants, Registration & Approach-B Imagery

> **Branch:** `feature/story8-text`
> **Depends on:** [Feature 30 (PR-0)](./30-story8-prototype-gate.md) returning **GO** — `lib/ai/story8-prompts.ts` and the Approach-B loop must already exist and be validated.
> **Master template:** [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md)
> **Playbook:** [context/new-book-playbook.md](../new-book-playbook.md) — Steps 1, 1a, 2 (+ AI generate). **Step 3 (layout/CSS) is SKIPPED.**
> **Product:** "The Amazing Adventures of [PET_NAME]" — the catalog's first joyful kids' adventure.
> **PR split:** This is **PR-A of 3**. It makes the engine *produce a correct Adventure PDF from a `Story8Session`* (text → variants → merge → registration → Approach-B imagery), verified by the `render:test` CLI with a fixture — **no wizard, no storefront, not yet sellable.** [Feature 32 (PR-B)](./32-story8-wizard-and-storefront.md) makes it creatable + sellable. Mirrors the Story 7 split (specs 28+29).

---

## Status

Not Started

## Scope & guardrails

**Authoring-mostly for the text/pages; the real engineering is the Approach-B generation function** (the one piece no prior book has). The reuse guarantee otherwise holds: **zero** changes to Supabase, the worker, the admin desk, delivery, or the order state machine.

- **No new page layout / CSS — Step 3 SKIPPED.** Story 8 reuses the **Story-1 narrative set**: `cover`, `narrative`, `closing`, `back-cover`. **No `dedication`, no `love`, no `truth`** (no death page). The `renderPage` switch and both stylesheets are untouched → **every existing book's PDF stays byte-identical.**
- **Tone is a happy/adventure book** — like Story 7, no grief language; *unlike* every book, it has real (mild, safe) jeopardy. The standing guard: no euphemism leakage *and* the wobble never tips into scary/sad. Encoded as test assertions.
- **The pet-likeness gate is the product** — PR-0 already proved it holds; PR-A's job is to wire the validated prompts + B-loop into the registry-driven path so the worker generates them with zero worker edits.

### Decisions to lock (PM) before/while building PR-A

- **Launch theme set.** The template authors **Backyard Mystery** to full v1; sea-voyage / space-rescue / enchanted-forest are sketches. **Recommendation: ship PR-A with Backyard Mystery only** (the `AdventureTheme` enum carries all four values and the variant layer is structured to accept more, but only backyard-mystery is authored). Additional themes are **follow-on authoring** (each is a `variants.ts` reskin, the template's "Phase 5 recurring" pattern), not a blocker. *Confirm.*
- **Price.** Template recommends **$34 (`3400`)** (at/just above Wonderbly $34.99, under Petventures $44.99). Recorded here for the fixture/marketing; set in PR-B's catalog entry. *Confirm.*
- **Climax tier.** If PR-0's GO required the climax at **Medium**, encode that as the per-slot default for `adventure-climax` (the one deliberate opt-out of the Low cost rule, justified by it being the single highest-drift pose). *Confirm from PR-0 findings.*

---

## Pages, ids & layouts (13 page ids, 10 illustration slots)

Stem `adventure-*` (playbook convention — book-unique, no collision in the shared `PageId` union).

| # | Page (template beat) | `Story8PageId` | Layout | Illustrated? |
|---|---|---|---|---|
| — | Cover (hero shot) | `adventure-cover` | `cover` | ✅ slot (reference — the locked anchor) |
| 1 | The Ordinary Day | `adventure-ordinary` | `narrative` | ✅ slot (reference) |
| 2 | What Made [PET] Special | `adventure-special` | `narrative` | ✅ slot (reference) |
| 3 | The Call to Adventure | `adventure-call` | `narrative` | ✅ slot (reference) |
| 4 | The First Clue | `adventure-clue` | `narrative` | ✅ slot (reference) |
| 5 | Deeper Into the Mystery | `adventure-deeper` | `narrative` | ✅ slot (reference) |
| 6 | The Discovery | `adventure-discovery` | `narrative` | ✅ slot (reference) |
| 7 | The Wobble | `adventure-wobble` | `narrative` | ✅ slot (reference) |
| 8 | Save the Day (climax) | `adventure-climax` | `narrative` | ✅ slot (reference — **highest risk**) |
| 9 | The Celebration | `adventure-celebration` | `narrative` | ✅ slot (reference) |
| 10 | Home Again, More Loved | `adventure-home` | `narrative` | decorative / **reuse** (no slot) |
| 11 | Closing | `adventure-closing` | `closing` | decorative / **reuse** (no slot) |
| — | Back Cover (Hero's Page) | `adventure-back-cover` | `back-cover` | writing page — paw-print badge border only (no slot) |

**`illustrationSlots` (10, in book order):** `adventure-cover`, `adventure-ordinary`, `adventure-special`, `adventure-call`, `adventure-clue`, `adventure-deeper`, `adventure-discovery`, `adventure-wobble`, `adventure-climax`, `adventure-celebration`. `illustrationCount` derives from this (= 10). Total API images per book = **11** (locked reference + 10 slots).

**Pages 10–11 reuse imagery (no extra generation)** — like Story 7's dedication/closing. `adventure-home` reuses the calm celebration scene (or the reference); `adventure-closing` reuses the cover/reference for the "echoes the cover" framing. Wire the manifest so these render from an existing path — **do not add slots** (holds the firm 10). Back cover is the fill-in "All about [PET], Backyard Hero" page (the one place a ⭐ rating is allowed — see banned-content note).

---

## Session/draft types — `lib/session/types.ts` (Step 2)

Add `"story-8"` to `StoryType` and the new groups. **Novelty vs prior books:** first book to combine a **child (name + age bracket)** with **two new merge fields** (`superpower`, `sidekickName`) and an **adventure-theme + hero-count** toggle pair.

```ts
export type StoryType = "story-1" | "story-2" | "story-4" | "story-5" | "story-6" | "story-7" | "story-8";

// New enumerated toggles
export type AdventureTheme = "backyard-mystery" | "sea-voyage" | "space-rescue" | "enchanted-forest"; // default "backyard-mystery"
export type HeroCount = "pet-plus" | "pet-solo"; // default "pet-plus" (pet + child together)
// AgeBracket ("3-5" | "6-8" | "9-12") already exists — REUSE it (matches the template's brackets exactly).
```

**Reuse:** `Pet` (name, species, breedColor, pronoun, illustrationStyle, photo — narrative book, keeps pronoun + style like Story 1/6/7) and the existing `AgeBracket`.

**Child handling (the hero-count subtlety):** the **age bracket always applies** (it tunes reading level even in pet-solo, where the child is the *reader*); the **child's name is a character only in pet-plus.** So carry `childAgeBracket` as a defaulted toggle and `childName` as conditional. Do **not** reuse the `Child` interface wholesale (it forces a required `name`).

```ts
export interface Story8Adventure {
  superpower: string;        // [SUPERPOWER]        — optional-with-fallback (the plot engine; blank → derive from activity → quirks → species stock)
  favoriteActivity: string;  // [FAVORITE_ACTIVITY] — optional-with-fallback (Page 2 + superpower derivation)
  quirks: string;            // [QUIRKS]            — optional-with-fallback (superpower derivation)
  sidekickName?: string;     // [SIDEKICK_NAME]     — NEW, optional-omit (Page 5 expedition party; pet-plus only)
  childName?: string;        // [CHILD_NAME]        — conditional-required when heroCount = pet-plus; optional in pet-solo
  nicknames?: string;        // [PET_NICKNAMES]     — optional-omit
}

export interface Story8Toggles {
  adventureTheme: AdventureTheme; // [ADVENTURE_THEME] — selects the pre-authored arc (PR-A: backyard-mystery only)
  heroCount: HeroCount;           // [HERO_COUNT]      — child as character (pet-plus) vs child as reader (pet-solo)
  childAgeBracket: AgeBracket;    // [CHILD_AGE_BRACKET] — reading level (default "6-8")
}

export interface Story8Draft { id; createdAt; status; storyType: "story-8";
  pet: Partial<Pet>; adventure: Partial<Story8Adventure>; toggles: Partial<Story8Toggles>; }

export interface Story8Session { id; createdAt; status; storyType: "story-8";
  pet: Pet; adventure: Story8Adventure; toggles: Story8Toggles;
  images: GeneratedImage[]; pdfPath?: string; }
```

Extend the `WizardDraft` union with `Story8Draft`. Widen `Order.inputs` in `lib/order/types.ts` with `Story8Session`. (No `Owner` group — this book is about the child + pet, not an owner-signed keepsake.)

---

## Text engine — `lib/story/story8/*` (Steps 1 + 1a)

Namespaced folder, mirroring `lib/story/story7/`:

- **`master-text.ts`** — the 13 pages as **structured data** (`{merge}` placeholders, `layout` tag, `pageNumber`, optional `title`/`subtitle`, `body` paragraphs, `illustrationBrief`), returned from `masterStory8()` yielding a **fresh mutable copy** per call. Default copy = the **Backyard Mystery** theme, **age 6-8**, **pet-plus**. The page bodies are the template's worked example (Cover + Pages 1–11 + Back Cover) verbatim-ish.
  - **The `illustrationBrief` per scene is the same content PR-0 inlined in `story8-prompts.ts`** — PR-A makes the briefs live in the master text (the single source) and refactors `story8-prompts.ts` to read the resolved page's brief (the Story-6/7 shape), instead of the PR-0 constants. Keep the pose-discipline clause in the prompt builder, not the brief.
- **`variants.ts`** — **compose-before-merge.** `composeVariants8(session)` mutates the fresh copy, then `resolveStory8(session) = mergeStory8(composeVariants8(session), session)`. Dimensions:
  1. **Adventure theme** — selects which pre-authored arc fills the page bodies + briefs. **PR-A authors `backyard-mystery` only**; the dimension is a `switch` ready for more themes (each new theme = a new case + its page bodies, a follow-on authoring task). A non-authored theme must **fall back to backyard-mystery**, never emit a half-themed page.
  2. **Hero count** — `pet-solo` rewrites the **call (Page 3)** and **expedition (Page 5)** beats so the child narrates as the reader, not a character ("Nobody else noticed. But [PET] did."), and **omits the child** from those scenes; `pet-plus` (default) keeps the child as co-adventurer.
  3. **Age bracket** — `3-5` simplifies the **climax (Page 8)** to one clean action sentence + gentler wobble + less text; `9-12` lengthens sentences, adds a wink of wordplay, keeps the full sequel hook; `6-8` is the master text.
  4. **Species** — `[SPECIES_DESCRIPTOR]` (good boy / sweet girl / kitty / bunny) + species-tuned superpower stock fallback.
  5. **Sidekick present** — when `sidekickName` set **and** `heroCount = pet-plus`, insert the Page 5 party line ("[PET], [CHILD], and [SIDEKICK] followed the trail together."); omit cleanly otherwise.
- **`merge.ts`** — `buildValues(session)` (cleaned free-text + derived pronouns via the shared mappers) + `mergeStory8` into `ResolvedStory`. **Reuse the shared primitives** from `lib/story/merge.ts` (`clean`, `substitute`, `MergeError`, `PageLayout`/`ResolvedStory`/`ResolvedPage`). Own `STORY_8_LAYOUT: Record<Story8PageId, PageLayout>` here. Optional fields use the omit-when-blank helpers (`cleanOptional`/`appendOptionalLines`).
  - **The `[SUPERPOWER]` fallback chain (the soul of the book — template Pages 2, 4–8):** blank → derive from `[FAVORITE_ACTIVITY]` ("the very best in the world at …") → else from `[QUIRKS]` → else **species stock** (dog → "the Best Nose in the World"; cat → "the Quietest Paws"; rabbit → "the Fastest Hop"; bird → "the Sharpest Eyes"). The chain must always yield a delightful, on-theme superpower from a thin input. Specificity is the charm — when the customer gives a real quirk, **never** override it with stock.
  - **Conditional-required `[CHILD_NAME]`:** required (throws `MergeError`) when `heroCount = pet-plus`; permitted blank in pet-solo (those beats are already rewritten by the variant layer to not reference it).
- **`editable-fields.ts`** — the in-browser "edit your own words" contract (page→field map, `EDITABLE_FIELDS`, `REQUIRED_EDITABLE_FIELDS`, `FIELD_COPY`, `isEditableField`/`isRequiredField`, `setSessionField`/`getSessionFieldValue`), reusing `clean()`. Editable surface: `petName` (cover/title), `childName`, `superpower` (Pages 2/4–8), `favoriteActivity`, `quirks`, `sidekickName`. Mirror `story7/editable-fields.ts`.
- **`fixtures.ts`** — `biscuitSession8()` (canonical complete order: dog, backyard-mystery, pet-plus, 6-8, real superpower) + `story8SessionWith(overrides)`. Include a **pet-solo** fixture, a **3-5** fixture, and a **blank-superpower** fixture (to exercise the full fallback chain).

### Step 1a — page-id union
In `lib/story/master-text.ts`, add the `Story8PageId` union (the 13 ids above) and extend `PageId = … | Story8PageId`. Existing per-product layout maps stay narrowed.

---

## Registration — `lib/story/story-8.ts` + `lib/story/registry.ts` (Step 2)

Thin definition module mirroring `story-7.ts`:

```ts
export type Story8PageId = /* the 13 ids */;
export const ADVENTURE_SCENE_PAGE_IDS: readonly PageId[] = [
  "adventure-cover", "adventure-ordinary", "adventure-special", "adventure-call",
  "adventure-clue", "adventure-deeper", "adventure-discovery", "adventure-wobble",
  "adventure-climax", "adventure-celebration",
]; // 10 slots

export const story8Definition: StoryDefinition = {
  resolve(session) { return resolveStory8(session as unknown as Story8Session); },
  illustrationSlots: ADVENTURE_SCENE_PAGE_IDS,
  pdfFilename(session) { return adventurePdfFilename(session.pet.name); },
  wizard: getWizardConfig("story-8"),   // STORY_8_STEPS added below (data only; UI in PR-B)
  editable: story8Editable,
};
```

Register `"story-8": story8Definition` in `REGISTRY`. **Keep scene identity out of `lib/ai/*`** — `ADVENTURE_SCENE_PAGE_IDS` lives in this product module (the public catalog chain reaches it without importing a prompt builder).

> **`wizard-config.ts` coupling:** `WIZARD_CONFIG` is `Record<StoryType, …>`, so adding `"story-8"` to `StoryType` makes it non-exhaustive → **PR-A must add `STORY_8_STEPS` + the `WIZARD_CONFIG` entry** (pure client-safe data; the UI lands in PR-B). Steps: `upload → pet → adventure → tone → generate` (5).

## PDF filename — `lib/pdf/filename.ts` (Step 2)
Add `adventurePdfFilename(petName)` → `Amazing-Adventures-of-[Name].pdf` (reuse `slugify` + the `"Pet"` fallback), beside the existing helpers.

---

## AI imagery — `lib/ai/story8-prompts.ts` (refactor from PR-0) + `lib/ai/generate.ts`

- **`lib/ai/story8-prompts.ts`** — refactor PR-0's prototype builder to `buildStory8SlotPrompts(session)` returning `Partial<Record<Story8PageId, { prompt; useReference: true }>>`, built from each scene page's **resolved `illustrationBrief`** (now sourced from the merged story, not inlined constants) + the pose-discipline + dynamic-watercolor clause (kept from PR-0). All 10 slots are reference-anchored.
- **`lib/ai/generate.ts`** — add `generateStory8Illustrations(session, options)` + the `case "story-8"` dispatch. **This is the one genuinely new bit of engine work:**
  - Lock the reference illustration (cached, like every book).
  - Run the 10 slots under **Approach B** — sequential, accumulating each accepted scene into the reference set (the validated PR-0 loop; promote `referencesForScene` if not already exported).
  - **Default to Approach B internally** (do **not** rely on `options.approach`) — the worker calls `generateAllIllustrations(session)` bare, so the book must self-select B. This is the deliberate, contained exception to "every other book is Approach A"; document it at the function.
  - **Generation order:** calm/establishing first (`cover → ordinary → special → celebration`) to build the reference bank, then escalating action, **climax (`adventure-climax`) last** — and at **Medium** if PR-0 found Low insufficient. Assemble the returned manifest in **book order** regardless of generation order.
  - `totalImages = 1 + 10 = 11`. Reference + scenes default **Low** (climax possibly Medium per the locked decision).
  - Wire `adventure-home` / `adventure-closing` to **reuse** an existing manifest path (no extra generation).

> **Known limitation (carry to `context/debt.md`):** `regenerateSceneIllustration` (the admin repaint button) "approximates B as A" — a single repaint has no priors to accumulate. For a book whose #1 quality gate is per-scene likeness, the operator will lean on repaint hardest. Flag as a candidate enhancement (feed already-accepted sibling scenes as references on a Story-8 repaint); not a PR-A blocker.

---

## Created vs edited files (PR-A)

**Created (12):**
- `lib/story/story8/master-text.ts`, `variants.ts`, `merge.ts`, `editable-fields.ts`, `fixtures.ts`
- `lib/story/story8/merge.test.ts`, `variants.test.ts`, `registry.test.ts`, `editable-fields.test.ts`
- `lib/story/story-8.ts`
- *(`lib/ai/story8-prompts.ts` + `story8-prompts.test.ts` already exist from PR-0 — refactored, not created)*
- `fixtures/amazing-adventures-biscuit.json` (render:test fixture)

**Edited (~8):**
- `lib/session/types.ts` — `StoryType += "story-8"`; `AdventureTheme`/`HeroCount`; `Story8Adventure`/`Story8Toggles`/`Story8Draft`/`Story8Session`; `WizardDraft` union.
- `lib/story/master-text.ts` — `Story8PageId` union; `PageId += Story8PageId`.
- `lib/story/registry.ts` — import + register `story8Definition`.
- `lib/story/wizard-config.ts` — `STORY_8_STEPS` + `WIZARD_CONFIG["story-8"]` (data only).
- `lib/pdf/filename.ts` — `adventurePdfFilename`.
- `lib/ai/generate.ts` — `generateStory8Illustrations` + `case "story-8"` dispatch (+ export `referencesForScene` if not done in PR-0).
- `lib/ai/story8-prompts.ts` — refactor to read resolved briefs.
- `lib/order/types.ts` — widen `Order.inputs` union with `Story8Session`.

---

## Tests & verification (the standing guards)

1. **`story8/merge.test.ts`** — full variant matrix (theme × hero-count × age-bracket × species × sidekick-present): **zero surviving placeholders** in any combination; optional fields omit cleanly; **`MergeError` for a missing required field** (incl. the **conditional `childName`** required under `pet-plus` but not `pet-solo`); brace-injection regression.
2. **`story8/variants.test.ts`** — each dimension in isolation: the **superpower fallback chain** (real input preserved; blank → activity → quirks → species stock, per species); pet-solo rewrites the call/expedition beats and drops the child; 3-5 simplifies the climax; sidekick insertion only under pet-plus; non-authored theme falls back to backyard-mystery.
3. **The adventure-tone guard** — assert across the whole matrix: **no grief/euphemism** ("rainbow bridge", "passed away", "fur baby", "watching over", "crossed over"); **no banned filler** ("little did they know", verbatim "happily ever after"); **no emoji/icon in body text** (the back-cover ⭐ rating is the only allowed decoration); the wobble copy stays mild (assert the climax always resolves safely on the next beat).
4. **`story8/registry.test.ts`** — `getStory("story-8")`: `illustrationSlots = ADVENTURE_SCENE_PAGE_IDS` (10), layouts all Story-1 values (only `cover`/`narrative`/`closing`/`back-cover`; never `dedication`/`love`/`truth`), `resolve`/`pdfFilename`/`wizard`/`editable` wired.
5. **`story8/editable-fields.test.ts`** + **`lib/ai/story8-prompts.test.ts`** — page→field map; 10 slot prompts, all `useReference:true`, each carrying the pose-discipline clause, climax carrying the side-leap rule, no surviving placeholder after merge.
6. **Byte-identity of ALL existing books' PDFs** — `npm run render:test fixtures/otis.json` (and one per existing book) on-branch vs clean `main`, compared by length + timestamp-normalized SHA. Must be byte-identical.
7. **Public-boundary test** `lib/runtime/surface.boundary.test.ts` still green.
8. **`npm run build`**, **`npm run test:run`**, **`npx tsc --noEmit`** all green.
9. **Real artifact check:** `npm run render:test fixtures/amazing-adventures-biscuit.json` → inspect `./output/Amazing-Adventures-of-Biscuit.pdf` (placeholder SVGs, $0). One **Low**-tier live run via the worker path (reusing PR-0's pet to stay near $0) to confirm the **registry-driven worker generates 10 slots under Approach B with no worker edit** and pages 10–11 reuse imagery correctly.

---

## Out of scope (→ PR-B / Feature 32)
Catalog entry, price wiring, Lemon Squeezy variant + env var, wizard step UIs + draft→session bridge + `/api/session` validation, the public order form branch, the landing story-picker card, `illustrationLabels` slots, `REFERENCE_ANCHOR_STORIES` registration, samples. **Not purchasable or creatable until PR-B.**

Additional **adventure themes** (sea-voyage, space-rescue, enchanted-forest) are follow-on authoring **after** Story 8 ships — each a `variants.ts` reskin per the template's "Other adventure themes", not part of this milestone.

---

## References
- [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md) — page-by-page worked text, merge fields, variants quick reference, quality bar.
- [context/new-book-playbook.md](../new-book-playbook.md) — Steps 1/1a/2; the reuse guarantee.
- [context/features/28-story7-text-registry-and-imagery.md](./28-story7-text-registry-and-imagery.md) — the closest precedent (narrative book, no new layout, mixed reference handling).
