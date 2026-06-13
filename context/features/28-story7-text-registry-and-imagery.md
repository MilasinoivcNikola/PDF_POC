# Feature 28 — Story 7 (PR-A): "Welcome Home" Text, Variants, Registration & Imagery

> **Branch:** `feature/story7-text`
> **Master template:** [context/masterstories/story-7-master-template.md](../masterstories/story-7-master-template.md)
> **Playbook:** [context/new-book-playbook.md](../new-book-playbook.md) — Steps 1, 1a, 2 (+ AI prompts/generate)
> **Product:** "Welcome Home — [PET_NAME]'s Gotcha Day" — the catalog's **first joyful, non-memorial** book.
> **PR split:** This is **PR-A of 2**. PR-A makes the engine *produce a correct Welcome Home PDF from a `Story7Session`* (text → variants → merge → registration → AI imagery), verified by the `render:test` CLI with a fixture — **no wizard, no storefront, not yet sellable**. [Feature 29](./29-story7-wizard-and-storefront.md) (PR-B) makes it creatable + sellable. Mirrors the Story 5/6 split (specs 23+24, 25+26).

---

## Scope & guardrails

This is **authoring-mostly, LOW build effort** per the playbook. The reuse guarantee holds: **zero** changes to Supabase, the worker, the admin desk, delivery, or the order state machine.

- **No new page layout / CSS — Step 3 of the playbook is SKIPPED.** Story 7 reuses the **Story-1 narrative set** wholesale: `cover`, `dedication`, `narrative`, `closing`, `back-cover`. There is **no `truth` (death) page** — dropping a layout needs no code. The `renderPage` switch and both stylesheets are untouched, so **every existing book's PDF stays byte-identical**.
- **Tone is the headline risk.** This is the *opposite* of every sibling title — a happy book. The standing guard is that **no grief/memorial language leaks in** (no "rainbow bridge", "watching over", "gone too soon", "passed away", "fur baby"). Encoded as test assertions (see Tests).

