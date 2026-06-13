## 2026-06-07 — Project Scaffolding & Design System

**Branch:** `feature/scaffolding` → `main` (`68e8a7f`, merge `c40b5bf`) · Craft Area 3 (nextjs-ui-builder)

Milestone 1 setup. Stood up the Next.js 15 (App Router) + TypeScript + Tailwind app and ported the *Quietly Kept* design system so all later UI work shares one visual language.

- Landing page rebuilt faithful to `prototypes/index.html` (wordmark, hero, 12-entry TOC, footer); "Begin your story" CTA links to `/create/upload`.
- Warm editorial design system ported from `prototypes/styles.css` into `app/globals.css` (tokens + base typography + component classes).
- Fraunces (variable, `opsz`+`SOFT` axes), Lora, JetBrains Mono load via `next/font` — no Google Fonts `<link>`, no FOUT/CLS (keeps generation self-contained for later Puppeteer work).
- Design tokens single-sourced in `:root`, mirrored into `tailwind.config` theme (palette not forked, Tailwind additive).
- Full directory skeleton: `app/create/*` (8 steps), `app/api/*` (4 stub routes returning 501), `lib/{ai,pdf,story,session}`, `components/{wizard,preview}`.
- Runtime dirs (`uploads/ generated/ sessions/ output/`) gitignored with `.gitkeep`; `.env*.local` ignored. Shipped `.env.local.example` (OPENAI_API_KEY), `README.md`, and a vitest smoke test.

**Gates:** `npm run build` ✓ (17 routes) · `npm run test:run` ✓ (1 test) · code review PASS.

