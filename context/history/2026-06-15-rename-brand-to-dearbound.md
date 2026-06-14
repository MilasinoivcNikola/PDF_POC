# Rename the brand to Dearbound

**Date:** 2026-06-15
**Branch:** `feature/rename-dearbound` (feat `f1fd117`, merge `1eaf042`)
**Spec:** [context/features/rename-to-dearbound.md](../features/rename-to-dearbound.md)

## What & why

The catalog outgrew its "pet keepsake / memorial" framing. With 9 stories now spanning
memorial (1, 2, 5), living tribute (4, 6), gotcha-day (7), adventure (8), and new-baby
(9), the user-facing brand **"Quietly Kept — A gentle goodbye"** read too sad for the
joyful half of the line. Rebranded to **Dearbound** (exact-match domain dearbound.com,
bought 2026-06-14) — coined from *dear* (warmth across grief and joy) + *bound*
(bookbinding + the owner↔pet bond), species-neutral by design.

This was a **branding string rename only** — no behavior, layout, pricing, route, or
state-machine change. The single risk was *missing a spot*; mitigated by a guard test.

## Locked decisions (PM-approved)

- **D1 tagline:** *"Dearbound — custom illustrated books starring your pet"* (replaces the
  memorial-only "A gentle goodbye"), used in the `<title>` and the landing hero.
- **D2 "keepsake" common noun:** kept as a generic product descriptor (email
  `keepsakeNoun()`, body copy, prose) — it's accurate and not the brand. Only the
  catalog/nav **collective label** was softened ("The keepsakes" → "The books").
- **D3 doc scope:** rewrote the **live** doc set; left `context/history.md`,
  `context/history/*`, and superseded `context/features/*` as the dated record of what
  shipped under the old name. (Prior brand was "Quietly Kept" — recorded here per spec.)

## How

- **`lib/brand.ts`** — new `BRAND = "Dearbound"` constant, the single source for the
  wordmark, imported via `@/lib/brand` across ~16 public/operator/shared pages + their
  per-page `<title>` suffixes. Plain string constant, safe in Server and Client
  Components. Converts the riskiest part (16 scattered literals) into one edit.
- **`app/layout.tsx`** — new tagline title + refreshed, catalog-spanning description.
- **Catalog/nav (D2)** — softened the collective label evenly: the `/books` header/title
  plus 5 sibling back-links ("All keepsakes" / "See all keepsakes" / "The keepsakes" →
  "books"), caught in review as an initial uneven application.
- **Email** — `lib/delivery/email.ts` brand lines → `BRAND`; `FROM_EMAIL` example +
  `payload.from` test assertions → `Dearbound <hello@dearbound.com>`. `keepsakeNoun()`
  kept (D2).
- **PDF fallback** — `lib/pdf/template.tsx` fallback literal → "Dearbound" (the only
  byte-affecting string; no catalog product reaches it — byte-identity tests still pass).
- **Live docs/config** — `CLAUDE.md` title (+ fixed the "loacl" typo), `README.md`,
  `commerce-roadmap.md` design-system name, `.claude/agents/*`, the feature skill,
  design-system comment headers, prototypes. Masterstories (Stories 6–9) scrubbed of
  current-house-style "Quietly Kept" refs per a review finding (PM chose to scrub now).
- **Guard test** — `lib/brand.guard.test.ts` walks `app/`/`components/`/`lib/` (excludes
  `*.test.*`), asserts zero surviving "Quietly Kept". Mutation-verified by the reviewer
  (injected a fake offender; the test caught it).

## Verification

- `npm run test:run` — **1919 passed / 89 files** (guard, email, both PDF byte-identity
  locks included). `npm run build` — clean, route topology preserved (public SSG, operator
  dynamic).
- **Review:** code-reviewer + context-auditor both PASS. No commerce surface touched, so
  the commerce-security-reviewer was not dispatched.
- **QA:** drove the live app (Playwright, $0 spend) — `/`, `/books`, product, order,
  confirmation, policies, `/create/preview` all show "Dearbound" with consistent "books"
  nav vocabulary and the new hero. Admin pages SKIPPED (local Supabase URL placeholder
  crashes them pre-render — pre-existing env limit, not a rename regression; brand chrome
  source-verified via `lib/brand.ts`).

## Notes / not done

- `lib/pdf/styles.css` header comment was **safe** to edit — `buildInlineCss()` strips all
  CSS comments before inlining, so PDF bytes are unchanged.
- The localStorage draft key `quietly-kept:draft` was intentionally **not** renamed (a
  persisted code identifier, not the wordmark — renaming would orphan existing drafts).
- Scope wording "pet-memorial PDF POC" survives in some `.claude/` agent/skill headers —
  judged a *scope*-framing matter (not brand), acceptable to leave for this PR.
- Actual DNS/Vercel domain wiring, the real `FROM_EMAIL` mailbox, and Lemon Squeezy /
  Supabase dashboard names are ops, not code — out of scope.
