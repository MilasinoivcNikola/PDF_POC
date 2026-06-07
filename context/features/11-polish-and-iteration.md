# 11 — Polish & Iteration (Backlog)

> **Craft Area:** mixed · **Owner agents:** all three, per item
> **Milestone:** 6 (open-ended) · **Depends on:** 10 (working end-to-end prototype)
> **Branch:** one `feature/<slug>` **per item** — do not batch.

## Status

Not Started

## Goals

- Improve the craft now that the full loop works. This is a **menu, not a single feature** — pull one item at a time into `current-feature.md` via `/feature load`, give it its own branch, ship it, repeat.
- Each item should leave the app still building, tested, and on-brand.

## Candidate items (pick individually)

**Pet consistency (Craft Area 2 · `ai-image-specialist`)**
- Run Approach B (accumulating references) and Approach C (photo-only) against Approach A on a drift-prone pet; record which wins and make the best the default.
- Tune style-prompt phrasing ("soft watercolor" vs "children's-book watercolor", etc.) at Low tier; lock the winners.
- Add High-tier rendering for the cover/final illustration only.

**PDF / typography (Craft Area 1 · `pdf-render-specialist`)**
- Typography pass: fonts, line-heights, page layouts; drop caps, page borders, decorative dividers.
- Offer alternate print sizes (8×8" square, A4) behind a toggle.
- Optimize Puppeteer (reuse a warm browser; image pre-sizing for faster, smaller PDFs).

**UX / flow (Craft Area 3 · `nextjs-ui-builder`)**
- "Regenerate this page" polish (loading state, undo to previous image).
- Load a saved session from `./sessions/` to revisit/re-download a past book.
- Generate the same book in two illustration styles and compare side by side.
- Low-quality-photo warning refinement; nicer empty/error states.

## Scope discipline

**In scope (per pulled item)**
- The single chosen improvement, fully shipped (build + tests + qa + history log).

**Out of scope**
- Anything in the plan's "Things explicitly out of scope": payments, accounts, database, deployment, Stories 2/3, bulk generation, admin, email, i18n, mobile.
- Bundling multiple polish items into one branch/commit.

## Implementation notes

- Treat each item as a normal feature: `/feature load` a one-paragraph version of the item into `current-feature.md`, then `start` → `test`/`qa` → `review` → `complete`.
- Keep changes minimal and pattern-preserving (per `ai-interaction.md`); these are refinements, not rewrites.
- Log each shipped item in `context/history.md`.

## References

- @context/local-prototype-plan.md — "Milestone 6 — Polish and iteration" and "Open technical questions to resolve as you build".
- @context/masterstories/story-1-master-template.md — illustration style guide + quality bar (the bar polish should raise toward).

## Done when

- N/A as a whole — this feature is never "done". Each pulled item has its own `Done when` defined at `load` time and lands as its own branch/commit.
