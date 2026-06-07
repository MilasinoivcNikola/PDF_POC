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

## 2026-06-07 — PDF Template & Print CSS

**Branch:** `feature/pdf-template` → `main` (`1fc9e0e`, merge `cdf78ef`) · Craft Area 1 (pdf-render-specialist)

Milestone 1, feature 04. Turned the resolved story model into a self-contained, print-ready HTML document — the layer feature 05 (Puppeteer) will render to PDF bytes and feature 10 (in-browser preview) will reuse for screen. Replaced the two `lib/pdf/` stubs and added the stylesheet, self-hosted fonts, and a test file.

- `lib/pdf/template.tsx` — pure **`renderStoryHtml(story: ResolvedStory, images?: PageImageMap): string`** returning a full `<!DOCTYPE html>` document via `react-dom/server` `renderToStaticMarkup`. One `<section class="story-page">` per `ResolvedPage` (**14 total**: cover, page-1…12, back-cover), each mapped to the `preview.html` per-page treatment — cover art + "A story for [child]", Page-1 dedication verse + optional parent `dedication` block (distinct smaller typeface), shared narrative layout for pages 2-6/8/9/11, the Page-7 centered "gentle truth", Page-10 love-stays (lead/hero/"It stays" closer), Page-12 closing, and the back-cover ruled memory page. All copy comes from the resolved model — no hard-coded story text. `PageImageMap = Partial<Record<PageId, string>>` wires per-page image `src`; a missing entry falls back to the prototype's inline placeholder pet SVG so the doc is complete before feature 07.
- `lib/pdf/styles.css` — print stylesheet inlined into `<head>` so the output is fully self-contained for Puppeteer's `setContent`. `@page { size: 8.5in 11in }`, `page-break-after: always` / `break-inside: avoid` for **exactly one printed page per `.story-page`** (last page no trailing blank), 300-DPI **inch-based** image slots, `print-color-adjust: exact` for the warm washes, and the ported `.book-page*`/cover/treatment styles + a re-declared `:root` token copy (unavoidable across the Puppeteer boundary; documented). Square 8×8" noted as a future toggle, not built.
- `public/fonts/*.woff2` — self-hosted **Fraunces** (variable, `opsz`+`SOFT`+`wght` axes, normal+italic), **Lora** (normal+italic), **JetBrains Mono**. `styles.css` declares `@font-face` with `__FONT_*__` placeholder tokens; at render time the function reads each woff2 and base64-inlines it as a `data:font/woff2` URL — **zero external/Google-Fonts requests** in the emitted HTML (woff2 stays the single source; no base64 committed in CSS). Separate from `app/fonts.ts`/`next/font` which serves the Next app UI.
- `vitest.config.ts` — added `oxc.jsx.runtime: "automatic"` so vitest (Vite 8 / Oxc) transforms the new `.tsx` under test; tsconfig keeps `jsx: preserve` for Next, so the build is unaffected.
- `lib/pdf/template.test.tsx` — 20 unit tests over a real `ResolvedStory` (`resolveStory(otisSession())`): full-doc completeness, **14** `.story-page` sections in `data-page` order, resolved copy present (cover title, "A story for Emma", narrative body, Page-12 closing, optional parent dedication present/absent), the hard **"died"** rule (escaped form) with no euphemisms, image-manifest wiring vs placeholder fallback, and no surviving `{placeholder}`/`__FONT_*__` tokens + embedded-font self-containment (no `fonts.googleapis.com`).

**Gates:** `npm run build` ✓ (17 routes) · `npm run test:run` ✓ (100 tests, +20) · `qa` **PASS** (headless-Chrome visual check: 14-page Letter pagination, prototype fidelity, embedded fonts) · code review **PASS** (no blockers; deferred nice-to-haves — base64 font caching for feature 05's batch renders, a cwd-path comment, dead CSS classes).

**Deferred to later features:** actual PDF bytes / Puppeteer (05), real illustrations (07), the on-screen preview route (10).
