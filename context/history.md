# Project History

A running log of completed features, in order.

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

## 2026-06-07 — Session Types & Storage

**Branch:** `feature/session-types` → `main` (`e667d2c`, merge `f371e0e`) · Craft Area 3 (nextjs-ui-builder)

Milestone 1, feature 02. Established the shared Story-1 data contract every later craft area imports — wizard writes it, story-merge (03) reads it, the AI pipeline reads the pet fields, the PDF renderer consumes the merged result. Replaced the two `lib/session/` stubs and added one module + two test files.

- `lib/session/types.ts` — string-literal unions for every enumerated field (`Species`, `Pronoun`, `IllustrationStyle`, `AgeBracket`, `DeathType`, `BeliefFrame`, `OtherPetsInHome`, `SessionStatus`), grouped input interfaces (`Pet`/`Child`/`Memories`/`Toggles`), the per-page `GeneratedImage` manifest (carries `promptHash`+`referenceHash` for feature 07 caching), and the **`StoryDraft` (partial, localStorage) vs `StorySession` (complete, on disk)** split. Covers every Story-1 merge field + special-case toggle.
- `lib/session/mappers.ts` — pure derived-field mappers (`pronounObject`, `pronounPossessive`, `speciesDescriptor`) in one home; feature 03 imports them. `speciesDescriptor` returns a bare noun ("boy"/"girl"/"kitty"/"bunny"/"friend") on the contract that Page 12 supplies the leading "good" — carry-forward for 03's merge.
- `lib/session/storage.ts` — `createSessionId()`, `newDraft()` (defaults `watercolor` + `rainbow-bridge`), SSR-safe `loadDraft`/`saveDraft`/`clearDraft` (window-guarded), server-only `writeSession`/`readSession` for `./sessions/[id].json`. `fs` kept out of client bundles via dynamic import (convention-based; `server-only` dep declined for a local POC). `readSession` rethrows on corrupt JSON (finalized order) while `loadDraft` nulls (disposable draft).
- 31 unit tests across `mappers.test.ts` + `storage.test.ts`: pronoun mapping, species-descriptor (incl. pronoun-independence), `newDraft()` defaults + id uniqueness, localStorage round-trip (stubbed `window`), and disk round-trip incl. missing-id → `null`.

**Gates:** `npm run build` ✓ (17 routes) · `npm run test:run` ✓ (32 tests) · code review PASS (sole blocker — missing tests — resolved by the `test` step).

## 2026-06-07 — Story Master Text, Merge & Variants

**Branch:** `feature/story-master-text` → `main` (`57f5458`, merge `1fd190e`) · Craft Area 1 (pdf-render-specialist)

Milestone 1, feature 03. Turned the Story-1 master template into resolvable data: a pure `resolveStory(session)` that composes the four variant dimensions, then merges, producing the ordered page model feature 04 renders with **no further text logic**. Replaced the three `lib/story/` stubs and added a test fixture + two test files.

- `lib/story/master-text.ts` — the master template as **structured data** (not one string): 14 pages (`cover`, `page-1` dedication, `page-2`–`page-12`, `back-cover`), each with `{merge}` placeholders, an illustration brief (feeds feature 07's prompt builders), and `pageNumber`/`title`/`subtitle`. `masterStory()` returns a **fresh mutable copy** each call so variant composition can mutate without leaking across calls. `PLACEHOLDER_PATTERN` is exported as the single placeholder syntax.
- `lib/story/merge.ts` — pure merge engine → `ResolvedStory` (`ResolvedPage[]`). Reuses the feature-02 mappers (`pronounObject`/`pronounPossessive`/`speciesDescriptor`) — no re-implementation. Throws **`MergeError`** carrying **all** missing/empty `missingKeys` (sorted, deduped) rather than ever emitting a literal token. `clean()` strips `{`/`}` from customer free-text so an injected `{token}` can't survive (graceful — never throws on valid input). Optional `parentDedication` surfaces on resolved Page 1 as its own `dedication?` block (distinct typeface per the template), populated only when provided.
- `lib/story/variants.ts` — **compose-before-merge**: death-type → Page 7 (natural default / illness / sudden / euthanasia), belief-frame → Page 9 (rainbow-bridge default / heaven / secular / none, where `none` reuses the secular body), age bracket (3-5 simplifies 7/8/11 and overrides the death-type swap; 6-8 default; 9-12 appends extra sentences on 7/8/11 + a Page-9 line gated on euthanasia), other-pets → appends the extra Page 11 line. `resolveStory()` is the single entry point.
- 48 unit tests (`merge.test.ts` + `variants.test.ts`, shared `fixtures.ts` Otis session): zero surviving placeholders across a full age×death×belief×pets matrix, pronoun/name consistency, the hard **"died"** rule + banned euphemisms across every combination, `MergeError` reporting (multi-key + whitespace-only), the brace-injection regression, and `parentDedication` present/absent. Added a `@`-alias to `vitest.config.ts` so value-imports resolve under vitest.
- Two authored gap-fills flagged for the eventual grief-specialist copy review: the `illness` Page-7 wording (template gave no explicit text) and `beliefFrame: "none"` reusing the secular Page-9 body.

**Gates:** `npm run build` ✓ (17 routes) · `npm run test:run` ✓ (80 tests, +48) · code review **PASS** after fixing two blockers (dropped `parentDedication`; free-text `{…}` surviving the single-pass merge).
