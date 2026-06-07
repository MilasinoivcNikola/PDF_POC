# Complete Action

Land the feature: commit, merge, delete the branch, log it, and reset the working
file. This is the only action that writes history.

## Hard gates (do not proceed past a red one)

Per `context/ai-interaction.md` — **"Do NOT commit without permission and until
the build passes."**

1. **`npm run build` passes.** Run it. If it fails, stop and fix first.
2. **`npm run test:run` passes** (if the feature had tests).
3. **`review` (and `qa` for UI) came back PASS** with no open blockers.
4. **Explicit permission from Nikola to commit.** If not already given, ask.

## Steps

1. Confirm all gates above are green; report the build/test status plainly.
2. **Commit** with a focused, conventional message (`feat:` / `fix:` / `chore:`),
   one feature per commit. End the commit message with:

   ```
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```
3. **Merge** the feature branch into `main`.
4. **Delete the feature branch automatically** once it is merged into `main` —
   no need to ask (Nikola standing instruction, 2026-06-07; supersedes the "ask
   to delete the branch once merged" note in `CLAUDE.md`).
5. **Push only if Nikola asks** — the POC is local-only by default; don't push
   unprompted.
6. **Append a history entry** to `context/history.md` (in order) using the
   "Implementation summary" from `explain` — a dated line/short block: what
   shipped and why.
7. **Reset `context/current-feature.md`** back to the empty template (Status
   `Not Started`, empty Goals/Notes) so the next `load` starts clean.

## Output

Confirm what landed: commit hash/message, merge result, branch deleted (or kept),
and the history.md entry. If a gate blocked completion, say exactly which one and
what's needed to clear it.
