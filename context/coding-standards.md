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
  `components/{wizard,preview}/` as named exports.
- Route handlers live in `app/api/*/route.ts` and export named HTTP verbs
  (`export async function POST()`).
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
- No database. Sessions are JSON files (`./sessions/[id].json`); images are files
  under `./generated/[session-id]/`. Keep this — it's a deliberate scope choice.
- Secrets come from `.env.local` (`OPENAI_API_KEY`). Never hardcode keys; never log
  them. Keep `.env.local.example` in sync when a new env var is introduced.

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
- **Cost tiers are a hard rule:** `low` while iterating on prompts, `medium` for real
  book runs, `high` only for final/cover renders. Default new code to the cheapest
  tier that fits.
- **Cache by `hash(prompt + reference images)`.** Regenerating one page must re-call
  the API for that page only — never the whole book.
- Pet consistency is the central craft problem (Approach A → B in the plan). Prompt
  builders live in `lib/ai/prompts.ts`, one per scene; orchestration in `generate.ts`.
  Pass references as base64 data URLs.

### Story text (`lib/story/`)
- The master templates in `context/masterstories/` are the source of truth for
  wording. `master-text.ts` holds the text with `[MERGE_FIELDS]`; `merge.ts`
  substitutes; `variants.ts` composes age / death-type / belief-frame variants
  **before** merge.
- After merge, **no literal `[FIELD]` may survive** into output — assert this.
- Honor the master template's "Quality bar / what to avoid": e.g. use the word
  "died," never "passed away." These are product requirements, not style preferences.
