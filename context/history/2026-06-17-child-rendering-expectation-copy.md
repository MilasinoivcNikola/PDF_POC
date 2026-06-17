## 2026-06-17 — Fix: Communicate the illustrated child is a stylized character (Stories 1 + 8)

**Branch:** `fix/child-rendering-expectation-copy` (feat `9357cce`, merge `b27bccf`). **Type:** copy-only
(presentation). No engine, PDF, prompt, or logic change — PDFs byte-identical, route tiers unchanged.
**Spec:** `context/fixes/child-rendering-expectation-copy.md`.

### Why

Two catalog titles feature a **child** character alongside the pet: Story 1 "Saying Goodbye"
(`story-1`, child on nearly every page) and Story 8 "The Amazing Adventures of Your Pet"
(`story-8`, child present under `heroCount: "pet-plus"`). The uploaded photo is used **only to keep
the pet on-model** — the child is *always* rendered as a deliberately generic, stylized figure (no
specific face), by design (avoids the uncanny valley; keeps a grief book sensitive). Nothing in the
UI said so, and Story 8's storefront tagline actively over-promised a likeness ("…and your kid.").

The real risk was an **expectation gap**, not a generation bug: including the child in the uploaded
photo does not make the illustrated child look like them — we ignore the child's face either way.
PM decision (2026-06-17): an **honest copy fix on both titles, no engine change** — the same
truthful-and-warm principle as the prior `fix/ai-honesty-copy` reconciliation. (Anchoring the child
to a photo was declined: large engine effort, uncanny-valley risk, wrong tone for a grief product.)
PM signed off on the exact proposed strings **as drafted**.

### What changed (5 surfaces, A–E)

- **A. Story 8 tagline** — `lib/catalog/products.ts`: `"A joyful adventure starring your actual
  pet — and your kid."` → `"A joyful adventure starring your actual pet — with a child hero
  alongside."` (one line). Story 8's longer `description` ("your child adventures alongside them")
  was left unchanged — it describes the child's accurate *narrative role* (the book is named after
  their child), not a likeness claim; flagged out of scope.
- **B. Child-field notes** — `app/(public)/order/[productId]/OrderForm.tsx`, appended to the existing
  `field__hint`:
  - Story 1 (`Story1Fields`): *"Your photo brings your pet to life on every page. The child is drawn
    as a soft, stylized character — not a portrait of a specific child."*
  - Story 8 (`Story8Fields`): *"Your photo captures your pet. The child is illustrated as a playful,
    stylized character — not a likeness of a specific child."*
- **C. Photo-step note** — same file, photo-upload field, gated by a new `featuresChild =
  isStory1 || isStory8` boolean (defined once, beside the existing story flags): *"You only need
  your pet in the photo — the child in the book is drawn as a stylized character, not from a
  photo."* Shown **unconditionally** for both titles (the `heroCount` toggle sits below the photo;
  the note is harmless under pet-solo) — the agreed engineering call, not gated on `heroCount`.
- **D. Book-detail prep note** — `lib/catalog/book-questions.ts`: added an optional `note?: string`
  to `QuestionItem` (additive, the module stays pure-literal / zero-import) and set the note on the
  child question item for `story-1-book` and `story-8-adventure`: *"Drawn as a stylized character,
  not a likeness of a specific child."* Rendered inline in the book-detail prep section
  (`app/(public)/books/[productId]/page.tsx`) reusing the existing `styles.qitemNote` class (the
  same treatment as `item.reveal`).
- **E. Operator wizard mirror** — `app/(operator)/create/child/page.tsx` (Story-1 step) and
  `app/(operator)/create/adventure/page.tsx` (Story-8 step) carry the matching child-rendering note
  for internal consistency. Both pages are story-specific, so the wording is hardcoded (no flag).

### Guardrails held

- `lib/catalog/products.ts` and `lib/catalog/book-questions.ts` stayed **pure / client-safe** — no
  new imports, no `lib/ai/*`; the public boundary test (`surface.boundary.test.ts`) green.
- `QuestionItem.note?` is purely additive — notes are not examples, so the example-pinning tests in
  `book-questions.test.ts` are untouched. One new coverage test pins that **exactly**
  `story-1-book` + `story-8-adventure` carry a `note` (the no-leakage rule, machine-enforced).
- No scope creep into `lib/ai/*`, prompt builders, or the PDF template. PDFs byte-identical; tiers
  unchanged (`/books/[id]` `●` SSG, `/order/[id]` server shell).

### Verification

- **Review:** code-reviewer **PASS** (all 5 surfaces verbatim, scoping correct, no leakage, client-safe,
  byte-identical); context-auditor **IN SYNC** (the `note?` field doesn't outgrow the docs; copy
  faithfully extends the locked AI-honesty stance; engine reality already renders the child
  generically — `lib/ai/prompts.ts` "Any child is drawn slightly stylized" + `master-text.ts` "no
  specific face"). Commerce-security not run (no payment/order/auth/PII surface).
- **QA (Playwright, $0, 0 console errors):** 5/5 PASS — Story 8 tagline reworded with **"your kid"
  gone site-wide**; Story 1 + Story 8 order forms show the photo-step + child-field notes; both
  book-detail prep sections show the note; **no leakage** onto non-child titles (Story 6 / Story 2
  order forms + Story 6 detail show nothing).
- `npm run build` clean; `npm run test:run` **2153 passed** (+1 new coverage test).

### Carried forward (see `context/debt.md`)

The new tagline ("…with a child hero alongside") and the child-field note both **assume a child is
always present**, but Story 8 supports `heroCount: "pet-solo"` (no child). The public order form is a
single long page and renders the child field + note in both hero modes, so under pet-solo a buyer
still sees the child note. PM shipped as-is (honest in every state, not a regression). The planned —
but not-yet-built — `context/fixes/story8-pet-solo-illustrations.md` spec already documents revising
this tagline again (to "…the hero of their own legend") for the pet-solo case; recorded as a low debt
row so the interim wording isn't mistaken for final.
