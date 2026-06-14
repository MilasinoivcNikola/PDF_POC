## 2026-06-14 — Story 8 (PR-0): Approach-B Illustration Prototype (go/no-go gate) — **GO**

**Branch:** `feature/story8-prototype`
**Spec:** [context/features/30-story8-prototype-gate.md](../features/30-story8-prototype-gate.md)
**Master template:** [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md)
**Owner:** Craft Area 2 — ai-image-specialist

### What shipped

PR-0 of 3 for **Story 8 — "The Amazing Adventures of [PET_NAME]"**, the catalog's first
joyful kids' adventure book (highest demand + highest technical risk). This PR is the
**go/no-go gate** the master template demands: it builds *only* enough to answer one
question — **does the test pet stay on-model across 10 dynamic action poses under Approach
B?** No text engine, no registration, no wizard, no storefront, no PDF, no commerce touch.
Deliberately deletable on a NO-GO.

**Why the gate exists:** Story 8 is the one catalog book the existing engine could *not*
trivially serve. Every other book was authoring-mostly; Story 8's entire moat is "this is
YOUR actual pet, mid-adventure" — exactly what the pipeline is worst at (holding markings,
ear shape, eye color across running / leaping / sneaking / mid-rescue poses). And it
exposed a real engine gap: **Approach B** (accumulate each accepted scene as a reference
for the next) lived only in the original Story-1 path; every newer book (2/4/5/6/7)
hardcodes Approach A and the batch worker passes no options, so *nothing* runs Approach B
in production today. "Use Approach B" was net-new orchestration to validate, not a flag.

**Built (3 created, 1 edited):**
- `lib/ai/story8-prompts.ts` (**REAL — carries forward verbatim into PR-A**) — pure
  `buildStory8PrototypePrompts(petDescription, style)` → ordered 10 Backyard-Mystery slots,
  all `useReference: true`. Pose discipline baked into every prompt: same-animal/markings
  anchor, 3/4-or-side dynamic pose + no extreme foreshortening, costume-must-not-obscure-face,
  dynamic warm-watercolor palette; the climax slot alone gets the explicit 3/4-**side**-leap /
  no-foreshortened-lunge clause. Beat briefs inlined as constants (PR-A refactors these to read
  each page's resolved `illustrationBrief`). Slot ids (`adventure-cover` … `adventure-celebration`)
  are the exact literals PR-A registers as `ADVENTURE_SCENE_PAGE_IDS`. Mirrors the shape of
  `story6-prompts.ts` / `story7-prompts.ts`; reuses `IllustrationStyle` (no redefined shape).
- `lib/ai/story8-prompts.test.ts` — asserts exactly 10 slots in book order, all
  `useReference: true`, no surviving `{token}`/`[FIELD]`, climax side-leap clause present,
  same-animal + 3/4 rule on every prompt.
- `scripts/story8-prototype.ts` (**THROWAWAY script; the B-loop logic carries forward**) —
  tsx CLI: read test photo from argv (default `uploads/feat21-talk-otis/photo.jpg`) →
  locked reference (Low, never dropped) → 10 slots under Approach B **sequentially in risk
  order** (calm `cover→ordinary→special→celebration` → escalating
  `call→clue→deeper→discovery→wobble` → **climax LAST at Medium**), each accepted scene
  appended to the reference set (16-ref cap, newest kept) → PNGs + book-ordered
  `contact-sheet.html` to `./generated/story8-proto/` → per-image tier + running cost log.
- `package.json` — added `proto:story8` (with `--env-file-if-exists=.env.local`, see below).

**Reuse decision:** the engine's `referencesForScene` / `generateAndSaveScene`
(`lib/ai/generate.ts`) are module-private **and** coupled to a real `StorySession` + the
per-session image cache, which a session-less one-shot prototype doesn't have. So the script
**replicates** the small Approach-B accumulation inline (a byte-faithful copy of
`referencesForScene` for approach "B" — same base `[photo, reference]`, same
`room`/`recent`/newest-kept/16-cap logic) and reuses only the already-exported primitives
(`generateReferenceIllustration`, `generateSceneIllustration`, `MAX_REFERENCE_IMAGES`).
`lib/ai/generate.ts` was **not** modified. PR-A promotes the loop into a shared
`generateStory8Illustrations` orchestrator.

### Env-loading fix

The first gate run failed with `OPENAI_API_KEY is not set` — Next.js auto-loads
`.env.local`, but a standalone tsx script does not. Fixed by adding
`--env-file-if-exists=.env.local` to the `proto:story8` npm script (a built-in Node 22 / tsx
passthrough — **not** a new dependency; the `-if-exists` variant preserves the engine's
friendly "add it to .env.local" error when the file is absent). Verified the 164-char key
reaches `process.env` without calling the paid API.

### The verdict — GO (PM Nikola)

PM inspected `generated/story8-proto/contact-sheet.html` for the test pet
(`uploads/feat21-talk-otis/photo.jpg`): **likeness held across all 10 dynamic action poses**
under Approach B — including the leap, expedition, discovery, and wobble, not just the calm
scenes. **GO → proceed to PR-A (Feature 31).** `story8-prompts.ts` + the Approach-B B-loop
are keepers; the throwaway script is superseded by PR-A's shared orchestrator.

**Cost floor (carried to debt.md):** the run generated 9 slots + reference at Low and the
climax leap at Medium (the prototype's default config). Story 8 book runs therefore carry
one Medium image (the climax) on top of Low for the rest — a deliberate, scene-specific
opt-in consistent with the cost-tier rule, not a default-tier violation. Whether Low alone
holds the climax was not tested (only Medium was rendered) — PR-A may run a one-image
Low-vs-Medium comparison before locking the floor.

### Verification

- `npm run test:run` — 1627 passed (79 files), incl. the new `story8-prompts.test.ts`.
- `npm run build`, `npx tsc --noEmit` — green.
- `lib/runtime/surface.boundary.test.ts` — green; `lib/ai/*` is already banned from the
  public closure, so nothing was added to the public graph and the deploy-surface boundary
  is trivially preserved.
- No byte-identity work needed — no template/registry/CSS touched.
- code-reviewer: **PASS** (no blockers); context-auditor: **IN SYNC**.

### Carried forward (see debt.md)

- Story 8 book cost floor = one Medium image (climax) per run; Low-vs-Medium climax
  comparison still untested.
- `new-book-playbook.md` lacks the "illustration-prototype exception" section that this
  feature's spec + the masterstory cite — best added when PR-A/PR-B land.
- Env-loading divergence: `proto:story8` auto-loads `.env.local`; `render:test` /
  `process:orders` don't (rely on ambient env).
