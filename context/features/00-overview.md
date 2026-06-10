# Commerce Build — PR Plan & Index

> Implementation breakdown for the [commerce-roadmap.md](../commerce-roadmap.md):
> selling pet-memorial books via an always-on **Vercel** storefront + **Supabase**
> order store + **Lemon Squeezy** (Merchant of Record) payment + a **local worker**
> with a human approval gate + **Resend** delivery. Full illustrated books only.
>
> This plan graduates the project past the POC "out of scope" lines (payment / DB /
> deployment / email), per the roadmap. Locked decisions: 24–48h hand-finished
> turnaround (batch worker), Vercel + Supabase + Lemon Squeezy + Resend, Serbia-viable.

## PR sequence

| PR | Title | Phase | Depends on |
|----|-------|-------|-----------|
| [01](./01-order-model-and-supabase.md) | Order model & Supabase data layer | Foundation | — |
| [02](./02-product-catalog-and-pricing.md) | Product catalog & pricing | Foundation | 01 |
| [03](./03-public-operator-split.md) | Public/operator split + env gate | Foundation (refactor) | — |
| [04](./04-public-storefront.md) | Public storefront | Phase 1 | 02, 03 |
| [05](./05-order-intake-and-photo-upload.md) | Order intake + photo upload | Phase 2a | 01, 04 |
| [06](./06-lemonsqueezy-checkout-and-webhook.md) | Lemon Squeezy checkout + webhook | Phase 2b | 05 |
| [07](./07-local-batch-worker.md) | Local batch worker | Phase 3a | 06 |
| [08](./08-admin-review-and-approval.md) | Admin review & approval | Phase 3b | 07 |
| [09](./09-delivery-via-resend.md) | Delivery via Resend | Phase 4 | 08 |
| [10](./10-new-book-product-playbook.md) | New-book product playbook | Phase 5 (repeatable) | all |

PRs 01–03 are parallelizable (01/02 = data, 03 = refactor). 04→09 are a strict chain.

## Dependency graph

```
01 ─┬─ 02 ─┐
    │        ├─ 04 ─ 05 ─ 06 ─ 07 ─ 08 ─ 09
03 ─────────┘                              └─ 10 (repeatable, after the loop is closed)
```

## How each PR is run

Each PR follows the standard workflow in [ai-interaction.md](../ai-interaction.md):
**document → branch (`feature/<slug>`) → implement → test → build → qa → review →
commit (with permission) → merge → delete branch → log to [history.md](../history.md)**.
When a PR starts, copy its spec goals into [current-feature.md](../current-feature.md).

**Gates (per [coding-standards.md](../coding-standards.md)):** `npm run build` ✓,
`npm run test:run` ✓, `tsc --noEmit` ✓, code review PASS, and `qa` PASS for any
user-facing change. Unit-test server actions + pure utilities (order state machine,
catalog, validators, webhook verify, token issue), not Puppeteer/OpenAI output.

## Cost discipline (standing rule)

Generation runs at **Low** tier (~$0.08/book). QA flow/orchestration features by
**reusing an existing `./sessions/` fixture** (a re-run is a free cache hit) — never
fresh paid books. Only PR-07 needs one real Low generation to prove the worker.

## Security spine (do not regress)

- The **OpenAI key + Puppeteer + engine never deploy to Vercel** — they load only in
  the operator surface (PR-03 establishes the gate; build-time check that no public
  route transitively imports the engine, like the existing "no puppeteer/fs in client
  bundle" guard).
- The **Supabase service-role key is server/operator-only**; the public site uses only
  anon-safe access behind RLS.
- **Payment is trusted only via the signed Lemon Squeezy webhook**, never a client redirect.
- Generation only ever runs for a **paid** order.

## Deferred product decisions (not code — settle before the noted PR)

- **Per-book price** — blocking at **PR-02/06**. Research: $20–40 made-to-order.
- **AI-honesty / disclosure copy** — blocking at **PR-04** (storefront copy).
- **Refund / remake policy** — blocking at **PR-09** (delivery + LS dispute handling).
- **Lemon Squeezy product/variant ids + manual-fulfilment config** — done during **PR-06**.
