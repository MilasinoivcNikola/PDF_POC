# 005 — Landing redesign with visual proof

## What this iteration tries
A full restructure of the public landing page (PM-approved) that fixes the current
landing's biggest flaw: **it is all text and shows nothing.** The single magic of
Dearbound — "the book looks like *your* pet" — is asserted in prose but never shown.
This iteration leads with proof.

New section order, top to bottom:

1. **Hero with artwork** — same big Fraunces headline + single primary CTA as today,
   but in a two-column layout with a fanned stack of three *real* sample covers
   (Welcome Home, While You're Still Here, Saying Goodbye). The headline is sharpened
   from a generic "Custom illustrated books starring your pet" to the differentiator:
   **"Books that *look like* your actual pet."** Proof is now above the fold.
2. **The transformation (the key new section)** — the literal answer to the silent
   objection *"will it really look like MY pet?"*. A real uploaded photo
   (`story-1-book/source-photo.jpg`) sits beside the real painted page we made from it
   (`story-1-book/cover.jpg`), captioned "From your photo → The page we painted." The
   photo is a plain polaroid; the painted page wears the keepsake frame and a richer
   shadow, so the eye reads it as the *payoff*. This is the section that converts.
3. **Two worlds** — the existing strong celebrate (gold) / remember (rose) split,
   unchanged in intent, now with a centered section heading above it.
4. **How it works** — the existing 3 steps, moved lower (proof earns the right to
   explain process).
5. **Trust / objections (FAQ-lite)** — six short Q&As that kill dealbreakers: will it
   look like my pet, is this just AI, what if I'm unhappy, how long, can I print it,
   what about my photo. **Every answer is truthful** and pulled from the real product
   model: `policies/page.tsx` (AI-honesty + the 30-day remake-then-refund policy +
   privacy) and `products.ts` / commerce-roadmap (human review gate, 24–48h,
   print-quality PDF).
6. **Closing CTA band** — one warm final "start your book" prompt for scrollers.
7. Footer (the shared SiteFooter, reused).

## What changed since the previous landing
- Iteration 001 introduced the two-worlds split and the shared chrome; this is the
  first landing iteration to add **real imagery** and a dedicated **proof** section.
- Hero went from centered all-text → two-column with a real-cover stack.
- Added the FAQ and closing-band sections (neither existed).
- No testimonials, no pricing table (per brief — pre-launch).

## On-brand notes
- Stays entirely within the existing design system. Reused verbatim: the `:root`
  tokens, `.btn`/`.btn--primary`, `.lede`, `.display-xl`, `.label`, `.hero__*`,
  `.worlds`/`.world*`, `.how*`, `.footer-rich*`, the wordmark + HeartBookMark glyph.
- **Four new component patterns** the engineer (`nextjs-ui-builder`) would add to
  `globals.css`, all built only from existing tokens: `.hero--proof` (2-col hero +
  `.hero__stack`), `.proof` (the transformation strip), `.faq`, `.closing-band`.
  None invents a new color, font, or radius.
- Tone respects the grief context: memorial language stays gentle, we say the books
  help a child "grieve" (never "passed away"); celebration copy stays warm.

## How to view
Open `context/prototypes/005-landing-with-proof/index.html` by double-click. Images
load from `../../../public/samples/...`; fonts come from the Google CDN for the mockup
only (the real app self-hosts via next/font — do not port the `<link>`).

## Open questions for the PM
1. **Hero stack content** — I fanned three covers spanning both worlds (one living
   gold, one living tribute, one loss) to signal range. Do you want the hero to lean
   *celebration-forward* (warmer, broader market) instead, with goodbye titles
   discovered deeper? Or keep the deliberate both-worlds signal up top?
2. **Transformation pairing** — I used the Story 1 (memorial dog) photo→cover because
   it's the strongest likeness asset we have. A memorial example as the *first* proof
   image is emotionally heavy for a first impression. Want a living title (e.g. the
   Story 7 gotcha-day or Story 6 senior cat) as the hero proof instead, and keep Story 1
   for the detail pages?
3. **FAQ count/placement** — six Q&As feels right for objection-killing without
   bloating the page. Cut to four (drop print + privacy) if we want it tighter?
4. **One CTA target everywhere** — every CTA currently points at `/books`. Should the
   closing band instead deep-link to the celebration world (`/books#living`) as the
   higher-volume entry?
