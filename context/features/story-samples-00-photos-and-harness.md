# Feature Spec — Story Samples PR-0: Candidate Photos + Capture Harness

> **Status:** Drafted, awaiting sign-off (not started).
> **Branch (proposed):** `feature/story-samples-foundation`
> **Scope:** Single PR. **No paid run, no visible storefront change.** Sources + commits
> the per-species reference photos and generalizes the Story-1 capture harness so every
> later per-story PR (02–09) is a tiny fixture + run + wire. This is the foundation that
> unblocks the whole series.

---

## Goal

Today only Story 1 has a real, durable sample set (13 HIGH JPGs + a 31 MB `preview.pdf`
under `public/samples/story-1-book/`). The other 7 titles ship 2 placeholder images or
none. We want **a full example book for every title**, each starring **a different pet
species** so the catalog visibly proves "we support all kinds of pets."

This PR-0 lays the two pieces of shared infrastructure that the per-story PRs reuse:

1. **Candidate reference photos** — one royalty-free stock photo per species, committed to
   a tracked location so every sample run is reproducible (the Story-1 photo lives in
   gitignored `uploads/`, so its run is *not* reproducible — we fix that pattern here).
2. **A story-agnostic capture harness** — generalizes `scripts/story1-high-run.ts` into a
   reusable run + capture pipeline that generates at the **locked mixed production tier**
   and emits both the web gallery JPGs and a **slim** preview PDF.

No catalog wiring and no paid generation happen in this PR — those land per story in
PRs 02–09. This PR is reviewable as pure tooling + assets.

---

## Decisions locked with the PM (2026-06-15)

| Decision | Choice |
|----------|--------|
| Photo source | **I source royalty-free stock** (Pexels/Unsplash, free-to-use, no attribution required), PM approves/swaps each before any paid run |
| Image quality tier | **Mixed `PRODUCTION_QUALITY`** (HIGH cover/hero, MEDIUM interiors, LOW reference) — identical to what the batch worker ships, so samples match what a paying customer receives. ≈ $1/book |
| Preview PDF weight | **Slim, web-res** (~2–4 MB) — rendered from the downscaled web JPGs, not full-res PNGs. Story 1's existing 31 MB PDF is left as-is |
| One PR per story | Yes — PRs 02, 04, 05, 06, 07, 08, 09 each ship one title's samples independently (the 3 letters could batch if the PM later prefers) |

---

## Species assignment (proposed — PM confirms at photo approval)

Covers all 5 supported `Species` values (`dog | cat | rabbit | bird | other`):

| Story | Title | Species | Photo file (committed) |
|-------|-------|---------|------------------------|
| 1 | Saying Goodbye | Dog (boxer) | *existing, unchanged* |
| 2 | A Letter from Your Pet | **Cat** | `uploads/sample-photos/cat.jpg` |
| 4 | If Your Pet Could Talk | **Rabbit** | `uploads/sample-photos/rabbit.jpg` |
| 5 | A Letter to Your Pet | **Dog** (senior, non-boxer) | `uploads/sample-photos/dog-senior.jpg` |
| 6 | While You're Still Here | **Cat** (senior) | `uploads/sample-photos/cat-senior.jpg` |
| 7 | Welcome Home | **Bird** (parrot/cockatiel) | `uploads/sample-photos/bird.jpg` |
| 8 | Amazing Adventures | **Dog** (energetic, e.g. corgi) | `uploads/sample-photos/dog-corgi.jpg` |
| 9 | And the New Baby | **Other** (e.g. guinea pig) | `uploads/sample-photos/other.jpg` |

Photo-selection bar (same logic that made the Story-1 boxer work well):
- **One clearly-front-facing animal**, distinctive coat/markings (a strong pet anchor for
  the reference-illustration step), no costume props that would bleed into scenes.
- Free-to-use license, no attribution required. Record each source URL + license in the
  per-story spec's "Input photo" section when the photo is chosen.

---

## Engine facts the harness relies on (verified)

- **Photo path containment:** `generateAllIllustrations` reads the photo via
  `resolveUnder(process.cwd(), "uploads", session.pet.photo)` (`lib/ai/generate.ts`,
  `lib/ai/paths.ts`). The resolved path **must stay strictly inside `./uploads`** or it
  throws "Pet photo path is outside ./uploads". → reference photos **must live under
  `./uploads`**; `pet.photo` is the cwd-relative form `"uploads/sample-photos/<file>"`
  (the prefix form, exactly like `fixtures/story1-high.json`).
- **Quality is NOT in the image cache key** (`page + promptHash + referenceHash`). Each
  fixture therefore needs a **fresh `id`** with an empty `./generated/<id>/` so the run is
  all cache misses, not stale Low PNGs.
- **`renderStoryPdf(session, imageMap)` is already story-agnostic** — it dispatches on
  `session.storyType` via `getStory(...).resolve(session)`. No render changes needed.
