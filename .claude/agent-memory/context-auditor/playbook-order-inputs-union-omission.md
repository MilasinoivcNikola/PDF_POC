---
name: playbook-order-inputs-union-omission
description: new-book-playbook's reuse guarantee omits the required Order.inputs type-union widen every sellable book makes (PR-22/24/26 all did it)
metadata:
  type: project
---

`context/new-book-playbook.md`'s "The reuse guarantee" (~line 272) claims a new book
needs **zero** changes to Supabase / worker / admin / delivery and that intake carries
`inputs` "verbatim, nothing book-specific." True *behaviorally*, but every **sellable**
new book makes a mandatory **type-only** edit to three union types:
`lib/order/types.ts` (`Order.inputs`), `lib/order/store.ts` (`OrderRow.inputs`),
`lib/session/disk.ts` (`AnySession`) — each `... | Story<N>Session`.

**Why:** confirmed recurring across PR-22 (Story 4), PR-24 (Story 5), PR-26 (Story 6) —
the same three-file widen each time. The playbook records it nowhere; each PR's own spec
re-flags it instead.

**How to apply:** this is a **nice-to-have omission, not a misleading contradiction** —
don't block a PR on it. When a new-sellable-book branch lands and the playbook still
hasn't recorded it, recommend *update the doc* (add one line to the reuse guarantee or a
wiring step). See [[new-book-playbook]], [[deploy-surface-secrets-lag]].

Settled-as-covered on PR-26 (so DON'T re-flag as drift): `LEMONSQUEEZY_VARIANT_<PRODUCT_ID>`
+ a `story-N-*` catalog entry are covered by the *generic* conventions in
`coding-standards.md` (env line ~200, catalog map ~131) and `new-book-playbook.md` Steps 4–6;
the roadmap header "celebration / living titles" already covers a living tribute.
