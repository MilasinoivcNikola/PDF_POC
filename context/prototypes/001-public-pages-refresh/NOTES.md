# 001 — Public pages refresh

## What this iteration tries

A cohesive redesign of the **entire public surface** — landing, `/books` catalog,
book detail, order form, policies, and the delivery/download page — as one
consistent set. It **extends the existing Dearbound design system** (the live
`app/globals.css` tokens, fonts, `.btn` / `.field` / `.label` / `display-*` /
`.wizard` / `.form-layout` classes are reused verbatim); it does **not** invent a
new visual language. All token *values* and component class *names* match
`globals.css`, so the new pieces port 1:1 into the real `page.module.css` files.

The one **structural** idea worth a PM decision: the catalog has grown to **8
titles split roughly half joyful / half grief**. The current landing page dumps all
8 chooser cards in a single stack and the current `/books` lists all 8 in one
undifferentiated grid. This refresh introduces a **"two worlds" split** —
*celebrate them* (4 living/joyful titles) vs *remember them* (4 memorial/tribute
titles) — used consistently on both the landing ("two worlds" panels) and the
catalog (two labelled sections with anchor links `#joyful` / `#memorial`). Joyful
cards take a **gold** accent; memorial cards keep the **rose** accent. This keeps a
grieving visitor from wading through adventure books, and a gift-shopper from
wading through goodbye letters.

## What changed vs. the current live pages

- **Shared chrome upgrade:** a real `.site-nav` cluster in the header (the live
  header carries only a single "The books" link) and a richer 3-column
  `.footer-rich` with brand + tagline + link columns (the live footer is two mono
  labels). Both are additive and optional.
- **Landing:** hero pares back to a single CTA + a short lede; the 8-card dump is
  replaced by the two-worlds panels; a new **"How it works" 3-step trust strip**
  (tell us → we paint it → it arrives) is added. The Story-1 table-of-contents
  section from the live landing is dropped here (it over-indexed on one title) —
  flag if you want it back.
- **Catalog:** two labelled sections instead of one grid; cards carry a **kicker**
  (the audience line, e.g. "A kids' adventure") + price + illustration/page count.
  Real titles, taglines, prices and counts pulled from `lib/catalog/products.ts`
  ($34/$29/$29/$27 joyful; $29/$29/$29/$32 memorial).
- **Book detail:** unchanged in spirit (sticky gallery left, info right, facts
  list, companion cross-link), just rebuilt on shared tokens with a cleaner facts
  list and the Story-2↔5 companion block styled as a `--cream-deep` callout.
- **Order form:** the live two-column `.wizard` / `.form-layout` is reused exactly;
  this mockup shows the **Story-1 field set** (the richest one) including the photo
  upload zone, species/pronoun/style radios, and the lettered child+memory fields.
- **Policies & download:** content-faithful rebuilds. The download mockup shows
  **both** delivery states (ready + expired link) stacked, separated by a
  dashed mockup-only divider, so you can review both at once.

## New CSS (not in globals.css — all built from existing tokens)

`.site-nav`, `.footer-rich*`, `.hero*`, `.how*`, `.worlds`/`.world*`,
`.catalog-intro*`, `.cat-section*`, `.grid`, `.card*`, `.detail-layout`,
`.gallery*`, `.info*`, `.facts*`, `.detail-cta*`, `.companion*`, `.policies*`,
`.policy-section`, plus `.ph`/`.ph--joyful`/`.ph__paw` (placeholder art blocks
standing in for the real sample JPEGs under `public/samples/`), and the
`.label--sage` / `.label--rose` accent variants. None override an existing class.

## Open questions for the PM

1. **The two-worlds split** — do we want this celebrate/remember framing as the
   primary navigation of the catalog, or keep one flat grid? It's the biggest call
   here and it changes the storefront's whole shape.
2. **Joyful = gold, memorial = rose** — is that accent mapping right? (Gold is the
   live "made by hand" accent; it reads warm/celebratory. Rose is the existing
   grief accent.) The live landing already gives Stories 6/7/8/9 their own bespoke
   accents — this collapses them into two families.
3. **Drop the Story-1 table of contents from the landing?** I removed it (it
   showcased a single title on a now-8-title storefront). It could return as a
   per-book "inside the book" section on the detail page instead.
4. **Header nav** — is "The books / How it's made" enough, or do we want the
   celebrate/remember split surfaced in the nav too?

## How to view

Open any file by double-click (self-contained, fonts via Google Fonts CDN):
- `context/prototypes/001-public-pages-refresh/index.html` — landing
- `context/prototypes/001-public-pages-refresh/books.html` — catalog
- `context/prototypes/001-public-pages-refresh/book-detail.html` — book detail
- `context/prototypes/001-public-pages-refresh/order.html` — order form
- `context/prototypes/001-public-pages-refresh/policies.html` — policies
- `context/prototypes/001-public-pages-refresh/download.html` — delivery (both states)
