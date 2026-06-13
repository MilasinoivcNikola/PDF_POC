---
name: story7-text-seams
description: PR-A (feature 28) Story-7 ("Welcome Home — Gotcha Day") seams — the catalog's first JOYFUL non-memorial book; happy-tone guard, 6-dimension variant matrix, anniversary-without-yearsHome fallback, found-as-stray thank-you deviation
metadata:
  type: project
---

Story 7 ("Welcome Home — [PET_NAME]'s Gotcha Day") is the catalog's **first joyful,
non-memorial** book — the inverse of every sibling. Reuses Story-1 narrative layouts
wholesale (`cover`/`dedication`/`narrative`/`closing`/`back-cover`) — **never `truth`**
(no death page). PR-A is text+registry+imagery only; PR-B (feature 29) adds wizard/
storefront. Mirror the Story-6 file split.

**Why:** record the seams + the two locked deviations so a re-run points at the right
modules and re-asserts the load-bearing invariants without re-deriving them.

**How to apply:**
- **Testable seams (pure, $0):** `lib/story/story7/{master-text,variants,merge,
  editable-fields,fixtures}.ts`, `lib/story/story-7.ts` (registry def +
  `WELCOME_SCENE_PAGE_IDS`), `lib/pdf/filename.ts` `welcomeHomePdfFilename` →
  `Welcome-Home-[Name].pdf` ("Pet" fallback for blank). Fixtures: `biscuitSession7()`
  (shelter/adult/new-arrival dog "Biscuit", owner "Maria", child "Leo"),
  `story7SessionWith()`, `biscuitAnniversarySession7()` (yearsHome "3"),
  `pepperStraySession7()` (senior cat stray — defined but exercised combinatorially,
  not imported by a named test).
- **11 page ids / 10 leaves / 8 image slots.** `WELCOME_SCENE_PAGE_IDS` = cover +
  7 narrative scene pages (welcome-before..welcome-belong). Dedication REUSES the
  reference (not a slot); closing/back-cover not slots. `totalImages = 1 + 8 = 9`.
- **Imagery is a MIXED set (the divergence):** `welcome-before` is **figure-free**
  (`useReference:false`, empty-house wash, the Story-2 belief-wash path); the other 7
  are reference-anchored (`useReference:true`, `images.edit`). Story-7 palette modifier
  "a beginning not a sunset" + golden-morning light on EVERY prompt; consistency clause
  only on the 7 anchored slots. Covered by `lib/ai/story7-prompts.test.ts` — pure,
  asserts on built prompt strings only, no SDK/network.
- **6-dimension variant matrix** (`composeVariants7`): occasion (new-arrival default vs
  gotcha-day-anniversary) × adoptionSource (5: shelter/rescue/breeder/found-as-stray/
  other) × lifeStage (puppy-kitten/adult/senior-adoption) × species × child-present ×
  family-present = 600 combos in merge.test.ts.
- **Happy-tone guard** (Story 7's distinctive bar) iterates the WHOLE matrix asserting
  NONE of 10 banned phrases leak: rainbow bridge / watching over / gone too soon /
  passed away / fur baby / forever home / purrfect / pawsome / meant to be / a match
  made in heaven. (NO "died" rule — opposite book.)
- **Two locked deviations the impl agents made (both already tested):**
  1. **found-as-stray carries a thank-you line** (grouped with shelter/rescue for the
     "whoever had you before, thank you" gating) AND keeps the Page-4 softening
     ("we *took* you home"). breeder/other get NO thank-you.
  2. **anniversary WITHOUT yearsHome falls back to new-arrival wording** so no
     `{yearsHome}` ever survives merge. PITFALL: the merge.test.ts full-matrix sweep
     always pairs anniversary with yearsHome="3", so the missing-yearsHome combo is
     NOT covered by the matrix — I added a dedicated merge.test.ts guard
     ("anniversary occasion with no yearsHome never leaks a {yearsHome} token", +the
     no-dateAdopted variant) that runs the all-pages `{token}`+`[FIELD]`+brace sweep.
- **`{yearsHome}` singular/plural** ("1 year" vs "N years") handled in merge.ts, pinned
  in variants.test.ts.
- **editable surface = 8 fields:** petName/ownerNames/homecomingMemory/quirks/
  favoriteActivity/sleepingSpot required (6); childName/familyMembers optional.
- **Build pitfall (hit this run):** a `next dev` server was running (port 3001,
  pgrep "next dev") — per project memory `npm run build` while dev runs corrupts
  `.next`. Skipped build; reported it. Always `lsof -ti:3000,3001` / `pgrep -f
  "next dev"` BEFORE building.
- Result: suite 1547→1549 (added 2 merge.test.ts guards for the anniversary-without-
  yearsHome gap; everything else in the spec's 9 guards was already covered).
