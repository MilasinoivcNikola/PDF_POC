# Feature Spec — Story 1 HIGH-Fidelity Sample Set + Preview PDF

> **Status:** Drafted, awaiting sign-off (not started).
> **Branch (proposed):** `feature/story1-high-sample-preview`
> **Scope:** Single PR. One paid HIGH generation run → durable public sample assets.

---

## Goal

Generate the Story 1 book **once at the HIGH image tier** (cover + all scenes) from a
real child-and-pet photo, then wire those renders into two durable, public-facing
artifacts on the `/books/story-1-book` detail page:

1. **All illustrated pages as on-page samples** (the full gallery, not today's 3).
2. **A downloadable full-book preview PDF** ("See the full book (PDF)" link).

The HIGH run is **paid and one-time** (~$2.95, see Cost). The whole point of this spec is
to capture the run's output as committed assets so **we never pay for it again** — the
storefront serves static files, not a live render.

## Why

- Today's `/books/story-1-book` gallery shows 3 low-tier samples. A prospective buyer
  can't see the real quality or the whole book before paying. HIGH samples + a full PDF
  is the strongest possible "show, don't tell" for the storefront's hero title.
- HIGH is the visible-quality ceiling; this doubles as the quality check the PM asked for
  ("see how it looks") — the assessment of HIGH-vs-Low happens on the rendered output.

---

## Input photo (decided)

`uploads/high-run-candidates/test-image.jpg` — a boy embracing a fawn-and-white boxer
outdoors. Chosen because: both subjects are present and reasonably front-facing, the
boxer's dark-mask/white-blaze coat is highly distinctive (strong pet anchor), and there
are no costume props to bleed into scenes. Pexels, free-to-use, no attribution required.

**Consistency expectation (set by the photo choice):** the *pet* is locked hard (the
reference-illustration step anchors on it). The *child* is anchored only **moderately** —
the photo gives the model the boy's look, but Story 1's scene prompts still deliberately
draw the child stylized (3/4 view or from behind, `lib/ai/prompts.ts:48-59`) and the
locked reference is pet-only. Expect the boy to read as a consistent fair-haired kid in a
green shirt, not a precise likeness. That is the agreed-acceptable bar.

---

## Engine facts this spec relies on (verified)

- **Quality is NOT part of the image cache key** (`lib/ai/cache.ts` — key is
  `page + promptHash + referenceHash`). Therefore the HIGH run **must use a fresh session
  id** with an empty `./generated/<id>/`, or it would hit the cached Low PNGs and silently
  produce Low output. The new fixture's fresh id guarantees 14 cache misses.
- Story 1 generates **14 paid API images**: 1 reference + 13 scenes (`SCENE_PAGE_IDS` =
  `cover` + `page-1..page-12`; the back cover is text-only, `lib/story/scenes.ts`).
  → **13 printable sample images** (cover + 12 pages).
- `generateAllIllustrations(session, { sceneQuality, referenceQuality })` is the entry
  point; defaults are Low. We pass `"high"` for both. (Reference can stay `"low"` to save
  ~$0.21 since it is never printed — see Cost; default to HIGH for a faithful test.)
- `manifestToImageMap(manifest)` → `PageImageMap`; `renderStoryPdf(session, map)` → PDF
  bytes. Same render path the app uses, so the PDF is print-faithful.
- Photo is resolved strictly under `./uploads` (`resolveUnder(cwd, "uploads", pet.photo)`).
  `pet.photo` must therefore be the path **relative to `./uploads`** — i.e.
  `"high-run-candidates/test-image.jpg"` (verify the exact relative form against
  `resolveUnder` during implementation; the existing `fixtures/otis.json` is the template).

---

## Deliverables (the work)

### 1. New session fixture — `fixtures/story1-high.json`
A complete `StorySession` (Story 1) driving the merged text and the stylized child.
Fresh `id` (e.g. `story1-high`). Pet = boxer (`species: "dog"`,
`breedColor` describing the fawn/white dark-mask coat, `illustrationStyle: "watercolor"`,
`photo: "high-run-candidates/test-image.jpg"`). A child name + age bracket, memories, and
toggles (use tasteful sample values — this text ships in the public preview PDF, so it
must honor the master template's quality bar, e.g. "died", never "passed away").

### 2. Throwaway run script — `scripts/story1-high-run.ts` (deletable, like `story8-prototype.ts`)
- Load the fixture → `generateAllIllustrations(session, { sceneQuality: "high",
  referenceQuality: "high" })`.
- Persist the manifest onto the session; render via
  `renderStoryPdf(session, manifestToImageMap(manifest))`.
- Write the PDF to `./output/` (gitignored working copy).
- Add an npm script `proto:story1-high` mirroring `proto:story8` (uses `--env-file-if-exists=.env.local` so the OpenAI key loads).
- The 14 PNGs + manifest land under `./generated/<id>/` (gitignored). **Nothing committed
  from here** — this script is the cost step, run once, then deletable.

### 3. Asset prep → web-optimized committed files
- Downscale/convert the 13 printable PNGs (`cover`, `page-1..page-12`) into
  `public/samples/story-1-book/` as web JPGs (`cover.jpg`, `page-1.jpg … page-12.jpg`),
  overwriting today's 3. Use macOS-native **`sips`** for resize+convert (≈1000px long
  edge, quality ~80) — **no new npm dependency** (respects the locked stack).
- Copy the preview PDF to `public/samples/story-1-book/preview.pdf`.

### 4. Catalog wiring — `lib/catalog/products.ts`
- Expand `story-1-book` `sampleImages` to all 13 (`cover.jpg`, `page-1.jpg … page-12.jpg`).
- Add an **optional** `previewPdf?: string` to the `Product` contract and set
  `story-1-book`'s to `/samples/story-1-book/preview.pdf`. Field is a plain string path —
  keeps the module pure/client-safe (no engine import), consistent with the existing
  boundary rule. Other products omit it (gallery + link both already degrade gracefully).

### 5. Detail page — `app/(public)/books/[productId]/page.tsx`
- The gallery already maps `product.sampleImages`, so all 13 render with no structural
  change. (Sanity-check the `galleryItemLead` first-item layout still reads well at 13.)
- Add a "See the full book (PDF)" link/button when `product.previewPdf` is set, opening
  the static PDF in a new tab. Style with existing component classes (`.btn` etc.) — no
  new CSS system, match surrounding markup.

### 6. Tests / build
- Update any catalog test that asserts `story-1-book.sampleImages` length/paths (PR-3
  relaxed Story 8/9 to `[]`; this moves Story 1 from 3 → 13). Add a light assertion for
  the new `previewPdf` field if the product shape is tested.
- The boundary test (`surface.boundary.test.ts`) should be unaffected (no new imports into
  the public graph; `previewPdf` is a string). Confirm it stays green.
- `npm run test:run` + `npm run build` must pass. Detail page stays `●` SSG.

---

## Cost (one-time)

| Item | Tier | Per image (sq.) | Count | Subtotal |
|------|------|-----------------|-------|----------|
| Reference | HIGH | $0.211 | 1 | $0.21 |
| Scenes (cover + 12) | HIGH | $0.211 | 13 | $2.74 |
| **Total** | | | **14** | **~$2.95** |

- Books print portrait, so the realistic figure sits a bit below the square headline
  ($0.165/img portrait → ~$2.31); edit/reference-input tokens push it back up. Budget
  **~$3**.
- Optional save: keep the reference at Low (it is never printed) → ~$2.74. Spec defaults
  to HIGH reference for a clean apples-to-apples test; trivial to switch.

### Rate-limit headroom (verified — TPM is not a blocker)

The org is on OpenAI **Tier 2**; the `gpt-image` family limits are **20 images/min** and
**250,000 TPM** (confirmed on the platform limits page, 2026-06-15). This run is
comfortably inside both:

- This run uses **Approach A** (the `generateAllIllustrations` default — the spec passes
  no `approach`): scenes generate in parallel through the bounded pool capped at
  `DEFAULT_CONCURRENCY = 3` (`lib/ai/retry.ts`), and each scene passes only **2 reference
  images** (photo + locked reference, `referencesForScene`) — *not* Approach B's
  accumulating ≤16-image stack. So the per-call token cost stays small and flat.
- Rough worst case at HIGH: ~6k output tokens + a short prompt + 2 reference images ≈
  **~8–10k tokens/image**. At concurrency 3 the burst is **~24–30k tokens/min** vs the
  **250k TPM** ceiling — roughly **8× headroom**. The 14-image total (~126k tokens) is
  spread across the multi-minute run, not one window. The 20 IPM cap is likewise slack at 3
  in flight.
- **Therefore: do not raise concurrency for this run.** It is one-time and speed-irrelevant;
  the conservative default protects pet-consistency, not throughput. The separate
  env-tunable-concurrency feature (`context/features/ai-concurrency-env.md`) is for routine
  LOW customer runs and must not change this run's behavior — which is exactly why it is an
  env var, not a new constant default.

## Pre-flight (before spending)

- Verify `OPENAI_API_KEY` is live (`curl /v1/models`) — per memory it flipped valid
  2026-06-09, but confirm before the paid run.
- Ensure `next dev` is **not** running during `npm run build` (known `.next` cache
  corruption — stop dev first).

## Out of scope / deferred

- Inline embedded PDF viewer (we chose a download/open link).
- HIGH samples for any other title — this PR is Story 1 only.
- Making HIGH a selectable tier in the product/wizard — separate decision; this is a
  sample-asset task, not an engine-default change. Real customer orders still default Low.

## Open items to confirm during build (non-blocking)

- Exact `pet.photo` relative form against `resolveUnder` semantics.
- Final child name / memory copy for the sample fixture (PM may want specific wording).
- Whether 13 gallery tiles want a "view all" affordance or simply stack (decide visually
  on the rendered page).
