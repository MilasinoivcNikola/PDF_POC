# Fix: Story-8 climax Low-vs-Medium tier check (resolve `STORY8_MEDIUM_SLOT`)

> Pays down the **low**-severity debt row *"Story 8 cost floor — climax Low-vs-Medium
> comparison unrun"* (`context/debt.md`). A near-$0 experiment that either confirms or
> removes a per-slot cost bump. Tier-3.

## Background

Story 8 ("The Amazing Adventures…") runs Approach B and pins one slot —
`adventure-climax`, the highest-drift side-leap pose — to **Medium** while every other
slot stays Low:

- `lib/ai/generate.ts:1256` — `const STORY8_MEDIUM_SLOT: Story8PageId = "adventure-climax";`
- applied via `atLeastMedium()` at `generate.ts:1387` and `:1802` (full-book + repaint).

PR-0's go/no-go gate (feature 30) returned **GO with the climax rendered at Medium —
only Medium was ever tested.** PR-A (feature 31) then shipped Medium as the locked
per-slot default **without running the Low-vs-Medium comparison.** The `story-samples-08`
PR confirmed Approach B self-selects by `storyType` and generates all 10 slots cleanly at
`PRODUCTION_QUALITY` (climax floored to Medium), closing the *other* half of the original
trigger. **Still unrun:** the one-image Low-vs-Medium climax comparison. Medium remains
locked without proof Low would hold.

This matters only for COGS: under the mixed `PRODUCTION_QUALITY` policy the climax already
renders at HIGH/MEDIUM as a hero/interior anyway in production, so the `STORY8_MEDIUM_SLOT`
floor mostly bites the **all-Low dev path** and any future Low-tier sample/repaint. The
upside is a cleaner engine (drop a special-case constant) if Low holds.

## Decision

Run the single deferred experiment, then act on the result:

1. **Render the climax once at Low and once at Medium** from the committed Story-8 corgi
   fixture (`fixtures/sample-story8-dog.json`) — the same pet the catalog sample uses, so
   the comparison is against a known-good Medium reference. Cost ≈ one Low + one Medium
   image (well under $0.05). Reuse the existing Approach-B path; no new harness if the
   sample/proto script can target a single slot, otherwise a throwaway one-slot runner
   (kept like `scripts/story8-prototype.ts`).
2. **PM judges likeness** on the climax leap (the #1 Story-8 quality gate is per-scene
   likeness on the high-drift pose).
   - **If Low holds:** drop `STORY8_MEDIUM_SLOT` to Low — i.e. delete the constant and the
     two `atLeastMedium()` call sites (`generate.ts:1387`, `:1802`), removing the special
     case. Update the Story-8 cost-floor comments/docs and the debt row.
   - **If Low drifts:** keep Medium locked; record the comparison verdict in the history
     entry so the question is closed, and remove the debt row as *resolved (Medium
     confirmed)*.

## Constraints

- This is an **AI-illustration** change (`lib/ai/`) — engine/operator surface only; no
  public-graph or catalog touch, boundary test unaffected.
- If the constant is removed, the Story-8 imagery tests
  (`lib/ai/generate.story8*.test.ts`, if present) that assert the climax floor must be
  updated to assert the uniform-Low behavior. Grep for `STORY8_MEDIUM_SLOT` /
  `adventure-climax` / `atLeastMedium` in tests before editing.
- Mind `gpt-image-2` rate limits (memory: ~20 images/min Tier 2) — trivial here (2 images).

## Verification

- The two rendered climax images, compared side-by-side (attach to the history entry).
- `npm run test:run` + `npm run build` pass after whichever branch is taken.
- The debt row is removed (note which way it resolved in the feature's history entry).

## Why it's worth doing now

Cheap, closes a lingering "we never checked" question, and — if Low holds — deletes a
special-case from the hottest illustration path. If it stays Medium, we at least have the
evidence on record instead of an untested assumption.
