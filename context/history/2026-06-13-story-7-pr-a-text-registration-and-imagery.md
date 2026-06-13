## 2026-06-13 — Story 7 (PR-A): "Welcome Home" Text, Variants, Registration & Imagery

**Branch:** `feature/story7-text` (c20fbd1, merge 377df21)
**Spec:** [context/features/28-story7-text-registry-and-imagery.md](../features/28-story7-text-registry-and-imagery.md)
**Master template:** [context/masterstories/story-7-master-template.md](../masterstories/story-7-master-template.md)

### What shipped

PR-A of 2 for **Story 7 — "Welcome Home, [PET_NAME]'s Gotcha Day"**, the catalog's
**first joyful, non-memorial book**. This PR makes the engine *produce a correct
Welcome Home PDF from a `Story7Session`* (text → variants → merge → registration →
AI imagery), verified by the `render:test` CLI with a fixture. The book is **not yet
creatable or sellable** — that's PR-B / [Feature 29](../features/29-story7-wizard-and-storefront.md).
Mirrors the Story 5/6 split.

**Text engine** — `lib/story/story7/`:
- `master-text.ts` — `masterStory7()` returns a fresh mutable copy of the 11 pages as
  structured data (new-arrival occasion default, past-tense origin pages / present-tense
  belonging pages).
- `variants.ts` — `composeVariants7()` over **six dimensions** (occasion, adoption-source,
  life-stage, species, child-present, family-present), each variant-affected page built
  whole by a per-page builder; `resolveStory7() = mergeStory7(composeVariants7(s), s)`.
- `merge.ts` — `buildValues` + `mergeStory7` reusing the shared `clean`/`substitute`/
  `MergeError` primitives; owns `STORY_7_LAYOUT` (Story-1 narrative layouts **minus
  `truth`** — no death page); `{homecomingMemory}` and `{quirks}` blank/sparse fallbacks;
  `{yearsHome}` singular ("1 year") vs plural; the dedication dated line.
- `editable-fields.ts` (in-browser edit contract) + `fixtures.ts` (`biscuitSession7`,
  `story7SessionWith`, an anniversary fixture, a senior-adoption/stray fixture).

**Registration** — `lib/story/story-7.ts` exports `WELCOME_SCENE_PAGE_IDS` (the 8
illustration slots, kept out of `lib/ai/*` to honor the public boundary) + `story7Definition`,
registered as `"story-7"` in `lib/story/registry.ts`.

**Edits** — `lib/session/types.ts` (`StoryType += "story-7"`; `Occasion`/`AdoptionSource`/
`LifeStage` unions; `Story7Memories`/`Story7Toggles`/`Story7Draft`/`Story7Session`; `WizardDraft`),
`lib/story/master-text.ts` (`Story7PageId` union + `PageId +=`), `lib/story/wizard-config.ts`
(`STORY_7_STEPS` + `WIZARD_CONFIG["story-7"]`, data only — UI in PR-B), `lib/pdf/filename.ts`
(`welcomeHomePdfFilename` → `Welcome-Home-[Name].pdf`), `lib/order/types.ts` + `lib/order/store.ts`
(`Order.inputs` union widened with `Story7Session`).

**AI imagery** — `lib/ai/story7-prompts.ts` (`buildStory7SlotPrompts`: per-slot prompts from
each scene page's resolved `illustrationBrief` + the style/consistency clause, a Story-7
palette modifier — "bright golden-morning light, upbeat and saturated-but-soft, a beginning
not a sunset" — and the emotional-progression note) and `lib/ai/generate.ts` `case "story-7"`:
a **mixed** image set — 1 locked reference + 7 reference-anchored slots (`images.edit`) +
1 figure-free `welcome-before` empty-house wash (`images.generate`, `useReference:false`) =
**9 API images**, Low tier. The dedication reuses the locked reference (the `dedication`
layout renders no image, so no manifest wiring needed).

### Reuse guarantee held
No layout/CSS change (playbook Step 3 skipped — Story 7 reuses the Story-1 narrative set
wholesale, no `truth` page). The `renderPage` switch and both stylesheets are untouched, and
existing books re-render byte-identical (Otis = 873889 bytes). Zero changes to Supabase, the
worker, the admin desk, delivery, or the order state machine.

### Review / QA findings fixed on-branch
- **Page-6 blank-`[QUIRKS]` doubling (QA-caught bug).** The fallback is a whole verbatim
  paragraph that already opens with "We learned" and ends with a period; it was being filled
  into the `"We learned {quirks}."` slot, producing "We learned We learned … yours..".
  Fixed in `variants.ts`: the quirks paragraph is `"We learned {quirks}."` when supplied and a
  bare `"{quirks}"` when blank (so the verbatim fallback drops in clean). Two regression tests
  added. The original test only asserted the fallback substring appeared, so the doubling slipped
  past unit tests — artifact QA caught it.
- **found-as-stray thank-you line** added (spec gating requires shelter/rescue/found-as-stray to
  carry it); the master template's verbatim stray sentence was updated to match (it had
  self-contradicted its own variants quick-ref).
- **anniversary-without-`yearsHome`** falls back to new-arrival body wording so no `{yearsHome}`
  token ever survives merge (cover/back-cover reframes carry no year and still apply).
- **Product-aware `render:test` filename** (`scripts/render-test.ts`) — was hardcoded to the
  Story-1 name; now uses `getStory().pdfFilename` (also corrects Story 2/6 debug filenames). This
  paid off the prior "render:test Story-1 filename quirk" debt row.
- **Doc tidies** (context-audit drift, resolved on-branch): Story-7 masterstory added to
  `CLAUDE.md`'s `@`-load list for the in-progress milestone; `lib/ai/story7-prompts` added to the
  boundary test's `FORBIDDEN_LOCAL`; `new-book-playbook.md` gained the page-id-prefix convention,
  the `slots + 1` reference-anchor accounting (+ the `REFERENCE_ANCHOR_STORIES` gotcha), and the
  mixed reference/figure-free dispatch pattern.

### Verdicts
Code review **PASS** · Security **PASS** (commerce threat model didn't engage — `Order.inputs`
is a pure additive widening; Story-7 unrepresentable outside `pending_payment` at creation;
draft dispatchers fail-closed) · Context audit **DRIFT FOUND → resolved**. `npm run build`,
`npm run test:run` (1550 / 78 files), `npx tsc --noEmit` all green. Artifact QA: rendered the
anniversary fixture + eyeballed resolved text across the distinctive variants (1-year singular,
stray/senior/cat, breeder/puppy, fallbacks, no-child/no-family) — tone consistently joyful, zero
grief language, zero surviving placeholders.

### Carried forward (see `context/debt.md`)
- **Story-7 absent from `REFERENCE_ANCHOR_STORIES`** (`generate-illustrations` route) — latent in
  PR-A (book non-creatable); add `"story-7"` when PR-B wires the wizard, else the progress bar
  under-counts by 1. Forward-noted in the Feature 29 spec's edited-files list.
- The live **Low-tier image eyeball** (palette/likeness + the novel figure-free empty-house page)
  was deferred — prompts + dispatch are unit-verified; visual fidelity is best confirmed in PR-B
  when the wizard makes end-to-end QA easy.
