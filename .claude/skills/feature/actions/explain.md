# Explain Action

Document what changed and why — the human-readable summary that feeds the commit
message and the history log. Light, main-thread work (no agent needed).

## Steps

1. **Gather the change set.** Use `git diff main...HEAD` (and `--stat`) plus the
   feature's Goals/Notes to see what was actually built.
2. **Write a concise summary** covering:
   - **What** changed — the user-visible outcome and the key files/modules.
   - **Why** — which goal/milestone it serves, and any non-obvious decisions
     (e.g. "chose Approach A for pet consistency because…", "embedded fonts
     instead of CDN so the PDF renders offline").
   - **Trade-offs / follow-ups** — anything deferred or worth revisiting.
3. **Record it** in `context/current-feature.md` under `## Notes` (an
   "Implementation summary" subsection). This is the source text `complete` will
   append to `context/history.md`.

## Guardrails

- Explain only what's in the diff — don't invent rationale. If a decision was
  arbitrary, say so.
- Keep it tight; this is a changelog entry, not an essay.
