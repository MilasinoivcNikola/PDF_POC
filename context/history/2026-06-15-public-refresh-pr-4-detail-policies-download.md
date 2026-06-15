# Public Refresh PR-4: Book Detail + Policies + Download

**Branch:** `feature/public-refresh-detail-pages`
**Date:** 2026-06-15
**Milestone:** 15 — Public-pages refresh (the final PR, 4 of 4)

## What shipped

The last of the four-PR public-pages refresh. PR-2 had already swapped every public
page onto the shared `SiteHeader`/`SiteFooter` chrome and PR-3 rebuilt the `/books`
catalog; this PR finished the three remaining page bodies — **book detail**, **policies**,
and **download** — on the refreshed design. Presentation-only: no engine, commerce, or
data-logic change.

### A. Book detail — `app/(public)/books/[productId]/page.tsx` (+ `page.module.css`)
The substantive page. Changes:
- **Titles use `productDisplayTitle(product)`** (PR-1) in both metadata and the `<h1>`, so
  Story 9 reads "Your Pet and the New Baby" rather than the raw `[PET_NAME]` template.
- **Audience tint** — `const living = product.audience === "living"` drives a **gold**
  eyebrow + tagline for living books and **rose** for loss, matching the catalog-card
  family accent. Carried by self-contained module classes (`eyebrowGold`/`eyebrowRose`/
  `taglineGold`), consistent with how PR-3's catalog scoped its rose (no global
  `label--rose`).
- **Gallery placeholder fallback** — when `sampleImages.length === 0` (Story 8/9) the
  gallery renders one lead-sized placeholder panel with the centered `PawMark` instead of
  a broken `<img>`, the same approach PR-3 used on the catalog card, ported to the gallery.
  `galleryJoyful` (living) vs the loss default tint the panel differently.
- **Companion callout** unchanged in mechanism — an explicit local `COMPANION_PRODUCT_ID`
  map (`story-2-letter ↔ story-5-letter-to`) renders the "One from them, one from you"
  block for that pair only; verified both directions resolve (neither letter dangles). The
  companion link text was switched from `companion.title` to `productDisplayTitle(companion)`
  in review for consistency (no behaviour change today — neither letter has a `displayTitle`
  override).
- New CSS reuses existing `globals.css` tokens (`--rose-soft`, `--sage-soft`, `--gold-soft`,
  `--cream-deep`, `--gold`, `--rose`) — no hardcoded hex.

### B. Policies — `app/(public)/policies/page.tsx`
Added stable section ids `#how-its-made` / `#refunds-and-remakes` / `#privacy`. Policy copy
left **verbatim** (content-faithful — terms unchanged; the placeholder-privacy / AI-honesty
debt rows still stand).

### C. SiteFooter — `components/site/SiteFooter.tsx`
Pointed the three policy footer links at the new anchors (previously all bare `/policies`),
so the footer-link → policy-section pairing the spec described actually works. The
component's own comment was updated in the same diff to match. Touches the footer on all
public pages, but additively (the anchors didn't exist before on either side).

### D. Download — `app/(public)/download/[token]/page.tsx`
**No change.** Already matched the mockup's ready/invalid states (PR-2 had moved it onto the
shared chrome); the token-resolution condition was untouched as the spec required.

## Verification
- `npm run test:run` → **1927 passed (89 files)**, incl. `surface.boundary.test.ts` (no
  engine / `lib/supabase/server` / `lib/ai/*` leaked into the public graph).
- `npm run build` green. Tiers held: `/books/[productId]` ● SSG, `/policies` ○ Static,
  `/download/[token]` ƒ Dynamic.
- Review: code-reviewer + context-auditor — PASS. One nit fixed (companion title),
  one deferral recorded (per-book TOC → `debt.md`). Commerce-security skipped (no commerce
  surface touched).
- QA (Playwright, $0): **6/6** — companion both directions, Story-8 placeholder gallery
  (no broken image), Story-9 displayTitle, Story-1 real art, policies anchors scroll,
  download invalid-state renders gently (ready state not testable locally — needs a
  `delivered` order).

## Deferrals (in `context/debt.md`)
- Per-book "inside the book" detail-page TOC — content-authoring task (~12 entries × 8
  books); the detail page uses gallery + description instead. Flips to blocking only if the
  PM wants a contents section.

## Notes for later
- The `/api/download/[token]` route crashed the dev process once on cold-compile during QA,
  then compiled fine on restart and returned a clean 404. Out of PR-4 scope (presentation
  only) — surfaced for awareness, route resilience not investigated.
