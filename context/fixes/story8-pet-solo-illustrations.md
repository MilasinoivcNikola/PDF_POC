# Fix: Story 8 "pet-solo" mode — make the illustrations child-free (finish the toggle)

> **Status:** Spec drafted — awaiting PM sign-off. No branch, no code yet.
> **Type:** Engine fix (text/brief layer) + small storefront-copy reconciliation. No new
> product/SKU/price/LS-variant; pet-solo stays a **toggle inside the one Story 8 product**.
> **Decision (PM, 2026-06-17):** keep it one product with the two-mode toggle; finish the
> half-built pet-solo path so the art matches the text, and make sure the two options are
> communicated clearly.

## Problem (a live defect)

Story 8 "The Amazing Adventures of Your Pet" already ships a two-mode `heroCount` toggle
([types.ts](../../lib/session/types.ts) — `"pet-plus" | "pet-solo"`), selectable today on
both the operator wizard and the public order form:

- **pet-plus** (default): the child co-stars in the adventure.
- **pet-solo**: the pet is the lone hero; the child is the *reader* being told the legend,
  not a character.

The **text** layer fully honors pet-solo — [story8/variants.ts](../../lib/story/story8/variants.ts)
rewrites every child-referencing body page (cover subtitle + Pages 1–6, 9, 10) to a
child-free voice. **But the illustration briefs were never given pet-solo variants.** They
still name `{childName}`, and [story8/merge.ts:181-193](../../lib/story/story8/merge.ts#L181-L193)
papers over the missing name by registering a generic `"the child"` stand-in *for the briefs
only*. Net result: **a customer who picks pet-solo gets child-free words but a (generic)
child drawn in every scene** — the words and the pictures contradict each other.

This is shippable today; it's a correctness/quality bug, not a hypothetical.

### Authoritative scope (the merge comment is stale)

The merge.ts comment says only "cover, Page 1" briefs name the child. That is **wrong/out of
date.** Grepping `{childName}` in [story8/master-text.ts](../../lib/story/story8/master-text.ts),
the briefs that name the child are:

| Slot id | Generated? | Brief names child? | Action |
|---------|-----------|--------------------|--------|
| `adventure-cover` | yes (HERO/HIGH) | yes (L86) | rewrite child-free in pet-solo |
| `adventure-ordinary` | yes | yes (L99) | rewrite |
| `adventure-special` | yes | no | — |
| `adventure-call` | yes | yes (L127) | rewrite |
| `adventure-clue` | yes | no | — |
| `adventure-deeper` | yes | yes (L155) | rewrite |
| `adventure-discovery` | yes | yes (L168) | rewrite |
| `adventure-wobble` | yes | yes (L183) | rewrite |
| `adventure-climax` | yes | no | — |
| `adventure-celebration` | yes | yes (L210) | rewrite |
| `adventure-home` | no (reuses calm art) | yes (L223) | rewrite for cleanliness* |
| `adventure-closing` | no (reuses cover) | yes (L235) | rewrite for cleanliness* |
| `adventure-back-cover` | no | no | — |

\* `home`/`closing` don't generate art, but rewriting their briefs too means **no
`{childName}` placeholder survives anywhere in pet-solo**, which lets us delete the
`"the child"` stand-in cleanly (see below). 7 generated slots actually change; 2 more are
rewritten only to keep the invariant tidy.

## The communication check (your ask: do buyers know there are two ways?)

The **toggle itself is already clear** — verified across surfaces:
- Option labels ([wizard tone step + OrderForm `Story8Fields`]): *"together — the child
  joins the quest"* vs *"the lone hero — the child hears the legend."*
- Dynamic helper text on selection: pet-solo → *"{pet} is the lone hero and the child is the
  reader being told the tale — so the child's name (and a sidekick) are optional."*
- Conditional reveals reinforce it: pet-solo makes `childName` optional and **hides** the
  sidekick field; the pet-plus validation error even says *"or choose 'the lone hero' above."*

The weak spots are all **pre-form** (where a shopper decides *which* book this is), and they
currently bias toward "the child is always in it":
1. **Tagline** ([products.ts:358](../../lib/catalog/products.ts#L358)): *"…starring your
   actual pet — and your kid."* — reads as child-always.
2. **Description** ([products.ts:359-370](../../lib/catalog/products.ts#L359)): opens
   *"…alongside your child"* before it mentions the toggle, so a scanner assumes one mode.
3. **Book-detail prep** ([book-questions.ts](../../lib/catalog/book-questions.ts) story-8):
   the `heroCount` item shows only `example: "pet-plus"` with no note that it's a *mode
   choice* that can drop the child entirely.

So the fix here is not the toggle UI (it's good) — it's making the **storefront** surface
the two modes so a buyer knows, before they start, that a pet-only adventure is an option.

## Scope

**Engine (the bug):**
- **E1.** Add pet-solo **illustration-brief variants** for the 7 generated child-naming
  slots (cover, ordinary, call, deeper, discovery, wobble, celebration), plus the 2
  non-generated reuse slots (home, closing) for invariant cleanliness — mirroring the
  existing per-page body-builder pattern in `variants.ts`.
- **E2.** Delete the `"the child"` stand-in in `merge.ts` (`buildValues`) — once no pet-solo
  brief carries `{childName}`, the stand-in is dead and pet-solo legitimately has **no
  child placeholder anywhere**. Update both the stale `merge.ts` comment and the
  `master-text.ts`/`variants.ts` header comments to state briefs are rewritten too.

**Communication (the two-options clarity):**
- **C1.** Reconcile the Story 8 **tagline** to fit *both* modes and the AI-honesty stance
  (see coordination note below).
- **C2.** Revise the Story 8 **description** so the toggle is stated plainly and the child is
  framed as an option + a stylized character.
- **C3.** Add a `reveal` note to the `heroCount` item in `book-questions.ts` so the prep
  section explains the two modes.

Out of scope: any new product/SKU/price/LS variant; the wizard/order-form toggle UI (already
clear); pet-plus behavior (must stay byte-identical); a new pet-solo storefront *sample* (the
existing corgi sample is pet-plus and stays — see Verification).

## Proposed copy (PM: confirm or tweak)

**C1 — tagline** (works for both modes, no likeness promise):
- Current: `A joyful adventure starring your actual pet — and your kid.`
- Proposed: `A joyful adventure starring your actual pet — the hero of their own legend.`

**C2 — description** — change the two child-implying clauses:
- `…stars as the hero of a fun 'save the day' quest alongside your child.` →
  `…stars as the hero of a fun 'save the day' quest.`
- `Choose whether your child adventures alongside them or hears the legend as the reader,
  and the reading level that fits.` →
  `Choose whether a child co-stars (drawn as a playful, stylized character) or your pet
  takes the spotlight alone — and the reading level that fits.`

**C3 — book-questions heroCount `reveal`:**
> Two ways to tell it: the child co-stars in the adventure, or your pet is the lone hero and
> the child just hears the legend (a pet-only book).

## Implementation plan

1. **`lib/story/story8/variants.ts`** — add per-page **brief** builders alongside the body
   builders for the child-naming slots, and set them in `composeBackyardMystery` (a `setBrief`
   helper like the body's `setBody`, the same one Story 9 introduced). Each pet-solo brief is
   authored child-free (e.g. cover drops "with {childName} grinning just behind"; the hero
   shot stays a pet-only 3/4 likeness anchor). pet-plus briefs unchanged.
2. **`lib/story/story8/merge.ts`** — remove the `else if heroCount === "pet-solo"` →
   `"the child"` branch in `buildValues`; fix the stale comment block.
3. **`lib/catalog/products.ts`** — C1 + C2 tagline/description edits.
4. **`lib/catalog/book-questions.ts`** — C3 reveal note (pure/client-safe; example stays
   `"pet-plus"`, fixture-pin unaffected).
5. **Tests** — extend the Story-8 text suite: assert that for a pet-solo session **no
   resolved illustration brief contains `{childName}` or the literal "the child"**, across
   the theme × age × species matrix; assert the prompt-builder output
   ([story8-prompts.ts](../../lib/ai/story8-prompts.ts) `buildScenePromptFromPage`) for
   pet-solo slots carries no child reference; keep a pet-plus regression assertion that the
   briefs are byte-identical to today.

## Coordination with the copy-fix spec (important)

The in-flight [child-rendering-expectation-copy.md](./child-rendering-expectation-copy.md)
ALSO edits the Story 8 tagline (to `"…with a child hero alongside."`). That wording assumes
the child is always present, which **contradicts** this fix once pet-solo is real. Resolve by
sequencing:
- If the copy fix lands first, this PR **revises** the tagline again to the C1 wording.
- If this lands first, the copy fix **drops** its tagline item (keeps its photo-step /
  child-field / prep notes, which still apply to pet-plus).

Recommend: let **this** spec own the final Story 8 tagline/description, since it's the one
that makes both modes real. Flagging so we don't ship a contradiction.

## Constraints / verification

- **pet-plus is byte-identical** — verify the composed pet-plus briefs + bodies are unchanged
  (the existing Story-8 template/merge tests + a diff of resolved pet-plus output).
- `products.ts` / `book-questions.ts` stay pure/client-safe; boundary test green.
- `npm run build` + `npm run test:run` green.
- **Cost-controlled QA** (per the low-tier-cost memory): the child-free guarantee is proven
  by the **unit tests on the resolved briefs/prompts ($0)** — no full paid book needed. A
  cheap optional spot check: render 1–2 pet-solo slots at LOW tier to eyeball that no child
  appears. The storefront sample stays the existing pet-plus corgi (one sample per card; a
  pet-solo sample is a separate, optional merchandising decision, not part of this fix).
