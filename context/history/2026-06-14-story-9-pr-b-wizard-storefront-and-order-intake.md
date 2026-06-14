## 2026-06-14 — Story 9 (PR-B): Wizard, Storefront & Order Intake

**Branch:** `feature/story9-wizard` · **Commit:** 7213bd8 · **Merge:** 19d183a

**Completes Story 9 "[PET_NAME] and the New Baby" / Milestone 13.** PR-A built the
text engine, registry, and Approach-A imagery (the engine could produce a correct
10-leaf "New Baby" PDF from a `Story9Session`, but the book was neither creatable in
the wizard nor sellable). PR-B makes it both — reusing the existing commerce machinery
by id, with **no engine, worker, admin, Supabase, delivery, or state-machine changes**
(the reuse guarantee holds). Eighth book on both the create wizard and the storefront.

### Wizard (operator `/create`)
- **New Step 3 `/create/baby`** (`app/(operator)/create/baby/page.tsx`) — collects owner
  names + favorite activity + sleeping spot (required), quirks/babyName/babyArrival/
  nicknames (optional). The chain is `upload → pet → baby → tone → generate` (5 steps).
- **`babyStatus`** (expecting [default] | arrived) + reused **`otherPetsInHome`** toggles
  live on the tone step (`Story9Tone`).
- **The load-bearing decision — `babyName` gated at GENERATE, not at the step** (the
  Story-8 PR-B lesson against a wizard dead-end): the baby step has no Continue gate on
  babyName, and `missingRequiredFieldsStory9` omits it entirely. An expecting order (the
  default) or any blank-name order completes cleanly; the PR-A variant layer degrades
  every reference to "the new baby" with no surviving `[BABY_NAME]` literal. The
  babyStatus toggle that decides whether a provided name is used sits on the *next* step,
  so the baby step can never trap the user.
- `babyName`/`babyArrival` are root-level draft fields; `WizardProvider.updateDraft`
  was extended to merge top-level keys (it previously only deep-merged named groups).
  Context → localStorage on every change (refresh-safe); session written to disk only at
  Generate via the existing `/api/session`.
- Illustration labels: `NEWBABY_ILLUSTRATION_SLOTS` (reference + 7) + `story9LabelsFor`.

### Storefront & intake
- `lib/catalog/products.ts` — `buildProduct("story-9-newbaby", "story-9", …)` at
  **`priceUsd: 2700`** ($27, PM-locked 2026-06-14). `illustrationCount` **DERIVES** from
  the registry's `illustrationSlots.length` (= 7) — never hardcoded.
- Landing card (`app/(public)/page.tsx` + `page.module.css`, sage accent) → `/books/
  story-9-newbaby` detail page (title, $27, masterstory customer-facing copy, "7 painted
  from your photo").
- Public order intake (`OrderForm.tsx`) accepts the Story-9 fields → writes a
  `pending_payment` order + photo via the **existing** public order route (same path as
  Stories 5–8). New non-secret env placeholder `LEMONSQUEEZY_VARIANT_STORY_9_NEWBABY`.

### Shared seams wired (PR-A left these as `throw "not wired (PR-B)"` stubs)
- `lib/session/draft.ts` — `draftToSessionStory9` + `missingRequiredFieldsStory9`, routed
  in both dispatchers.
- `lib/session/storage.ts` — `newStory9Draft` (defaults `babyStatus: "expecting"`).
- `lib/session/disk.ts` — `Story9Session` in `AnySession`.
- `lib/order/types.ts` — `Story9Session` in `Order.inputs` (this one was a tsc-only gap:
  PR-A had not widened the order union).
- `app/(operator)/api/session/route.ts` — `validateStory9` branch.
- `app/(operator)/api/generate-illustrations/route.ts` — `story-9` added to
  `REFERENCE_ANCHOR_STORIES` (Approach A writes a reference anchor → progress = slots + 1 = 8).

### Fix folded in (QA-caught, PM-approved scope)
The reused pet step (`app/(operator)/create/pet/page.tsx`) branched its intro copy for
Stories 7/6/4 but **Story 8 and Story 9 fell through to the memorial default** ("Tell us
about the one who is gone" / "exactly as they were") — a tonal violation of the
masterstory's #1 rule on a joyful book, and a latent bug already shipped on `main` for
Story 8. Both now get living-pet intro copy (Story 9: "Tell us about the one who was here
first." / "So the book celebrates them, exactly as they are."; Story 8: "Tell us about
the hero of the story." / "So the adventure stars them, exactly as they are."), so the
memorial default only ever reaches actual memorial books (Story 1 + the letters). This
paid off the standing Story-8 pet-step-copy debt row.

### Preview editing
Already wired end-to-end by PR-A — `lib/story/story9/editable-fields.ts` is consumed
generically through `story9Definition.editable` in the registry, which the existing
preview UI/update-text route read. No new work.

### Verification
- `npm run test:run` → **1918 pass** (16 new: catalog exact-list/DERIVED count, draft
  round-trip incl. the blank-name → "the new baby" degrade, `validateStory9` route 400s
  incl. an `arrived` body with no babyName, illustration-label slots). `npm run build`
  succeeds (`story-9-newbaby` in the SSG `/order/[productId]` set — 8 paths).
- QA (`qa-verifier`, real Chromium, $0 spent — no generation): all 7 acceptance checks
  PASS — landing card, $27 detail page, order-form fields, the create chain, the
  expecting+blank-name no-dead-end path, the arrived+name path, and refresh persistence.
- Reviews: code review PASS, commerce security PASS (clean reuse — trust boundary,
  spend guard, `NewOrderInput`, `isSafeSessionId` all unchanged), context audit resolved
  (CLAUDE.md `@`-load cleanup folded into this completion; the masterstory "8–10 pages"/
  `closing` "drift" was a false positive — the engine does build the 10-leaf structure
  incl. the page-8 `closing`, restored in PR-A review).

### Carried forward (see `context/debt.md`)
- Real storefront sample art for `public/samples/story-9-newbaby/` (cover + a hero
  interior) — paths wired, files deferred (same status as Stories 7/8).
- Lemon Squeezy variant id + price ($27/2700¢) confirmation at LS go-live.
