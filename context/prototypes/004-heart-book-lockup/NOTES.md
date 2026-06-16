# 004 — Heart-book lockup (locking Direction 03)

**Surface:** public site chrome (header/footer wordmark) + favicon. **Follows:**
iteration 003, where the PM chose **Direction 03 "Open Heart-Book"** (an open book
whose facing pages rise into a heart). **Proposal only** — no `app/` / React change.

**What this iteration locks (decisions already made by the PM).**
1. **Locked glyph** — the heart-book refined: heart-from-page-tops + spine + open
   covers spreading at the base, drawn in neutral ink (color comes from the tint,
   not the glyph). Two faint inner page-lines only render at hero/header size.
2. **Two-worlds tint (decided)** — shown as three live header strips side by side:
   **neutral ink** in the global header, **gold** on living/celebration pages,
   **rose** on loss/memorial pages. Only the strokes+spine take the tint; the
   page-wash stays `--rose-faint` so the heart always reads warm and it never looks
   like a different logo. Engineer note: glyph stroke = a per-route-group CSS var
   (`--mark-ink`, default `--ink`).
3. **Favicon = the same heart-book, optimized (decided: keep the mark, transparent
   bg, NOT a bare heart/monogram)** — a size-tuned redraw at 48/32/16px: page-lines
   dropped, strokes thickened, covers reduced to bold wedges with a knocked-out
   spine notch so it stays "book + heart," not just "heart." Shown over a
   checkerboard (transparent) and in a browser-tab sim.

**The one open decision — wordmark (section 04).** Four treatments in the live nav:
A title-case Fraunces (control/today), B lowercase, C tracked-out caps, D
letter-spaced small-caps. **My recommendation: D, small-caps** — the press/imprint
dignity of caps but warmer and even-toned, carries celebration and memorial equally,
and sits best under the heart-book's symmetry.

**Honest favicon read.** 48px excellent; 32px good (does the most work, Retina @2×);
16px is near its legibility floor — it reads as "a heart on an open book," the spine
notch is the only feature separating it from "a heart on a base," and it can wash out
on dark tab chrome. Two build asks flagged: ship a real multi-size `.ico`+SVG (each
size uses its tuned drawing, not one auto-scaled file); consider a lighter ink / faint
outline for dark-mode tabs. Within those, the mark survives without falling back to a
generic heart.

**On-system.** Verbatim `:root` tokens from `app/globals.css`, Fraunces/Lora/JetBrains
Mono, the existing gold=living / rose=loss split. No new palette. Wordmark uses the
real `.wordmark` type spec so the pairing ports 1:1; header mirrors `.site-header` /
`.site-nav` / the `.wordmark__ornament` slot.

**Open questions for the PM.**
1. **Wordmark:** A / B / C / D? (My pick: D, small-caps.)
2. **Favicon dark-tab fallback:** OK to add a faint outline / lighter ink for dark
   browser chrome, or keep pure ink transparent and accept it may dim on dark tabs?
3. **Footer glyph:** apply the same tint logic in the footer, or always neutral there?
