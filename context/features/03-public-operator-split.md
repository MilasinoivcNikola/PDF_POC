# PR-03 — Public/Operator Split + Env Gate

> **Branch:** `feature/public-operator-split` · **Phase:** Foundation (refactor) · **Depends on:** —
> **Status:** Planned · Part of the [commerce plan](./00-overview.md).

## Goal

Behaviour-preserving refactor that splits the app into a **public** surface (safe to
deploy to Vercel) and an **operator** surface (runs locally, holds the OpenAI key +
engine + admin). The single most important security boundary in the whole build.

## Scope (in this PR)

- Route groups: `app/(public)/…` vs `app/(operator)/…`.
- Relocate the engine-touching API routes + wizard/preview into `(operator)`.
- An env gate (`DEPLOY_TARGET=public|operator`) so operator routes 404 and the engine
  never loads under a public build.
- Vercel build config documented (deploy public only; operator runs locally).

## Out of scope

- Storefront content (PR-04), order flow, payment. **No behaviour change** to existing
  local flows — this is structure only.

## What to build

- Move to `(operator)`: `generate-illustrations`, `regenerate-illustration`,
  `render-pdf`, `preview`, `update-text`, `test-ai` routes + the current
  `create/generate` + `create/preview` pages (operator review reuses them later).
- Keep in `(public)`: landing + (soon) storefront/order/delivery.
- `lib/runtime/surface.ts` — reads `DEPLOY_TARGET`; helper `assertOperator()` for
  operator-only routes; operator routes return 404 under `public`.
- Ensure `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` are only read in operator code
  paths; public env is anon-safe only.
- `vercel.json` / build note: public deploy excludes (or runtime-gates) the operator surface.

## Out-of-scope guardrail

The existing wizard still works locally end-to-end after this PR — same routes, just
relocated. No new feature.

## Reuse

- Mirrors the **feature-14 behaviour-preserving keystone refactor** and the existing
  server-only `disk.ts` / "no puppeteer/fs in client bundle" discipline.

## Testing

- **Build:** passes for both `DEPLOY_TARGET=operator` (local, full) and a `public`
  build that **excludes the engine** (assert no Puppeteer/OpenAI import in the public graph).
- **Unit/integration:** an operator route returns 404 under `public` mode.
- **Manual:** local operator run behaves identically to today (wizard → generate →
  preview → download still work).

## Done when

- [ ] One codebase, two run modes.
- [ ] Public mode: operator routes 404, no engine/key in the bundle, safe to deploy.
- [ ] Operator mode (local): existing flows unchanged.
- [ ] Build + tests + `tsc --noEmit` green.

## Risks / notes

- **The whole security model rests here.** Add a build-time assertion that no
  `(public)` route transitively imports the engine — the same class of guard the project
  already uses for the client bundle. A regression here leaks the key path to Vercel.
- Pure refactor: re-verify nothing user-facing changed (existing tests stay green).
