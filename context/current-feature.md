# Current Feature

## Status

In Progress — branch `feature/lean-context-system`. All four threads implemented (history tiered to 39 archive files + lean index, byte-identical reconstruction verified; `CLAUDE.md` `@`-loads trimmed; coding-standards prose pointed at tests; `debt.md` seeded; `ai-interaction.md` step 10 + README rows 27/28 updated). Next: `review` (context-auditor gate).

## Goals

**Feature 27 — Lean the Context System** (docs-only; zero information loss). Spec: `context/features/27-lean-context-system.md`. Owner: main thread. Verified by `context-auditor`. Branch: `feature/lean-context-system`.

Make the standing context cheaper and less drift-prone, four threads:

1. **Tier `history.md`** — lean one-line-per-entry index stays loaded at `context/history.md`; full multi-paragraph entries move **verbatim** to `context/history/` (one file per entry, `YYYY-MM-DD-slug.md`), loaded on demand. Every entry relocated, never deleted.
2. **Trim the `@`-load set in `CLAUDE.md`** — keep the 5 live docs `@`-loaded (`coding-standards`, `ai-interaction`, `commerce-roadmap`, `current-feature`, `history`); demote heavy/stale inlines (4 `prototypes/*.html`, `saying-goodbye-to-otis.pdf`, completed-story masterstories 1/2/3) from `@`-load to plain path mentions with a "load on demand" note.
3. **Tests as source of truth** — where an invariant is enforced by a test, the doc points to the test in one line instead of re-describing it. Keep the *why/decision*; defer the *what-it-verifies* to the executable. Targets: Deploy-surface boundary block, order state-machine prose, byte-identity rule.
4. **Debt ledger** — new `context/debt.md` (table: item · area/files · why-deferred · severity · flips-to-blocking-when), seeded from `history.md` carry-forwards; `ai-interaction.md` step 10 names it as the home for durable deferrals.

## Notes

**In scope (edited):** `context/history.md`, `CLAUDE.md`, `context/coding-standards.md`, `context/ai-interaction.md`, `context/features/README.md`. **New:** `context/history/` (one file per entry), `context/debt.md`.

**Out of scope:** any code change (no `lib/`/`app/`/`components/`/tests/config); reprogramming the `/feature` skill (ledger wired by convention only); deleting/rewording any decision or rationale (relocate + de-duplicate only); `local-prototype-plan.md` (leave as historical/superseded).

**Key decisions:**
- Information-preserving by construction — entries *moved* not summarized; prose trimmed only where a named test already guarantees the claim. Audit gate: "could a fresh agent still reach every fact?"
- Loaded every session: lean `history.md` index + 5 live docs. On-demand (path only): prototypes, sample PDF, completed-story masterstories, full history archive. The in-progress story's masterstory stays `@`-loaded while its milestone is active.
- Lowest-churn split: one archive file per history entry (not per-milestone bundles).

**Debt-ledger seed items** (harvest from `history.md`): grief-counselor copy review; `cleanOptional`/`appendOptionalLines` 4-way consolidation; `render:test` Story-1-filename quirk; reused-route operator-auth boundary; worker two-process claim race; `failed→queued` full re-spend; AI-honesty disclosure copy; privacy policy; LS store setup; live Resend/LS test-mode runs; `STYLE_PHRASE` map copies; download-meta hardcoded size; alternate print sizes; warm Puppeteer pool; Stories 2+5 bundle; Story-6 love-page unused slots.

**Done when:** history tiered (diff the concatenation = no text lost); `CLAUDE.md` no longer `@`-loads prototypes/PDF/completed masterstories; targeted coding-standards blocks point to their test in one line with rationale retained; `debt.md` exists + `ai-interaction.md` step 10 names it; README lists 27 + 28; `npm run build` + `npm run test:run` + `npx tsc --noEmit` pass **unchanged** (boundary test still green).

**Gate:** `context-auditor` is the verification gate (zero info loss, trimmed claims still test-enforced, no doc an active feature needs got dropped). No `test-author`, no `qa`.
