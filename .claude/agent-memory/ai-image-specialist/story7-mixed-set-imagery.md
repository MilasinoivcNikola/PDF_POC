---
name: story7-mixed-set-imagery
description: Story 7 ("Welcome Home") imagery is the catalog's first MIXED set — reference + 7 reference-anchored scenes + 1 figure-free wash (9 images); dedication reuses the reference (no extra gen)
metadata:
  type: project
---

Story 7 ("Welcome Home — [PET_NAME]'s Gotcha Day", the first JOYFUL non-memorial book) imagery is the catalog's **first MIXED set** — it combines, in one product, the two shapes prior books used separately:
- **7 reference-anchored scenes** (cover + pages 3-8): `[photo, reference]` via `images.edit`, like Story 1/6.
- **1 figure-free wash** `welcome-before` (the empty-house "before you came" page; the pet is absent BY DESIGN): prompt-only via `images.generate`, like Story 2/5's belief wash — `useReference: false`.

So `buildStory7SlotPrompts` returns a real per-slot `useReference` flag (unlike Story 6 where every slot was `true`). `totalImages = 1 reference + 8 slots = 9` (the +1 separate `reference.png` anchor, like Story 1's 14 and Story 6's 8 — NOT the letters' total = slots).

**Dedication reuses the locked reference — no extra generation.** `welcome-dedication` is NOT in `WELCOME_SCENE_PAGE_IDS` (8 slots), so nothing generates for it. Important realization: the `dedication` PageLayout (`DedicationPage` in `lib/pdf/pages.tsx`) renders **NO image at all** — `renderPage` passes it no `src`. So "wire the manifest so dedication renders from the reference path" required **no manifest wiring** — the dedication is verse-only; reuse = simply not generating a separate dedication image. (Story 6's `tribute-page-1` is also a `dedication` layout AND a slot, but its generated image is likewise never rendered on the page — a latent quirk, not my bug.)

**Story-7 palette divergence (the tonal headline):** this is a HAPPY book, so the clause adds *"bright golden-morning light, upbeat and saturated-but-soft, a beginning not a sunset"* — golden MORNING, not the memorial books' golden-hour dusk. Plus an emotional-progression beat per slot: curious/unsure on `welcome-choosing`, fully joyful by `welcome-now-ours`/`welcome-belong`.

**`render:test` CLI was Story-1-only on filename** — it hardcoded `storyPdfFilename` (→ wrong "Saying-Goodbye-to-X.pdf" for every non-Story-1 fixture). Changed `scripts/render-test.ts` to use the registry's product-aware `getStory(storyType).pdfFilename(session)`. Byte-safe (only the output NAME changes, not PDF bytes); fixed a latent bug for Story 2/6 too. `npm run render:test fixtures/welcome-home-biscuit.json` → `./output/Welcome-Home-Biscuit.pdf`, 11 PDF pages, $0 (placeholder SVGs).

**Pet-consistency verdict:** NOT yet live-eyeballed (left for human QA per spec — one Low run on the anniversary fixture to check palette + likeness + the figure-free empty-house page). Wiring/prompts verified pure + compiling only. Expect Approach A + Low to hold as it did for Story 6's 7-page set ([[story6-living-tribute-imagery]]), but the figure-free `welcome-before` is the novel surface to eyeball (hopeful, never melancholy). See [[api-surface-and-cost-tiers]].
