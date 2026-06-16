## 2026-06-16 — Landing Redesign (lead with visual proof)

`feature/landing-redesign-visual-proof` — presentation-only rebuild of the public
landing page (`app/(public)/page.tsx`), plus two responsive/chrome fixes surfaced
during QA. Design source of truth: `context/prototypes/005-landing-with-proof/`.
Page stays `○` Static (SSG); no engine/PDF/commerce/catalog-data change; PDFs
byte-identical; 2135 tests green.

### Why

The old landing was **all text and showed no artwork** — the single magic of
Dearbound ("the book looks like *your* pet") was asserted in prose but never shown.
For a product sold on a visual transformation, that was the biggest conversion leak.
This redesign leads with real sample imagery and a dedicated proof section.

### What shipped

**The seven-section landing** (replacing hero → two-worlds → how-it-works):

1. **Hero with visual proof** (`.hero--proof`) — the sharpened headline *"Books that
   look like your actual pet."* + CTA + a two-column layout with a fanned stack of
   three real sample covers. **Celebration-forward** (PM call): the corgi
   `adventure-cover` is the lead/front card (`.s-front`), with the Story-6 tribute and
   Story-7 welcome covers fanned behind.
2. **The transformation** (`.proof`) — the literal photo→painting proof that answers
   *"will it really look like MY pet?"*: the **rabbit** `source-photo.jpg` (a plain
   polaroid) beside the painted rabbit `baby-cover.jpg` (keepsake-frame treatment),
   "From your photo → The page we painted." PM chose a **living** title (Story 9) as
   the first proof rather than the memorial dog — a lighter first impression.
3. **Two worlds** — the existing celebrate (gold) / remember (rose) split, kept
   verbatim with a new centered `.section-head`; counts stay catalog-derived.
4. **How it works** — the existing three steps, moved lower (proof earns the process).
5. **FAQ-lite** (`.faq`) — six short, truthful Q&As killing the dealbreakers
   (likeness, "is it just AI", refund/remake, turnaround, printing, photo privacy);
   answers reconciled with `policies/page.tsx` + the product model.
6. **Closing CTA band** (`.closing-band`) — one warm final prompt → `/books`.
7. `<SiteFooter />` unchanged; landing keeps a neutral header.

All counts stay **catalog-derived** (`getProducts()` / `getProductsByAudience()` via
the existing `numberWord` helper) — no hardcoded numbers. Images use the committed,
web-optimized `public/samples/...` copies (not the gitignored `generated/`/`uploads/`
mockup paths). Four new CSS blocks in `app/globals.css` (`.hero--proof`, `.proof`,
`.faq`, `.closing-band`) + the shared `.section-head`, built only from existing
`:root` tokens.

### Responsive + chrome fixes (folded in during QA)

The first QA only measured horizontal overflow at four round widths and missed two
real breaks at in-between widths (~600–820px). Both fixed and verified across a dense
sweep of 19 widths (320→1920px) with programmatic overlap detection:

- **Hero stack vertical overflow** — `.hero__stack` used a fixed pixel height while its
  absolutely-positioned figures are sized as a % of width with portrait aspect ratios,
  so at narrow widths the images grew taller than the container and overlapped the
  header above and the headline below. Fixed by making the container height **track
  width** (`aspect-ratio: 1 / 0.85`) and, in the ≤860px single-column layout, capping +
  centering the stack (`max-width: 440px; margin-inline: auto`). After: `figVsHeader`
  and `figVsTitle` overlap = 0 at every width; no horizontal overflow anywhere.
- **Proof arrow label** — the ≤760px media query rotated the *entire* `.proof__arrow`
  90°, which turned the "painted by hand" label vertical. Fixed by rotating **only the
  SVG** so the arrow points down and the label stays horizontal.
- **Mobile navigation** (shared `.site-header`, all public pages) — at phone widths the
  wordmark + nav didn't fit one row, so each nav label wrapped to two lines ("THE /
  BOOKS"). Fixed with `white-space: nowrap` on nav links + a `@media (max-width: 560px)`
  that stacks the header (wordmark on top, nav beneath). Verified: stacks ≤560, one row
  ≥600, no internal wrapping or horizontal overflow at any width.
- **Pink heart in the logo** (`components/site/HeartBookMark.tsx`, shared) — the heart
  fill was `--rose-faint` (#F1DDD5), so pale it read as an unfilled outline on the cream
  header. Not a regression — computed fill confirmed it was applied, just invisible.
  Bumped to `--rose-soft` (#DCBCB1) → now a visible soft pink. The fill stays a fixed
  rose regardless of the `--living`/`--loss` accent (the accent only drives the
  `currentColor` stroke) — pre-existing intentional design, just now visible.

### Review (PASS, no blockers)

`code-reviewer` **PASS** + `context-auditor` **IN SYNC** (the heart-color swap's
source-of-truth — the component comment — was updated in-branch; `heart-book-logo.md`
only specced the stroke/tint, not the fill, so no contradiction; remaining
`--rose-faint` mentions are out-of-scope history/frozen mockups). No
`commerce-security-reviewer` (presentation-only, no commerce surface). Four
non-blocking nice-to-haves — all this feature's own leftovers — fixed on the branch:
the four sample `<img>` intrinsic `width`/`height` attributes corrected to match the
real assets (covers are 1000×1000 square, not 800×1035; `source-photo.jpg` is
1000×750), the three orphaned `.hero` / `.hero__ornament` / `.hero__cta` CSS rules
(grep-confirmed unused) removed, and the overstated `.proof__art::after` "print frame
mirror" comment trimmed.

### QA

`qa-verifier` 8/8 PASS on the first round (sections, hero lead card hit-tested, rabbit
transformation, all five `/samples/...` images 200, derived counts, CTAs → `/books`,
responsive sweep, clean console). The two breaks above were caught by the PM after
that QA and fixed + re-verified.
