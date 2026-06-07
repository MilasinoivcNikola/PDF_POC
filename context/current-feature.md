# Current Feature

Project Scaffolding & Design System

## Status

In Progress

## Goals

- `npm run dev` boots a Next.js 15 (App Router) + TypeScript app on `localhost:3000` with a landing page visually faithful to `prototypes/index.html`.
- The warm editorial design system from `prototypes/styles.css` is available app-wide (tokens + base typography + component classes) so later UI work reuses it.
- The three project fonts (Fraunces variable w/ opsz+SOFT axes, Lora, JetBrains Mono) load via `next/font` — no external Google Fonts `<link>`, no FOUT/CLS.
- Design tokens are usable both as CSS variables and mirrored into the Tailwind theme (one source of values, Tailwind additive).
- The full directory skeleton from the plan exists (stubbed where needed); runtime dirs (`uploads/ generated/ sessions/ output/`) are gitignored.
- `npm run build` passes and `npm run test:run` passes on a trivial smoke test — establishing the gates from `ai-interaction.md`.
- "Begin your story" links to `/create/upload` (route may be a stub).

## Notes

- **Craft Area 3 — App/UI.** `start` will dispatch to **`nextjs-ui-builder`**.
- **Milestone 1 (setup)** · greenfield, no dependencies · branch `feature/scaffolding`.
- **Maps to:** `prototypes/index.html` (landing to rebuild) + `prototypes/styles.css` (design system to port).
- **Key decisions:**
  - Keep `styles.css` as the design system — import it globally rather than rewriting as Tailwind utilities. Mirror the same token values into `tailwind.config` `theme.extend` so future work can use either; don't fork the palette.
  - Load Fraunces as a variable font so the `opsz`/`SOFT` `font-variation-settings` the prototypes rely on work. Lora + JetBrains Mono are straightforward.
  - Replace the Google Fonts `<link>` with `next/font` — keeps generation/preview self-contained (matters later for Puppeteer).
  - Confirm exact Next.js 15 / Tailwind / `next/font` init flow against current docs (context7) — versions move.
- **Folder skeleton to create:** `app/`, `app/create/*`, `app/api/*`, `lib/ai/`, `lib/pdf/`, `lib/story/`, `lib/session/`, `components/wizard/`, `components/preview/`, plus gitignored `uploads/ generated/ sessions/ output/`. Stub files are fine — just enough to anchor imports.
- **Also ship:** `.env.local.example` (documents `OPENAI_API_KEY`), root `README.md` (dev/build/test).
- **Out of scope:** wizard step logic, AI calls, PDF rendering (later features); mobile responsiveness beyond what the prototype implies (desktop-first); replacing the hand-tuned CSS with pure Tailwind.
