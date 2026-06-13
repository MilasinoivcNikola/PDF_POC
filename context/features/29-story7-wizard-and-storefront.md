# Feature 29 — Story 7 (PR-B): "Welcome Home" Wizard, Storefront & Order Intake

> **Branch:** `feature/story7-wizard`
> **Depends on:** [Feature 28 (PR-A)](./28-story7-text-registry-and-imagery.md) — the text engine, registration, and imagery must be merged first.
> **Master template:** [context/masterstories/story-7-master-template.md](../masterstories/story-7-master-template.md)
> **Playbook:** [context/new-book-playbook.md](../new-book-playbook.md) — Steps 4, 5, 6 (+ the wizard wiring from Step 2's tail).
> **PR split:** This is **PR-B of 2**. It makes Welcome Home **creatable** (the `/create` wizard) and **sellable** (storefront catalog + order intake + checkout) — **completes Story 7**. Mirrors specs 24 (Story 5) and 26 (Story 6).

---

## Scope & guardrails

PR-A proved the engine produces a correct PDF from a `Story7Session`. PR-B builds the two human-facing surfaces that *create* that session: the **operator `/create` wizard** and the **public storefront order form**. Per the **reuse guarantee**, nothing in the worker, admin, delivery, or order state machine changes — the order flows **by id**.

All product-specific logic is **dispatched** (an `isStory7`/`storyType === "story-7"` branch), never mutated into shared code. The closest precedent — **Story 6's PR-26** — is the template to mirror, extended for Story 7's larger field set and one conditional reveal (`yearsHome`).

---

## Wizard shape (5 steps)

`upload(1) → pet(2) → homecoming(3) → tone(4) → generate(5)` — already declared as `STORY_7_STEPS` in `wizard-config.ts` (PR-A). Story 7 is a **narrative** book (keeps pronoun + illustration-style choice like Story 1/6), so `pet` reuses Story 1's pet fields unchanged.

- **`pet` (step 2)** — reused as-is; only the **continue href** branches to `/create/homecoming` for `story-7`. No new pet fields (no `ageOrStage` — that was Story 6).
- **`homecoming` (step 3, NEW route)** — collects: `ownerNames` (req), `favoriteActivity` (req), `sleepingSpot` (req), `homecomingMemory` (optional textarea — the heart of Pages 4–5), `quirks` (optional textarea), `childName` (optional), `familyMembers` (optional), `nicknames` (optional), `dateAdopted` (optional). Gates Continue on the three required fields.
- **`tone` (step 4, reuse route + add `Story7Tone()` sub-component)** — three radio groups + one conditional field:
  - `occasion`: **new-arrival** (default) / **gotcha-day-anniversary**.
  - **Conditional reveal:** when `occasion = gotcha-day-anniversary`, show a small numeric **`yearsHome`** field ("How many years ago did [PET_NAME] come home?"). Hidden + cleared otherwise.
  - `adoptionSource`: shelter / rescue / breeder / found-as-stray / other (default e.g. `shelter`).
  - `lifeStage`: puppy-kitten / adult (default) / senior-adoption.
- **`generate` (step 5)** — add the `story-7` required-field map + step count/label from `getWizardConfig`.

---

## Draft → session bridge & validation

- **`lib/session/draft.ts`** — add `Story7RequiredField`, `missingRequiredFieldsStory7(draft)`, `draftToSessionStory7(draft)`, the `isStory7Draft` type guard, and extend the dispatchers (`missingRequiredFieldsForDraft`, `draftToSessionForDraft`).
  - **Required (throw/gate if missing):** `petName`, `species`, `breedColor`, `photo`, `ownerNames`, `favoriteActivity`, `sleepingSpot`.
  - **Conditional-required:** `yearsHome` **only when** `occasion = gotcha-day-anniversary`.
  - **Optional-with-fallback (store `""`):** `quirks`, `homecomingMemory`.
  - **Optional-omit (drop when blank):** `childName`, `familyMembers`, `nicknames`, `dateAdopted`.
  - Toggles (`occasion`/`adoptionSource`/`lifeStage`) are default-selected, so never "missing".
- **`app/(operator)/api/session/route.ts`** — add `validateStory7(session)` and branch the POST dispatcher on `storyType === "story-7"`. Mirror the existing snake_case error codes (`missing_pet_name`, `missing_owner_names`, `missing_favorite_activity`, `missing_sleeping_spot`, …, plus `missing_years_home` when the anniversary toggle is set).

---

## Storefront & order intake (Steps 4–6)

- **`lib/catalog/products.ts`** — add `buildProduct("story-7-welcome", "story-7", { … })` to `buildCatalog()`:
  - `title: "Welcome Home"`, `tagline` + `description` lifted from the template's **Customer-facing description** (trim the pricing prose; invent no claims).
  - `priceUsd: PLACEHOLDER_STORY_7_PRICE_USD` — add the constant **`2900`** ($29, the locked launch price) beside the existing ones.
  - `sampleImages: ["/samples/story-7-welcome/welcome-cover.jpg", …]`.
  - `illustrationCount` is **DERIVED** (= 8) by `buildProduct` from the registry — do not set it.
  - Leave `lsVariantId` undefined (resolved server-side at checkout via env).
- **`app/(public)/order/[productId]/OrderForm.tsx`** — add the `isStory7` branch. Story 7 is the **largest** public field set so far: pet (narrative — name/species/breedColor/pronoun/style), owner names, the homecoming memories, the three toggles + the **conditional `yearsHome` reveal**, plus email/photo. POST to `/api/order` with `{ productId, email, inputs: draftToSessionForDraft(draft), photo }`. Treat Story 7 as **narrative, not letter** (it must not enter the `isLetter` set).
- **`app/(public)/page.tsx`** (+ `page.module.css`) — add the landing **story-picker card** for Story 7. This is the **first joyful card** — set it apart visually (its own accent class, "Welcome home · a gotcha-day book"), distinct from the grief titles. Links to `/books/story-7-welcome` and seeds `newDraft("story-7")` via the generic `StoryStartButton`.
- **`components/wizard/illustrationLabels.ts`** — add `WELCOME_ILLUSTRATION_SLOTS` (`reference` + the 8 slots = 9) + `story7LabelsFor(name)` (warm, present-tense labels) + route `storyType === "story-7"` in the dispatchers.
- **`components/wizard/WizardProvider.tsx`** — extend the `DraftPatch` group unions with `Partial<Story7Memories>` / `Partial<Story7Toggles>` (the provider's merge logic is otherwise generic).
- **`components/preview/BookPreview.tsx`** — **verify** Story 7 lands in the narrative facing-spread branch (it is *not* a letter). Likely zero edit; add a one-line confirmation/exclusion only if the spread branch is a positive allow-list.
- **`.env.local.example`** — add `LEMONSQUEEZY_VARIANT_STORY_7_WELCOME` (non-secret runtime config, resolved server-side at checkout).
- **Lemon Squeezy (Step 5, manual, ops task):** create the LS product/variant set to **manual fulfilment**, price matching `2900`; record its id in the env var on the public host. (Not a code change; note it in the PR description.)
- **Samples (Step 6):** a few **Low**-tier sample frames (~800px JPEG, ~$0.07/book) under `public/samples/story-7-welcome/` — including the figure-free empty-house page and a peak-joy page — referenced by `sampleImages`.

---

## Created vs edited files (PR-B)

**Created (2 + samples):**
- `app/(operator)/create/homecoming/page.tsx` — Story 7 step 3 (memories + homecoming + optional child/family).
- `public/samples/story-7-welcome/*.jpg` — storefront samples.

**Edited (~13):**
- `app/(operator)/create/pet/page.tsx` — `story-7` continue href → `/create/homecoming`.
- `app/(operator)/create/tone/page.tsx` — `Story7Tone()` (occasion + conditional yearsHome + adoptionSource + lifeStage).
- `app/(operator)/create/generate/page.tsx` — `story-7` required-field map + step count/label.
- `app/(operator)/api/session/route.ts` (+ `route.test.ts`) — `validateStory7` + dispatcher branch + tests.
- `lib/session/draft.ts` (+ `draft.test.ts`) — required-fields/bridge/guard/dispatchers + tests.
- `lib/catalog/products.ts` (+ `products.test.ts`) — Story 7 product + `PLACEHOLDER_STORY_7_PRICE_USD` + tests.
- `app/(public)/order/[productId]/OrderForm.tsx` — `isStory7` branch.
- `app/(public)/page.tsx` + `page.module.css` — joyful landing card + accent.
- `components/wizard/illustrationLabels.ts` (+ `illustrationLabels.test.ts`) — slots + labels + dispatch.
- `components/wizard/WizardProvider.tsx` — `DraftPatch` union widen.
- `components/preview/BookPreview.tsx` — verify/confirm narrative-spread branch.
- `app/(operator)/api/generate-illustrations/route.ts` — **add `"story-7"` to `REFERENCE_ANCHOR_STORIES`** so the wizard progress bar counts the locked reference (`slots + 1 = 9`). Carried forward from feature 28's review (latent in PR-A because the book was non-creatable; see `context/debt.md`). The hand-maintained set is not derived — easy to miss.
- `.env.local.example` — `LEMONSQUEEZY_VARIANT_STORY_7_WELCOME`.

---

## Tests & verification

1. **`draft.test.ts`** — `missingRequiredFieldsStory7` (incl. the **conditional `yearsHome`** gate under anniversary), `draftToSessionStory7` (required throw, optional-with-fallback stores `""`, optional-omit drops), `isStory7Draft`.
2. **`route.test.ts`** — `validateStory7` accepts a complete order, rejects each missing required field with the right code, enforces `missing_years_home` only on the anniversary toggle.
3. **`products.test.ts`** — the Story 7 product exists, `illustrationCount === 8` (derived), price `2900`.
4. **`illustrationLabels.test.ts`** — 9 slots, labels present for each.
5. **Public-boundary test** `lib/runtime/surface.boundary.test.ts` green — if a new public page/route entry is added, register it in `PUBLIC_ENTRIES`/`PUBLIC_API_ENTRIES`.
6. **Byte-identity of ALL existing books' PDFs** still holds (PR-B touches no template).
7. **`npm run build`**, **`npm run test:run`**, **`npx tsc --noEmit`** green.
8. **Browser QA (the real proof):**
   - Landing → joyful Story 7 card → `/create/upload` → walk all 5 steps → Generate → preview → download `Welcome-Home-[Name].pdf`.
   - Toggle `gotcha-day-anniversary`: confirm `yearsHome` reveals, is required, and the reframed cover/dedication/Page-7/closing/back-cover copy reads naturally (incl. **"1 year"** singular).
   - Each adoption source → correct Page-3 origin sentence; thank-you line only for shelter/rescue/stray.
   - Optional fields left blank → fallbacks fire, no dangling artifacts, no `[FIELD]` leaks.
   - Public storefront `/books/story-7-welcome` renders; order form submits an order (no charge in QA).
   - Per the cost rule, QA by **reusing an existing session / Low tier** — not fresh Medium books.

---

## Completion (workflow step 10)
On merge: append the one-line index entry to `context/history.md` under a new **Milestone 11 — Story 7 ("Welcome Home")**, write the full write-up to `context/history/`, and log any durable deferral (e.g. the gotcha-day-demand hypothesis to validate with early sales; final PM price confirmation before LS go-live) in `context/debt.md`.
