# Fix: AI-honesty copy reconciliation (resolve "painted by hand" vs "made with AI")

## Problem

The public pages tell two contradictory stories. Several surfaces claim each book
is **"painted by hand"** (reads as: a human artist paints every illustration), while
the landing FAQ and the policies page honestly state the art is **"made with the help
of AI image generation."** A careful customer reads both and feels misled — the worst
outcome for a premium, emotional keepsake brand.

The PM is fine being upfront about AI; the goal is to remove the contradiction, not the
AI disclosure.

## Decision (PM, 2026-06-16)

- **Tone:** *Honest but understated.* Keep the explicit AI disclosure where it already
  lives (landing FAQ + `/policies`). Everywhere else, use truthful, warm craft language
  rather than repeating "AI" in every section.
- **Scope:** *All public pages* — reconcile the whole `(public)` surface in one pass so
  the site tells one consistent story.

## The reconciliation principle

Separate three claims the copy currently blurs:

| Claim | True? | Action |
|-------|-------|--------|
| painted **from your photo** | ✅ the AI is guided by the real photo, not a breed from a list | **Keep** — it's the differentiator |
| **finished by hand** / reviewed by a person | ✅ the approval-gate + repaint step | **Keep** — the honest craft story |
| painted **by hand** / "we paint it by hand" | ❌ no human paints the art | **Replace** — the only false claim |

Resulting site-wide vocabulary:
- in-sentence: "painted / made **from your photo**"
- short kicker/tagline: "**Finished by hand**"
- AI disclosed plainly only in the FAQ + policies (unchanged)

After this, the FAQ's AI line stops being a contradiction — it just explains *how* the
"painted from your photo" happens.

## Edits (presentation-only copy; 13 strings, 7 files)

The first scope estimate was 10 strings / 6 files; a verification grep during
implementation surfaced three more (the `/books` SEO description, the book-detail
"Made: By hand" fact row, and a stale code comment) — folded in below.

1. `app/(public)/page.tsx`
   - proof arrow: "painted by hand" → "painted from your photo"
   - how-it-works step 02 title: "We paint it by hand" → "We paint it from your photo"
   - closing band: "the rest slowly, by hand, and made for you" → "the rest slowly, with care, and made for you"
   - (hero "hand-finish" + FAQ "hand-finished" kept — finishing by a person is literally true)
2. `app/(public)/books/page.tsx`
   - intro kicker: "Made by hand" → "Finished by hand"
   - **SEO `metadata.description`**: "...made by hand from your photo..." → "...painted from your photo..."
3. `app/(public)/books/[productId]/page.tsx`
   - **fact row**: label "Made" / value "By hand, in 24–48 hours" → label "Finished" / value unchanged
     (the sibling "Illustrations: {n} painted from your photo" row was already truthful — left as-is)
4. `app/(public)/order/[productId]/OrderForm.tsx`
   - checkout intro: "paint your book by hand" → "paint your book from your photo"
   - attribution: "We'll do the rest by hand." → "We'll do the rest, with care."
   - footer label: "Made slowly · Made by hand" → "Made slowly · Finished by hand"
5. `app/(public)/order/[productId]/confirmation/page.tsx`
   - "We paint every book by hand, so this takes a little time" → "We paint every book from your photo and finish it by hand, so this takes a little time"
   - **code comment** (line 15): "we're painting it by hand" → "we're painting it from your photo" (consistency)
6. `app/(public)/download/[token]/page.tsx`
   - "We painted it by hand." → "We painted it from your photo."
7. `components/site/SiteFooter.tsx`
   - tagline: "Made slowly, made by hand." → "Made slowly, finished by hand."

## Out of scope / unchanged

- The landing FAQ "Is this just AI art?" answer and `/policies` AI-honesty statement —
  already correct; left as the single place AI is disclosed.
- Alt text that says "painted from a pet's photo" — already truthful, left as-is.
- PDF template / print copy — not touched; PDFs stay byte-identical.

## Verification

- `npm run test:run` (no test asserts this copy; brand guard unaffected) and
  `npm run build` pass.
- Visual check of the six pages; grep confirms no user-facing "by hand" claim that
  implies a human paints the art survives ("finished by hand" / "hand-finish" are
  intentional and true).
