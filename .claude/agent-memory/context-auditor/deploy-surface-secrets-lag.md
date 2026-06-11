---
name: deploy-surface-secrets-lag
description: Recurring drift — deploy-surface boundary text and the env/secrets note lag each new public API route + new secret
metadata:
  type: feedback
---

**Recurring drift pattern:** each commerce PR that adds a **new public API route** or a **new
secret** leaves two standing passages stale until updated in the same PR.

**Why:** the project's three-tier security model (public page · public API route · operator)
grew incrementally — PR-03 wrote it pages-only, PR-05 added the first secret-holding public
API route and updated the text to "three tiers." Each later PR adds more secret-holding public
routes (PR-06: `/api/checkout` + `/api/webhooks/lemonsqueezy`, LS secrets), so the same two
spots drift again.

**Where it bites — check these two every payment/secret PR:**
1. `context/coding-standards.md` *Secrets* bullet (≈line 158): enumerates secret env vars
   (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). A new secret (e.g. the three
   `LEMONSQUEEZY_*`) added to `.env.local.example` but NOT named here = staleness drift.
2. `context/features/00-overview.md` *Security spine* (≈line 61): still says "service-role key
   is server/**operator-only**" and "public site uses only **anon-safe** access behind RLS."
   That contradicts PR-05/06 reality (public API routes hold the service-role key + LS
   secrets). This is a **contradiction** that misleads — overview lags `coding-standards.md`,
   which already corrected it to "server-only, not operator-only."

**How to apply:** when a branch adds a public API route or a new secret, grep both passages.
Recommend *update the doc* (the code is the correct in-spec target state per the roadmap).
The deploy-surface text in `coding-standards.md` also lists the public route group's static
paths and `PUBLIC_API_ENTRIES` routes by name — a new public route absent there is omission
drift worth a low-priority note. Re-read live before citing line numbers; this section moves.
