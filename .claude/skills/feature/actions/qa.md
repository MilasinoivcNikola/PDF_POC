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
   - Drive the running app in a real browser via the **Playwright MCP** tools
     (`browser_navigate` / `snapshot` / `click` / `file_upload` / `evaluate` /
     `network_requests` / `take_screenshot` …); fall back to the built-in
     **`/verify`** + **`/run`** skills only if the Playwright MCP server isn't
     connected.
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
- **Cost: image generation spends real credits.** When briefing `qa-verifier`,
  for any feature where image *quality* isn't the thing under test
  (orchestration, progress, wizard, preview, download), tell it to **reuse an
  existing `./sessions/` fixture** (re-running an identical session is a free
  cache hit) rather than generate fresh books — and if a fresh run is truly
  needed, **Low tier, once**. See the qa-verifier's "Cost discipline" section.
  A flow feature should cost ~$0 to QA, not several dollars.
