# Feature 30 — Story 8 (PR-0): Approach-B Illustration Prototype (go/no-go gate)

> **Branch:** `feature/story8-prototype`
> **Master template:** [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md)
> **Playbook:** [context/new-book-playbook.md](../new-book-playbook.md) — this is the **exception** the playbook names: a real illustration-prototype phase that the lightweight authoring path does not have.
> **Product:** "The Amazing Adventures of [PET_NAME]" — the catalog's **first joyful kids' adventure** book (#5 ranked, highest demand + highest build effort + highest technical risk).
> **PR split:** This is **PR-0 of 3** — the **go/no-go gate**. It builds *only* enough to answer one question: **does the pet stay on-model across 10 dynamic action poses under Approach B?** No text engine, no registration, no wizard, no storefront, not sellable. [PR-A (Feature 31)](./31-story8-text-registry-and-imagery.md) and [PR-B (Feature 32)](./32-story8-wizard-and-storefront.md) are written but **must not be started until this prototype returns GO.**

---

## Status

Not Started

## Why this PR exists (read first)

Every other book in the catalog was "authoring-mostly" — the engine already did what they needed. **Story 8 is the one exception.** Its entire moat is "this is YOUR actual dog, having an adventure," and that is exactly what the AI pipeline is worst at: holding a pet's real markings, ear shape, and eye color across **running, leaping, sneaking, disguised, mid-rescue** poses. A pet sitting in golden light (Story 1) is easy; a pet mid-leap in a 3/4 rear angle is where the model quietly substitutes a generic animal. **If the dog stops looking like the dog, the product fails.**

The master template makes this the explicit go/no-go gate ("prototype the 10-slot set FIRST and look at it; the prototype is the gate, not the final step"). After auditing the engine, that judgement is correct **and** it is where the only hard engineering lives — so this PR front-loads the risk and the real engine work.

### The engine gap this PR closes

Approach B (accumulate each accepted scene as a reference for the next generation) **exists only in the original Story-1 code path** ([`lib/ai/generate.ts:495-508`](../../lib/ai/generate.ts)). Every newer book (Stories 2/4/5/6/7) has its own generation function that **hardcodes Approach A** (parallel, photo + locked reference only — no accumulation), and the **batch worker passes no options** ([`worker.ts:313`](../../lib/order/worker.ts) calls `generateAllIllustrations(session)` bare), so in production *nothing* runs Approach B today. "Use Approach B" is therefore **net-new orchestration**, not a config flag. This PR validates that orchestration on a real pet before any copy is written.

---

## Scope & guardrails

**In scope — the minimum to render 10 inspectable images of one test pet:**
- The **real scene-prompt builder** for the default theme (Backyard Mystery), with the pose discipline baked in. **This file carries forward verbatim into PR-A** — it is the artifact the prototype validates.
- The **real Approach-B orchestration** (sequential, risk-ordered, accumulating references), exercised by a throwaway CLI script.
- A throwaway prototype script + an HTML **contact sheet** so the 10 slots can be eyeballed side-by-side against the reference and the original photo.

**Out of scope (deliberately — keeps this PR deletable on a NO-GO):**
- No `lib/story/story8/` text engine, no `master-text.ts`/variants/merge.
- No `Story8Session` in `lib/session/types.ts`, no `Story8PageId` union, no registry entry, no catalog product, no wizard, no PDF.
- No theme other than Backyard Mystery.
- No order/commerce touch whatsoever.

**Guardrails:**
- **Touch only `lib/ai/*`, `scripts/`, `package.json`.** `lib/ai/*` is already banned from the public closure by the boundary guard, so this PR cannot break the public build. No existing book's PDF can change (no template/registry/CSS touch) — byte-identity is trivially preserved.
- **Cost rule applies.** Generate at **Low** tier by default; the climax leap (the single highest-drift pose) may be bumped to **Medium** to test whether tier rescues it. One prototype run ≈ **11 images** (locked reference + 10 slots) ≈ **$0.08–$0.15**. Run on **one** test pet; re-run only to compare prompt tweaks.

---

## What gets built

### 1. `lib/ai/story8-prompts.ts` (REAL — carries into PR-A)

A pure scene-prompt builder for the **Backyard Mystery** theme, mirroring the shape of `lib/ai/story6-prompts.ts` / `story7-prompts.ts` but **standalone of the text engine** (PR-0 has no resolved story to read briefs from, so the briefs are inlined here as constants for the 10 slots — PR-A will refactor these to read each page's resolved `illustrationBrief`).

- Export `buildStory8PrototypePrompts(petDescription, style)` → an ordered list of `{ slot, prompt, useReference: true }` for the 10 slots (all reference-anchored; the pet is the hero in every one).
- **Pose discipline encoded in every prompt** (the template's central craft rule):
  - "the **same animal** as in the reference images — identical breed markings, coat color, eye color, ear shape, body proportions."
  - "**3/4 or side dynamic pose**; show motion through stride, ears, tail, and the environment — **not** by aiming the pet at the camera. **No extreme foreshortening.**"
  - The **climax leap** prompt explicitly: "a 3/4 **side** leap — full profile/silhouette visible, never a foreshortened lunge toward the camera."
  - "Any costume/prop (bandana, magnifying glass) **must not obscure the face, eyes, ears, or markings.**"
  - **Palette modifier** (distinct from Story 1's gentle grief wash): "soft warm watercolor but **dynamic** — looser, energetic brushwork, golden sunny light, bright but not garish-primary, never flat-cartoon or clipart."
- The 10 slots (the template's cover + Pages 1–9):

  | Order in book | Slot id | Beat | Pose register |
  |---|---|---|---|
  | 1 | `adventure-cover` | Hero shot (the locked anchor) | calm, 3/4, face fully visible |
  | 2 | `adventure-ordinary` | The ordinary day | calm |
  | 3 | `adventure-special` | The superpower hinted | energetic, grounded |
  | 4 | `adventure-call` | The call to adventure | alert |
  | 5 | `adventure-clue` | First clue (first motion test) | dynamic 3/4, grounded |
  | 6 | `adventure-deeper` | The expedition | trotting 3/4 |
  | 7 | `adventure-discovery` | The discovery | heroic upward 3/4 |
  | 8 | `adventure-wobble` | The wobble | coiled, about-to-act |
  | 9 | `adventure-climax` | **Save the day (THE money shot)** | **3/4 side leap — highest risk** |
  | 10 | `adventure-celebration` | The celebration | relaxed, beaming |

  > These ids are the same literals PR-A will register as `ADVENTURE_SCENE_PAGE_IDS`. Pages 10–11 + back cover are **not** slots (decorative / reuse / writing page) — see PR-A.

### 2. Approach-B orchestration, exercised by `scripts/story8-prototype.ts` (script is THROWAWAY; the loop logic carries forward)

A standalone CLI (run via `tsx`, like `render-test.ts` / `process-orders.ts`):

1. Read a test pet photo path from argv (default to a checked-in test photo under `uploads/`).
2. Generate the **locked reference illustration** once (`generateReferenceIllustration`, Low) — the consistency anchor. **Never dropped** from the reference set thereafter.
3. Run the 10 slots under **Approach B, sequentially, in risk order** (not book order):
   - **Calm/establishing first** to build a strong on-model reference bank: `cover → ordinary → special → celebration`.
   - **Then escalating action**: `call → clue → deeper → discovery → wobble`.
   - **Climax LAST**, when the most accepted references are available to anchor it — and generate it at **Medium** to test whether the tier bump holds the hardest pose.
   - Each accepted scene is appended to the reference set for the next (the `referencesForScene` Approach-B accumulation, capped at the 16-reference ceiling — a 10-slot book never approaches it).
4. Write all PNGs to `./generated/story8-proto/` and emit **`contact-sheet.html`**: the original photo + the reference + all 10 slots in a grid, each labelled, so likeness can be judged at a glance.
5. Log per-image cost-tier + total.

> **Reuse, don't fork:** if `referencesForScene` / `generateAndSaveScene` are exportable from `generate.ts` without dragging in unwanted state, the script should call them so the prototype exercises the *real* accumulation code. If they are module-private, replicate the small B-loop in the script and note that PR-A promotes the shared helper. Either way the prompts come from `story8-prompts.ts`.

### 3. `package.json`

Add `"proto:story8": "tsx --tsconfig scripts/tsconfig.json scripts/story8-prototype.ts"`.

---

## Created vs edited files (PR-0)

**Created (3):**
- `lib/ai/story8-prompts.ts` — the 10 Backyard-Mystery scene prompts + pose discipline (carries forward).
- `lib/ai/story8-prompts.test.ts` — unit test (below).
- `scripts/story8-prototype.ts` — the throwaway Approach-B runner + contact-sheet emitter.

**Edited (1, +1 optional):**
- `package.json` — `proto:story8` script.
- *(optional)* `lib/ai/generate.ts` — export `referencesForScene` / `generateAndSaveScene` **only if** the script reuses them (no behavior change to existing flows).

---

## Tests & verification

1. **`lib/ai/story8-prompts.test.ts`** — `buildStory8PrototypePrompts("scruffy brown terrier dog", style)`:
   - returns exactly **10** slots in the table order, all `useReference: true`;
   - **no surviving placeholder** (`{token}`/`[FIELD]`) in any prompt;
   - the climax prompt contains the **side-leap / no-foreshortening** instruction; every prompt contains the **same-animal / markings** anchor and the **3/4 pose** rule; none mentions a face-obscuring costume.
2. **`npm run build`**, **`npm run test:run`**, **`npx tsc --noEmit`** green.
3. **Public-boundary test** `lib/runtime/surface.boundary.test.ts` green (this PR adds nothing to the public graph).
4. **No byte-identity work needed** — no template/registry/CSS touched (note it in the PR; don't skip silently).

### The actual gate (manual, the whole point)

5. `npm run proto:story8 <test-photo>` → open `./generated/story8-proto/contact-sheet.html` and **judge likeness across all 10 slots** against the photo + reference:
   - Same markings, ear shape, eye color, coat, proportions on the **leap, the expedition, the discovery, the wobble** — not just the calm scenes.
   - The climax leap reads as the same dog (Low first; if it drifts, confirm whether Medium rescues it).
   - No costume hides the face; no foreshortened lunge.

---

## The go/no-go decision

Record the verdict in `context/current-feature.md` (and carry the durable conclusion to `context/debt.md` / the history write-up on merge):

- **GO** — likeness holds across the action set (optionally only with the climax at Medium — note that, it sets the cost floor). → proceed to **PR-A (Feature 31)**; `story8-prompts.ts` and the B-loop are kept and wrapped by the real text engine + registration.
- **NO-GO** — the hero drifts on the dynamic poses and no tier/prompt tweak rescues it within 2–3 attempts (per the "when stuck" rule). → **stop.** Delete the PR-A/PR-B spec files (31, 32) and this branch. The copy was never written, so nothing is wasted — which is the entire reason this gate exists.

> **Decision owner:** PM (Nikola), on inspection of the contact sheet. Do not self-greenlight PR-A from a partial result.

---

## References
- [context/masterstories/story-8-master-template.md](../masterstories/story-8-master-template.md) — "Pipeline fit & build notes", "Illustration & typography style guide", "Notes for the ghostwriter / reviewer" (the prototype-first instruction).
- [`lib/ai/generate.ts`](../../lib/ai/generate.ts) — `referencesForScene` (Approach-B accumulation), the Story-1 B-loop, the per-story dispatch.
- [`lib/ai/story6-prompts.ts`](../../lib/ai/story6-prompts.ts) / [`story7-prompts.ts`](../../lib/ai/story7-prompts.ts) — the prompt-builder shape to mirror.
