---
name: supabase-auth-pr08
description: PR-08 built the admin auth gate (Supabase Auth + @supabase/ssr) — settled supersessions and where the docs lag
metadata:
  type: project
---

Commerce PR-08 (`feature/admin-review`) built the operator admin review desk and the
project's **first authentication**: Supabase Auth (single operator account, email/password),
cookie session via the new dep **`@supabase/ssr`**, a new server-only **anon-key** session
client `lib/supabase/auth.ts` (distinct from the service-role `lib/supabase/server.ts`).
New operator API routes `app/(operator)/api/admin/{auth,approve,requeue}`; admin pages under
`app/(operator)/admin/**`. State moves added: `awaiting_review → approved` (+ `pdfKey`) and
`failed → queued`.

**Settled — do NOT re-flag as drift:**
- The admin auth gate is **in-spec**: roadmap diagram (≈L77-82) already says "Admin review UI
  (auth-gated) → Approve → render PDF" and Phase 3 (≈L146) says "Local auth-gated admin." The
  `current-feature.md` records the locked decision (PM confirmed 2026-06-11): Supabase Auth.
- The new auth client is the **anon** key + user session cookie; it is server-only (touches the
  request cookie store) and **never reaches a client bundle** — grep confirms `@supabase/ssr` +
  `lib/supabase/auth` are referenced ONLY from `(operator)` code. RLS denies the anon role, so
  the gate client can't read/write orders; data still goes through the service-role client.
- Operator API routes call `assertOperator()` first, then `getOperatorUserId()` — both gates.
  Admin pages redirect to `/admin/login` when no session.

**Where the standing docs lag (drift this PR should resolve in-branch):**
1. `commerce-roadmap.md` "Deferred product decisions" still lists **"Admin auth method —
   Supabase Auth ... is the default"** as DEFERRED. It is now BUILT → should move to a
   recorded/locked decision (or be annotated "implemented PR-08"). Otherwise it misleads a
   reader into thinking auth is still open.
2. `coding-standards.md` "Commerce exception (approved)" note (≈L24-30) names only
   **`@supabase/supabase-js`** as the approved Supabase dep — **`@supabase/ssr`** is not listed.
   It's covered by the roadmap's "Supabase ... Auth" approval (the stack table line names Auth),
   but the standards note that enumerates the approved deps should add it so the dep rule stays
   honest.
3. `coding-standards.md` commerce-data-layer map (≈L107) names `lib/supabase/` = `server.ts` /
   `ids.ts` / `storage.ts` — the new **`auth.ts`** (anon-session client) is not in that list.
4. `00-overview.md` Security spine (L61-65) was ALREADY corrected to "server-only, not
   operator-only" — in sync. It does not yet mention the auth gate, but that's a low-priority
   addition, not a contradiction.

Pattern reinforced: see [[deploy-surface-secrets-lag]] — every commerce PR that adds a dep / a
new `lib/supabase/` module / a new env-var role leaves the `coding-standards.md` map + dep note
stale until updated in-branch.
