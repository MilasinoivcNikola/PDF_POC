# nextjs-ui-builder — project memory

_Index of saved memories (one line each: `- [Title](file.md) — hook`)._

- [Lemon Squeezy webhook](lemonsqueezy-webhook.md) — X-Signature HMAC-SHA256 over raw body; meta.custom_data carries orderId; idempotent pending→paid→queued
- [Public API route secrets](public-api-route-secrets.md) — public API routes may hold secrets but must stay engine-free; register in PUBLIC_API_ENTRIES, never read env in client-safe catalog
- [New-book wizard seams](new-book-wizard-seams.md) — a new sellable book must touch storage.ts newDraft + disk.ts AnySession even when the spec omits them; storage.ts fallthrough is a silent wrong-shape, not a tsc error
