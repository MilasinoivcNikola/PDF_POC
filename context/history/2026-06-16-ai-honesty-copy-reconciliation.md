# AI-honesty copy reconciliation (resolve "painted by hand" vs "made with AI")

**Branch:** `fix/ai-honesty-copy` (commit `5cce893`, merge `dbb8a95`) · **Date:** 2026-06-16
**Spec:** `context/fixes/ai-honesty-copy-reconciliation.md`

## Problem

The public site told two contradictory stories. Several surfaces claimed each book was
**"painted by hand"** — which reads as *a human artist paints every illustration* — while
the landing FAQ ("Is this just AI art?") and `/policies` honestly disclosed that the art is
**"made with the help of AI image generation."** A careful customer reads both and feels
misled; in a grief/keepsake context that's the worst place to lose trust. The PM was fine
being upfront about AI — the goal was to remove the *contradiction*, not the disclosure.

## Decision (PM, 2026-06-16)

- **Tone:** *honest but understated.* Keep the explicit AI disclosure where it already
  lives (landing FAQ + `/policies`); everywhere else use truthful, warm craft language
  rather than repeating "AI" in every section.
- **Scope:** *all public pages* — reconcile the whole `(public)` surface in one pass.

## The reconciliation principle

The copy was blurring three distinct claims; the fix keeps the two that are true and drops
the one that isn't:

| Claim | True? | Action |
|-------|-------|--------|
| painted **from your photo** | ✅ the AI is guided by the real photo, not a breed from a list | keep — it's the differentiator |
| **finished by hand** / reviewed by a person | ✅ the approval-gate + repaint step | keep — the honest craft story |
| painted **by hand** / "we paint it by hand" | ❌ no human paints the art | replace — the only false claim |

After this, the FAQ's AI line stops being a contradiction — it explains *how* the
"painted from your photo" happens.

## What changed

13 copy strings across 7 files (presentation-only; no engine/PDF/logic change):

- `app/(public)/page.tsx` — proof-strip arrow "painted by hand" → "painted from your
  photo"; how-it-works step 02 title "We paint it by hand" → "We paint it from your photo";
  closing band "slowly, by hand" → "slowly, with care". (Hero "hand-finish" + FAQ
  "hand-finished" kept — finishing by a person is literally true.)
- `app/(public)/books/page.tsx` — intro kicker "Made by hand" → "Finished by hand"; SEO
  `metadata.description` "made by hand from your photo" → "painted from your photo".
- `app/(public)/books/[productId]/page.tsx` — facts row label "Made" → "Finished" (value
  "By hand, in 24–48 hours" kept; the sibling "{n} painted from your photo" row was already
  truthful).
- `app/(public)/order/[productId]/OrderForm.tsx` — checkout intro "paint your book by hand"
  → "from your photo"; attribution "the rest by hand." → "the rest, with care."; footer
  label "Made by hand" → "Finished by hand".
- `app/(public)/order/[productId]/confirmation/page.tsx` — "We paint every book by hand" →
  "We paint every book from your photo and finish it by hand" (+ matching code comment).
- `app/(public)/download/[token]/page.tsx` — "We painted it by hand." → "We painted it from
  your photo."
- `components/site/SiteFooter.tsx` — tagline "Made slowly, made by hand." → "Made slowly,
  finished by hand."

The first scope estimate was 10 strings / 6 files; a verification grep during
implementation surfaced three more (the `/books` SEO description, the book-detail
"Made" fact-row label, and a stale confirmation-page code comment), folded in.

Also annotated `context/commerce-roadmap.md`'s deferred "AI-disclosure / honesty stance"
bullet as **Resolved (2026-06-16) — stance only**, mirroring the PR-08 pattern, and updated
the debt-ledger row to "AI-honesty disclosure copy — final wording" (stance decided; only
the exact `/policies` wording remains a launch-gated placeholder).

## Verification

- **Tests:** 2135/2135 green (no test asserts this copy; the brand guard is unaffected).
- **Build:** clean, route tiers unchanged (`/` and `/books` stay `○` Static, detail `●`
  SSG) — PDFs byte-identical (template untouched).
- **QA (qa-verifier, Playwright, $0):** all 5 target pages PASS; a raw-HTML sweep for 11
  variants of "a human paints the art" returned zero hits; the FAQ AI disclosure confirmed
  still present.
- **Review:** code-reviewer **PASS**; context-auditor **IN SYNC** (its one doc nit — the
  roadmap "Resolved" annotation — was applied). No commerce surface touched, so no
  commerce-security review.

## Notes

- Bundled into the same commit (same file, unrelated PM polish): a pre-existing working-tree
  restyle of `app/(public)/page.tsx` replacing em-dashes with commas/hyphens across the
  landing copy. One typographic byproduct left as-is (the PM's choice): the proof heading now
  reads "Yes - it really *is* them." with a bare spaced hyphen.
- The exact `/policies` AI-honesty wording is still a labelled `PLACEHOLDER` pending PM
  launch sign-off — tracked in `context/debt.md` (row "AI-honesty disclosure copy — final
  wording"), not a blocker for this fix.
