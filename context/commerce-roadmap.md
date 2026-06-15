# Commerce Roadmap — Selling Pet Memorial Books

> **Status:** Planned (decisions locked 2026-06-10). Supersedes the "out of scope:
> payments / accounts / database / deployment / email" lines in
> [local-prototype-plan.md](./local-prototype-plan.md) — we are intentionally
> graduating the local POC into a small real business.
> **Product line:** full illustrated keepsake books only (no single portraits).
> Pet-keepsake focused — both memorial titles (e.g. Story 1 "Saying Goodbye",
> Story 2 "A Letter from…") and celebration / living titles (e.g. Story 4 "If
> [PET_NAME] Could Talk"); catalog grows by authoring more book titles.
> **Fulfillment:** local-worker + human approval gate, async (24–48h hand-finished).

---

## Locked decisions (2026-06-10)

| Decision | Choice |
|----------|--------|
| Product scope | **Full illustrated books only** — grow the catalog of titles, no single portraits |
| Fulfillment model | **Local-worker + approval gate** — automated generation, human-reviewed, async |
| Turnaround promise | **24–48h, hand-finished** → batch worker, not a real-time daemon |
| Stack | **Vercel** (storefront) + **Supabase** (Postgres + Storage + Auth) + **Lemon Squeezy** (Merchant of Record — payment + global VAT) + **Resend** (delivery email) |
| Scope | **Graduate past the local POC** — add payment, datastore, deployment, email |

---

## Why this model (recap)

- "Instant" (seconds) is impossible — a book is ~14 AI image calls, each taking
  seconds-to-tens-of-seconds to generate, so a book lands in minutes regardless of the
  rate ceiling (originally sized against ~5/min; the verified Tier-2 limit is now 20
  images/min — see `context/features/ai-concurrency-env.md`). But **automated-async**
  (minutes-to-hours, no manual labor) is fully feasible. The real choice was
  automated-async vs manual; automated wins.
- **Image COGS per book ≈ ~$1** under the locked mixed-tier policy (HIGH hero slots +
  MEDIUM interiors + LOW reference — see `context/features/mixed-tier-illustration-quality.md`),
  vs ~$3 all-HIGH. Comfortably inside the $20–40 price band.
- A **human approval gate** is kept on purpose: this is a grief product, and shipping
  a bereaved customer a book where the pet drifted is unacceptable. The gate is a
  ~30-second glance + optional repaint, not manual authoring.
- 24–48h turnaround is **better positioning** ("lovingly hand-finished") than instant,
  and lets the worker be a **batch command** run once or twice a day rather than a daemon.

## Why off-Etsy

Etsy's 2025–2026 AI/Creativity-Standards crackdown targets exactly our profile
(AI art + made-to-order at volume); 17k+ listings were pulled retroactively in early
2025. Owning the channel avoids suspension risk, the 20–30% fee drag, and gives us the
funnel. (Full research in the 2026-06-10 deep-research findings.)

---

## Why Lemon Squeezy for payment (and not Stripe)

**Stripe does not support Serbia**, so it's off the table for the operator's account.
The answer is a **Merchant of Record (MoR)** — the MoR is the legal seller to the end
customer, so it (a) sidesteps the Stripe-Serbia block and (b) collects and remits
**global VAT/sales tax** for us (brutal to do solo otherwise) and absorbs chargebacks.

**Lemon Squeezy** chosen: full MoR, built for digital products, clean hosted checkout +
API + webhooks (fits our inputs-first → checkout → webhook → `paid` flow), ~5% + 50¢,
and — **confirmed on their supported-countries list (2026-06-10): Serbia is supported.**
Payout to a Serbian seller is via **PayPal (200+ countries) or bank (79 countries)**;
PayPal receiving is live in Serbia. *Avoided:* Stripe-Connect-based MoRs (e.g. Polar).
Note LS's *buyer-side* is now Stripe-backed post-acquisition, but **seller payouts still
go via PayPal/bank**, which is why Serbia works.

**Two things to verify at setup:** (1) configure the product for **deferred/manual
fulfillment** (no auto-download — LS takes payment, our worker delivers in 24–48h);
(2) watch the Stripe-acquisition direction long-term (if seller payouts ever migrate onto
Stripe rails, revisit). Receiving/legal: PayPal/Payoneer/Wise are the standard Serbian
rails; the usual structure is a **preduzetnik on flat-rate (paušal) tax** receiving MoR
payouts as business income — confirm specifics with a Serbian accountant.

---

## Architecture — two deployments of one codebase

```
   VERCEL (public, always on)            SUPABASE                LOCAL (your machine, batch)
┌──────────────────────────────┐   ┌──────────────────┐   ┌──────────────────────────────┐
│ Storefront + marketing       │   │ Postgres: orders │   │ Worker (batch command):      │
│ Lemon Squeezy MoR            │──►│ Storage: photo + │◄──│ drain queued orders → engine │
│ Order form (wizard-as-order) │   │   final PDF      │   │  → upload result             │
│ Delivery / download page     │◄──│ Auth: admin gate │──►│ Admin review UI (auth-gated):│
│  NO OpenAI key, NO engine    │   └──────────────────┘   │  reuse preview + repaint     │
└──────────────────────────────┘                          │  → Approve → render PDF       │
            ▲  Lemon Squeezy webhook (order_created)       │  HAS OpenAI key + Puppeteer  │
            └──────────────────────────────────────────────┴──────────────────────────────┘
                                   Approve → Resend email (download link) → delivered
```

**Key property:** generation (OpenAI key + Puppeteer + the rate-limited engine) is
**local only**. The public host can take orders and serve finished files, but cannot
generate. Supabase holds only the order row, the input photo, and the final PDF.

---

## Order state machine (the backbone)

Orders are **created in `pending_payment`** and move forward only on the paid webhook:

`pending_payment` → `paid` → `queued` → `generating` → `awaiting_review` → `approved` → `delivered`

The full transition table is implemented in `lib/order/state.ts` (**the single source of
truth** — `ALLOWED_TRANSITIONS` / `canTransition` / `assertTransition`), mirrored as a
`CHECK` constraint in `supabase/migrations/0001_orders.sql`, and enforced **before any DB
write** (an illegal move throws and never touches Postgres):

| From | → Allowed |
|------|-----------|
| `pending_payment` | `paid`, `cancelled` |
| `paid` | `queued`, `refunded`, `cancelled` |
| `queued` | `generating`, `failed`, `cancelled` |
| `generating` | `awaiting_review`, `failed` |
| `awaiting_review` | `approved`, `failed` |
| `approved` | `delivered`, `failed` |
| `failed` | `queued` (retry), `refunded`, `cancelled` |
| `delivered` / `refunded` / `cancelled` | — (terminal) |

- Generation only ever starts on the **paid** Lemon Squeezy webhook (no spending on unpaid
  orders): the only edge into `generating` is `queued → generating`, and the only edges into
  `queued` are `paid → queued` and the `failed → queued` retry — there is no shortcut from
  `pending_payment`.
- `awaiting_review` is the operator's queue; `approved` triggers final PDF render + delivery.
  `failed` is recoverable (operator retries via `failed → queued`).
- Grows out of the existing session `status` (`generating`/`ready`) + feature-09 job
  registry, but moves from local JSON into the shared Supabase store.

---

## What's reused vs new

**Reused (~80%):** the generation engine, the `StoryDefinition` registry (feature 14
made the pipeline product-agnostic *for exactly this*), the wizard inputs, the preview
screen (**becomes** the admin review UI), per-page regenerate, the PDF renderer.

**New:** hosted storefront, Lemon Squeezy checkout + webhook (Merchant of Record — also
collects/remits global VAT/sales tax), Supabase order store + file storage, the batch
worker, an admin auth gate, Resend delivery email.

---

## Phased build (each phase ships something usable)

- **Phase 1 — Storefront (Vercel).** Marketing + product pages in the Dearbound
  design system, always up. "Order" CTA, no checkout yet. → a real URL live.
- **Phase 2 — Order intake + payment.** Wizard-as-order form, photo upload to Supabase,
  **then** Lemon Squeezy checkout — inputs-first, our order ID passed via custom checkout
  data so the webhook links payment → order. Generation fires only on the paid webhook.
  Order written as `paid`. Customer told "we're painting it, check your email."
- **Phase 3 — Local worker + admin queue.** Batch command drains `queued` orders (the
  post-paid-webhook state — `paid → queued`, per the state machine above) → runs
  the engine → `awaiting_review`. Local auth-gated admin lists the queue → opens the
  existing preview → repaint → **Approve**.
- **Phase 4 — Delivery.** Approve renders the final PDF, uploads it, Resend emails a
  download link. → `delivered`.
- **Phase 5 (recurring) — Build more books.** Each new title = a new registry entry
  (master text + layout + illustration slots + price) that auto-appears as a purchasable
  product. Infra is built once in 1–4; every title after is mostly *writing*. The
  step-by-step, file-path-level recipe lives in
  [new-book-playbook.md](./new-book-playbook.md).

**Worker simplification:** at this volume the worker is a **batch command you run**
once or twice a day, not a 24/7 poller. Pairs with the 24–48h promise.

---

## Deferred product decisions (not blocking Phase 1)

- **Pricing per book** — needed by Phase 2. Research suggests $20–40 made-to-order.
- **AI-disclosure / honesty stance** in the copy — off-Etsy we're not bound by Etsy
  policy, but it's an ethics + marketing choice in a grief context.
- **Refund / remake policy** — what happens if a customer is unhappy with the result.

> **Resolved (PR-08, 2026-06-11):** **Admin auth method** — **Supabase Auth** (single
> operator account), the noted default, is now built. The `(operator)/admin` review desk
> and its mutation routes are gated by a cookie-based session (`@supabase/ssr` anon-key
> client in `lib/supabase/auth.ts`) on top of the existing `assertOperator()` deploy gate.
