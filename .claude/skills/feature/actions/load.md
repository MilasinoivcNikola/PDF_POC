# Load Action

Turn a spec, a milestone reference, a prototype, or an inline description into a
clean `context/current-feature.md`. **This action only documents — it does not
branch or implement.**

## Input

`$ARGUMENTS` (after `load`) is one of:

- A **milestone** reference — e.g. "Milestone 1" or "static PDF from JSON".
  Pull the goals from `context/local-prototype-plan.md` → "Build sequence".
- A **file path** — a spec, a prototype (`prototypes/*.html`), or a masterstory
  template (`context/masterstories/*.md`).
- **Inline text** — a free-form description Nikola typed.

If `$ARGUMENTS` is empty, ask which feature/milestone to load.

## Steps

1. **Ground it in context.** Read the relevant source(s): the matching milestone
   in `context/local-prototype-plan.md`, the prototype HTML it maps to, and the
   masterstory template if the feature touches story text. Don't guess scope —
   anchor it to the plan.
2. **Pick a short feature name** for the H1 (e.g. "Static PDF render pipeline").
3. **Write `context/current-feature.md`** with exactly these sections:
   - `# Current Feature` — the name.
   - `## Status` — `Not Started`.
   - `## Goals` — bullet points of what success looks like, taken from the
     milestone's "Done when" / the spec. Concrete and checkable.
   - `## Notes` — constraints and routing info:
     - Which **Craft Area** this is (1 PDF / 2 AI images / 3 UI), and therefore
       which implementation agent `start` will dispatch to.
     - Key files/dirs it will touch and the prototype(s) it maps to.
     - Out-of-scope reminders relevant to this feature (from the plan's "out of
       scope" list) so we don't drift.
4. **Confirm back to Nikola** in 2-3 lines: the feature name, the headline goal,
   and which agent (`pdf-render-specialist` / `ai-image-specialist` /
   `nextjs-ui-builder`) `start` will hand it to. Frame trade-offs in
   business/user terms per `CLAUDE.md` if any scope choice is open.

## Guardrails

- Do not create a branch, install anything, or write code here.
- Don't overwrite an in-progress feature without confirming — if
  `current-feature.md` shows Status `In Progress`, flag it and ask before
  replacing.
