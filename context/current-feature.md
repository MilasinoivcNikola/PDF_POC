# Scene Pipeline & Pet Consistency

## Status

In Progress

## Goals

- From a pet photo + reference illustration, generate **all** illustrations a Story-1 book needs (cover + ~10–12 scenes) where the pet looks like the *same animal* on every page.
- `generateAllIllustrations(session): Promise<PageImageMap>` runs the full chain — reference (feature 06) → all scenes → saves each to `./generated/[session-id]/[page].png` → returns a manifest (page → path + prompt/reference hashes).
- End-to-end pipeline works: `StorySession` + photo → all illustrations → feature 05 → a complete PDF with real illustrations of the actual pet. **This is Milestone 3's "done" — the wow moment.**
- Caching makes regeneration cheap and idempotent: cache hit skips the API call; single-page regenerate re-calls only the changed page.
- A real Medium-tier book lands near the **~$0.58** budget.
- `npm run build` passes; unit tests cover prompt builders, cache key, reference-cap, manifest shape (OpenAI fully mocked).

## Notes

**Craft Area 2 (AI illustration)** → `start` dispatches to **`ai-image-specialist`**. Milestone 3. Depends on features 05 (Puppeteer renderer) and 06 (OpenAI client + reference illustration) — both merged on `main`. Branch: `feature/scene-pipeline`.

**Builds directly on feature 06's surface** — reuse, don't re-create: `lib/ai/client.ts` (`getOpenAI`, `imageToDataUrl`, `photoToFile`), `lib/ai/generate.ts` (`buildReferencePrompt`, `Quality`, `generateReferenceIllustration` via `images.edit` with `image:` — note 06 corrected the plan: reference images go through **`images.edit`**, not `images.generate({ reference_images })`), and `lib/ai/paths.ts` (`isSafeSessionId`, `resolveUnder` — use these for every `./generated/[id]/` write).

**Files:**
- `lib/ai/prompts.ts` — per-scene prompt builders, one per illustration, derived from each page's **illustration brief** (`lib/story/master-text.ts`, feature 03) + session inputs. Don't duplicate scene text in two places.
- `lib/ai/generate.ts` — add `generateSceneIllustration(...)` + orchestrator `generateAllIllustrations(session)`.
- `lib/ai/cache.ts` (new) — cache keyed by `hash(prompt + reference-image set)`; manifest stores hashes (the `GeneratedImage` type from feature 02 already carries `promptHash`+`referenceHash`).

**Scene set** must match `prototypes/generating.html`: reference portrait, cover, front door (P2), bond/together (P3), favorite activity (P4), sleeping spot (P5), the memory (P6), gentle-truth rest (P7, mirrors P5), feelings (P8), comfort frame (P9), love-stays (P10), P11 triptych, closing (P12).

**Pet-consistency strategy — configurable, don't hard-wire:**
- **A** (default): each scene = [original photo + reference illustration] + scene prompt.
- **B**: accumulate prior scenes as extra references (cap **16** total) to drift-compensate — sequential by nature.
- **C**: photo-only baseline (cheapest) for comparison.
- Enforce the 16-image reference cap (photo + reference + up to 14 prior scenes).
- Approach A scenes are independent → generate in parallel; B is sequential.

**Quality tiers (hard rule):** `low` while iterating on prompts, **`medium`** for real book runs, `high` reserved for cover/finals.

**Style guide (from masterstory):** warm pastels / golden-hour light, no harsh black, child rendered 3/4 or from behind, consistent breed markings / eye color / posture across pages.

**Verify** `images.edit` params/limits against the live SDK (context7) — same caveat feature 06 flagged.

**Out of scope (don't drift):** the generation progress UI + HTTP route (feature 09), wizard input collection (feature 08), the PDF render itself (reuse feature 05).
