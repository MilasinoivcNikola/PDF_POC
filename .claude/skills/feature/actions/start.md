# Start Action

Begin implementation: set up the branch, dispatch the right specialist agent(s),
and mark the feature in progress. **Does not commit** — that's `complete`.

## Preconditions

- `context/current-feature.md` holds a real feature (not the empty template).
  If it's still the stub, tell Nikola to run `load` first.
- Status is `Not Started` (or `In Progress` to resume).

## Steps

1. **Ensure a git repo + branch** (the workflow in `context/ai-interaction.md`
   requires one branch per feature):
   - If `git status` fails (not a repo yet), `git init`, then make a baseline
     commit of the current tree so there's something to branch from.
   - Create and switch to a branch named from the feature: `feature/<slug>` for
     features, `fix/<slug>` for fixes. Never build directly on `main`.
2. **Route to the implementation agent(s)** using the Craft Area in the feature's
   Notes:
   | Craft Area / surface                                   | Agent                  |
   | ------------------------------------------------------ | ---------------------- |
   | PDF pipeline, story template, print CSS, merge/variants| `pdf-render-specialist`|
   | AI illustration gen, pet consistency, prompts          | `ai-image-specialist`  |
   | Wizard, App Router pages, components, preview, API routes| `nextjs-ui-builder`   |
   A cross-cutting feature may need more than one. **Dispatch independent agents
   in parallel** (multiple Agent calls in one message); **sequence** them when one
   depends on another's output (e.g. UI preview depends on the shared template).
3. **Brief each agent** via the Agent tool (`subagent_type` = the agent name).
   Pass: the feature Goals + Notes from `current-feature.md`, the specific files
   to touch, and the relevant prototype/masterstory references. Let the agent read
   its own canonical sources rather than pasting everything.
4. **Set Status to `In Progress`** in `context/current-feature.md`.
5. Honor `context/ai-interaction.md`: minimal changes, preserve existing patterns,
   no unrequested features, never delete files without clarification.

## Output

Report what each agent built (relayed from their summaries — the user does not
see agent output directly), the branch name, and the suggested next step
(`test` / `qa` / `review`). If something is blocked after 2-3 attempts, stop and
explain rather than thrashing.
