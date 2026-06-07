# Review Action

Check that the feature meets its goals and the code holds up before merging.

## When to run

After the feature builds and `test` / `qa` are green — the last gate before
`complete`. Can also be run on demand at any point per `context/ai-interaction.md`
("Review AI-generated code periodically and on demand").

## Steps

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
2. **Relay the verdict** to Nikola: **PASS** or **CHANGES NEEDED**, blocking
   issues first (with `file:line`), then nice-to-haves. Frame the call in
   business/user terms where it matters (e.g. "this blocks the preview moment for
   the parent persona").

## Guardrails

- The reviewer is read-only. If it finds blocking issues, loop back to `start` /
  the specialist to fix, then re-review — don't `complete` over open blockers.
