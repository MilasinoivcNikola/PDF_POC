---
name: rename-dearbound-review-calibration
description: brand rename "Quietly Kept"→"Dearbound" review — byte-identity/guard verified safe; only finding is uneven D2 nav-label softening
metadata:
  type: feedback
---

Reviewed the `feature/rename-dearbound` branding string rename (one PR, BRAND constant in `lib/brand.ts`).

**Validated-as-safe (don't re-flag these in future string-rename reviews):**
- **PDF byte-identity via comment strip:** `lib/pdf/buildInlineCss()` runs `.replace(/\/\*[\s\S]*?\*\//g, "")` on `styles.css` before inlining, so a CSS *comment-header* edit genuinely cannot reach PDF bytes. The only byte-affecting string is `template.tsx` `story[0]?.title ?? "..."` fallback — no catalog product hits it (every product supplies a title), so template byte-identity tests still pass. Confirmed: full suite 1919 green incl. template.test + template.story2.test.
- **`${BRAND}` raw-interpolated into email HTML is NOT an injection vector** — BRAND is a compile-time string constant with no HTML metachars; user-controlled `petName`/`downloadUrl` are correctly `escapeHtml`'d.
- **The guard test is genuinely effective, not vacuous:** `lib/brand.guard.test.ts` walks app/+components/+lib/ on disk (node:fs, recursive), excludes `*.test.*`+self, substring-checks "Quietly Kept". Mutation-tested: injecting the old string into an untouched file (`lib/order/store.ts`) made it fail. Same pattern as `surface.boundary.test.ts`.

**The one real finding class — uneven D2 application (nice-to-have, not a blocker):** Decision D2 said soften the catalog/nav *collective label* ("the keepsakes" → "the books") but KEEP "keepsake" as a product descriptor. The homepage + `/books` header were softened, but 5 sibling `<Link href="/books">` collective-label back-links were left as "The keepsakes"/"All keepsakes"/"See all keepsakes" (policies header+footer, books-detail back-link, OrderForm, confirmation). Same nav role, now points to a page titled "The books" → inconsistent vocabulary. Cosmetic copy, zero behavior risk — flagged as nice-to-have.

**Calibration:** for a pure string-rename PR, the load-bearing checks are (1) mutation-test the guard, (2) confirm the comment-strip claim for PDF, (3) grep that the *kept* descriptor (D2) wasn't over-purged, (4) check the *softened* label was applied to ALL siblings not just the obvious ones. Correctness surface is otherwise nil.
