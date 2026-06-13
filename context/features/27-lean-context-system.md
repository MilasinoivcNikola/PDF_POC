# 27 — Lean the Context System (history tiering · tests-as-truth · debt ledger)

> **Craft Area:** — (dev-process / docs) · **Owner:** main thread · **verified by** `context-auditor`
> **Milestone:** — (dev-process & tooling) · **Depends on:** — (touches only `context/*.md` + `CLAUDE.md`)
> **Branch:** `feature/lean-context-system`

## Status

Not Started

## Goals

A **docs-only** pass that makes the standing context cheaper and less drift-prone, with **zero** information loss. Three threads, one coherent concern — shrink what every session/agent loads, stop prose from duplicating what tests already guarantee, and give deferred work a durable home.

1. **Tier `history.md`** — a terse one-line-per-entry changelog stays at `context/history.md` (loaded); the full multi-paragraph entries move verbatim to `context/history/` (loaded on demand). Monotonic growth stops taxing every session.
2. **Trim the always-loaded set in `CLAUDE.md`** — keep the live docs `@`-referenced (`coding-standards`, `ai-interaction`, `commerce-roadmap`, `current-feature`, `history`); demote the heavy/stale inlines (the 4 `prototypes/*.html`, `saying-goodbye-to-otis.pdf`, and the completed-story masterstories) from `@`-load to plain path mentions — still discoverable, no longer auto-loaded.
3. **Tests as source of truth** — where an invariant is enforced by a test, the doc points to the test in one line instead of re-describing what it checks. The *why/decision* stays; the *what-it-verifies* defers to the executable.
4. **Debt ledger** — a new `context/debt.md`, seeded by harvesting the "carried forward / not a blocker" notes scattered across `history.md`, plus a documented convention that `/feature complete` appends to it.

## Scope

**In scope**
- `context/history.md` → rewritten as a lean index: one line per entry (`YYYY-MM-DD — title — branch (sha) — one-clause hook → link`), grouped by milestone. **Every** existing full entry is **relocated, never deleted**.
- `context/history/` (new dir) — one file per relocated entry, `YYYY-MM-DD-slug.md`, full text byte-preserved from the current `history.md`.
- `CLAUDE.md` — demote `@prototypes/*.html`, `@context/saying-goodbye-to-otis.pdf`, and the **completed** `@context/masterstories/story-{1,2,3}-master-template.md` from `@`-load to plain backtick-free path references (keep a one-line "load on demand when building/altering that surface" note). Leave the active-development docs `@`-loaded.
- `context/coding-standards.md` — collapse the prose that **restates a test's checks** into a one-line pointer + intent. Primary targets: the *Deploy-surface boundary* block (→ `lib/runtime/surface.boundary.test.ts` + `all-operator-routes-gate.test.ts`), the order state-machine prose (→ `lib/order/state.test.ts` / `lib/order/state.ts`), and the byte-identity rule (→ the story-template tests). Keep every rationale/decision that is **not** captured by a test.
- `context/debt.md` (new) — a triageable ledger (table: item · area/files · why-deferred · severity · flips-to-blocking-when). Seeded from `history.md` carry-forwards (grief-counselor copy review; `cleanOptional`/`appendOptionalLines` 4-way consolidation; `render:test` Story-1-filename quirk; reused-route operator-auth boundary; worker two-process claim race; `failed→queued` full re-spend; AI-honesty disclosure copy; privacy policy; LS store setup; live Resend/LS test-mode runs; `STYLE_PHRASE` map copies; download-meta hardcoded size; alternate print sizes; warm Puppeteer pool; Stories 2+5 bundle).
- `context/ai-interaction.md` — add to the Workflow (step 10 / "Complete"): durable deferrals go in `context/debt.md`, not buried in a history entry.
- `context/features/README.md` — add rows 27 + 28 to the backlog table.

**Out of scope**
- **Any code change.** No `lib/`, `app/`, `components/`, tests, or config touched — gates pass because nothing executable moved.
- Reprogramming the `/feature` skill itself (the ledger is wired by *convention* in `ai-interaction.md`; auto-appending from the skill is a separate, optional follow-up).
- Deleting or rewording any decision/rationale. This pass **relocates and de-duplicates**; it never drops content.
- `local-prototype-plan.md` (already correctly marked superseded by `commerce-roadmap.md` — leave as historical).

## Implementation notes

**Key decisions**
- **Information-preserving by construction.** History entries are *moved*, not summarized; coding-standards prose is only trimmed where a named test already guarantees the claim. The audit gate is "could a fresh agent still reach every fact?" — yes, via the index line or the test.
- **What stays loaded vs. on-demand.** Loaded every session: the lean `history.md` index + the five live docs. On-demand (path only): prototypes, the sample PDF, completed-story masterstories, and the full history archive. The in-progress story's masterstory stays `@`-loaded while that milestone is active.
- **Lowest-churn split.** One archive file per history entry (not per-milestone bundles) so a future entry is a new file + one index line — no rewriting a growing archive file.

**Files**
- New: `context/history/` (one file per entry) · `context/debt.md`
- Edited: `context/history.md` · `CLAUDE.md` · `context/coding-standards.md` · `context/ai-interaction.md` · `context/features/README.md`

## References

- @context/ai-interaction.md — the workflow + "fix the doc in the same PR, never let it drift" discipline this pass serves.
- @context/coding-standards.md — the "when a rule and reality disagree, fix one" single-source rule; the prose blocks to point at tests.
- @CLAUDE.md — the `@`-load list to trim.

## Done when

- [ ] `context/history.md` is a one-line-per-entry index; every full entry exists verbatim under `context/history/`; no entry text lost (diff the concatenation).
- [ ] `CLAUDE.md` no longer `@`-loads the prototypes, the sample PDF, or the completed-story masterstories — they remain referenced by path.
- [ ] The targeted `coding-standards.md` blocks point to their enforcing test in one line, with all decisions/rationale retained.
- [ ] `context/debt.md` exists, seeded from the history carry-forwards; `ai-interaction.md` step 10 names it.
- [ ] README backlog lists 27 + 28.
- [ ] `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass **unchanged** (no code touched); the public-boundary test still passes.

## Tests

- **No `test-author`.** Docs/process only — nothing executable changes.
- **`context-auditor` is the gate:** verify zero information loss (every relocated entry reachable, every trimmed claim still enforced by the cited test, no decision dropped) and that the trimmed `@`-load set didn't remove a doc an active feature needs.
- **No `qa`** — nothing user-facing renders.
