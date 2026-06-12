# commerce-security-reviewer — project memory

- [Spend-guard claim pattern](spend-guard-claim-pattern.md) — claim-before-await is the spend gate; known two-OS-process TOCTOU residual is accepted for the batch worker, blocking if it ever goes concurrent/server-triggered
- [Operator engine boundary](operator-engine-boundary.md) — three-tier deploy surface; the CLI worker is operator-only (no HTTP route, not in any boundary closure); verification recipes
- [Admin auth gate](admin-auth-gate.md) — PR-08 dual gate (assertOperator + getUser session) on admin pages+mutation routes; reused engine-route no-session residual accepted for localhost-only single-operator, blocking if ever network-exposed
- [Storefront posture inheritance](storefront-posture-inheritance.md) — a new public product (e.g. Story 4 PR-22) inherits the order-intake posture for free (product-agnostic /api/order, NewOrderInput excludes status/pdfKey, inputs.status is inert); verification recipe for the next product
