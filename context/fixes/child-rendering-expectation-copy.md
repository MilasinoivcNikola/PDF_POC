# Fix: Communicate that the illustrated child is a stylized character (not painted from the photo)

> **Status:** Spec drafted — awaiting PM sign-off on the exact copy. No branch, no code yet.
> **Type:** Copy-only (presentation). No engine, PDF, or logic change. PDFs stay byte-identical.
> **Scope:** single PR.

## Problem

Two titles feature a **child** character alongside the pet: **Story 1 "Saying Goodbye"**
(`story-1`, the child is in the book on nearly every page) and **Story 8 "The Amazing
Adventures of Your Pet"** (`story-8`, child present under `heroCount: "pet-plus"`).

The uploaded photo is used **only to keep the pet on-model**. The child is *always*
rendered as a deliberately generic, stylized figure — "Any child is drawn slightly
stylized, in a 3/4 view or seen from behind" ([prompts.ts:52-61](../../lib/ai/prompts.ts#L52-L61)),
"no specific face" ([master-text.ts](../../lib/story/master-text.ts) page-9 brief), and the
Story-8 pose discipline ([story8-prompts.ts](../../lib/ai/story8-prompts.ts)) repeats the
same rule. This is by design (avoids the uncanny valley; keeps a grief book sensitive).

**Key fact that reframes the original concern:** including the child in the uploaded
photo does **not** make the illustrated child look like them — we ignore the child's face
either way. So the real risk is not "pet-only upload → random child"; it is an
**expectation gap**: nothing in the UI tells the buyer how the child will appear, and
Story 8's storefront tagline actively over-promises a likeness.

### What we say today (all pet-only, no child guidance)
- Order form photo field ([OrderForm.tsx:308-316](<../../app/(public)/order/[productId]/OrderForm.tsx#L308>)):
  *"We'll paint your pet from this photo. A clear photo of the face works best, but any
  beloved photo will do."*
- Story 1 child field ([OrderForm.tsx:746-766](<../../app/(public)/order/[productId]/OrderForm.tsx#L746>)):
  *"The book is written to your child, by name, on nearly every page."*
- Story 8 child field — `Story8Fields`, "The child in the story" (conditional on `heroCount`).
- **Story 8 tagline** ([products.ts:358](../../lib/catalog/products.ts#L358)):
  *"A joyful adventure starring your actual pet — and your kid."* ← over-promises a likeness.

This is the same honesty principle as the recent AI-honesty copy reconciliation
(`context/fixes/ai-honesty-copy-reconciliation.md`): be truthful and warm, don't imply
something we don't deliver.

## Decision (PM, 2026-06-17)

**Honest copy fix, both titles. No engine change.** Set the expectation plainly: the pet
is painted from your photo; the child is a gentle, stylized character — not a portrait of
a specific child. (The alternative — anchoring the child to an uploaded photo — was
declined: large engine effort, uncanny-valley risk, and undesirable tone for a grief
product.)

## Scope

In scope (customer-facing):
- **A.** Reword the Story 8 tagline so it no longer promises a likeness of "your kid".
- **B.** Add a child-rendering clarification at the **child field** of the public order
  form, for Story 1 and Story 8.
- **C.** Add a one-line clarification at the **photo-upload step** of the order form, for
  the two child-featuring titles, so the upload moment itself answers "do I need the child
  in the photo?".

Also in scope (PM-confirmed, same PR):
- **D.** Mirror the child-field note in the **book-detail prep section** (`book-questions.ts`)
  so the expectation is set *before* purchase, not only at the form.
- **E.** Mirror **B** in the operator `/create` wizard child step for internal consistency.

Out of scope:
- Any change to `lib/ai/*`, prompt builders, the PDF template, or generation behavior.
- Story 8's longer `description` narrative "your child adventures alongside them" — this
  refers to the child's *narrative role* (named after their child), which is accurate; flag
  for PM review but don't change unless asked.

## Proposed copy (PM: confirm or tweak)

> All strings below are proposals. Tone target: warm, plain, reassuring — matches the
> existing field hints.

**A. Story 8 tagline** (`products.ts`)
- Current: `A joyful adventure starring your actual pet — and your kid.`
- Proposed: `A joyful adventure starring your actual pet — with a child hero alongside.`

**B. Child-field clarification** (order form)
- Story 1 — append to the existing "Who is this story for?" hint:
  > Your photo brings your pet to life on every page. The child is drawn as a soft,
  > stylized character — not a portrait of a specific child.
- Story 8 — append to the "The child in the story" hint:
  > Your photo captures your pet. The child is illustrated as a playful, stylized
  > character — not a likeness of a specific child.

**C. Photo-step clarification** (order form photo field, Story 1 + Story 8 only)
- Append to the existing photo hint:
  > You only need your pet in the photo — the child in the book is drawn as a stylized
  > character, not from a photo.

  (This directly reassures a pet-only uploader they've done it right, and pre-empts the
  "where's my actual child?" disappointment.)

**D. Book-detail prep note** (`book-questions.ts`, story-1 + story-8 child question item)
- A short clarifying note rendered inline with the child question, e.g.:
  > Drawn as a stylized character, not a likeness of a specific child.

## Implementation plan

1. **`lib/catalog/products.ts`** — reword the Story 8 `tagline` (A). One-line change.
2. **`app/(public)/order/[productId]/OrderForm.tsx`**:
   - Photo field (C): conditionally append the clarification when `storyType` is `story-1`
     or `story-8`. Add a small `featuresChild` boolean (`storyType === "story-1" ||
     storyType === "story-8"`) beside the existing `isStory8` flags rather than inlining.
     Show it unconditionally for Story 8 at the photo step (the `heroCount` toggle is below
     the photo; the note is harmless under `pet-only`). — *confirm this nuance with PM.*
   - `Story1Fields` child hint (B) and `Story8Fields` child hint (B): append the note. The
     Story 8 note naturally only appears when the child field is revealed.
3. **`lib/catalog/book-questions.ts`** (D, recommended) — add the clarifying note to the
   child question item for `story-1-book` and `story-8-adventure`. If reusing the existing
   `reveal?` field is too semantically narrow, add an optional `note?: string` to
   `QuestionItem` (additive, client-safe) and render it in the prep section; otherwise reuse
   `reveal`. The example-pinning test (`book-questions.test.ts`) is unaffected (notes aren't
   examples).
4. **(E, optional)** mirror B in the operator create wizard child step.

## Constraints / guardrails

- `products.ts` and `book-questions.ts` stay **pure / client-safe** — no new imports, no
  `lib/ai/*`. Boundary test (`surface.boundary.test.ts`) must stay green.
- Presentation only: no PDF/engine change → all PDFs byte-identical; route tiers unchanged
  (`/books/[id]` `●` SSG, `/order/[id]` server). `npm run build` + `npm run test:run` green.
- If `QuestionItem` gains `note?`, add a one-line coverage assertion; otherwise no new tests
  (pure rendering copy).

## Verification

- Build + full test suite green.
- Manual/Playwright QA: order form for Story 1 and Story 8 shows the photo-step note and the
  child-field note; `/books/story-1-book` and `/books/story-8-adventure` prep sections show
  the child note (if D); Story 8 storefront card/detail show the reworded tagline; a
  non-child title (e.g. Story 6) shows **no** child note (no leakage).
