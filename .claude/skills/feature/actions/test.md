# Test Action

Cover the feature's testable logic with unit tests, and make sure the build is
still green.

## When to run

After `start`, for any feature that adds **server actions or pure utility
functions** (merge, variants, prompt builders, session storage, API-route logic).
If the feature is UI-only with no testable pure logic, say so and skip to `qa`.

## Steps

1. **Dispatch the `test-author` agent** via the Agent tool
   (`subagent_type: test-author`). Brief it with the feature Goals/Notes and the
   specific functions to cover. It will:
   - Write focused unit tests for the pure logic and edge cases (blank/sparse
     inputs, pronoun + merge-field consistency, correct variant selection).
   - Mock external APIs — **no real OpenAI calls / no spent credits in tests**.
   - Run **`npm run test:run`** and make tests pass.
   - Confirm **`npm run build`** still succeeds.
2. **Relay the result** to Nikola: functions tested, edge cases covered, pass/fail
   counts, anything untestable and why.

## Guardrails

- Per `context/ai-interaction.md`, the build must pass before `complete`. If the
  agent leaves the build or tests red, treat that as blocking — `complete` should
  not run until it's green.
- Don't test visual output or things `qa-verifier` covers in the browser.