### Decisions locked (PM, 2026-06-13)
- **Price:** **$29 (`2900`)** placeholder (set in PR-B's catalog entry; recorded here for the fixture/marketing copy).
- **`[YEARS_HOME]`:** **asked directly** (a numeric wizard field shown only when `OCCASION = gotcha-day-anniversary`), *not* derived from the free-text `[DATE_ADOPTED]`. PR-A's merge layer consumes `yearsHome` as a value and handles **1-year singular/plural**; PR-B collects it.
- **Illustration slots: 8** — `cover` + the **7 narrative scene pages** (pages 2–8). The **dedication portrait reuses the locked reference image** (its brief literally describes the reference anchor — no separate generation), and the **closing** page gets a decorative/reused treatment, not its own slot.

---

## Pages, ids & layouts (11 page ids, 10 printed leaves)

| # | Page | `Story7PageId` | Layout | Illustrated? |
|---|------|----------------|--------|--------------|
| — | Cover | `welcome-cover` | `cover` | ✅ scene (reference-anchored) |
| 1 | Dedication | `welcome-dedication` | `dedication` | ✅ **reuses reference** (not a slot) |
| 2 | Before You Came | `welcome-before` | `narrative` | ✅ scene — **figure-free** (empty house, pet absent by design) |
| 3 | The Day We Found Each Other | `welcome-choosing` | `narrative` | ✅ scene (reference) |
| 4 | The Drive Home | `welcome-drive-home` | `narrative` | ✅ scene (reference) |
| 5 | The First Night | `welcome-first-night` | `narrative` | ✅ scene (reference) |
| 6 | Learning Each Other | `welcome-learning` | `narrative` | ✅ scene (reference) |
| 7 | Now You're Ours | `welcome-now-ours` | `narrative` | ✅ scene (reference) |
| 8 | You Belong Here (love-beat) | `welcome-belong` | `narrative` *(template tags it `narrative`, not `love`)* | ✅ scene (reference) |
| 9 | Closing | `welcome-closing` | `closing` | decorative / reuse (no slot) |
| — | Back Cover (memory page) | `welcome-back-cover` | `back-cover` | writing page (no slot) |

**`illustrationSlots` (8, in book order):** `welcome-cover`, `welcome-before`, `welcome-choosing`, `welcome-drive-home`, `welcome-first-night`, `welcome-learning`, `welcome-now-ours`, `welcome-belong`. `illustrationCount` derives from this (= 8). Total API images per book = **9** (locked reference + 8 slots).

**Per-slot imagery shape (a real choice, per the playbook):** `welcome-before` is **figure-free** (prompt-only wash via `generateImageFromPrompt` — the Story-2 belief-wash path; the pet is deliberately absent). The cover + pages 3–8 are **reference-anchored** (`generateSceneIllustration` / `images.edit`). This mixed set means the generate dispatch combines the Story-1 (reference) and Story-2 (figure-free) patterns.

---

## Session/draft types — `lib/session/types.ts` (Step 2)

Add `"story-7"` to the `StoryType` union and the new groups. **Novelty vs prior books:** Story 7 is the first to carry an **optional child name *and* an owner** at once, plus three new variant toggles and three new merge fields.

```ts
export type StoryType = "story-1" | "story-2" | "story-4" | "story-5" | "story-6" | "story-7";

// New enumerated toggles (string-literal unions, like every other book)
export type Occasion = "new-arrival" | "gotcha-day-anniversary";          // default "new-arrival"
export type AdoptionSource = "shelter" | "rescue" | "breeder" | "found-as-stray" | "other";
export type LifeStage = "puppy-kitten" | "adult" | "senior-adoption";     // default "adult"
```

**Reuse:** `Pet` (name, species, breedColor, pronoun, illustrationStyle, photo — narrative book, keeps pronoun + style like Story 1/6) and `Owner` (names; `relationship` defaults `"single"`, never read by the variant engine — same as Story 6).

**Do NOT reuse the full `Child` group** — it forces an `ageBracket` Story 7 doesn't use. Story 7 needs only an optional `childName`, carried in the memories group below.

```ts
export interface Story7Memories {
  favoriteActivity: string;   // [FAVORITE_ACTIVITY] — required (Page 7)
  sleepingSpot: string;       // [SLEEPING_SPOT]      — required (Pages 5 & 7)
  quirks: string;             // [QUIRKS]             — optional-with-fallback (Page 6)
  homecomingMemory: string;   // [HOMECOMING_MEMORY]  — NEW, optional-with-fallback (Page 4; <~4 words → fallback)
  familyMembers?: string;     // [FAMILY_MEMBERS]     — NEW, optional-omit (Page 7 swap)
  childName?: string;         // [CHILD_NAME]         — optional-omit (Pages 6 & 8 beats)
  nicknames?: string;         // [PET_NICKNAMES]      — optional-omit
  dateAdopted?: string;       // [DATE_ADOPTED]       — optional-omit (dedication dated line)
}

export interface Story7Toggles {
  occasion: Occasion;             // [OCCASION]        — reframes cover/dedication/Page 7/closing/back cover
  adoptionSource: AdoptionSource; // [ADOPTION_SOURCE] — Page 3 origin sentence (+ thank-you line) & Page 4 stray softening
  lifeStage: LifeStage;           // [LIFE_STAGE]      — Page 2 & Page 5 beats
  yearsHome?: string;             // [YEARS_HOME]      — present ONLY when occasion = gotcha-day-anniversary
}

export interface Story7Draft { id; createdAt; status; storyType: "story-7";
  pet: Partial<Pet>; owner: Partial<Owner>;
  memories: Partial<Story7Memories>; toggles: Partial<Story7Toggles>; }

export interface Story7Session { id; createdAt; status; storyType: "story-7";
  pet: Pet; owner: Owner; memories: Story7Memories; toggles: Story7Toggles;
  images: GeneratedImage[]; pdfPath?: string; }
```

Extend the `WizardDraft` union with `Story7Draft`. (The `Order.inputs` union in `lib/order/types.ts` is widened with `Story7Session` — see "Edited files".)

---

## Text engine — `lib/story/story7/*` (Steps 1 + 1a)

Namespaced folder, mirroring `lib/story/story6/`:

- **`master-text.ts`** — the 11 pages as **structured data** (`{merge}` placeholders, `layout` tag, `pageNumber`, optional `title`/`subtitle`, `body` paragraphs, `illustrationBrief`), returned from `masterStory7()` yielding a **fresh mutable copy** per call. Default copy = the **new-arrival** occasion, past-tense origin pages / present-tense belonging pages.
- **`variants.ts`** — **compose-before-merge.** `composeVariants7(session)` mutates the fresh copy across **six dimensions**, then `resolveStory7(session) = mergeStory7(composeVariants7(session), session)` (the registry's `resolve` wraps this). Dimensions:
  1. **Occasion** — anniversary reframes the **cover subtitle** ("Happy Gotcha Day"), **dedication** ("[YEARS_HOME] years home, and counting."), **Page 7** ("[YEARS_HOME] years on…"), **closing** ("[YEARS_HOME] years ago today…"), and **back cover** prompt. Requires `yearsHome`; falls back to the dated line / omits when absent.
  2. **Adoption source** — Page 3's origin sentence (the **5 variants** verbatim from the template) + the warm *"thank you to whoever had you before"* line **only** for `shelter`/`rescue`/`found-as-stray`; Page 4 stray softening ("we *took* you home").
  3. **Life stage** — `senior-adoption` adds the Page 2 "you were waiting too" beat and the Page 5 "a lot of places that weren't home" beat; `puppy-kitten` leans younger on Page 4/5; `adult` is neutral.
  4. **Species** — Page 2 ("a walk that nobody asked for" → cat "a windowsill with nobody sitting in it"), Page 5 cat "settle on your own terms" beat. Default text dog-calibrated; `[SPECIES]`/`[SPECIES_DESCRIPTOR]` carry the rest.
  5. **Child present** — when `childName` set, add Page 6 ("[CHILD_NAME] learned you fastest of all.") and the Page 8 beat ("…and most of all, some days, to [CHILD_NAME]."). Omit cleanly when absent.
  6. **Family members present** — Page 7 second sentence swap to "Your people are [FAMILY_MEMBERS]."
- **`merge.ts`** — `buildValues(session)` (cleaned free-text + derived pronouns via the shared mappers — Story 7 keeps pronouns like Story 1/6) + `mergeStory7` into `ResolvedStory`. **Reuse the shared primitives** from `lib/story/merge.ts` (`clean`, `substitute`, `MergeError`, `PageLayout`/`ResolvedStory`/`ResolvedPage`) — do not re-implement. Own a `STORY_7_LAYOUT: Record<Story7PageId, PageLayout>` map here. Handle optional fields with the omit-when-blank helpers (`cleanOptional`/`appendOptionalLines`) — no dangling separators.
  - **Fallbacks (verbatim from the template):** Page 4 `[HOMECOMING_MEMORY]` blank/sparse (≤ ~4 words) → the "You were so small in such a big new world…" fallback; Page 6 `[QUIRKS]` blank → the "We learned the way you tilt your head…" fallback.
  - **`[YEARS_HOME]` singular/plural:** "1 year" vs "N years" handled here.
- **`editable-fields.ts`** — the in-browser "edit your own words" contract (page→field map, `EDITABLE_FIELDS`, `REQUIRED_EDITABLE_FIELDS`, `FIELD_COPY`, `isEditableField`/`isRequiredField`, `setSessionField`/`getSessionFieldValue`), reusing `clean()`. Editable surface: `petName` (cover), `ownerNames` (dedication/Page 7), `homecomingMemory` (Page 4), `quirks` (Page 6), `favoriteActivity` (Page 7), `sleepingSpot` (Pages 5 & 7), and optionally `childName`/`familyMembers`. Mirror `story6/editable-fields.ts`.
- **`fixtures.ts`** — `biscuitSession7()` (canonical complete order) + `story7SessionWith(overrides)`. Include at least one **anniversary** fixture (`occasion: "gotcha-day-anniversary"`, `yearsHome: "3"`) and a **senior-adoption / stray** fixture.

### Step 1a — page-id union
In `lib/story/master-text.ts`, add the `Story7PageId` union (the 11 ids above) and extend `PageId = … | Story7PageId`. Existing per-product layout maps stay narrowed.

---

## Registration — `lib/story/story-7.ts` + `lib/story/registry.ts` (Step 2)

Thin definition module mirroring `story-6.ts`:

```ts
export type Story7PageId = /* the 11 ids */;
export const WELCOME_SCENE_PAGE_IDS: readonly PageId[] = [
  "welcome-cover", "welcome-before", "welcome-choosing", "welcome-drive-home",
  "welcome-first-night", "welcome-learning", "welcome-now-ours", "welcome-belong",
]; // 8 slots

export const story7Definition: StoryDefinition = {
  resolve(session) { return resolveStory7(session as unknown as Story7Session); },
  illustrationSlots: WELCOME_SCENE_PAGE_IDS,
  pdfFilename(session) { return welcomeHomePdfFilename(session.pet.name); },
  wizard: getWizardConfig("story-7"),   // STORY_7_STEPS added in PR-B's wizard-config
  editable: story7Editable,
};
```

Register `"story-7": story7Definition` in `REGISTRY`. **Keep scene identity out of `lib/ai/*`** — `WELCOME_SCENE_PAGE_IDS` lives in this product module (the public catalog chain reaches it without importing a prompt builder; the boundary guard bans `lib/ai/*` from the public closure).

> **`wizard-config.ts` coupling:** `getWizardConfig("story-7")` requires a `WIZARD_CONFIG["story-7"]` entry, and `WIZARD_CONFIG` is typed `Record<StoryType, …>`. Adding `"story-7"` to `StoryType` in PR-A makes that record non-exhaustive → **PR-A must add `STORY_7_STEPS` + the `WIZARD_CONFIG` entry** to `lib/story/wizard-config.ts` (it's pure client-safe data; the *UI* that renders those steps lands in PR-B). Steps: `upload → pet → homecoming → tone → generate` (5).

## PDF filename — `lib/pdf/filename.ts` (Step 2)
Add `welcomeHomePdfFilename(petName)` → `Welcome-Home-[Name].pdf` (reuse `slugify` + the `"Pet"` fallback), beside the existing helpers.

---

## AI imagery — `lib/ai/story7-prompts.ts` + `lib/ai/generate.ts`

- **`lib/ai/story7-prompts.ts`** (mirror `story6-prompts.ts`): `buildStory7SlotPrompts(session)` returns `Partial<Record<Story7PageId, { prompt; useReference }>>` built from each scene page's resolved `illustrationBrief` + the style/consistency clause. **`welcome-before` → `useReference: false`** (figure-free empty-house wash); all other slots `useReference: true`. Add a **Story-7 palette modifier** to the clause — *"bright golden-morning light, upbeat and saturated-but-soft, a beginning not a sunset"* — and the **emotional-progression** note (curious/unsure on `welcome-choosing`, fully joyful by `welcome-now-ours`/`welcome-belong`), per the template's style guide. Re-export scene-id list from `lib/ai/prompts.ts` for back-compat (matching the existing pattern).
- **`lib/ai/generate.ts`** — add `case "story-7"`: lock the reference, then generate the 8 slots — 7 reference-anchored (Approach A / `images.edit`) + the one figure-free `welcome-before` (`generateImageFromPrompt`). `totalImages = 1 + 8 = 9`. Default tier **`low`** (cost rule). The **dedication reuses the reference image** (no extra generation) — wire the manifest so the dedication page renders from the reference path.

---

## Created vs edited files (PR-A)

**Created (12):**
- `lib/story/story7/master-text.ts`, `variants.ts`, `merge.ts`, `editable-fields.ts`, `fixtures.ts`
- `lib/story/story7/merge.test.ts`, `variants.test.ts`, `registry.test.ts`, `editable-fields.test.ts`
- `lib/story/story-7.ts`
- `lib/ai/story7-prompts.ts`, `lib/ai/story7-prompts.test.ts`
- `fixtures/welcome-home-biscuit.json` (render:test fixture)

**Edited (7):**
- `lib/session/types.ts` — `StoryType += "story-7"`; `Occasion`/`AdoptionSource`/`LifeStage`; `Story7Memories`/`Story7Toggles`/`Story7Draft`/`Story7Session`; `WizardDraft` union.
- `lib/story/master-text.ts` — `Story7PageId` union; `PageId += Story7PageId`.
- `lib/story/registry.ts` — import + register `story7Definition`.
- `lib/story/wizard-config.ts` — `STORY_7_STEPS` + `WIZARD_CONFIG["story-7"]` (data only).
- `lib/pdf/filename.ts` — `welcomeHomePdfFilename`.
- `lib/ai/generate.ts` — `case "story-7"` dispatch.
- `lib/order/types.ts` — widen `Order.inputs` union with `Story7Session`.

---

## Tests & verification (the standing guards)

1. **`story7/merge.test.ts`** — full variant matrix (occasion × adoption-source × life-stage × species × child-present × family-present): **zero surviving placeholders** (`{token}`/`[FIELD]`) in any combination; optional fields omit cleanly; `MergeError` for a missing required field; brace-injection regression.
2. **`story7/variants.test.ts`** — each dimension in isolation: the 5 origin sentences + thank-you-line gating, senior/puppy beats, species swaps, child/family beats, `[HOMECOMING_MEMORY]`/`[QUIRKS]` fallbacks, `[YEARS_HOME]` **1-year singular** vs plural.
3. **The happy-book tone guard (Story 7's distinctive bar)** — assert across the **whole matrix** that **no banned/grief phrase** appears in any resolved page: "rainbow bridge", "watching over", "gone too soon", "passed away", "fur baby", "forever home" (as filler), "purrfect", "pawsome", "meant to be", "a match made in heaven". (No "died" rule here — it's the opposite book.)
4. **`story7/registry.test.ts`** — `getStory("story-7")`: `illustrationSlots = WELCOME_SCENE_PAGE_IDS` (8), layouts are all Story-1 values (never `truth`), `resolve`/`pdfFilename`/`wizard`/`editable` wired.
5. **`story7/editable-fields.test.ts`** + **`lib/ai/story7-prompts.test.ts`** — page→field map + 8 slot prompts, `welcome-before` carries `useReference:false`, the others `true`.
6. **Byte-identity of ALL existing books' PDFs** — `npm run render:test fixtures/otis.json` (and one per existing book) on-branch vs clean `main`, compared by length + timestamp-normalized SHA. Must be byte-identical.
7. **Public-boundary test** `lib/runtime/surface.boundary.test.ts` still green (no `lib/ai/*`/Puppeteer/`node:`/fs leak into the public closure from the new registry/scene code).
8. **`npm run build`**, **`npm run test:run`**, **`npx tsc --noEmit`** all green.
9. **Real artifact check:** `npm run render:test fixtures/welcome-home-biscuit.json` → inspect `./output/Welcome-Home-Biscuit.pdf` (placeholder SVGs, $0). One **Low**-tier live image run on the anniversary fixture to eyeball palette/likeness + the figure-free empty-house page (per the "QA reference-anchored slots explicitly" note).

---

## Out of scope (→ PR-B / Feature 29)
Catalog entry, price wiring, Lemon Squeezy variant + env var, wizard step UIs + draft→session bridge + `/api/session` validation, the public order form branch, the landing story-picker card, `illustrationLabels` slots, samples. The book is **not purchasable or creatable** until PR-B ships.
