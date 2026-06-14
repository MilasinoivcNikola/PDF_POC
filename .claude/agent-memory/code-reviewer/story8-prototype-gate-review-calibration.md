---
name: story8-prototype-gate-review-calibration
description: Feature 30 (Story 8 PR-0) Approach-B illustration prototype gate — validated patterns and refuted concerns for the throwaway-script + carries-forward-prompt-builder shape
metadata:
  type: feedback
---

Feature 30 is the first **prototype-gate PR** in this repo (PR-0 of a 3-PR story): a throwaway CLI + a prompt builder that carries forward verbatim into PR-A. Review the builder as production code, the script as disposable-but-the-loop-carries.

**Validated as intentional (don't flag):**
- **Contact-sheet photo by absolute filesystem path, slots by relative filename.** `scripts/story8-prototype.ts` writes `<img src="/Users/.../uploads/.../photo.jpg">` for the original photo (outside OUTPUT_DIR) while slot PNGs use bare basenames (beside the sheet). Absolute path resolves correctly under `file://` on macOS/Linux; relative wouldn't reach `uploads/`. Intentional and functional.
- **`useReference: true` as a literal type (not `boolean`).** Sibling builders (story7) use `boolean` because they have a figure-free wash slot; Story 8's pet is the hero of all 10 slots, so the literal is correct and documented.
- **Script replicates `referencesForScene` approach-B inline rather than importing it.** `generate.ts`'s `referencesForScene`/`generateAndSaveScene` are module-private AND coupled to `StorySession` + the disk cache; a session-less one-shot prototype can't use them. Replication is byte-identical to the engine (base=[photo,reference], room=MAX-base.length, recent=slice(max(0,len-room)), [...base,...recent]). Spec explicitly blessed replicate-and-note-PR-A-promotes. The optional `generate.ts` export edit was correctly DECLINED.

**Refuted concern:**
- The `--env-file-if-exists=.env.local` in the new `proto:story8` npm script is NOT a divergence bug. Sibling scripts (`render:test`, `process:orders`) load no env at all (operator must export `OPENAI_API_KEY` in shell); no `dotenv` dep exists. The new flag is a Node-native passthrough via tsx, `-if-exists` = no-crash-when-absent → a strict improvement. At most a nit that the siblings don't share it.

**Calibration:** for a gate PR whose explicit NO-GO path is "delete the branch," script-quality nits (HTML escaping on a local-only file, no argv style override) are nits not blockers. The load-bearing checks are: prompt builder correctness (pose discipline present on every prompt, climax side-leap, no surviving tokens) and faithful approach-B accumulation matching the engine.
