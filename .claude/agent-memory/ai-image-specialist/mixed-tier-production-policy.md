---
name: mixed-tier-production-policy
description: The locked mixed-tier production quality policy (PRODUCTION_QUALITY / qualityForPage / heroSlots) and the cover-id namespacing gap that makes the default hero tier a no-op on non-Story-1 books
metadata:
  type: project
---

The mixed-tier illustration-quality policy shipped on `feature/mixed-tier-quality`
(Milestone 17-ish). Production books no longer render a uniform tier.

**Why:** image COGS scales per order; HIGH everywhere (~$3/book) is wasteful when
only the cover + emotional bookend earn it. Mixed = HIGH hero + MEDIUM interior +
LOW reference ≈ ~$1/book. LOW stays the engine default for dev/iteration.

**How to apply:** never re-derive the tier split — use the existing surface.

- **`PRODUCTION_QUALITY`** (exported from `lib/ai/generate.ts`) =
  `{ sceneQuality: "medium", heroSceneQuality: "high", referenceQuality: "low" }`.
  The worker (`lib/order/worker.ts`) and the operator repaint route both pass this
  ONE constant, so they can't drift. Engine defaults stay LOW (a bare
  `generateAllIllustrations(session)` is all-LOW — dev path).
- **`qualityForPage(storyType, page, opts)`** is the pure per-page resolver: hero
  slot → `heroSceneQuality ?? sceneQuality ?? "low"`; interior → `sceneQuality ??
  "low"`. With `heroSceneQuality` unset it collapses to the old uniform behavior
  (back-compat — every existing test stayed green).
- **`heroSlots?: readonly PageId[]`** on `StoryDefinition` (pure data, beside
  `illustrationSlots`); read via `heroSlotsFor(storyType)` which defaults to
  `["cover"]`. Only Story 1 declares it: `["cover", "page-12"]`.

**GOTCHA — the default hero tier is a NO-OP on every non-Story-1 book (by spec).**
`heroSlotsFor` defaults to `["cover"]`, but only Story 1 (and Story 9, which reuses
Story-1 `SCENE_PAGE_IDS`) actually use the bare slot id `"cover"`. Stories 2/4/5/6/7/8
namespace their cover (`letter-cover`, `talk-cover`, `note-cover`, `tribute-cover`,
`welcome-cover`, `adventure-cover`), so `["cover"]` matches NONE of their slots —
meaning under PRODUCTION_QUALITY their covers render MEDIUM, not HIGH. The spec
("every book gets a HIGH cover for free") and the literal default disagree; I built
to the spec's literal `["cover"]` default + tests, and flagged the gap. To actually
elevate a non-Story-1 cover, that book's definition must set
`heroSlots: ["<prefix>-cover"]` — a one-line, zero-risk follow-up. The mechanism is
correct; only the per-story data is missing.

**Story-8 reconciliation:** the climax MEDIUM floor was FOLDED into the general
mechanism, not left as a parallel branch. `qualityForPage` resolves the climax
(interior, since `adventure-cover` ≠ `"cover"`), then `atLeastMedium(...)` raises it
to ≥ Medium. Dev output is byte-identical to before (all low, climax medium);
production = all medium for Story 8 (no hero match), climax stays medium. Verified
by reasoning + the full suite, not a paid run.

**Validation:** unit coverage only (1950 tests green), no paid generation — the
`-MIXED.pdf` proof already validated the visual result. `npm run build` was NOT run
(a `next dev` server for this project was live; running build corrupts `.next` — see
user auto-memory `dev-build-cache-conflict`); left for the PM to run manually.