- **`generateAllIllustrations(session, opts)` dispatches by `storyType`** and self-selects
  Approach A/B/C per title. Passing `PRODUCTION_QUALITY` reproduces the worker exactly:
  `{ sceneQuality: "medium", heroSceneQuality: "high", referenceQuality: "low" }` — HIGH
  hero/cover, MEDIUM interiors, LOW (never-printed) reference.
- **Manifest page ids = the title's `illustrationSlots`** (`lib/story/*.ts`), so the
  captured JPG filenames derive directly from slot ids (e.g. `letter-cover`,
  `welcome-drive-home`, `adventure-climax`).

---

## Deliverables (the work)

### 1. Track a committed sample-photo dir — `.gitignore`
`uploads/*` currently ignores everything under `uploads/`. Add a negation so the approved
reference photos are version-controlled (single source of truth, reproducible runs):

```
!uploads/sample-photos/
!uploads/sample-photos/**
```

Document the exception in `context/coding-standards.md` (*Files, IO, and persistence*):
`uploads/` stays gitignored **except** `uploads/sample-photos/`, the committed
royalty-free reference photos that drive the storefront sample runs. ESLint-ignore of
`uploads/` is irrelevant (image files).

### 2. Source + commit the candidate photos — `uploads/sample-photos/`
One photo per species in the table above (Story-1 boxer excluded — it keeps its existing
photo). **PM approval gate: present the candidates for sign-off before any per-story PR
spends on a run.** Files committed here; their licenses recorded per story.

### 3. Generalize the run harness — `scripts/sample-run.ts`
Modeled on `scripts/story1-high-run.ts`, made story-agnostic:
- Take a **fixture path** as a CLI arg (`process.argv[2]`).
- Load it as a `StorySession`; `generateAllIllustrations(session, PRODUCTION_QUALITY)`
  (imported from `@/lib/ai/generate` — the **same constant the worker passes**, so samples
  cannot drift from production output).
- Persist the manifest onto the session; render the **full-res** working PDF via
  `renderStoryPdf(session, manifestToImageMap(manifest))` to `./output/` (gitignored — a
  reference render, not the committed artifact).
- PNGs + manifest land under `./generated/<fixture-id>/` (gitignored).
- Log each `page → path` like the Story-1 script. Kept (not deleted), like
  `scripts/story8-prototype.ts` / `story1-high-run.ts`, for re-runs.

### 4. Capture step — `scripts/sample-capture.ts`
The piece that produces the **committed** assets from a completed run (this is also what
makes the preview PDF *slim*):
- Input: a `--id <fixture-id>` (reads `./generated/<id>/` + the manifest) and a
  `--out <productId>` (the `public/samples/<productId>/` target dir).
- For each manifest entry, `sips`-downscale the PNG → web JPG (~1000px long edge, quality
  ~80; **no new npm dependency** — macOS-native `sips`, exactly as Story 1 did), named by
  **slot id** (`<slotId>.jpg`, e.g. `letter-cover.jpg`, `adventure-climax.jpg`).
- Build a `PageImageMap` from the **downscaled web JPGs** and call `renderStoryPdf(session,
  webImageMap)` → a **web-res `preview.pdf`** (~2–4 MB, the slim-PDF trick). Write it to
  `public/samples/<productId>/preview.pdf`.
- Copy the web JPGs into `public/samples/<productId>/`.

> Implementation note: steps 3 and 4 may be one combined script with two subcommands if
> cleaner — the only hard requirements are (a) generation uses `PRODUCTION_QUALITY`, and
> (b) the committed `preview.pdf` is rendered from the *downscaled* images, not full-res.

### 5. npm script — `package.json`
Add `proto:sample` (mirrors `proto:story8` / `proto:story1-high`, with
`--env-file-if-exists=.env.local` so the OpenAI key loads). Per-story PRs invoke it with
their fixture path.

### 6. Docs
- `context/coding-standards.md` — the `uploads/sample-photos/` tracked-dir exception (see
  deliverable 1) + a one-line note that storefront samples are generated at
  `PRODUCTION_QUALITY` via `scripts/sample-run.ts`.
- `context/new-book-playbook.md` — add a step: "ship the storefront sample set
  (`scripts/sample-run.ts` + `sample-capture.ts` → `public/samples/<id>/`, wire
  `sampleImages` + `previewPdf`)" so every future title follows this pattern.

---

## Tests / build

- No engine, catalog, or route code changes → `surface.boundary.test.ts` and the catalog
  tests are untouched and stay green.
- The new scripts are throwaway tooling (not unit-tested, consistent with
  `scripts/story8-prototype.ts` / `story1-high-run.ts`).
- `npm run test:run` + `npm run build` must still pass (regression check only).

## Pre-flight (carried into every per-story PR that spends)

- Verify `OPENAI_API_KEY` is live (`curl /v1/models`) before any paid run.
- `next dev` must **not** be running during `npm run build` (`.next` cache corruption).

## Out of scope / deferred

- Any paid generation — happens per story in PRs 02–09.
- Re-rendering Story 1 (its assets stay as-is; only the harness it inspired is generalized).
- Making the mixed tier or HIGH selectable in the wizard — unrelated engine-default change.
