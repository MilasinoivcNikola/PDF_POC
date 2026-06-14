# Current Feature

Feature 30 — Story 8 (PR-0): Approach-B Illustration Prototype (go/no-go gate)

## Status

In Progress

## Goals

Build *only* enough to answer one question: **does the test pet stay on-model
across 10 dynamic action poses under Approach B?** This is the go/no-go gate for
"The Amazing Adventures of [PET_NAME]" — no text engine, no registration, no
wizard, no storefront, not sellable.

- **`lib/ai/story8-prompts.ts` (REAL — carries into PR-A):** pure
  `buildStory8PrototypePrompts(petDescription, style)` → ordered list of
  `{ slot, prompt, useReference: true }` for the 10 Backyard-Mystery slots, all
  reference-anchored. Pose discipline baked into every prompt (same-animal /
  markings anchor, 3/4 or side dynamic pose, no extreme foreshortening, climax =
  3/4 side leap never foreshortened, costume must not obscure face, dynamic warm
  watercolor palette modifier). Briefs inlined as constants (PR-A refactors to
  read resolved `illustrationBrief`). Slot ids = the literals PR-A registers as
  `ADVENTURE_SCENE_PAGE_IDS`.
- **Approach-B orchestration via `scripts/story8-prototype.ts` (script THROWAWAY;
  loop logic carries forward):** read test pet photo from argv → generate locked
  reference once (Low, never dropped) → run 10 slots **sequentially in risk
  order** (calm first: cover→ordinary→special→celebration; then escalating:
  call→clue→deeper→discovery→wobble; **climax LAST at Medium**), each accepted
  scene appended to the reference set (Approach-B accumulation, 16-ref cap) →
  write PNGs to `./generated/story8-proto/` + emit `contact-sheet.html` (photo +
  reference + 10 slots in a labelled grid) → log per-image tier + total cost.
  **Reuse, don't fork:** call `referencesForScene` / `generateAndSaveScene` from
  `generate.ts` if exportable without dragging state; otherwise replicate the
  small B-loop and note PR-A promotes the shared helper.
- **`package.json`:** add
  `"proto:story8": "tsx --env-file-if-exists=.env.local --tsconfig scripts/tsconfig.json scripts/story8-prototype.ts"`
  (the `--env-file-if-exists` flag — a built-in Node 22 / tsx passthrough, no new
  dep — auto-loads `.env.local` so the paid gate run picks up `OPENAI_API_KEY`;
  standalone tsx scripts don't load it the way Next.js does).

## Notes

- **Owner:** Craft Area 2 — **ai-image-specialist** (touches `lib/ai/*` +
  generation orchestration).
- **PR-0 of 3.** PR-A (Feature 31) and PR-B (Feature 32) are written but **must
  not be started until this prototype returns GO.** Decision owner: PM (Nikola),
  on inspection of the contact sheet — do not self-greenlight.

**Created (3):**
- `lib/ai/story8-prompts.ts` — 10 Backyard-Mystery scene prompts + pose discipline.
- `lib/ai/story8-prompts.test.ts` — unit test.
- `scripts/story8-prototype.ts` — throwaway Approach-B runner + contact-sheet emitter.

**Edited (1, +1 optional):**
- `package.json` — `proto:story8` script.
- *(optional)* `lib/ai/generate.ts` — export `referencesForScene` /
  `generateAndSaveScene` **only if** the script reuses them (no behavior change).

**Guardrails:**
- **Touch only `lib/ai/*`, `scripts/`, `package.json`.** `lib/ai/*` is already
  banned from the public closure, so this PR cannot break the public build. No
  template/registry/CSS touch → byte-identity trivially preserved.
- **Cost rule:** Low tier by default; climax leap may bump to Medium. One run ≈
  11 images ≈ $0.08–$0.15. One test pet; re-run only to compare prompt tweaks.

**Tests & verification:**
1. `story8-prompts.test.ts` — `buildStory8PrototypePrompts("scruffy brown terrier
   dog", style)`: exactly **10** slots in table order, all `useReference: true`;
   no surviving `{token}`/`[FIELD]`; climax has side-leap / no-foreshortening
   instruction; every prompt has same-animal / markings anchor + 3/4 pose rule;
   none mentions a face-obscuring costume.
2. `npm run build`, `npm run test:run`, `npx tsc --noEmit` green.
3. `lib/runtime/surface.boundary.test.ts` green (nothing added to public graph).
4. No byte-identity work needed (note in PR, don't skip silently).

**The actual gate (manual):** `npm run proto:story8 <test-photo>` → open
`./generated/story8-proto/contact-sheet.html` → judge likeness across all 10
slots vs photo + reference (markings/ears/eyes/coat/proportions on the leap,
expedition, discovery, wobble — not just calm scenes). Climax reads as same dog
(Low first; if it drifts, confirm whether Medium rescues it). No costume hides
face; no foreshortened lunge.

**Go/no-go (record verdict here + carry to debt.md / history on merge):**
- **GO** — likeness holds (optionally only with climax at Medium — note it, sets
  cost floor) → proceed to PR-A (Feature 31).
- **NO-GO** — hero drifts on dynamic poses, no tier/prompt tweak rescues within
  2–3 attempts → stop, delete spec files 31 & 32 and this branch. Copy never
  written, nothing wasted.

## Verdict — GO (PM Nikola, 2026-06-14)

Likeness held across all 10 dynamic action poses on the test pet
(`uploads/feat21-talk-otis/photo.jpg`) under Approach B. Inspected the contact
sheet at `generated/story8-proto/contact-sheet.html`. **Proceed to PR-A
(Feature 31).** Keep `lib/ai/story8-prompts.ts` + the Approach-B B-loop.

- **Cost floor:** the run generated 9 slots + reference at **Low**, the climax
  leap at **Medium** (the prototype's default config). Carry to debt.md: Story 8
  book runs cost one Medium image (the climax) on top of Low for the rest.
- The throwaway `scripts/story8-prototype.ts` carries no further; PR-A promotes
  the B-loop into a shared `generateStory8Illustrations` orchestrator.
