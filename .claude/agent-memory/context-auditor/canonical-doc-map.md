---
name: canonical-doc-map
description: Which standing doc owns which decision in the Quietly Kept project — audit drift against the right source
metadata:
  type: project
---

Canonical ownership of decisions, so an audit targets the right doc:

- **`context/commerce-roadmap.md`** owns the *current* commerce decisions and **supersedes**
  `local-prototype-plan.md`'s "out of scope: payments / accounts / database / deployment /
  email" lines. Building payment/Supabase/deploy/email is in-spec — judge it against the roadmap.
  Owns: Lemon Squeezy (MoR, not Stripe; Serbia-viable), the order state machine, manual
  fulfilment, the phased build.
- **`context/coding-standards.md`** owns code conventions + the **three-tier Deploy-surface
  boundary** (public page → client-safe · public API route → service-role OK, engine banned ·
  operator → everything) + the env/secrets guidance + the `lib/catalog/` client-safe rule.
  This is the doc that drifts most as new public API routes/env vars land (see
  [[deploy-surface-secrets-lag]]).
- **`context/features/00-overview.md`** owns the commerce PR sequence + a "Security spine"
  section + a "Deferred product decisions" list (price, AI-honesty copy, refund policy).
  Its security-spine bullets predate the public-API-route tier and can lag (see
  [[deploy-surface-secrets-lag]]).
- **`context/features/NN-*.md`** are per-PR specs (goal/scope/done-when). The branch is
  expected to outgrow small spec wording (e.g. route path under a route group).
- **`context/masterstories/*.md`** own story wording + quality bars ("died" rule, banned
  euphemisms, page structure). Product source-of-truth for copy.
- **Out of scope to audit:** `context/history.md` (append-only, `complete` owns it),
  `context/current-feature.md` (transient).

Settled supersession (do NOT re-flag as drift): public server-side API routes legitimately
hold the **service-role** Supabase key (PR-05) and **Lemon Squeezy secrets** (PR-06) — the
invariant is *no client bundle* + *engine-free*, NOT *operator-only*. The roadmap diagram's
"NO OpenAI key, NO engine" on the Vercel box is correct (it bans the engine, not all keys).
