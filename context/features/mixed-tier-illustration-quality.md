# Feature Spec — Mixed-Tier Illustration Quality (HIGH bookends + MEDIUM interiors)

> **Status:** Drafted, awaiting sign-off (not started).
> **Branch (proposed):** `feature/mixed-tier-quality`
> **Scope:** Single PR. A per-page quality policy + the locked production tier for all books.

---

## Goal

Lock the image-quality tier used for **all production book generation** to a **mixed
strategy**: render the **hero pages** (the cover, and for Story 1 the closing page) at the
**HIGH** tier, and all **interior pages** at **MEDIUM**. This was chosen on a real
three-way side-by-side comparison (`output/Saying-Goodbye-to-Bo{,-MEDIUM,-LOW}.pdf` plus the
`-MIXED.pdf` proof) — HIGH's resolution edge is visible, but only worth paying for on the
pages a customer fixates on (the cover they screenshot/share, the emotional closing).

The result: customers get HIGH fidelity exactly where it shows most, at **~$1/book** instead
of ~$3 all-HIGH — while the cheap LOW default stays available for prompt iteration / dev.

## Why (business framing)

- **Margin lever.** Illustration cost is per-book COGS that scales with every order. On a
  $20–40 made-to-order product, the mixed tier costs **~$0.30/book more than all-MEDIUM** and
  **~$2/book less than all-HIGH** — fidelity where it's seen, frugality where it isn't.
- **The cover is the storefront's hero image and the most-shared asset; the closing page is
  the emotional payoff.** Those two earn HIGH. The 11 interior pages do not.
