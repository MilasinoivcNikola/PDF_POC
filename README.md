# Dearbound

Custom illustrated keepsake books starring your pet — a local-worker engine plus
a public storefront that turns a pet photo and a few answers into a personalized,
print-quality storybook PDF. The catalog spans joyful titles (gotcha-day,
adventure, new-baby) and gentle memorials. See `context/commerce-roadmap.md` for
the current direction and `context/local-prototype-plan.md` for the original plan.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and a
hand-tuned editorial design system (ported from `prototypes/styles.css`).

## Prerequisites

- Node.js 20.9+ (developed on Node 22)
- npm

## Setup

```bash
npm install
cp .env.local.example .env.local   # then add your OPENAI_API_KEY
```

## Scripts

| Command            | What it does                                      |
| ------------------ | ------------------------------------------------- |
| `npm run dev`      | Start the dev server on http://localhost:3000     |
| `npm run build`    | Production build                                   |
| `npm run start`    | Serve the production build                         |
| `npm run lint`     | Run ESLint                                         |
| `npm run test`     | Run Vitest in watch mode                          |
| `npm run test:run` | Run Vitest once (CI / pre-commit gate)            |

## Project structure

```
app/
  layout.tsx            Root layout (fonts + global CSS) — the single <html>/<body>
  globals.css           Design system (ported from prototypes/styles.css)
  fonts.ts              next/font setup (Fraunces, Lora, JetBrains Mono)
  (public)/             PUBLIC surface — landing + (soon) storefront/delivery
    page.tsx            Landing page  →  served at /
  (operator)/           OPERATOR surface — engine + wizard (404s under a public deploy)
    layout.tsx          Route-group gate: force-dynamic, notFound() when DEPLOY_TARGET=public
    create/<step>/      Wizard steps  →  served at /create/<step> (URL unchanged), dynamic (ƒ)
    api/                Route handlers →  served at /api/… (upload, session,
                        generate-illustrations, render-pdf, preview, update-text, …)
    test-ai/            Dev-only AI scaffold
lib/
  runtime/  ai/  pdf/  story/  session/  order/  supabase/  catalog/   Domain logic
components/
  wizard/  preview/             UI components
uploads/ generated/ sessions/ output/   Gitignored runtime artifacts
```

Route groups `(public)` / `(operator)` are **URL-transparent** — they do not appear
in the path. The split is the public/operator security boundary (see Deploy below).

## Design system

`app/globals.css` is the canonical design system (warm editorial palette,
Fraunces/Lora/JetBrains Mono typography, component classes). The same token
values are mirrored into `tailwind.config.ts` `theme.extend`, so UI can use
either CSS custom properties (e.g. `var(--rose)`) or Tailwind utilities
(e.g. `text-rose`). Keep the two in sync — one source of values.

## Deploy — public vs. operator surface

One codebase runs as **two surfaces**, switched by the `DEPLOY_TARGET` env var
(see `context/commerce-roadmap.md`, "two deployments of one codebase"):

| `DEPLOY_TARGET` | Surface | What runs |
| --------------- | ------- | --------- |
| `operator` (default, unset = this) | **Local** | The full app — wizard, generation engine (OpenAI key + Puppeteer), preview, PDF render, admin. |
| `public` | **Vercel** | The always-on storefront. Operator API routes 404; the `(operator)` pages 404; the engine never loads. |

- **Local dev:** leave `DEPLOY_TARGET` unset (or `operator`) — `npm run dev` gives
  today's full app. The default is `operator` so a forgotten env can never *widen*
  the public surface's exposure.
- **Vercel:** `vercel.json` sets `DEPLOY_TARGET=public` for the build and runtime.
  The public route graph (`app/layout.tsx` + `app/(public)/…`) never imports the
  engine — enforced by the build-time guard in
  `lib/runtime/surface.boundary.test.ts`, so the `OPENAI_API_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` paths can't reach a public deploy.
- The gate lives in `lib/runtime/surface.ts` (`assertOperator()` for API routes,
  `isPublic()` for the `(operator)` layout). Generation is **local only** — the
  public host takes orders and serves finished files, but cannot generate.

## Admin review desk (operator-only)

The operator reviews and approves each generated book at `/admin` (operator
surface only — it 404s on a public deploy). The local batch worker
(`npm run process:orders`) drains paid orders into `awaiting_review`; the admin
queue lists those (and any `failed` orders), opens each in the reused book preview
(repaint any drifted page, fix the customer's own words inline), and **Approve**
renders the final PDF, uploads it to the private `order-pdfs` bucket, and moves the
order to `approved` (which PR-09's delivery email reacts to).

Login is **Supabase Auth** (email/password), cookie-based via `@supabase/ssr`. The
admin uses the **anon** key (`NEXT_PUBLIC_SUPABASE_*`) for the session gate only —
order data still goes through the service-role client.

**One-time setup — create the operator account:**

1. In the Supabase dashboard → **Authentication → Users → Add user**, create one
   user with the operator's email + a password (confirm/auto-confirm the email).
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in
   `.env.local` (from Project Settings → API).
3. Run the operator app locally and sign in at `/admin/login`.

There is no self-serve signup — the single operator account is provisioned by hand.
- **Both gates hold at runtime, build-env-independent.** The `(operator)` layout is
  `force-dynamic`, so its `isPublic()` / `notFound()` decision is evaluated **per
  request** rather than baked in at build time — an app built in operator mode but
  served with `DEPLOY_TARGET=public` at runtime still 404s the wizard pages. (Without
  `force-dynamic` the wizard pages would prerender, and a runtime env flip could not
  un-bake the static shell.) Consequence for the build output: the public landing `/`
  prerenders **static** (`○`), while the `(operator)` pages (`/create/*`) are now
  **dynamic** (`ƒ`) — rendered per-request. Functionally identical for the
  client-driven wizard.
