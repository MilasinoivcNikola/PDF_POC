# commerce-security-reviewer — project memory

- [Spend-guard claim pattern](spend-guard-claim-pattern.md) — claim-before-await is the spend gate; known two-OS-process TOCTOU residual is accepted for the batch worker, blocking if it ever goes concurrent/server-triggered
- [Operator engine boundary](operator-engine-boundary.md) — three-tier deploy surface; the CLI worker is operator-only (no HTTP route, not in any boundary closure); verification recipes
