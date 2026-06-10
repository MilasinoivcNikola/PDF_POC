# Review Action

Check that the feature meets its goals and the code holds up before merging.

## When to run

After the feature builds and `test` / `qa` are green — the last gate before
`complete`. Can also be run on demand at any point per `context/ai-interaction.md`
("Review AI-generated code periodically and on demand").

## Steps

First, **decide scope**: does this feature's diff touch the **commerce surface** —
`lib/order/`, `lib/supabase/`, `supabase/migrations/`, `lib/catalog/`, or any
payment / webhook / checkout / delivery / admin-auth route? If yes, the
`commerce-security-reviewer` joins this run (step 3). If no (a POC-only change —
typography, preview, wizard, the engine), skip it.

Dispatch the review agents **in parallel** (all Agent calls in one message) — they
read the same diff but judge different things, so there's no dependency.

1. **Dispatch the `code-reviewer` agent** via the Agent tool
   (`subagent_type: code-reviewer`). Brief it with the feature Goals/Notes. It
   will:
   - Delegate to the built-in **`/code-review`** skill at default effort (never
     `ultra` — that's billed and user-triggered).
   - Check the diff for correctness, security (no committed secrets; input
     validation), performance (re-renders, redundant API calls, image caching),
     edge cases (sparse inputs, merge-field/pronoun consistency), and consistency
     with existing patterns.
   - Confirm the changes actually satisfy the feature's stated goals.
2. **Dispatch the `context-auditor` agent** via the Agent tool
   (`subagent_type: context-auditor`). Brief it with the feature Goals/Notes. It
   checks the diff against the standing context docs (`CLAUDE.md`,
   `context/*.md`, `commerce-roadmap.md` / `context/features/*`, `masterstories/*`)
   and flags where the branch **contradicted** a doc (e.g. a provider the roadmap
   rejected, a "no database" rule the code now breaks) or **outgrew** one (a new
   env var, route, convention, or order-state transition no doc records yet). It
   respects supersession (build against the newest decision doc — the commerce
   roadmap supersedes the old plan's "out of scope" lines) and returns
   **IN SYNC** or **DRIFT FOUND** with a recommended resolution *direction* per
   finding. It is read-only — it does not rewrite the docs.
3. **Dispatch the `commerce-security-reviewer` agent** — *only if the scope check
   above flagged a commerce-surface change* (`subagent_type:
   commerce-security-reviewer`). Brief it with the feature Goals/Notes. It will:
   - Delegate to the built-in **`/security-review`** skill over the pending diff.
   - Apply the commerce threat model the generic reviewer doesn't carry: the order
     state machine's **spend guard** (no generation on an unpaid order, no
     double-spend race), Lemon Squeezy **webhook** signature + idempotency, the
     Supabase **service-role / RLS boundary** (server-only key, default-deny),
     **IDOR** on order / photo / PDF / delivery-token lookups, and **PII / secret**
     handling.
   - Return **PASS** or **CHANGES NEEDED**. For a POC-only feature it is not
     dispatched at all.
4. **Relay the verdicts** to Nikola:
   - Code review: **PASS** or **CHANGES NEEDED**, blocking issues first (with
     `file:line`), then nice-to-haves. Frame the call in business/user terms where
     it matters (e.g. "this blocks the preview moment for the parent persona").
   - Commerce security *(only when it ran)*: **PASS** or **CHANGES NEEDED**,
     blocking issues first (with `file:line` + the money/data impact in plain
     terms — e.g. "this lets an unpaid order reach generation" or "this PDF is
     reachable by guessing an order id"). Omit this line for POC-only features.
   - Context audit: **IN SYNC** or **DRIFT FOUND**, with each drift as
     `doc:line` → says / reality / recommended direction. For drift, **lead with a
     recommendation** (update which doc, or fix the code) — these are
     product-owned decisions, so make the call easy for Nikola, don't just list.

## Guardrails

- All review agents are read-only. If `code-reviewer` **or**
  `commerce-security-reviewer` finds blocking issues, loop back to `start` / the
  specialist to fix, then re-review — don't `complete` over open blockers. A
  commerce-security blocker is **hard-gating**: never `complete` a feature that can
  spend on an unpaid order, leak a customer's data, or trust an unverified webhook.
- **Resolve doc drift on this branch, before `complete`.** Per
  `context/coding-standards.md` ("fix the code or fix this doc in the same PR —
  never let them drift"), a **DRIFT FOUND** verdict is a soft gate: apply the
  agreed fix (edit the doc on the main thread, or route a code fix back to the
  specialist) so the same commit carries it. Don't defer it to a future cleanup —
  that's how the context files rot. Only `complete` once the docs tell the truth
  again (or Nikola explicitly accepts the drift as intentional).
- The auditor recommends a *direction*; it never edits docs itself. Doc edits are
  a deliberate main-thread action so Nikola stays in the loop on changes to
  product-decision files.