- The cost-tier rule in `coding-standards.md` already sanctions this ("medium/high are
  deliberate opt-in overrides for higher fidelity (e.g. final/cover renders)") — this feature
  makes that intent a concrete, per-story policy instead of an all-or-nothing flag.

---

## Engine facts this spec relies on (verified)

- Quality is passed **per scene call** — `generateAndSaveScene(session, page, prompt, refs,
  sceneQuality)` (`lib/ai/generate.ts:371`). So varying tier by page is natural, not a rework.
- **There is already a per-page-tier precedent:** Story 8 bumps just its climax slot to
  MEDIUM inside an otherwise-LOW book — `const quality = page === STORY8_MEDIUM_SLOT ?
  "medium" : sceneQuality;` (`generate.ts:1194`). This spec **generalizes that exact pattern**
  into a registry-driven hero-slot policy.
- Every story path independently resolves `sceneQuality = options.sceneQuality ?? "low"` —
  **7 sites**: Story 1 A/C + B (`:450`), Story 2 (`:599`), Story 4 (`:675`), Story 5 (`:753`),
  Story 6 (`:834`), Story 7 (`:970`), Story 8 (`:1132`). Each then calls `generateAndSaveScene`
  (or its per-story clone) with that single tier. These are the wiring sites.
- **Production path:** the batch worker calls `generateAllIllustrations(session)` with **no
  options** → all LOW today (`lib/order/worker.ts:313`). This is the one call that must carry
  the new production policy.
- **Single-page repaint:** `regenerateSceneIllustration(session, page)` (`generate.ts:1247`,
  dispatched per story) currently defaults LOW (`:1265`). A repainted hero page must come back
  at its production tier (HIGH), not LOW — so the same per-page policy must reach this path.
- `StoryDefinition` (`lib/story/registry.ts:100`) carries `illustrationSlots: readonly
  PageId[]` and is **pure / client-safe** (the public storefront imports the registry chain).
  A new hero-slot field is also pure `PageId[]` data — safe to add, no `lib/ai/*` import.
- Existing committed storefront samples (`public/samples/story-1-book/`) are **untouched** —
  this changes only *future* generations. The PDF template byte-identity rule is unaffected
  (it governs the template, not which image tier fills a slot).

---

## Design

### 1. Hero slots — registry data (`lib/story/registry.ts`)
Add an **optional** field to `StoryDefinition`:

```ts
/** Page slots rendered at the elevated "hero" tier (cover + any emotional bookend).
 *  Defaults to ["cover"] when omitted — every book's cover is its storefront hero. */
heroSlots?: readonly PageId[];
```

- **Default (helper, not per-story duplication):** a `heroSlotsFor(storyType)` returns
  `definition.heroSlots ?? ["cover"]`. So **every** book gets a HIGH cover for free.
- **Story 1** sets `heroSlots: ["cover", "page-12"]` (cover + the closing scene; the back
  cover is text-only, not a slot).
- Other stories: **cover-only** by default (no change to their files). Per-title bookend
  tuning (e.g. a letter title's hero page) is a later, trivial follow-up — out of scope here.
- Stays pure/client-safe (data only); the boundary test must stay green.

### 2. Per-page tier resolution — pure helper (`lib/ai/generate.ts`, near the Story-8 precedent)
```ts
function qualityForPage(storyType, page, opts): Quality
// hero page  → opts.heroSceneQuality ?? opts.sceneQuality ?? "low"
// interior   → opts.sceneQuality ?? "low"
```
Replace the single `sceneQuality` passed to each `generateAndSaveScene` (and the per-story
`generateAndSave<Story>Scene` clones) with `qualityForPage(storyType, page, options)` at all
7 paths. **Backward compatible:** with `heroSceneQuality` unset, every page falls back to
`sceneQuality` — i.e. today's uniform behavior, so existing callers/tests are unaffected.

### 3. `GenerateOptions` (`lib/ai/generate.ts:262`)
Add `heroSceneQuality?: Quality` ("Quality tier for hero slots — cover + emotional bookends.
Falls back to `sceneQuality` when unset, preserving uniform-tier behavior."). `sceneQuality`
keeps its meaning but is now specifically the **interior** tier.

### 4. The locked production policy — passed explicitly by the worker
`lib/order/worker.ts:313` changes from `generateAllIllustrations(session)` to:
```ts
generateAllIllustrations(session, {
  sceneQuality: "medium",      // interiors
  heroSceneQuality: "high",    // cover + bookends
  referenceQuality: "low",     // never printed (see open decision B)
})
```
**Engine defaults stay LOW** (dev/prototype iteration stays cheap — the cost-tier rule's "low
is default for iterating on prompts" is preserved). Production is **explicit**, matching the
existing pattern where higher tiers are a deliberate opt-in. Update the worker's tier comments
(`:255`, `:307`).

### 5. Single-page repaint parity (`regenerateSceneIllustration`)
The repaint path must apply the same production policy so an operator re-painting the cover
gets HIGH back, not LOW. Thread the production tiers into `regenerateSceneIllustration` (it
already takes `Pick<GenerateOptions,"sceneQuality">`; widen to include `heroSceneQuality`, and
have the operator route at `app/(operator)/api/regenerate-illustration/route.ts:98` pass the
same policy constant the worker uses). **Factor the production policy into one shared
constant** (e.g. `PRODUCTION_QUALITY` in `lib/ai/generate.ts`) so the worker and the repaint
route can't drift.

### 6. Story 8 reconciliation
Story 8's existing climax-at-MEDIUM special-case (`:1194`) must not regress. Fold it into the
general mechanism (its climax becomes effectively a hero/elevated slot) **or** leave its local
logic intact and confirm the general path doesn't double-apply. Pick whichever keeps Story 8's
current output behavior; call it out in the PR.

---

## Cost (per book, Story 1, ~14 images, portrait)

| Strategy | ~Cost/book | At 500 books/yr |
|----------|-----------|-----------------|
| All HIGH | ~$3.00 | ~$1,500 |
| **Mixed (2 HIGH + 11 MEDIUM + LOW ref)** | **~$1.00** | **~$500** |
| All MEDIUM | ~$0.70 | ~$350 |
| All LOW (today's default) | ~$0.07 | ~$35 |

Per-image (portrait, approx, from the comparison runs): HIGH ~$0.21, MEDIUM ~$0.05,
LOW ~$0.005. Mixed Story 1 = 2×HIGH ($0.42) + 11×MEDIUM ($0.55) + 1×LOW ref ≈ **~$1.00**.

---

## Tests / build

- **Pure helper unit tests** (`lib/ai/generate.test.ts` or a colocated test): `qualityForPage`
  matrix — hero page → `heroSceneQuality` (falls back to `sceneQuality`, then `"low"`);
  interior → `sceneQuality` (then `"low"`); covers "no options → all low" (back-compat).
- **Registry test:** `heroSlotsFor` returns `["cover"]` by default and `["cover","page-12"]`
  for Story 1.
- **Boundary test** (`lib/runtime/surface.boundary.test.ts`) stays green — `heroSlots` is pure
  data, no new public-graph import.
- **Worker test** (`lib/order/worker.test.ts`) — assert the worker invokes
  `generateAllIllustrations` with the production policy (medium / high / low), not bare.
- No paid run required to ship: the policy + resolution are unit-covered, and the `-MIXED.pdf`
  proof already validated the visual result. (An optional one-time confirmation render of a
  *freshly* mixed-generated book — vs the composed proof — can be done with the throwaway
  `story1-tier-compare.ts`-style harness if the PM wants belt-and-suspenders; not a gate.)
- `npm run test:run` + `npm run build` must pass.

---

## Docs to update (in-branch)

- `context/coding-standards.md` — the AI-illustration cost-tier rule: state the **production
  policy** explicitly (interiors MEDIUM, hero slots HIGH, reference LOW; LOW remains the engine
  default for dev/iteration). Note the registry's `heroSlots` field beside `illustrationSlots`.
- `context/new-book-playbook.md` — add `heroSlots` to the registry-entry step (optional;
  defaults to cover-only) so new-book authors know how to elevate a title's bookend.
- `context/commerce-roadmap.md` — if it states a per-book cost anywhere, reconcile to ~$1.

---

## Open decisions for the PM (resolve before/at implementation)

- **B — reference tier in production.** Recommended **LOW** (the reference is never printed;
  it only anchors the pet's look, and consistency held at low historically). MEDIUM is the
  fallback if a mixed run shows the pet drifting. *Default in this spec: LOW.*
- **C — hero slots for the other 7 titles.** This spec ships **cover-only HIGH** for every
  non-Story-1 title (universal, safe) and Story 1's cover+closing. Do you want specific bookend
  pages elevated on any other title now, or tune later? *Default: cover-only for the rest.*
- **A — confirm "closing" = `page-12`** for Story 1 (the last narrative scene; back cover is
  text-only). *Default: yes.*

## Out of scope / deferred

- Making tier a per-order or wizard-selectable option (it's a fixed product policy).
- Re-running/replacing the existing committed `story-1-book` storefront samples (separate
  decision; those HIGH samples already exist).
- Per-title bookend authoring for stories 2/4/5/6/7/8/9 beyond the cover default.
