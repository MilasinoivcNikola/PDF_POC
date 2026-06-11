---
name: spend-guard-claim-pattern
description: How the spend guard is enforced for any code path that reaches the engine (claim-before-await) and the known two-OS-process TOCTOU residual
metadata:
  type: project
---

The repo's spend guard — generation never runs on an unpaid/unclaimed order — rests
on two things, both verified true as of PR-07 (2026-06-11):

1. **State machine (`lib/order/state.ts`).** The ONLY edge into `generating` is
   `queued → generating`; the only edges into `queued` are `paid → queued` and the
   `failed → queued` retry. No `pending_payment → *` shortcut into generation. This
   is mirrored as a CHECK constraint in the migration.
2. **Claim-before-await.** A worker/route must call `updateOrderStatus(id,
   "generating")` BEFORE the first heavy `await` (photo download, engine call). On
   `IllegalTransitionError` it must SKIP (not generate, not fail); any other claim
   error must NOT proceed to generation. Generation only ever runs after a successful
   claim. PR-07's `lib/order/worker.ts processOrder` does exactly this.

**Known residual (accepted, NOT a blocker for the batch worker):** `updateOrderStatus`
is `UPDATE … WHERE id = ?` with **no status guard** — the claim is an app-level
`assertTransition` (read-then-write), NOT a DB compare-and-swap. Within one OS process
the worker serializes (ORDER_CONCURRENCY = 1) so claims can't interleave. Across two
**separate OS processes** racing the same `queued` row, both can read `queued` and both
write `generating` → double-generation → ~$0.08 double-spend + a duplicate book. Judged
acceptable for an operator batch command run once/twice a day (the roadmap model);
documented in code; operators told not to run two `process:orders` at once. **If this
ever becomes server-triggered / concurrent (e.g. a webhook or daemon kicks generation),
re-raise it as blocking — the fix is a conditional `.eq("status","queued")` update in
the store so the claim is a real atomic compare-and-swap.**

**Verification recipe (re-run on any diff that reaches the engine):**
- Grep the new code for `updateOrderStatus(..., "generating")` and confirm it precedes
  every `await getPhoto` / `await generateAllIllustrations`.
- Confirm an `IllegalTransitionError` on the claim returns skip/no-op, never proceeds.
- Confirm no new edge was added into `generating`/`queued` in `state.ts` outside the
  paid/retry paths.

See [[operator-engine-boundary]].
