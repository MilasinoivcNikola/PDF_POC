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
6. **Log history — tiered (feature 27).** `context/history.md` is now a **lean
   index**, not the place for the write-up. Do all three:
   - **a. Full write-up → a new archive file.** Write the `explain` "Implementation
     summary" verbatim to `context/history/YYYY-MM-DD-<slug>.md` (slug from the
     feature title). Its first line is the entry header `## YYYY-MM-DD — Title`,
     matching the existing files in that directory.
   - **b. One index line → `context/history.md`.** Append a single line under the
     correct `## Milestone …` heading (add a new milestone heading only if this
     feature opens one), in the format the existing lines use:
     `` - YYYY-MM-DD — Title — `branch` (merge-sha) — one-clause hook → [archive](history/YYYY-MM-DD-<slug>.md) ``
     Do **not** paste the multi-paragraph write-up here. (See the header note at the
     top of `history.md` and `ai-interaction.md` step 10.)
   - **c. Durable deferrals → `context/debt.md`.** Any "carried forward / not a
     blocker" note that outlives the branch becomes a triage row in `context/debt.md`
     (item · area/files · why-deferred · severity · flips-to-blocking-when) — don't
     bury it in the write-up. Remove a debt row here if this feature paid it off.
7. **Reset `context/current-feature.md`** back to the empty template (Status
   `Not Started`, empty Goals/Notes) so the next `load` starts clean.

## Output

Confirm what landed: commit hash/message, merge result, branch deleted (or kept),
the new `context/history/` archive file + the one-line index entry appended to
`history.md`, and any `context/debt.md` rows added/cleared. If a gate blocked
completion, say exactly which one and what's needed to clear it.
