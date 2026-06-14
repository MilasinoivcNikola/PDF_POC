# Feature Spec — Public Refresh PR-1: Catalog Data Foundation

> **Series:** Public-pages refresh (4 PRs + 1 follow-up). This is **PR-1 of 4**.
> Siblings: `public-refresh-pr-2-chrome-and-landing.md`,
> `public-refresh-pr-3-catalog-page.md`,
> `public-refresh-pr-4-detail-policies-download.md`,
> `public-refresh-followup-story-8-9-samples.md`.
> Design source: `context/prototypes/001-public-pages-refresh/`.

## Intent

The refreshed landing and catalog split the 8-title line into two worlds —
**"celebrate them" (living)** vs **"remember them" (loss)**. That split is currently
implied only by ad-hoc per-card accent classes on the landing
(`chooserCardLiving/Joyful/Adventure/Newbaby` in [page.tsx](../../app/\(public\)/page.tsx)).
Before any page can render the split from data, the catalog needs to **carry the
classification as a field** — and the page copy needs to **derive counts** instead of
hardcoding them (the live hero still says "Six keepsakes" for an 8-title catalog).

This PR is **data + pure helpers only — no visible change**. It ships invisibly and
unblocks PR-2/3/4, so each of those becomes low-risk presentational work.

## Scope assessment → one PR

Small, self-contained change to [lib/catalog/products.ts](../../lib/catalog/products.ts)
plus its test. Pure, client-safe module (no IO) — same discipline as today. One PR on
`feature/public-refresh-catalog-data`.

---

## Resolved decisions (locked with PM)

1. **Internal field name vs. display copy are intentionally different.** The field is
   `audience: "living" | "loss"`; the customer-facing words are **"celebrate" /
   "remember"** (section headers) and the framing **"for the days you have" / "for the
   goodbye"** (kickers). Page copy lives in PR-2/3, not here.
2. **Living-vs-loss is the axis (not celebration-vs-memorial).** This is the call that
   moves **Story 6 "While You're Still Here"** to the **living** side — it's a tribute to
   a pet who is *still alive*, so filing it under "the goodbye" was the tone-miss we're
   fixing. Consequence: the split is **5 living / 3 loss**, not the 4/4 the mockup drew —
   which is exactly why counts must be derived, never written as "four."
3. **`displayTitle` override, set only where the stored title reads incomplete on a
   standalone card.** Today that's only Story 9 ("And the New Baby" → **"Your Pet and the
   New Baby"**). All other products fall back to `title`.

### Audience mapping (the 8 products)

| productId | title | audience |
|---|---|---|
| `story-1-book` | Saying Goodbye | `loss` |
| `story-2-letter` | A Letter from Your Pet | `loss` |
| `story-5-letter-to` | A Letter to Your Pet | `loss` |
| `story-4-talk` | If Your Pet Could Talk | `living` |
| `story-6-tribute` | While You're Still Here | `living` |
| `story-7-welcome` | Welcome Home | `living` |
| `story-8-adventure` | The Amazing Adventures of Your Pet | `living` |
| `story-9-newbaby` | And the New Baby | `living` |

> Note on Story 4: it's primarily a joyful/living book but offers a past-tense
> (pet-has-died) option at checkout. It is classified **`living`** — that's its primary
> shelf; the memorial option is a checkout nuance, not a second catalog placement.

---

## Implementation plan (checklist)

### A. Extend the `Product` contract
- [ ] In [lib/catalog/products.ts](../../lib/catalog/products.ts), add to the `Product`
      interface:
  - `audience: "living" | "loss";` — which world the title belongs to.
  - `displayTitle?: string;` — optional card/landing title override; falls back to `title`.
- [ ] Thread both through `buildProduct(...)` (add to the `meta` pick / params). Keep the
      module **pure and client-safe** — no new imports beyond the existing registry pull.

### B. Populate the catalog
- [ ] Set `audience` on all 8 entries per the mapping table above.
- [ ] Set `displayTitle: "Your Pet and the New Baby"` on `story-9-newbaby` only.

### C. Pure selector helpers (so pages don't re-implement filtering)
- [ ] `export function getProductsByAudience(audience: "living" | "loss"): Product[]` —
      `getProducts().filter(p => p.audience === audience)`, preserving catalog order.
- [ ] `export function productDisplayTitle(p: Product): string` — `p.displayTitle ?? p.title`.
      (One obvious place for the fallback so cards/landing/detail never each re-derive it.)

> Total count for "N books" copy is just `getProducts().length` — no dedicated helper
> needed; PR-2/3 call it directly. The point is **no literal count in JSX.**

---

## Out of scope (explicit)
- Any JSX / page / CSS change — that's PR-2 (landing), PR-3 (catalog), PR-4 (detail etc.).
- Pricing changes — the placeholder prices stand (separate, PM-gated).
- A bundle SKU, a third audience value, or per-title sub-categories — not now.
- Touching the engine registry, order model, or Lemon Squeezy mapping.

## Testing
- [ ] Extend [lib/catalog/products.test.ts](../../lib/catalog/products.test.ts):
  - Every product has a valid `audience` (`"living" | "loss"`).
  - The exact partition matches the mapping table (assert the two id sets) — this is the
    test that catches a future title being added without a deliberate classification.
  - `getProductsByAudience` returns the right members, in catalog order, and the two
    results partition `getProducts()` with no overlap/no omission.
  - `productDisplayTitle` returns the override for `story-9-newbaby` and `title` otherwise;
    no product's resolved display title is empty.
- [ ] `npm run test:run` + `npm run build` green.
- [ ] No manual QA needed — zero visible change (confirm `/` and `/books` still render
      byte-for-byte as before, since nothing consumes the new fields yet).

## Risks / notes
- **The one judgement call is the Story-6 reclassification** (Decision 2) — it's the whole
  reason for the field. The partition test pins it so it can't silently regress.
- Adding fields to the client-safe catalog keeps it client-safe (no new imports). The
  boundary test (`lib/runtime/surface.boundary.test.ts`) still passes unchanged.
