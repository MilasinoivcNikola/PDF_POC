# 12 — Input Photo Downscale

> **Craft Area:** 2 — AI illustration · **Owner agent:** `ai-image-specialist`
> **Milestone:** 6 (polish, pulled from `11-polish-and-iteration.md`) · **Depends on:** 06, 07, 10
> **Branch:** `feature/input-photo-downscale`

## Status

Not Started

## Goals

- Stop re-sending an oversized pet photo to OpenAI on **every** illustration call. The uploaded photo is passed as a reference on all 14 calls per book (1 reference + 13 scenes); a 2400×1600 phone photo is far more than `gpt-image-2` needs to anchor the pet.
- Cap the photo's longest edge at ~1024px (re-encoded) **once**, so every downstream `images.edit` call sends a smaller reference image → fewer input-image tokens per call → lower cost and faster uploads.
- **No meaningful quality / consistency loss.** This is the one "free" optimization — if a 1024px reference visibly degrades pet consistency vs. the full-size photo, we stop and reconsider the cap, not ship a regression.

## Scope

**In scope**
- A single downscale step that produces the photo bytes actually sent to the API: longest edge ≤ 1024px, aspect ratio preserved, re-encoded (JPEG ~q85 or kept as-is if already small). Applied to the photo used by both `generateReferenceIllustration` and every `generateSceneIllustration` reference set.
- A short measurement note in the PR / history: input bytes before vs. after, and a side-by-side consistency check on one real pet (full-size photo book vs. downscaled-photo book) confirming the pet still reads as the same animal.

**Out of scope**
- Touching the **output** resolution (`size: "1024x1024"`) or the generated reference illustration / scene PNGs — those are the printed art and stay as-is.
- Quality-tier changes (that's feature 13).
- Any change to caching semantics beyond the expected key shift (see notes).
- Photo retouching, cropping, face-detection, EXIF rotation handling beyond what's needed to not break (flag if EXIF orientation turns out to matter).

## Implementation notes

**The dependency decision — surface before building.** The repo currently has **no image-processing library**, and `coding-standards.md` forbids new deps without approval. There are three viable places to downscale, with different trade-offs — pick one with Nikola:

1. **Client-side, in the browser before upload** (`components/wizard/ImageUploader.tsx`) via a `<canvas>`. **No new dependency**, and it also shrinks the upload itself. Trade-off: the server only ever receives the downscaled photo (we lose the pristine original — matters only if a future `input_fidelity: "high"` wants max detail).
2. **Server-side on upload** (`app/api/upload/route.ts`) — needs an image lib (`sharp`, a new dependency) to resize before writing `./uploads/[id]/photo.[ext]`. Keeps one source of truth on disk; original is replaced by the downscaled version.
3. **At generation time** in `lib/ai/` (resize the buffer in `photoToFile` / just before the `images.edit` call) — needs `sharp`, but keeps the full-res original on disk and only shrinks the in-flight copy. Most flexible, most code.

**Recommendation:** option **1 (client canvas)** for this POC — it adds zero dependencies, cuts upload bandwidth too, and the pristine-original concern is moot while we're not using `input_fidelity: "high"`. If Nikola wants to preserve the original on disk, go option 3 and accept `sharp`.

**Key decisions / gotchas**
- **Cache key shift is expected.** The cache keys on `hashReferenceSet(...)` over the photo bytes ([lib/ai/cache.ts](../../lib/ai/cache.ts)). Smaller photo bytes ⇒ different hash ⇒ existing cached books miss once and regenerate. That's fine (caches are disposable here), but note it so it isn't mistaken for a cache bug. The downscale must be **deterministic** (same input + params → same bytes) so the new hash stays stable across re-runs.
- Keep the downscale a small, pure-ish helper so it's unit-testable on a fixture (in → dimensions/byte-size out), matching how `imageToDataUrl` is tested.
- Respect the existing upload validation (jpeg/png/webp, ≤10 MB) — downscaling happens after type/size validation, not instead of it.
- Don't upscale: photos already ≤1024px long edge pass through untouched (no quality loss, no pointless re-encode).

**Files (depends on the chosen option)**
- Option 1: `components/wizard/ImageUploader.tsx` (+ a small resize util).
- Option 2: `app/api/upload/route.ts` (+ `sharp`).
- Option 3: `lib/ai/client.ts` / `lib/ai/generate.ts` (+ `sharp`).

## References

- @context/local-prototype-plan.md — "Reference images: Pass them as base64 data URLs … phone photo of a pet, they'll be much smaller"; the cost-tier table.
- @context/coding-standards.md — "Do not add dependencies … without approval" (the `sharp` decision); the `lib/ai/` craft-area rules.
- [lib/ai/generate.ts](../../lib/ai/generate.ts) — where the photo is read and passed as a reference on every call.
- [lib/ai/cache.ts](../../lib/ai/cache.ts) — `hashReferenceSet`, why the key shifts.

## Done when

- [ ] The photo bytes sent to OpenAI have longest edge ≤ ~1024px on every call; photos already small pass through untouched.
- [ ] A real before/after run shows reduced input bytes (logged) with the pet still recognizably the same animal across pages.
- [ ] No new dependency added **without** Nikola's sign-off (or option 1 chosen, which adds none).
- [ ] `npm run build` and `npm run test:run` pass.

## Tests

- `test-author`: the resize helper as a pure unit — caps the long edge, preserves aspect ratio, leaves already-small images alone, output is deterministic. **No real OpenAI calls.**
- `qa`: one real generation on a large photo (re-run an existing `./sessions/` fixture is a free cache check; the actual downscale benefit needs one fresh **Low**-tier run — keep it Low, not Medium). Eyeball pet consistency vs. a full-size baseline; record input-byte delta.
