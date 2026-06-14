# Feature Spec — Public Refresh PR-4: Book Detail + Policies + Download

> **Series:** Public-pages refresh. This is **PR-4 of 4** (final). Depends on **PR-1**
> (`displayTitle`, `audience`) and **PR-2** (shared chrome).
> Design source: `context/prototypes/001-public-pages-refresh/` —
> `book-detail.html`, `policies.html`, `download.html`.

## Intent

Finish the public surface: rebuild the three remaining page bodies on the refreshed
design — the **book detail** page (the meatiest: gallery, facts, conditional companion
cross-link), and the two light pages, **policies** and **delivery/download**. Chrome is
already shared (PR-2); this PR only redoes the bodies.

## Scope assessment → one PR

Three page bodies. Detail is the substantial one; policies and download are
content-faithful rebuilds small enough to ride along. One PR on
`feature/public-refresh-detail-pages`. (If detail alone proves large in review, it can be
peeled into its own PR — but the default is one.)

---

## Resolved decisions
- **Detail accent follows the book's `audience`** (gold for living, rose for loss) — the
  page reads `product.audience` (PR-1) so the eyebrow/accents match the catalog card.
- **Companion cross-link is conditional**, shown only for the Story 2 ↔ Story 5 pair
  ("one from them, one from you"). Drive it from an explicit `companionId` rather than
  guessing — define a tiny map (`story-2-letter ↔ story-5-letter-to`) local to the detail
  page; no other product shows the block.
- **"Inside the book" section (the old Story-1 TOC, reborn per-book):** **defer.** PR-2
  dropped the landing TOC; bringing a per-book contents section to *every* detail page is a
  content-authoring task (12 entries × 8 books). Not in this PR — note in `context/debt.md`
  if we still want it. Detail uses the gallery + description, not a TOC.
- **Download page keeps both real states** (ready / invalid-or-expired link) — the mockup
  stacks them only for review; production renders one based on token resolution.
- **Titles use `productDisplayTitle`** (PR-1) so "Your Pet and the New Baby" reads right.

---

## Implementation plan (checklist)

### A. Book detail — [app/(public)/books/[productId]/page.tsx](../../app/\(public\)/books/[productId]/page.tsx)
- [ ] Confirm `<SiteHeader>` / `<SiteFooter>` from PR-2; the back-link ("← All books")
      pattern from the mockup is fine in the header slot.
- [ ] Two-column `detail-layout`: left **gallery** (lead image + thumbs from
      `product.sampleImages`, with the graceful no-image fallback for Story 8/9), right
      **info** column: audience-tinted eyebrow label, `display-md` `productDisplayTitle`,
      tagline, full `description`, a `facts` list (Price / Illustrations / Made by hand in
      24–48h), and the primary **"Order this book"** CTA → the existing order route.
- [ ] Conditional `companion` callout for the Story 2 ↔ 5 pair only.
- [ ] Port `detail-layout`, `gallery*`, `info*`, `facts*`, `detail-cta*`, `companion*` into
      `books/[productId]/page.module.css` from the mockup, reusing existing tokens.

### B. Policies — [app/(public)/policies/page.tsx](../../app/\(public\)/policies/page.tsx)
- [ ] Rebuild on the shared chrome + the mockup's `policies*` / `policy-section` layout.
      **Content-faithful** — carry the existing policy copy over verbatim; this is a
      restyle, not a rewrite of terms. Keep the section anchors the footer links target
      (how-it's-made / refunds-&-remakes / privacy).

### C. Download — [app/(public)/download/[token]/page.tsx](../../app/\(public\)/download/[token]/page.tsx)
- [ ] Restyle both states on the shared chrome: **ready** (label, heading with the pet's
      name, reassurance copy, primary download button, the `Saying-Goodbye-to-[PET].pdf`
      filename meta) and **invalid/expired** (gentle "this link isn't working, reply to the
      email" message). **No change to token resolution / data logic** — presentation only.

---

## Out of scope (explicit)
- The **order form** and confirmation — unchanged across the series.
- Per-book "inside the book" TOC content — deferred (see Decisions).
- Any change to delivery-token logic, download auth, or the policy *terms* themselves.
- Story 8 / 9 sample art — the follow-up (detail gallery degrades gracefully meanwhile).

## Testing
- [ ] `npm run build` + `npm run test:run` green. Detail and policies stay in the
      public/static tier; download stays in its current tier — boundary test unchanged.
- [ ] Manual QA (Playwright):
  - `/books/story-2-letter` — gallery, facts, rose accent, **companion** block linking to
    Story 5; `/books/story-5-letter-to` shows the reciprocal block.
  - `/books/story-8-adventure` — renders with the placeholder gallery (no broken image),
    gold accent, CTA works.
  - `/books/story-9-newbaby` — title reads **"Your Pet and the New Baby"** (`displayTitle`).
  - `/policies` — restyled, all section anchors from the footer resolve; terms text intact.
  - `/download/<valid-token>` shows the ready state + correct filename; an unknown token
    shows the gentle error state.

## Risks / notes
- Detail is the only page with real layout complexity (sticky gallery); budget review time
  there. Policies/download are low-risk restyles.
- Double-check the companion map both directions so neither letter shows a dangling link.
- Verify the download page's two states still key off the exact same condition the current
  page uses — restyle must not change which state shows when.
