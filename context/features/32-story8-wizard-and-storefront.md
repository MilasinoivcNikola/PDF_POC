# Feature 32 — Story 8 (PR-B): "Amazing Adventures" Wizard, Storefront & Order Intake

> **Branch:** `feature/story8-wizard`
> **Depends on:** [Feature 31 (PR-A)](./31-story8-text-registry-and-imagery.md) — the text engine, registration, and Approach-B imagery must be merged first.
> **Master template:** [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md)
> **Playbook:** [context/new-book-playbook.md](../new-book-playbook.md) — Steps 4, 5, 6 (+ the wizard wiring from Step 2's tail).
> **PR split:** This is **PR-B of 3**. It makes Adventures **creatable** (the `/create` wizard) and **sellable** (storefront catalog + order intake + checkout) — **completes Story 8.** Mirrors spec 29 (Story 7 PR-B).

---

## Status

Not Started

## Scope & guardrails

PR-A proved the engine produces a correct PDF from a `Story8Session`. PR-B builds the two human-facing surfaces that *create* that session: the **operator `/create` wizard** and the **public storefront order form**. Per the **reuse guarantee**, nothing in the worker, admin, delivery, or order state machine changes — the order flows **by id**.

All product-specific logic is **dispatched** (an `isStory8`/`storyType === "story-8"` branch), never mutated into shared code. The closest precedent — **Story 7's PR-B (spec 29)** — is the template to mirror, extended for Story 8's **two conditional reveals** (`sidekickName` gated on `pet-plus`; the hero-count toggle reshaping who the child is).

> **One async, latency-honest UX note:** Story 8 is the slowest book to generate (Approach B is **sequential**, not parallel, + 11 reference-heavy images). The wizard progress screen already tolerates multi-minute waits (the gpt-image rate-limit reality), but copy the "we're painting it" expectation accordingly. The public order flow is async-by-design anyway (pay → worker → 24–48h), so the storefront is unaffected.

---

## Wizard shape (5 steps)

`upload(1) → pet(2) → adventure(3) → tone(4) → generate(5)` — already declared as `STORY_8_STEPS` in `wizard-config.ts` (PR-A). Story 8 is a **narrative** book (keeps pronoun + illustration-style choice like Story 1/6/7), so `pet` reuses Story 1's pet fields unchanged.

- **`pet` (step 2)** — reused as-is; only the **continue href** branches to `/create/adventure` for `story-8`. No new pet fields.
- **`adventure` (step 3, NEW route)** — the book's distinctive inputs:
  - `superpower` (optional text — "[PET]'s real-life superpower"; hint: "a real quirk we'll turn into the hero's power — leave blank and we'll invent one"). Optional-with-fallback.
  - `favoriteActivity` (optional text) and `quirks` (optional textarea) — feed the superpower fallback + Page 2.
  - `childName` — **conditional-required** (see hero-count below).
  - `sidekickName` (optional — "a sibling or second pet who joins the quest").
  - `nicknames` (optional).
- **`tone` (step 4, reuse route + add `Story8Tone()` sub-component)** — the toggles + conditional reveals:
  - `adventureTheme`: **backyard-mystery** (default). **If PR-A ships only one theme, present it as a single fixed choice or a "more adventures coming soon" note — do not offer un-authored themes.** (When sea-voyage etc. are authored later, they appear here.)
  - `heroCount`: **pet-plus** (default — "[PET] and [CHILD] adventure together") / **pet-solo** ("[PET] is the lone hero; your child is the reader hearing the legend").
    - **Conditional reveal #1:** `childName` (collected on step 3) is **required when `pet-plus`**, optional when `pet-solo`. Surface the requirement on whichever step the toggle lives — simplest is to keep the `childName` field on step 3 and gate it via the step-3 validator reading the (defaulted) `heroCount`. Confirm the toggle default makes `childName` required by default.
    - **Conditional reveal #2:** `sidekickName` only meaningfully applies in `pet-plus`; in `pet-solo` hide/ignore it (the pet adventures alone).
  - `childAgeBracket`: 3-5 / **6-8** (default) / 9-12 — "reading level."
- **`generate` (step 5)** — add the `story-8` required-field map + step count/label from `getWizardConfig`.

---

## Draft → session bridge & validation

- **`lib/session/draft.ts`** — add `Story8RequiredField`, `missingRequiredFieldsStory8(draft)`, `draftToSessionStory8(draft)`, the `isStory8Draft` type guard, and extend the dispatchers (`missingRequiredFieldsForDraft`, `draftToSessionForDraft`).
  - **Required (throw/gate if missing):** `petName`, `species`, `breedColor`, `photo`.
  - **Conditional-required:** `childName` **only when** `heroCount = pet-plus`.
  - **Optional-with-fallback (store `""`):** `superpower`, `favoriteActivity`, `quirks`.
  - **Optional-omit (drop when blank):** `sidekickName`, `nicknames`, and `childName` when `pet-solo`.
  - Toggles (`adventureTheme`/`heroCount`/`childAgeBracket`) are default-selected, so never "missing".
- **`app/(operator)/api/session/route.ts`** — add `validateStory8(session)` and branch the POST dispatcher on `storyType === "story-8"`. Mirror the snake_case error codes (`missing_pet_name`, `missing_species`, `missing_breed_color`, `missing_photo`, plus `missing_child_name` only when `heroCount = pet-plus`).

---

## Storefront & order intake (Steps 4–6)

- **`lib/catalog/products.ts`** — add `buildProduct("story-8-adventure", "story-8", { … })` to `buildCatalog()`:
  - `title: "The Amazing Adventures of [PET_NAME]"` (or a clean storefront title), `tagline` + `description` lifted from the template's **Customer-facing description** (trim pricing prose; invent no claims — lead with the *real-photo likeness* differentiator vs breed-picker competitors).
  - `priceUsd: PLACEHOLDER_STORY_8_PRICE_USD` — add the constant **`3400`** ($34, the locked launch price) beside the existing ones.
  - `sampleImages: ["/samples/story-8-adventure/adventure-cover.jpg", …]`.
  - `illustrationCount` is **DERIVED** (= 10) by `buildProduct` from the registry — do not set it.
  - Leave `lsVariantId` undefined (resolved server-side at checkout via env).
- **`app/(public)/order/[productId]/OrderForm.tsx`** — add the `isStory8` branch. Field set: pet (narrative — name/species/breedColor/pronoun/style), the adventure inputs (superpower, favoriteActivity, quirks, childName, sidekickName, nicknames), the toggles (`adventureTheme` if >1 theme, `heroCount`, `childAgeBracket`) with the **same conditional reveals** as the wizard, plus email/photo. POST to `/api/order` with `{ productId, email, inputs: draftToSessionForDraft(draft), photo }`. Treat Story 8 as **narrative, not letter** (must not enter the `isLetter` set).
- **`app/(public)/page.tsx`** (+ `page.module.css`) — add the landing **story-picker card** for Story 8. This is the **most playful card in the catalog** — distinct accent ("A joyful adventure starring your pet"), clearly set apart from the grief/keepsake titles (and even from Story 7's gentle joy). Links to `/books/story-8-adventure` and seeds `newDraft("story-8")` via the generic `StoryStartButton`.
- **`components/wizard/illustrationLabels.ts`** — add `ADVENTURE_ILLUSTRATION_SLOTS` (`reference` + the 10 slots = 11) + `story8LabelsFor(name)` (playful, action labels — "the hero's cover", "the big leap") + route `storyType === "story-8"` in the dispatchers.
- **`components/wizard/WizardProvider.tsx`** — extend the `DraftPatch` group unions with `Partial<Story8Adventure>` / `Partial<Story8Toggles>` (provider merge logic is otherwise generic).
- **`components/preview/BookPreview.tsx`** — **verify** Story 8 lands in the narrative facing-spread branch (not a letter). Likely zero edit; add a one-line confirmation/exclusion only if the spread branch is a positive allow-list.
- **`app/(operator)/api/generate-illustrations/route.ts`** — **add `"story-8"` to `REFERENCE_ANCHOR_STORIES`** so the wizard progress bar counts the locked reference (`slots + 1 = 11`). The set is hand-maintained, not derived — easy to miss. (All 10 Story-8 slots are reference-anchored.)
- **`.env.local.example`** — add `LEMONSQUEEZY_VARIANT_STORY_8_ADVENTURE` (non-secret runtime config, resolved server-side at checkout).
- **Lemon Squeezy (Step 5, manual, ops task):** create the LS product/variant set to **manual fulfilment**, price matching `3400`; record its id in the env var on the public host. Not a code change; note it in the PR description.
- **Samples (Step 6):** a few **Low**-tier sample frames (~800px JPEG; Approach-B run ≈ $0.08–$0.15/book) under `public/samples/story-8-adventure/` — include the **hero cover** and the **climax leap** (the two images that sell the differentiator), referenced by `sampleImages`.

---

## Created vs edited files (PR-B)

**Created (2 + samples):**
- `app/(operator)/create/adventure/page.tsx` — Story 8 step 3 (superpower + activity + quirks + child + sidekick).
- `public/samples/story-8-adventure/*.jpg` — storefront samples.

**Edited (~13):**
- `app/(operator)/create/pet/page.tsx` — `story-8` continue href → `/create/adventure`.
- `app/(operator)/create/tone/page.tsx` — `Story8Tone()` (theme + heroCount + childAgeBracket + the conditional `childName`/`sidekickName` logic).
- `app/(operator)/create/generate/page.tsx` — `story-8` required-field map + step count/label.
- `app/(operator)/api/session/route.ts` (+ `route.test.ts`) — `validateStory8` + dispatcher branch + tests.
- `lib/session/draft.ts` (+ `draft.test.ts`) — required-fields/bridge/guard/dispatchers + tests.
- `lib/catalog/products.ts` (+ `products.test.ts`) — Story 8 product + `PLACEHOLDER_STORY_8_PRICE_USD` + tests.
- `app/(public)/order/[productId]/OrderForm.tsx` — `isStory8` branch.
- `app/(public)/page.tsx` + `page.module.css` — playful landing card + accent.
- `components/wizard/illustrationLabels.ts` (+ `illustrationLabels.test.ts`) — slots + labels + dispatch.
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union widen.
- `components/preview/BookPreview.tsx` — verify/confirm narrative-spread branch.
- `app/(operator)/api/generate-illustrations/route.ts` — `"story-8"` in `REFERENCE_ANCHOR_STORIES`.
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_8_ADVENTURE`.

---

## Tests & verification

1. **`draft.test.ts`** — `missingRequiredFieldsStory8` (incl. the **conditional `childName`** gate under `pet-plus`), `draftToSessionStory8` (required throw, optional-with-fallback stores `""`, optional-omit drops incl. `childName` under pet-solo, `sidekickName` ignored under pet-solo), `isStory8Draft`.
2. **`route.test.ts`** — `validateStory8` accepts a complete order, rejects each missing required field with the right code, enforces `missing_child_name` only under `pet-plus`.
3. **`products.test.ts`** — the Story 8 product exists, `illustrationCount === 10` (derived), price `3400`.
4. **`illustrationLabels.test.ts`** — 11 slots, labels present for each.
5. **Public-boundary test** `lib/runtime/surface.boundary.test.ts` green — register any new public page/route in `PUBLIC_ENTRIES`/`PUBLIC_API_ENTRIES`.
6. **Byte-identity of ALL existing books' PDFs** still holds (PR-B touches no template).
7. **`npm run build`**, **`npm run test:run`**, **`npx tsc --noEmit`** green.
8. **Browser QA (the real proof):**
   - Landing → playful Story 8 card → `/create/upload` → walk all 5 steps → Generate → preview → download `Amazing-Adventures-of-[Name].pdf`.
   - Toggle `pet-solo`: confirm `childName` becomes optional, `sidekickName` hidden/ignored, and the call/expedition pages read naturally with the child as reader (not character).
   - Toggle `pet-plus` (default): `childName` required, sidekick (if given) appears in the Page-5 party.
   - Each age bracket → climax/wobble simplify (3-5) or lengthen (9-12) correctly.
   - **Superpower fallback:** leave `superpower` blank with a real `favoriteActivity` → a delightful derived power; leave both blank → the species stock power. No `[FIELD]` leaks, no dangling artifacts.
   - Public storefront `/books/story-8-adventure` renders; order form submits an order (no charge in QA), incl. the conditional reveals.
   - **Likeness spot-check** on a real Low run (reuse PR-0/PR-A's pet to stay near $0): the hero still reads as the same animal on the cover, the leap, and the celebration — the product's #1 gate, confirmed end-to-end through the worker.
   - Per the cost rule, QA by **reusing an existing session / Low tier** — not fresh Medium books.

---

## Completion (workflow step 10)
On merge: append the one-line index entry to `context/history.md` under a new **Milestone 12 — Story 8 ("The Amazing Adventures of [PET_NAME]")**, write the full write-up to `context/history/`, and log durable deferrals in `context/debt.md`:
- **Additional adventure themes** (sea-voyage, space-rescue, enchanted-forest) — follow-on authoring, each a `variants.ts` reskin.
- **The repaint-accumulation gap** (`regenerateSceneIllustration` approximates B as A) carried from PR-A — revisit if operators report likeness drift on repaints of this book.
- **Final PM price confirmation** before LS go-live; **gotcha of demand vs build cost** (highest-effort book) to validate against early sales.

---

## References
- [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md) — customer-facing description, pricing, variants quick reference, production checklist.
- [context/features/29-story7-wizard-and-storefront.md](./29-story7-wizard-and-storefront.md) — the closest precedent (narrative book PR-B with a conditional reveal).
- [context/new-book-playbook.md](../new-book-playbook.md) — Steps 4/5/6; the reuse guarantee.
