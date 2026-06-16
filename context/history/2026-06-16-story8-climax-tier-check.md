## 2026-06-16 — Fix: Story-8 climax Low-vs-Medium tier check — keep Medium (Medium confirmed)

**Branch:** `fix/story8-climax-tier-check` (fd60294, merge 3687215) · **Spec:** `context/fixes/story8-climax-tier-check.md` · Tier-3, AI-illustration / decision-support.

### What this paid down

The **low**-severity debt row *"Story 8 cost floor — climax Low-vs-Medium comparison
unrun."* Story 8 ("The Amazing Adventures…") runs Approach B and pins one slot —
`adventure-climax`, the highest-drift 3/4 side-leap pose — to **Medium** while every other
slot stays Low, via `STORY8_MEDIUM_SLOT` (`lib/ai/generate.ts:1256`), applied through
`atLeastMedium()` at the full-book site (`:1387`) and the repaint site (`:1802`). PR-0's
go/no-go gate (feature 30) returned **GO with the climax rendered at Medium — only Medium
was ever tested**; PR-A (feature 31) then shipped Medium as the locked per-slot default
**without running the Low-vs-Medium comparison.** The `story-samples-08` PR closed the
*other* half of the original trigger (confirmed Approach B self-selects by `storyType` and
generates all 10 slots cleanly at `PRODUCTION_QUALITY`). The one-image comparison stayed
unrun — Medium locked without proof Low would hold. This fix ran it.

### The experiment

New throwaway runner `scripts/story8-climax-compare.ts` (committed, kept like
`scripts/story8-prototype.ts` / `scripts/story1-tier-compare.ts`), plus a
`proto:story8-climax` npm script mirroring `proto:story8` (same
`--env-file-if-exists=.env.local --tsconfig scripts/tsconfig.json` invocation).

It loads the committed corgi fixture `fixtures/sample-story8-dog.json` ("Pickle", a
tricolor Pembroke corgi — the **same pet the catalog sample uses**, so the comparison is
against a known-good Medium reference), builds prompts via the real
`buildStory8SlotPrompts`, and replicates the engine's inline Approach-B accumulation loop
(`referencesForScene`/`generateAndSaveScene` are module-private, so the loop is replicated
inline and only the exported primitives — `generateReferenceIllustration`,
`generateSceneIllustration`, `MAX_REFERENCE_IMAGES` — are reused, exactly as the sibling
runners do). It generates a Low reference + the 9 non-climax bank scenes at Low in risk
order, then renders the `adventure-climax` slot **twice from one identical 11-image
reference array** — once Low, once Medium. **Tier is the only variable** (code-reviewer
confirmed the same `references` array feeds both renders — the crux of the comparison's
validity). 12 images, **~$0.12**, key verified live (`GET /v1/models` → 200) before
spending. Output: `generated/story8-climax-compare/compare.html` + `adventure-climax-LOW.png`
/ `-MEDIUM.png` (gitignored — the committed runner reproduces them).

### Verdict — KEEP MEDIUM

Both renders held the corgi on-model (distinctive silhouette: tan head, white blaze, big
upright ears, white chest/legs, black saddle, short legs, the bandana from the bank), clean
3/4 side leap in both. Engine read: Low held marginally (likeness intact, Medium only
crisper). **The PM judged the high-drift side-leap — the #1 Story-8 quality gate — and chose
to keep the Medium floor** ("Keep HIGH/MEDIUM approach"). Product judgment overrode the
marginal engine read. This is the spec's *"If Low drifts"* branch: **no engine change** —
`STORY8_MEDIUM_SLOT`, `atLeastMedium()`, both call sites, and every Story-8 imagery test
stay exactly as they were. The HIGH/MEDIUM mixed-tier approach is preserved.

One honest caveat (code-reviewer, non-blocking): the comparison's reference *bank* was
rendered at Low, whereas a production sample feeds the climax a Medium-tier bank — so the
experiment isolated the climax's *own* tier (the question asked), slightly understating
production bank quality. Moot given the "keep Medium" verdict, and if anything a Low bank is
the harsher test, which the climax still passed.

### Diff & verification

- New: `scripts/story8-climax-compare.ts`; `package.json` (+`proto:story8-climax`).
- `context/debt.md`: the cost-floor row **removed** as *resolved (Medium confirmed)*.
- `.claude/agent-memory/ai-image-specialist/*`: recorded the corgi climax verdict.
- Engine + all tests untouched; no public/commerce surface, boundary test unaffected.
- `npm run test:run` → **2152 passed**; `npm run build` → clean, route tiers unchanged
  (`ƒ`/`●`/`○`).
- Review: code-reviewer **PASS** (experiment design sound, tier-isolation held, file writes
  safe, paid loop bounded to 12 fixed calls); context-auditor **IN SYNC** (debt-row removal
  is the correct convention; every standing doc that describes the Medium floor stays
  accurate because Medium was kept). Commerce-security reviewer not dispatched (no commerce
  surface). QA N/A (no UI surface).
