# QA Action

Verify user-facing changes actually work by driving the running app — not just
that it compiles.

## When to run

For any feature that touches the wizard UI, the in-browser preview, downloads, or
any visible flow. Skip for pure backend/library features (those rely on `test`).

## Steps

1. **Dispatch the `qa-verifier` agent** via the Agent tool
   (`subagent_type: qa-verifier`). Brief it with the feature Goals — each
   user-facing goal is an acceptance check. It will:
   - Delegate to the built-in **`/verify`** skill (and **`/run`** to launch the
     app) to exercise the flow in a real browser.
   - Test the happy path plus the obvious edge the spec cares about (missing
     photo, refresh mid-wizard preserving localStorage, sparse free-text).
   - Capture concrete evidence (observations, screenshots, logs).
2. **Relay the result** to Nikola: PASS/FAIL per goal with the observation behind
   each verdict. Flag anything that can't be tested locally (e.g. needs a real
   `OPENAI_API_KEY`) rather than calling it passed.

## Guardrails

- Desktop browser only — mobile responsiveness is out of scope for this POC.
- If QA fails, loop back to `start` / the relevant specialist to fix before
  `complete`. Don't merge a feature whose visible goals don't work.
