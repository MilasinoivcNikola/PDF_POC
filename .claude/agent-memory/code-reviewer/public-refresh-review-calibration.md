---
name: public-refresh-review-calibration
description: Public-pages-refresh PR series (4 PRs + 1 follow-up) review calibration — PR-1 catalog-data foundation verdict
metadata:
  type: project
---

Public-pages-refresh = 4 PRs + 1 follow-up, splitting the 8-title catalog into "celebrate them" (living) vs "remember them" (loss). Specs under `context/features/public-refresh-pr-*.md`; design prototypes under `context/prototypes/001-public-pages-refresh/`.

**Why:** the landing's two-world split was implied only by ad-hoc per-card accent classes; PR-1 carries it as a `Product.audience` field so PR-2/3/4 render the split (and derive counts) from data.

**How to apply (PR-1 verdict — clean PASS):** the load-bearing call is the **Story-6 reclassification** ("While You're Still Here" → `living`, a tribute to a still-alive pet). The split is deliberately **5 living / 3 loss**, NOT the mockup's 4/4 — so any future "Six keepsakes"-style hardcoded count is a regression PR-2/3 must derive via `getProducts().length`. The partition test pins it correctly (set-equality vs LIVING_IDS/LOSS_IDS catches a new title added with a valid audience; the "valid audience" test catches an unexpected value).

**PR-2 verdict (shared chrome + landing) — PASS, one nice-to-have:**
- `components/site/SiteHeader.tsx` + `SiteFooter.tsx`: client-safe (import only `lib/brand` + `next/link`; landing passes catalog counts as derived values, the components don't import catalog). Boundary test statically walks the public PAGE closure, so the extracted components are auto-covered — no manual entry needed.
- Counts genuinely derived: `getProducts().length` / `getProductsByAudience()` → `numberWord()` table (0–12, `?? String(n)` fallback). No literal "8"/"5"/"3"/"Six keepsakes" survive. living=gold via `.world--living`, loss=rose via default `.world`.
- **Dead CSS (nice-to-have, not blocking):** agent added BOTH `.label--sage` AND `.label--rose` with a comment claiming "the worlds panels + cards use" them — but worlds panels style via `.world*` directly and the old `chooserCard*` accents were deleted. Neither `.label--*` is referenced anywhere. The misleading comment is the worst part.
- All 6 public pages swapped; no orphaned imports (leftover `Link`/`BRAND` all still used); deleted LANDING `page.module.css` had no importers (books/detail/policies keep their OWN co-located page.module.css — distinct files, don't confuse). The two `<img>` lint warnings in books/detail are PRE-EXISTING out-of-scope bodies, not introduced here.

**Refuted / non-findings to not re-raise on this series:**
- `productDisplayTitle` uses `?? ` (nullish) not `||`: an empty-string `displayTitle` would NOT fall back. Inert today (only override is the real "Your Pet and the New Baby" on story-9-newbaby) and arguably correct intent. Not a defect — don't flag unless a future empty-string override appears.
- Story 4 is `living` despite its past-tense memorial checkout option — that's its primary shelf by PM decision, not a misclassification.
- No external consumers of `audience`/`displayTitle`/`getProductsByAudience`/`productDisplayTitle` yet is EXPECTED (data-only PR; consumers land PR-2/3/4). Boundary test stays green (no new imports → still client-safe).
