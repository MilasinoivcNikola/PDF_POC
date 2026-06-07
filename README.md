# Quietly Kept

A local, single-user prototype that turns a pet photo and a few gentle answers
into a twelve-page personalized memorial storybook PDF ("Saying Goodbye to
[PET_NAME]"). Runs entirely on `localhost` — no accounts, no payments, no
database. See `context/local-prototype-plan.md` for the full plan.

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
  page.tsx              Landing page
  layout.tsx            Root layout (fonts + global CSS)
  globals.css           Design system (ported from prototypes/styles.css)
  fonts.ts              next/font setup (Fraunces, Lora, JetBrains Mono)
  create/<step>/        Wizard steps (upload, pet, child, …, download)
  api/                  Route handlers (upload, session, generate, render-pdf)
lib/
  ai/  pdf/  story/  session/   Domain logic (stubbed for now)
components/
  wizard/  preview/             UI components (stubbed for now)
uploads/ generated/ sessions/ output/   Gitignored runtime artifacts
```

## Design system

`app/globals.css` is the canonical design system (warm editorial palette,
Fraunces/Lora/JetBrains Mono typography, component classes). The same token
values are mirrored into `tailwind.config.ts` `theme.extend`, so UI can use
either CSS custom properties (e.g. `var(--rose)`) or Tailwind utilities
(e.g. `text-rose`). Keep the two in sync — one source of values.
```
