# 01 — Project Scaffolding & Design System

> **Craft Area:** 3 — App/UI · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 1 (setup) · **Depends on:** — (greenfield)
> **Branch:** `feature/scaffolding`

## Status

Not Started

## Goals

- `npm run dev` boots a Next.js 15 (App Router) + TypeScript app on `localhost:3000` with a styled landing page that matches `prototypes/index.html`.
- The warm editorial design system from `prototypes/styles.css` is available app-wide (tokens + base typography + component classes), so later UI work reuses it rather than reinventing it.
- The three project fonts (Fraunces, Lora, JetBrains Mono) load via `next/font` with no FOUT/CLS.
- `npm run build` and `npm run test:run` both pass on an empty/placeholder test, establishing the gates from `ai-interaction.md`.
- The full directory skeleton from the plan exists (stubbed where needed) so subsequent features have a home.

## Scope

**In scope**
- Next.js 15 App Router project (TypeScript, ESLint), Tailwind CSS configured.
- Port `prototypes/styles.css` into the app as the global stylesheet; expose its tokens to Tailwind's theme so utilities and the existing class names coexist.
- `next/font/google` setup for Fraunces (variable, opsz+SOFT axes used by the prototypes), Lora, JetBrains Mono, wired to the `--font-display` / `--font-body` / `--font-mono` CSS variables the stylesheet already references.
- Root `app/layout.tsx` + landing `app/page.tsx` rebuilt from `prototypes/index.html` (header wordmark, hero, "What you will create" table of contents, footer). Link "Begin your story" → `/create/upload` (route can be a stub for now).
- Vitest set up with `npm run test` / `npm run test:run` scripts; one trivial passing test.
- Create the folder skeleton from the plan: `app/`, `app/create/*`, `app/api/*`, `lib/ai/`, `lib/pdf/`, `lib/story/`, `lib/session/`, `components/wizard/`, `components/preview/`, plus gitignored runtime dirs `uploads/ generated/ sessions/ output/` (already in `.gitignore`). Stub files are fine — just enough to anchor imports.
- `.env.local.example` documenting `OPENAI_API_KEY`.
- A short `README.md` at repo root: how to run dev, build, test.

**Out of scope**
- Any wizard step logic, AI calls, or PDF rendering (later features).
- Mobile responsiveness beyond what the prototype already implies (desktop-first per plan).
- Replacing the prototype's hand-tuned CSS with pure Tailwind utilities — keep the stylesheet; Tailwind is additive.

## Implementation notes

**Key decisions**
- **Keep `styles.css` as the design system.** It is already a complete, on-brand stylesheet. Import it globally (e.g. `app/globals.css` `@import` or copy in) rather than rewriting every component as Tailwind utilities. Map the same token values into `tailwind.config` `theme.extend` (colors, fontFamily, spacing, fontSize) so future work can use either. Don't fork the palette — one source of values.
- **Fraunces is a variable font** with `opsz` and `SOFT` axes; the prototypes lean on `font-variation-settings`. Load it as a variable font so those settings work. Lora and JetBrains Mono are straightforward.
- The prototype's `<link>` to Google Fonts should be replaced by `next/font` to keep generation/preview self-contained and avoid a network dependency at render time (matters later for Puppeteer).
- Confirm the exact Next.js 15 / Tailwind init flow against current docs (use context7) — versions move.

**Files (representative)**
- `package.json`, `tsconfig.json`, `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `vitest.config.*`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `lib/**`, `components/**` stub `index`/placeholder files
- `.env.local.example`, `README.md`

## References

- @prototypes/index.html — landing page to rebuild
- @prototypes/styles.css — the design system to port
- @context/local-prototype-plan.md — "Project structure" + "Tech stack" sections
- Use context7 for the latest Next.js 15 App Router, Tailwind, and `next/font` setup.

## Done when

- [ ] `npm run dev` serves a landing page visually faithful to `prototypes/index.html`.
- [ ] Fonts render via `next/font` (no external Google Fonts `<link>`); variable-font axes look right.
- [ ] Design tokens from `styles.css` are usable both as CSS vars and (mirrored) in Tailwind theme.
- [ ] The full folder skeleton exists; runtime dirs are gitignored.
- [ ] `npm run build` passes; `npm run test:run` passes.

## Tests

- Trivial smoke test proving Vitest runs (`test-author` will expand coverage in later features).
- Manual `qa`: landing page renders, fonts load, "Begin your story" navigates to `/create/upload`.
