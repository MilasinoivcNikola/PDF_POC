# Coding Standards

> Conventions for *code* in this repo. Workflow (branching, commits, review, history)
> lives in [ai-interaction.md](./ai-interaction.md) — this file does not repeat it.
> When a rule here and reality disagree, fix the code or fix this doc in the same PR —
> never let them drift.

The guiding principle from ai-interaction.md applies first: **preserve existing
patterns.** New code should be indistinguishable from the code already around it.

---

## Stack (the fixed parts)

- **Next.js 15 App Router** + **React 19** + **TypeScript** (`strict: true`)
- **Tailwind 3** for layout utilities; the design system lives in `app/globals.css`
- **Vitest** (`node` environment) for unit tests
- **ESLint** via `next/core-web-vitals` + `next/typescript`

Do not add dependencies, state libraries (Zustand/Jotai), a database, or a test
framework beyond this list without approval. The plan in
[local-prototype-plan.md](./local-prototype-plan.md) deliberately keeps the surface small.

> **Commerce exception (approved).** [commerce-roadmap.md](./commerce-roadmap.md) is the
> standing approval for graduating past the POC surface — it adds **Supabase**
> (Postgres + Storage + **Auth**) via **`@supabase/supabase-js`** (the data/Storage client)
> and **`@supabase/ssr`** (PR-08's cookie-based operator-auth session client) as the
> persisted order store + the admin auth gate (the CLI is not a runtime dep; migrations run
> via the dashboard/`psql`). This coexists with the JSON-session store — see *Files, IO, and
> persistence* below. **`resend`** is now added too (PR-09's delivery email) — pre-approved by
> the roadmap. Lemon Squeezy is integrated via direct REST + `node:crypto` HMAC (no SDK dep).
> Anything *outside* the roadmap still needs sign-off.

---

## TypeScript

- `strict` is on — no `any` to silence the compiler. Prefer a real type, `unknown`
  + a narrow, or a `// TODO` with a typed shape.
- Import other modules with the `@/*` path alias (`import { x } from "@/lib/story/merge"`),
  not long relative chains (`../../../`).
- Double quotes, semicolons, trailing commas in multiline literals — match the
  scaffolded files (`app/fonts.ts`, `app/layout.tsx`).
- Shared types belong in `lib/session/types.ts` (session/wizard state) or beside the
  module that owns them. Don't redefine the same shape in two places.
- Prefer pure functions for anything testable — merge, variant selection, prompt
  builders, pronoun mapping. Keep IO (fs, network, OpenAI) out of them so they're
  unit-testable without mocks.

---

## React & Next.js

- **Server Components by default.** Add `"use client"` only when a component needs
  state, effects, or browser APIs (the wizard steps, the uploader, the preview).
- Keep `"use client"` at the leaf, not the layout — push interactivity down so as
  much as possible stays server-rendered.
- One default-exported component per `page.tsx` / `layout.tsx`. Shared UI goes in
  `components/{wizard,preview,site}/` (e.g. `site/` holds the public `SiteHeader` /
  `SiteFooter` chrome) as named exports.
- Route handlers live under a **deploy-surface route group** and export named HTTP
  verbs (`export async function POST()`): engine/operator routes at
  `app/(operator)/api/*/route.ts`, public routes at `app/(public)/api/*/route.ts`.
  Route groups are URL-transparent, so the path is still `/api/*`. **Every operator
  route handler must call `assertOperator()` as the first statement of each verb**
  (returns 404 under a public build) — see the *deploy-surface boundary* below.
- File/dir naming: routes and folders are lowercase (`create/pet/page.tsx`);
  React components are `PascalCase.tsx` (`ImageUploader.tsx`).

### Wizard state
- Form state is React Context synced to `localStorage` (no external state lib).
- Persist on change so a refresh never loses progress; write the session to
  `./sessions/[id].json` only at the Generate step, per the plan.
- Required fields gate progression: pet name, child name, photo. Everything else
  is optional and must degrade gracefully (the master templates define fallbacks).

---

## Styling

- The design system is **single-sourced** as CSS custom properties in `:root` in
  `app/globals.css`, ported from `prototypes/styles.css`. `tailwind.config.ts`
  *mirrors* those tokens — it does not fork them. Add a color/space token in **one**
  place and reflect it in the other; never hardcode a hex that already has a token.
- Reach for the existing component classes (`.btn`, `.book-page`, `.field`, `.label`,
  `display-xl`, `lede`, …) before writing new CSS. Use Tailwind utilities for
  one-off layout (spacing, grid, flex).
- Fonts load through `next/font` in `app/fonts.ts` — **never** add a Google Fonts
  `<link>`. Self-hosting keeps generation self-contained for the Puppeteer step.
  Fraunces is a variable font with `opsz` + `SOFT` axes; respect the
  `font-variation-settings` the design uses.
- Match the prototypes in `prototypes/*.html` for visual intent when porting a screen.

---

## Files, IO, and persistence

- Runtime data dirs — `uploads/ generated/ sessions/ output/` — are gitignored and
  ESLint-ignored. Code may create/read files there; never commit their contents.
- **Two stores, by design.** The local POC **engine** persists to JSON files
  (`./sessions/[id].json`) + images under `./generated/[session-id]/` — keep this for
  the engine's inputs/artifacts. The **commerce layer** persists **orders** to
  **Supabase** (Postgres + Storage), per [commerce-roadmap.md](./commerce-roadmap.md)
  (the standing approval — see *Stack* above). They coexist: JSON = local generation
  inputs/outputs; Supabase = the durable order record + uploaded photo + final PDF.
- **Commerce data layer** (`lib/order/` + `lib/supabase/` + `supabase/migrations/`):
  `lib/order/types.ts` owns the `Order` / `OrderStatus` contract every later commerce PR
  imports; `lib/order/state.ts` is the **single source of truth** for legal status
  transitions (mirror it in the migration's `CHECK` constraint, never fork it) — the full
  transition matrix and the spend-guard invariants (no unpaid order can reach `generating`)
  are exercised in `lib/order/state.test.ts`, so read those rather than restating them.
  `lib/supabase/` holds the server-only service-role client (`server.ts`), the
  `isSafeOrderId` guard (`ids.ts`), Storage helpers (`storage.ts`), and — since PR-08 —
  the **operator auth-session client** (`auth.ts`). **Two distinct Supabase clients live
  here, by key and purpose:** `server.ts` uses the **service-role** key (bypasses RLS, the
  order data/Storage path), while `auth.ts` uses the **anon** key + the request's session
  cookie (`@supabase/ssr`; the `(operator)/admin` login gate only — `getOperatorUserId()`
  calls `auth.getUser()`, which re-validates the token server-side). Both are **server-only**
  — same `lib/session/disk.ts` discipline — and must never reach a **client/browser** bundle
  (`auth.ts` touches `next/headers`, so it can't, even though the anon key is the only
  `NEXT_PUBLIC_*`-safe key); RLS is defence-in-depth on top. *"Server-only" is not
  "operator-only":* a **public** server-side API route may hold it too (PR-05's
  `app/(public)/api/order/route.ts` is the first such consumer — it writes the order row
  + photo on the public Vercel host). The invariant that bites is *no client bundle*, not
  *operator-only* — see the three-tier *Deploy-surface boundary* below. `createOrder`
  accepts an optional caller-minted `id` so intake can mint the order id once, key the
  photo at `order-photos/<id>/photo`, and write `photoKey` atomically (no blank-then-patch).
  `lib/order/worker.ts` (PR-07) is the batch worker's orchestration — the first `lib/order/`
  member that is **engine-touching and operator-only**: unlike the pure `types.ts` / `state.ts`
  / `store.ts`, it transitively imports the engine (`lib/ai/generate` + Puppeteer via the PDF
  path) and the service-role client, so a **public** route must never import it (it's the
  engine tier of the *Deploy-surface boundary* below — invoked only by the
  `scripts/process-orders.ts` CLI, never an HTTP route).
- **Commerce catalog** (`lib/catalog/`): `lib/catalog/products.ts` owns the `Product`
  catalog contract the storefront (PR-04) and checkout (PR-06) import — one `Product`
  per registered `storyType`, with `illustrationCount` **derived** from the registry's
  `illustrationSlots` (never forked). It is **pure and client-safe** (opposite discipline
  to `lib/supabase/`): it imports only the registry's pure parts, so a stray transitive
  engine/Puppeteer import would break the public storefront's static build. The chain
  `products.ts → registry → story-1/story-2` must reach scene identity via the neutral
  `lib/story/scenes.ts` (see *AI illustration* below), **never** through `lib/ai/*` — the
  boundary guard bans all of `lib/ai/*` from the public graph, so a registry helper that
  imported a prompt builder would reintroduce the break PR-04 fixed. Prices are placeholder
  config until set with the PM before PR-06; per-product `sampleImages` are the storefront's
  web-optimized sample art under `public/samples/`, populated in PR-04.
- **Commerce delivery layer** (`lib/delivery/`, PR-09): closes the MVP loop on Approve.
  `lib/delivery/token.ts` is **pure** (`node:crypto`) — `mintDeliveryToken()` (256-bit
  base64url, the order's unguessable download token) + `isWellFormedToken()` (cheap
  shape/charset reject before any DB hit). `lib/delivery/email.ts` is **server-only and
  operator-only** (imports the Resend client, reads `RESEND_API_KEY`/`FROM_EMAIL`) — a pure
  `buildDeliveryEmail()` (subject/html/text, never embeds a raw storage URL) + a thin
  `sendDeliveryEmail()`; it's chained off `app/(operator)/api/admin/approve/route.ts` after
  the order reaches `approved`. The token is **persisted** via `setOrderDeliveryToken` and
  **resolved** via `getOrderByDeliveryToken` (both in `lib/order/store.ts`; the latter is the
  only lookup the **public** download route reaches — by opaque token, never an order id, so
  there's no IDOR path). `email.ts` (operator-only) must never enter the public graph;
  `token.ts` is pure and client-safe.
- **Deploy-surface boundary** (`lib/runtime/surface.ts` + the `app/(public)`/`app/(operator)`
  route groups): the single most important security boundary in the build (PR-03). One
  codebase, two run modes via `DEPLOY_TARGET` (`public` | `operator`, **default `operator`**,
  fail-closed — only the exact string `"public"` locks down, so a forgotten env can only ever
  make the public surface *more* restrictive): the **operator** surface runs locally and holds
  the **engine** (OpenAI key + Puppeteer + the generation graph); the **public** surface is the
  always-on Vercel storefront and must never **generate** — but it *may persist intent* (a
  public server-side API route writes the `pending_payment` order row + photo to Supabase),
  so the public deploy holds the **service-role** key too — never the engine. `surface.ts`
  exports `deployTarget()` / `isOperator()` / `isPublic()` / `assertOperator()`. Operator API
  routes call `assertOperator()` as the **first statement of every verb** (404 under public);
  `app/(operator)/layout.tsx` `notFound()`s the whole operator page group and is `export const
  dynamic = "force-dynamic"` so the page gate evaluates **per-request** (build-env-independent),
  not baked at prerender — so `(operator)` pages are dynamic (`ƒ`) while the `(public)`
  storefront stays static/SSG (`○`/`●`). **Three tiers:** public **page** (`PUBLIC_ENTRIES`) —
  fully client-safe, no engine **and** no `lib/supabase/server`; public **API route**
  (`PUBLIC_API_ENTRIES`) — may import the service-role client (`lib/supabase/server` +
  `@supabase/supabase-js`) but must stay **engine-free**, and does **not** call
  `assertOperator()` (it runs on the public host); **operator** — everything. Net invariant:
  **no `(public)` route transitively imports the engine** — same discipline as "no
  Puppeteer/fs in the client bundle" and the `lib/catalog/` client-safe rule above.
  **The live membership of each tier and every operator route's 404-gate are test-enforced
  — don't re-enumerate them in prose here:** `lib/runtime/surface.boundary.test.ts` walks
  the public import closure (both tiers) and fails on any engine / `lib/supabase/server` leak;
  `lib/runtime/all-operator-routes-gate.test.ts` asserts every operator verb 404s under public
  **and** drift-guards that a newly added operator route is registered + gated. So: a new
  public route → add it to the right `PUBLIC_*` list in the boundary test; a new operator
  route → the gate test fails until it calls `assertOperator()`. (Note: under a public Vercel
  build the operator routes still *ship* as gated 404 functions — the guarantee is that the
  public route *graph* never imports the engine and the keys are never set on that deploy, not
  that the engine code is build-excluded.)
- Secrets come from `.env.local` (`OPENAI_API_KEY`; the commerce `SUPABASE_SERVICE_ROLE_KEY`;
  the Lemon Squeezy `LEMONSQUEEZY_API_KEY` / `LEMONSQUEEZY_STORE_ID` /
  `LEMONSQUEEZY_WEBHOOK_SECRET`, server-only — read on the public host that takes/confirms
  payment, PR-06; and the Resend `RESEND_API_KEY` + `FROM_EMAIL`, server-only — read on the
  **operator** surface where the Approve action sends the delivery email, PR-09). Never
  hardcode keys; never log them; never echo them in an error body.
  The Supabase **service-role** key is server-only — never expose it to the browser or a
  `NEXT_PUBLIC_*` var (the anon key is the only client-safe one, and only behind RLS). The
  per-product LS **variant ids** (`LEMONSQUEEZY_VARIANT_<PRODUCT_ID>`) are **non-secret**
  runtime config (like `DEPLOY_TARGET` below), resolved server-side at checkout — kept out
  of the client-safe `lib/catalog/` module and never `NEXT_PUBLIC_*`. `PUBLIC_SITE_URL`
  (PR-09) is likewise **non-secret** runtime config: the public base for the emailed
  download link, read on the operator surface (the Approve request runs on localhost and so
  can't derive the public origin from itself — without it, delivery degrades rather than
  emailing a `localhost` link). Keep
  `.env.local.example` in sync when a new env var is introduced.
- `DEPLOY_TARGET` (`public` | `operator`) is **non-secret** runtime config, not a key:
  it selects the deploy surface (see *Deploy-surface boundary* above). Default `operator`
  (full local app); the Vercel build sets `public` via `vercel.json`. Fine to commit.

---

## API routes

- Return JSON with a consistent shape: success `{ ok: true, ... }`,
  failure `{ ok: false, error: "snake_case_code" }`.
- Unimplemented stubs return `501` with `{ ok: false, error: "not_implemented" }`
  (see `app/api/upload/route.ts`) so the wizard can be wired before the backend exists.
- Validate inputs at the boundary (file type/size on upload, required fields on
  session save). Don't trust the client even though it's local-only — it keeps the
  code honest and the errors readable.

---

## Testing

- Vitest picks up `**/*.{test,spec}.{ts,tsx}`. Colocate tests next to the unit
  (`lib/story/merge.test.ts` beside `merge.ts`).
- Per ai-interaction.md, unit-test **server actions and pure utilities**: merge,
  variants, prompt builders, pronoun/`SPECIES_DESCRIPTOR` mapping, session helpers.
- Don't unit-test the OpenAI API or Puppeteer output — verify those by running the
  app and inspecting the artifact (a generated image / `./output/*.pdf`).
- `npm run test:run` and `npm run build` must both pass before a commit.

---

## Craft-area specifics

These three areas have rules that general web code doesn't.

### PDF pipeline (`lib/pdf/`)
- The screen preview and the PDF render from the **same** React template
  (`template.tsx`) — one source of truth for layout. Differences are print CSS only.
  **Byte-identity rule:** a change that touches the shared template must leave every
  *existing* product's PDF output byte-identical (verified by raw length + a
  timestamp-normalized SHA — headless Chrome stamps a per-second `/CreationDate`). The
  structural half is test-enforced: `lib/pdf/template.test.tsx` / `template.story2.test.tsx`
  lock each product's section count + layout tags, so re-run them rather than restating which
  pages exist.
- Print CSS owns page geometry: `@page` size + margins, `break-inside: avoid` /
  `break-before: page` for page boundaries, `preferCSSPageSize: true` in Puppeteer.
- Output is 8.5×11 (or 8×8 square), **≥300 DPI**. Size raster images for 300 DPI at
  their printed dimensions — don't ship a 1024px image into a full-page slot blind.
- Embed fonts (via `next/font`/`@font-face`) so the PDF renders identically anywhere.
- Output filename follows the master template: `Saying-Goodbye-to-[PET_NAME].pdf`.

### AI illustration (`lib/ai/`)
- Model: `gpt-image-2-2026-04-21`. Verify the exact param names
  (`reference_images`, `quality`, `size`) against the live SDK at build time — the
  Images API has renamed params before.
- **Cost tiers are a hard rule:** `low` is the default — for iterating on prompts **and**
  for real book runs (scene generation defaults to `low`); `medium`/`high` are deliberate
  opt-in overrides for higher fidelity (e.g. final/cover renders). Default new code to the
  cheapest tier that fits.
- **Cache by `hash(prompt + reference images)`.** Regenerating one page must re-call
  the API for that page only — never the whole book.
- Pet consistency is the central craft problem (Approach A → B in the plan). Prompt
  builders live in `lib/ai/prompts.ts`, one per scene; orchestration in `generate.ts`.
  Pass references as base64 data URLs.
- **Scene identity is single-sourced in `lib/story/scenes.ts`** (`SCENE_PAGE_IDS` /
  `SceneId`), not in `lib/ai/`. `lib/ai/prompts.ts` re-exports it for back-compat, but the
  constant lives in a neutral module so the **client-safe** registry/catalog chain
  (`lib/catalog/products.ts` → registry → `story-1`) can reach scene identity without
  importing `lib/ai/*` — which the public boundary guard bans outright. Extracted in PR-04;
  do not move it back into `lib/ai/`.

### Story text (`lib/story/`)
- The master templates in `context/masterstories/` are the source of truth for
  wording. `master-text.ts` holds the text with `[MERGE_FIELDS]`; `merge.ts`
  substitutes; `variants.ts` composes age / death-type / belief-frame variants
  **before** merge.
- After merge, **no literal `[FIELD]` may survive** into output — every merge/variant test
  asserts zero surviving placeholders (`lib/story/**/merge.test.ts` over a full variant
  matrix), so a new story's tests must too rather than the doc re-describing the check.
- Honor the master template's "Quality bar / what to avoid": e.g. use the word
  "died," never "passed away." These are product requirements, not style preferences.
