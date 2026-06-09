# Input Photo Downscale

## Status

In Progress — Option 1 (client `<canvas>` downscale) chosen; branch `feature/input-photo-downscale`; routed to `nextjs-ui-builder`.

## Goals

- Stop re-sending the oversized pet photo to OpenAI on **every** illustration call — it's passed as a reference on all 14 calls per book (1 reference + 13 scenes), and a 2400×1600 phone photo is far more than `gpt-image-2` needs to anchor the pet.
- Cap the photo's longest edge at ~1024px (re-encoded) **once**, so every downstream `images.edit` call sends a smaller reference → fewer input-image tokens, lower cost, faster uploads. Aspect ratio preserved; photos already ≤1024px pass through untouched (no upscaling, no pointless re-encode).
- **No meaningful quality / consistency loss** — this is the "free" optimization. If a 1024px reference visibly degrades pet consistency vs. the full-size photo, stop and reconsider the cap rather than ship a regression.
- The downscale is **deterministic** (same input + params → same bytes) so the cache hash stays stable across re-runs.
- `npm run build` and `npm run test:run` pass.

## Notes

**Craft Area 2 — AI illustration.** `start` dispatches to **`ai-image-specialist`**.

**Open decision to settle at `start` (affects the dependency question).** Three places to downscale:
1. **Client canvas** before upload (`components/wizard/ImageUploader.tsx`) — **zero new deps**, also shrinks the upload. Server only ever gets the downscaled photo (loses the pristine original — only matters if a future `input_fidelity: "high"` wants max detail).
2. **Server on upload** (`app/api/upload/route.ts`) — needs `sharp` (new dep). One source of truth on disk; original replaced by downscaled.
3. **At generation** in `lib/ai/` — needs `sharp`; keeps full-res original on disk, shrinks only the in-flight copy. Most flexible, most code.

**Recommendation: Option 1 (client canvas).** Zero dependencies (`coding-standards.md` forbids new deps without sign-off), cuts upload bandwidth, and the pristine-original concern is moot while we're not using `input_fidelity: "high"`. Pick Option 3 + accept `sharp` only if Nikola wants the original preserved on disk.

**Key gotchas**
- **Cache-key shift is expected, not a bug.** `hashReferenceSet` keys on the photo bytes ([lib/ai/cache.ts](../../lib/ai/cache.ts)); smaller bytes ⇒ new hash ⇒ existing cached books miss once and regenerate. Fine (caches are disposable), but note it.
- Keep the resize a small pure-ish, unit-testable helper (in → dimensions/byte-size out), mirroring how `imageToDataUrl` is tested.
- Downscale happens **after** the existing upload validation (jpeg/png/webp, ≤10 MB), not instead of it.
- Flag EXIF orientation only if it turns out to matter.

**Files** (depends on chosen option): Option 1 → `components/wizard/ImageUploader.tsx` + a small resize util. Option 2 → `app/api/upload/route.ts` + `sharp`. Option 3 → `lib/ai/client.ts` / `lib/ai/generate.ts` + `sharp`.

**Out of scope:** output resolution (`size: "1024x1024"`) and the generated PNGs (printed art, stays as-is); quality-tier changes (feature 13); caching semantics beyond the expected key shift; photo retouching / cropping / face-detection.

**Depends on:** features 06, 07, 10 (all shipped).
