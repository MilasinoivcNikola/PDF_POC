## 2026-06-16 — Book-Detail Redesign PR-3: "Questions you'll answer" + worked example

The third and final PR of the book-detail redesign, **presentation-only** (Craft Area 3,
nextjs-ui-builder): no new data, no IO — the only new logic is rendering. It consumes the
content foundation shipped dead in PR-1 (`lib/catalog/book-questions.ts` +
`product.sourcePhoto`) and gives every title (all 8) a "prep" section below the existing
detail content, still inside `<main>`, with the route staying a Server Component
(`●` SSG, public route group).

### What shipped

- **`app/(public)/books/[productId]/page.tsx`** — a new `<section>` appended after the
  product `<article>`, gated on `getBookQuestions(product.productId)` (PR-1 guarantees one
  entry per sellable product; an unknown id falls through to `null` and renders nothing).
  Two halves inside a two-column grid:
  - **A. "The questions you'll answer"** (`.prep`): a "Before you order" eyebrow (audience
    accent — gold for living, rose for loss, consistent with the page), the finalized
    5–10-minute lede, then the full grouped questionnaire from `questions.groups`. Each group
    carries a zero-padded number + title + rule; each item shows its label, a Required/Optional
    tag (rose dot vs faint dot), and the `reveal` note inline where present. A legend at the
    foot explains the required/optional marks and that optional fields degrade gracefully.
  - **B. "The example we used"** (`.example`, an `<aside>`): **neutral framing** — kicker
    "The example we used" / heading "The answers behind the sample" (never pet-named). The
    **source photo** renders as a polaroid snapshot (`product.sourcePhoto`, captioned "The
    original" / "The photo we started from"), gated on the optional field. Then each question
    with a pinned `example` answer is paired Q→A. The example pairs are derived once with a
    `flatMap` over `questions.groups` filtering to items that have an `example` (optional
    fields the sample left blank are simply omitted, per the prototype).
- **`app/(public)/books/[productId]/page.module.css`** — ported the `.prep` + `.example` +
  polaroid CSS from `context/prototypes/002-book-detail-gallery-questions/styles.css`,
  reusing the existing design tokens (no new hardcoded hexes that already have a token), incl.
  the gold/rose audience-accent variants and the wide-viewport layout (worked-example panel).

### Boundary / tiers

`book-questions.ts` is pure, zero-import and client-safe, so the deploy-surface boundary test
stays green — no engine import enters the public graph. The route remains `●` SSG (confirmed
in the build output), the storefront stays statically prerendered.

### Verification

- `npm run test:run` — 2135 passed (no new unit tests; pure presentation, the only new logic
  is rendering — covered by the existing boundary + products/book-questions suites).
- `npm run build` — clean; `/books/[productId]` printed `●` (SSG).
- Per the completing instruction, review (code-reviewer/context-auditor) and the Playwright QA
  spot-checks were **skipped at the PM's direction** (verified elsewhere) — landed on the
  green build/test gates. Recorded here for the audit trail; carried to `context/debt.md`.

### Completes

The book-detail redesign (Milestone 18) — PR-1 content foundation, PR-2 gallery, PR-3
questions + worked example.
