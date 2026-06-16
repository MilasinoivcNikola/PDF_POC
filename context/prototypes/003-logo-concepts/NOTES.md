# 003 — Logo concepts

**Surface:** public site chrome (the header/footer wordmark). **Problem:** replace
the plain text `BRAND` wordmark + the current 5-blob paw ornament (`SiteHeader.tsx` /
`SiteFooter.tsx`) with a real logo. **Proposal only** — no `app/` / React change.

**What this iteration tries.** Five distinct logo directions for Dearbound, each
shown four ways so the PM can judge in situ: (1) a large hero lockup on paper,
(2) the live nav context (mirrors `.site-header` + `.site-nav`), (3) light / gold
(living) / rose (loss) surfaces, (4) favicon scale at 48/32/16px. Every mark is real
inline SVG + real Fraunces type — no gray placeholder boxes.

The five directions, in brief:
- **01 Refined Paw** — the system today, cleaned up (one soft paw, not five blobs). Lowest risk, but leans "pet brand" over "keepsake book."
- **02 The Bound Spine** *(recommended)* — three sewn signatures seen edge-on with a gold binding stitch. Names the product (a *bound* book), puns "-bound," emotionally neutral so it carries joy and grief equally, and the stitch is the made-by-hand detail.
- **03 Open Heart-Book** — an open book whose pages form a heart. Most emotionally honest, but tips toward sentiment; loses the "book" at favicon size (resolves to a heart).
- **04 Tucked Paw** *(runner-up)* — a dog-eared page with a small paw pressed into it. Marries pet + book in one quiet form; the folded corner is the warm detail.
- **05 The Monogram** — a Fraunces "D" drawn as a spined book inside a colophon seal. Most press-like and timeless, best favicon, but the least warm / least "pet."

**Recommendation: Direction 02 (The Bound Spine).** It's the only mark that states
the actual product, encodes the name without a literal pet cliché, holds both
emotional worlds with equal dignity, and degrades to a clean 16px stacked-book
glyph. 04 is the close runner-up if the PM wants the pet *in* the mark.

**Design decisions / constraints honored.**
- Built entirely on the existing system — verbatim `:root` tokens from
  `app/globals.css`, Fraunces/Lora/JetBrains Mono, the gold = living / rose = loss
  split. No new palette. On dark gold/rose surfaces the lockup inverts to cream.
- The lockup uses the real `.wordmark` type spec (`font-variation-settings: "opsz"
  144, "SOFT" 50`, `--t-lg`) so the wordmark half ports 1:1; the glyph replaces the
  current `.wordmark__ornament` slot.
- New CSS in this mockup (`.lockup`, `.surface*`, `.fav*`, `.dir*`) is **mockup
  scaffolding only** — it exists to *present* the options, not to ship. Only the
  chosen glyph SVG + (if changed) the wordmark gap/spacing would graduate to code.

**Open questions for the PM.**
1. **Direction.** 02 as recommended, or 04 if you want the pet present in the mark?
2. **Accent color of the glyph.** The marks currently use rose (01/03) or gold
   (02/04 stitch & paw) as a fixed accent. Should the glyph stay a single fixed
   color sitewide, or tint per page (gold on living pages, rose on loss pages) to
   echo the two-worlds system? My lean: fixed (one stable brand mark), but it's a call.
3. **Favicon source.** Whichever wins, the favicon becomes a real `.svg` + `.ico`
   set (gold/ink seal variants shown) — confirm you want a colored-chip favicon
   vs. a transparent one.
4. **Wordmark casing/spacing.** All five keep "Dearbound" in title case as today.
   Worth exploring an all-lowercase or letter-spaced variant, or leave the type as-is?
