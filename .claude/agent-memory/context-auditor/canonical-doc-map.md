---
name: canonical-doc-map
description: Which standing doc owns which decision in the Dearbound project — audit drift against the right source
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

Catalog-title convention (do NOT flag): the storefront `title` in `lib/catalog/products.ts`
intentionally **drops the `[PET_NAME]` merge field** from the master template's title — Story 1
master "Saying Goodbye to [PET_NAME]" → catalog "Saying Goodbye"; Story 2 "A Letter from
[PET_NAME]" → "A Letter from Your Pet"; Story 4 "If [PET_NAME] Could Talk" → "If Your Pet Could
Talk". A generic storefront title is the established pattern, not drift.

Brand rename (Quietly Kept → **Dearbound**, 2026-06-15, feature/rename-dearbound). Decision D3:
rewrite the *live* doc set (`CLAUDE.md` title, `README.md`, `commerce-roadmap.md` design-system
ref, `.claude/agents/*`, `.claude/skills/feature/*`, `app/globals.css`/`lib/pdf/styles.css`
headers, `.env.local.example`), **leave** the historical record (`context/history.md`,
`context/history/*`, superseded `context/features/*`). The wordmark is single-sourced in
`lib/brand.ts` (`BRAND = "Dearbound"`); a guard test (`lib/brand.guard.test.ts`) greps
`app/`+`components/`+`lib/` (excl. tests) for the old string. Do NOT flag as drift: (a) the
runtime localStorage key `quietly-kept:draft` (`lib/session/storage.ts`) — a code identifier,
NOT the wordmark; renaming it would orphan persisted drafts; qa-verifier.md citing it is correct;
(b) "Quietly Kept" surviving in `context/history*` / superseded specs (intentional record);
(c) the guard test naming the old string. **The masterstories** (`context/masterstories/*`) were
left untouched but still call the *current* house style / voice / catalog "Quietly Kept" — they
were ambiguous under D3 (not in either list). Flag as nice-to-have staleness: a future story
author reads these as source-of-truth and the brand reference now misleads.

Roadmap-header scope-framing lag — RESOLVED (verified 2026-06-15 on
feature/public-refresh-catalog-data). `commerce-roadmap.md`'s header (lines 7-9) now reads
"**Pet-keepsake focused** — both memorial titles … and celebration / living titles (e.g.
Story 4 …)", so it no longer understates the broadened catalog. Do NOT re-flag the header as
memorial-only drift. (History: it formerly said "Pet-memorial focused" and lagged Story 4's
living/celebration default.)

Audience field convention (new, PR public-refresh-1, 2026-06-15): `lib/catalog/products.ts`
`Product` now carries a **required** `audience: "living" | "loss"` + optional `displayTitle?`.
Living = pet still here, loss = pet has died; Story 6 "While You're Still Here" is deliberately
**living** (masterstory confirms: tribute to a still-alive pet, memorial path dropped).
Recurring drift to expect on the **next new-book branch**: `new-book-playbook.md` Step 4 field
checklist (~line 201) + worked `buildProduct` example (~line 350) OMIT `audience`, which is now
required — a book authored from the playbook won't compile + fails the partition test in
`products.test.ts`. See [[new-book-playbook-pr10]].
