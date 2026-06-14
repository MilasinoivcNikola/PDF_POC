---
name: design-system
description: Dearbound's live design-system tokens, fonts, and component classes — the source mockups must extend, not fork
metadata:
  type: project
---

The Dearbound design system is single-sourced in `app/globals.css` `:root`
(Tailwind config mirrors it). Mockups MUST reuse its tokens + class names so they
port 1:1; only add new CSS for genuinely new patterns and note them in NOTES.md.

**Why:** the brand constraint — extend the system, don't redesign from scratch
unless the PM explicitly asks for a fresh visual language.

**How to apply:** before designing, reuse these.

- **Fonts:** Fraunces (display, variable — `opsz` + `SOFT` axes; the header/buttons
  use `"opsz" 144, "SOFT" 50`, body display `"SOFT" 30`), Lora (body), JetBrains
  Mono (`.label`, kickers, page numbers). Live app self-hosts via `next/font`; in a
  standalone mockup pull them from the Google Fonts CDN (build concern, not design).
- **Palette tokens:** `--cream`/`--paper` (bg), `--ink`/`--ink-soft`/`--ink-muted`/
  `--ink-faint` (text), `--rose` (the grief/primary accent), `--sage`, `--gold` (the
  "made by hand" warm accent), `--border*`. Warm editorial / letterpress aesthetic;
  paper-texture body::before + radial wash.
- **Reusable component classes:** `.btn`/`.btn--primary`/`.btn--ghost`/`.btn-link`,
  `.field`/`.field__label`/`.field__num`/`.field__hint`/`.field__optional`,
  `.radio-option`, `.upload-zone`, `.notice`, `.label`/`.label--gold`,
  `display-xl/lg/md/sm`, `.lede`, `.helper`, `.wizard`/`.wizard__quote`/
  `.form-layout` (sticky heading + 2:1 fields — the order form reuses this),
  `.wizard-footer`, `.save-status`, `.download-final`, `.fade-in`/`fade-in-1..5`,
  `.site-header`/`.wordmark`/`.site-footer`, the paw-print wordmark SVG.
- **Brand strings:** `lib/brand.ts` `BRAND = "Dearbound"`; tagline "custom illustrated
  books starring your pet"; domain dearbound.com. Never hardcode a stale name.
- **Tone rule (grief context):** the product is half memorial / half celebration.
  Memorial copy says "died", never "passed away" (a product requirement, not style).
- **Catalog is data:** `lib/catalog/products.ts` is the source of titles, taglines,
  descriptions, placeholder prices, and derived `illustrationCount`. 8 books as of
  2026-06-15. Prices (placeholder): Story1 $29, Story2 $29, Story4 $29, Story5 $29,
  Story6 $32, Story7 $29, Story8 $34, Story9 $27.
- **Live header is thin** (one "The books" link) and **footer is two mono labels** —
  iteration 001 proposed a richer `.site-nav` + `.footer-rich`; not yet shipped.
