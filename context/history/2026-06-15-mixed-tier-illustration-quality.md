## 2026-06-15 — Mixed-Tier Illustration Quality (HIGH hero slots + MEDIUM interiors)

**Branch:** `feature/mixed-tier-quality` (47594e8, merge 19f1e23) — single PR.
**Spec:** `context/features/mixed-tier-illustration-quality.md`. **Craft Area 2** (ai-image-specialist).

### What & why

Locked **production** book generation to a **mixed image-quality policy**: the **hero pages**
render at the **HIGH** tier, all **interior pages** at **MEDIUM**, and the pet reference at
**LOW**. Hero pages = every title's **cover** (the storefront's most-shared asset) plus, for
Story 1, the **closing `page-12`** (the emotional bookend). **LOW stays the engine default**, so
prompt iteration and dev/prototype runs stay cheap — production tiers are passed *explicitly*,
matching the existing "medium/high are deliberate opt-in overrides" rule in `coding-standards.md`.

The margin lever: on a $20–40 made-to-order product, illustration is per-book COGS. The mixed
tier lands at **~$1/book** (2×HIGH + 11×MEDIUM + 1×LOW ref for Story 1) versus **~$3 all-HIGH** —
fidelity exactly where a customer fixates, frugality on the 11 interior pages where the HIGH
resolution edge isn't worth paying for. Chosen off a real three-way side-by-side
(`Saying-Goodbye-to-Bo{,-MEDIUM,-LOW}.pdf` + the `-MIXED.pdf` proof). Generalizes the existing
Story-8 climax-at-MEDIUM precedent into a registry-driven, per-page policy.

### Implementation summary

- **Registry (`lib/story/registry.ts`)** — added an optional `heroSlots?: readonly PageId[]` to
  `StoryDefinition` (pure data, no `lib/ai/*` import — the public storefront imports this chain)
  + a `heroSlotsFor(storyType)` helper. **Story 1** sets `heroSlots: ["cover", "page-12"]`; every
  other title is left undeclared.
- **Universal-cover fix (caught in review of the agent's build).** The spec's literal default
  `["cover"]` only matched Story 1 — every other title namespaces its cover (`letter-cover`,
  `baby-cover`, …), so their covers would have silently rendered MEDIUM, defeating the spec's
  stated intent that *every* book gets a HIGH cover. `heroSlotsFor` defaults instead to the
  title's own cover = **`illustrationSlots[0]`** (verified to be the cover for all 8 stories), so
  every cover is HIGH for free with zero per-title data.
- **Engine (`lib/ai/generate.ts`)** — new `heroSceneQuality?: Quality` on `GenerateOptions`
  (`sceneQuality` now specifically the interior tier); an exported `PRODUCTION_QUALITY` constant
  (`{ sceneQuality: "medium", heroSceneQuality: "high", referenceQuality: "low" }`); and a pure
  `qualityForPage(storyType, page, opts)` (hero → `heroSceneQuality ?? sceneQuality ?? "low"`;
  interior → `sceneQuality ?? "low"`). Wired at all **7** per-story sites (Story 1 A/C + B, 2, 4,
  5, 6, 7, 8) and the repaint path. **Back-compatible:** with `heroSceneQuality` unset every page
  collapses to today's uniform `sceneQuality` behavior.
- **Worker + repaint parity** — `lib/order/worker.ts` passes `PRODUCTION_QUALITY` to
  `generateAllIllustrations`; the operator repaint route
  (`app/(operator)/api/regenerate-illustration/route.ts`) and `regenerateSceneIllustration` pass
  the **same shared constant**, so a re-painted hero page comes back HIGH and the two paths can't
  drift. Engine defaults stay LOW.
- **Story 8 reconciliation** — the existing climax-at-MEDIUM special-case was **folded** into the
  general mechanism via a tiny `atLeastMedium()` floor (Low→Medium, Medium→Medium, High→High)
  rather than a parallel branch. Dev output (all-LOW book, climax→Medium) is byte-identical;
  production renders Story 8 all-MEDIUM with the climax floor satisfied.
- **Docs** — `coding-standards.md` (states the locked production policy + the `heroSlots` field
  beside `illustrationSlots`), `new-book-playbook.md` (the `heroSlots` registry-entry step;
  Step-6 sample wording narrowed to "LOW is the default *for sample generation*", reconciled
  against the new production policy — a context-audit catch), `commerce-roadmap.md` (per-book
  COGS reconciled to ~$1).

### Tests / verification

- New/updated unit coverage: `qualityForPage` matrix (hero/interior fallbacks + "no options → all
  low" back-compat), `heroSlotsFor` defaults (title's own cover; Story 1 cover+closing), worker
  asserts it invokes `generateAllIllustrations` with the production policy, operator route
  forwards `PRODUCTION_QUALITY`. The boundary test stays green (`heroSlots` is pure data).
- **1951 unit tests pass; `npm run build` passes.** No paid AI run — ships on unit coverage + the
  existing `-MIXED.pdf` proof, per spec. Cache key (`promptHash`+`referenceHash`, quality not
  keyed) and the committed Story-1 storefront samples are untouched.

### Review

- **code-reviewer:** PASS — all 7 sites correct, no double-apply, Story 8 behavior preserved,
  `illustrationSlots[0]` confirmed as cover for every story, back-compat holds, registry stays
  client-safe.
- **commerce-security-reviewer:** PASS — no new attack surface; the repaint route's
  `assertOperator()` gate + input validation unchanged; `PRODUCTION_QUALITY` is a hardcoded
  constant (not caller-controlled); spend guard intact (change alters *tier*, never *whether* the
  worker generates).
- **context-auditor:** one drift found and fixed (the `new-book-playbook.md` "LOW is default for
  real book runs" line, now narrowed to sample generation).

### Notes / non-blockers

- Open spec decisions A/B/C all taken at their documented defaults: reference tier LOW,
  other-titles cover-only HIGH, Story-1 closing = `page-12`.
- Pre-existing (not introduced here): `generateAllIllustrations` has no `story-9` dispatch branch
  (story-9 sessions fall through to the Story-1 shared path). The `qualityForPage("story-9", …)`
  pure path is self-consistent; the cover-HIGH path for story-9 gets exercised end-to-end only
  when story-9 generation is wired through `generateAllIllustrations` later.
- The throwaway comparison harnesses (`scripts/story1-mixed-compose.ts`,
  `scripts/story1-tier-compare.ts`) that produced the `-MIXED.pdf` proof were kept, like
  `scripts/story8-prototype.ts` / `story1-high-run.ts`. Fixed a pre-existing build-breaker in the
  former (it imported `GeneratedImage` from `@/lib/ai/generate`; the type lives in
  `@/lib/session/types`).
