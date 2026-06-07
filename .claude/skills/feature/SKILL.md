---
name: feature
description: Manage current feature workflow - start, review, explain or complete
argument-hint: load|start|review|qa|test|explain|complete
---

# Feature Workflow

Manages the full lifecycle of a feature from spec to merge for the *Quietly Kept*
pet-memorial PDF POC. Each action delegates the heavy lifting to a specialist
agent in [.claude/agents/](../../agents/).

## Working File

@context/current-feature.md

### File Structure

current-feature.md has these sections:

- `# Current Feature` - H1 heading with feature name when active
- `## Status` - Not Started | In Progress | Complete
- `## Goals` - Bullet points of what success looks like
- `## Notes` - Additional context, constraints, which Craft Area / agent owns it

## Task

Execute the requested action: $ARGUMENTS

| Action     | Description                                               | Delegates to             |
| ---------- | --------------------------------------------------------- | ------------------------ |
| `load`     | Load a feature spec or inline description into the file   | — (main thread)          |
| `start`    | Create branch, dispatch implementation agent(s)           | one of the 3 specialists |
| `test`     | Unit-test server actions and utilities (`npm run test:run`)| `test-author`           |
| `qa`       | Drive the running app to verify UI changes                | `qa-verifier` → `/verify`|
| `review`   | Check goals met + code quality                            | `code-reviewer` → `/code-review` |
| `explain`  | Document what changed and why                             | — (main thread)          |
| `complete` | Commit, merge, delete branch, log history, reset          | — (main thread)          |

See [actions/](actions/) for detailed instructions per action.

If no action provided, explain the available options.

## Agents

Implementation specialists — `start` dispatches by Craft Area (see
`context/local-prototype-plan.md`):

- **pdf-render-specialist** — Craft Area 1: Puppeteer, the story template, print
  CSS, master-text merge/variants.
- **ai-image-specialist** — Craft Area 2: gpt-image-2 generation, pet
  consistency, prompt builders, caching.
- **nextjs-ui-builder** — Craft Area 3: App Router, wizard, React Context +
  localStorage, components, preview, API routes.

Workflow agents — back the verification steps and **delegate to built-in skills**:

- **code-reviewer** → `/code-review` (never `ultra`).
- **qa-verifier** → `/verify` and `/run`.
- **test-author** → writes + runs unit tests (`npm run test:run`).

## Workflow sequence

Follows `context/ai-interaction.md`:
`load` → `start` (branch + implement) → `test` / `qa` → `review` → iterate →
`explain` → `complete` (commit + merge + delete branch + history). 

**Gates before `complete`:** `npm run build` passes, tests pass, review/qa PASS,
and **explicit permission to commit**. Do not commit without permission and until
the build passes — fix issues first.
