# New-Book Product Playbook — adding a sellable title

> **What this is:** the canonical, repo-checked recipe for adding a **new book** to the
> catalog. The pipeline is product-agnostic (features 14–19), and the whole commerce loop
> (order → pay → worker → admin → delivery, PRs 01–09) is reused unchanged — so a new title
> is mostly **authoring**, not plumbing.
> **Scope:** This formalizes commerce **PR-10** (Phase 5, recurring) — see
> [commerce-roadmap.md](./commerce-roadmap.md). It does **not** author a concrete book (the
> which-title call is PM-deferred); it's the recipe a future branch follows.
> **Last updated:** June 11, 2026

---

## Before you start

- One book per branch: **`feature/book-<name>`** (e.g. `feature/book-life-story`).
- This is **recurring content work**, not infra. If a step asks you to change the worker,
  the admin, Supabase, delivery, or the order state machine, you've gone off-recipe — stop
  and re-read the [Reuse guarantee](#the-reuse-guarantee) below.
- Read the relevant master template in `context/masterstories/` first — it is the source of
  truth for wording **and** the quality bar (the "died" rule, the banned-phrase list).
- Match the existing patterns. Story 1 (`lib/story/story-1.ts`, the page-level modules at
  `lib/story/*`) and Story 2 (`lib/story/story-2.ts`, `lib/story/story2/*`) are the two
  worked references; mirror whichever is closer to the new book's shape.

Throughout, `<book>` is the new product's slug (the `lib/story/<book>/` folder name),
`<book-type>` is its `StoryType` value (e.g. `"story-3"`), and `<book-id>` is its catalog
`productId` (e.g. `"story-3-booklet"`).

---

## Step 1 — Author the text

Create the page-level text modules. For Story 1 these live flat in `lib/story/` (its
`master-text.ts` / `variants.ts` / `merge.ts`); for Story 2 they're namespaced under
`lib/story/story2/`. **Use a namespaced folder for any new book** — `lib/story/<book>/`:

- **`lib/story/<book>/master-text.ts`** — the master text as **structured data**, not one
  string. Mirror `lib/story/story2/master-text.ts`: an array of pages, each with its
  `{merge}` placeholders, a `layout` tag, a `pageNumber`, optional `title`/`subtitle`, the
  `body` paragraphs, and an `illustrationBrief`. Return it from a **function** that yields a
  fresh mutable copy each call (so variant composition can mutate without leaking module
  state — see the `masterStory()` / `masterStory2()` pattern). Page ids must be new literals
  added to the `Story2PageId`-style union in `lib/story/master-text.ts` (see Step 1a).
- **`lib/story/<book>/variants.ts`** — **compose-before-merge.** Each variant dimension
  (death type, belief frame, relationship/species/age, etc.) mutates the fresh master copy
  *before* substitution. Expose a single entry point that composes then merges, mirroring
  `resolveStory2(session) = mergeStory2(composeVariants2(session), session)`
  (`lib/story/story2/variants.ts`). This entry point is what the registry's `resolve` wraps.
- **`lib/story/<book>/merge.ts`** — the value-builder + merge into `ResolvedStory`. **Reuse
  the shared primitives from `lib/story/merge.ts`** — do not re-implement them:
  - `clean(value)` — strips `{`/`}` braces and collapses whitespace on every customer value
    (prevents brace-injection of a surviving `{token}`).
  - `substitute(text, values, missing)` — the single-pass `{key}` replacement + missing-key
    accounting (it's an **exported helper**, promoted from module-private for exactly this).
  - `MergeError` — thrown (with the full sorted/deduped `missingKeys`) when a required field
    is missing or empty. **Never emit a literal `{field}` / `[FIELD]` into output.**
  - `PageLayout` / `ResolvedStory` / `ResolvedPage` types.

  Own a `STORY_<N>_LAYOUT: Record<<Book>PageId, PageLayout>` map here (mirror
  `STORY_2_LAYOUT` in `lib/story/story2/merge.ts`) that tags each page with its render
  layout. Handle optional fields by **omitting** the line/value when blank (never printing a
  dangling separator or an empty placeholder) — see `cleanOptional` / `appendOptionalLines`
  in `lib/story/story2/merge.ts`.

### Step 1a — extend the page-id union

In `lib/story/master-text.ts`, add a `<Book>PageId` string-literal union of the new book's
page ids, and add it to the product-agnostic union:
`export type PageId = Story1PageId | Story2PageId | <Book>PageId;`. The existing
per-product layout maps stay narrowed (`Record<Story1PageId, …>`, `Record<Story2PageId, …>`)
so no existing book's typing changes.

### Quality bar (a product requirement, not style)

Honour the relevant master template's "Quality bar / what to avoid":

- **Story 1** uses the word **"died"** — never "passed away", "went to sleep", "lost", "went
  away". Don't promise the pet "is watching over" the child; the last full page must be
  hopeful.
- **Story 2** bans "fur baby", "crossed the rainbow bridge", "ran free in heaven", "now an
  angel watching over you", any "watching over you", and quoting songs/poems/scripture; never
  print a date the customer didn't provide.

Each new book's template has its own such list — encode it as test assertions (Step 7).

---

## Step 2 — Register it

The registry is the single seam that makes the app multi-product. Two edits:

1. **Add the `StoryType` value** in `lib/session/types.ts`:
   `export type StoryType = "story-1" | "story-2" | "<book-type>";`. You will also need the
   book's session/draft shape — reuse the existing input groups (`Pet`, etc.) and add only
   the new groups the book needs (Story 2 added `Owner` / `LetterMemories` / `Story2Toggles`
   discriminated by `storyType: "story-2"`). Mirror `Story2Session` / `Story2Draft`.

2. **Add a `StoryDefinition`** in `lib/story/registry.ts`'s `REGISTRY` map, wrapping a thin
   product module `lib/story/<book>.ts` (mirror `lib/story/story-1.ts` /
   `lib/story/story-2.ts`). A `StoryDefinition` (interface in `lib/story/registry.ts`)
   supplies five things:

   - **`resolve(session): ResolvedStory`** — wraps your Step-1 entry point (e.g.
     `resolveStory2`). The registry has already routed by `storyType`, so narrow the
     `StorySession`-typed param to your book's session with a guarded cast at this seam
     (the documented pattern in `story-2.ts`).
   - **`illustrationSlots: readonly PageId[]`** — the page ids that get a generated scene
     illustration, in book order. Story 1 reads `SCENE_PAGE_IDS` from `lib/story/scenes.ts`;
     Story 2 declares `LETTER_SCENE_PAGE_IDS` in `lib/story/story-2.ts`. A text-only book can
     have an empty list. **This is the single source for the catalog's `illustrationCount`**
     (Step 4) and gates the AI orchestration + per-page regenerate paths.
   - **`pdfFilename(session): string`** — build it with a helper in **`lib/pdf/filename.ts`**
     (pure string module, kept out of `lib/pdf/render.ts` so the registry stays
     puppeteer-free — see Step 4's client-safe note). Add a `<book>PdfFilename(petName)`
     beside `storyPdfFilename` / `letterPdfFilename`, reusing the same `slugify` + `Pet`
     fallback. Name it per the template's production checklist.
   - **`wizard: WizardConfig`** — `getWizardConfig("<book-type>")` from
     `lib/story/wizard-config.ts`. Add a `STORY_<N>_STEPS` array + a `WIZARD_CONFIG` entry
     there (the ordered `/create/*` step segments + the "Step NN of NN" total). Pure data,
     client-safe — no render/server import.
   - **`editable: EditableFieldsContract`** — the in-browser "edit your own words" contract
     (feature 19). Add `lib/story/<book>/editable-fields.ts` (mirror
     `lib/story/editable-fields.ts` / `lib/story/story2/editable-fields.ts`): the page→field
     map (`PAGE_EDITABLE_FIELDS` / `editableFieldsForPage`), `EDITABLE_FIELDS`,
     `REQUIRED_EDITABLE_FIELDS`, `FIELD_COPY` (per-field label + hint), `isEditableField`,
     `isRequiredField`, `setSessionField`, `getSessionFieldValue` — all reusing `clean()`
     from `lib/story/merge.ts`. The product module wraps these into the contract (see the
     `story1Editable` / `story2Editable` objects).

You will also wire the wizard's draft→session bridge and per-`storyType` validation in
`lib/session/draft.ts` and `app/(operator)/api/session/route.ts`, plus the landing story
picker (`app/(public)/page.tsx` + `components/wizard/StoryStartButton.tsx`) and any new
`app/(operator)/create/<step>/page.tsx` steps — exactly as feature 18 did for Story 2. If
the new book reuses Story-1 or Story-2's input set, most of this is a small delta.

---

## Step 3 — Layout / CSS (**only if the book needs a new page layout**)

If the book reuses an existing layout value (`cover` / `dedication` / `narrative` / `truth`
/ `love` / `closing` / `back-cover` / `letter-cover` / `letter`), **skip this entire step** —
the renderer and CSS already handle it. Add a new layout only when no existing treatment fits
(as feature 16 did when a frameable letter shouldn't borrow the children's-book `narrative`
treatment).

To add one:

1. Add the value to the `PageLayout` union in **`lib/story/merge.ts`** and map your pages to
   it in your `STORY_<N>_LAYOUT`.
2. Add a `case` to the `renderPage` switch in **`lib/pdf/pages.tsx`**. The switch is
   **exhaustive over `PageLayout` with no `default`**, so a missing case is a **compile
   error** — that's by design. Put the component in a sibling module (Story 2's letter
   components live in `lib/pdf/pages-story2.tsx`), keeping `pages.tsx` IO-free (no `node:`/fs,
   no `react-dom/server`) so the client preview can import it.
3. Add the print CSS in **`lib/pdf/styles.css`** and **mirror every selector** in the screen
   CSS **`app/globals.css`**. This is the **screen↔PDF parity** invariant: structure lives
   only in the shared `pages.tsx`; every new selector must exist in **both** stylesheets, with
   shared tokens single-sourced via `var()` (don't hardcode a hex that has a token). Append
   any new selectors to the `print-color-adjust: exact` comma-list rather than touching the
   `.story-page` rules. Follow feature 16's `letter` precedent: a NEW primitive
   (`.letter-page`) with its OWN geometry token (`--page-margin-letter`) — it must **not** touch
   `.story-page` or the shared `--page-*` tokens, so existing books stay byte-identical.

**Both invariants are hard:** screen↔PDF parity (grep both stylesheets for the new selector
set — they must match) and existing-book byte-identity (Step 7 verifies it).

---

## Step 4 — Catalog entry

Add a `Product` to `lib/catalog/products.ts`'s `buildCatalog()` via `buildProduct(...)`:

- **`productId`** — stable, used in URLs / `Order.productId` / checkout (e.g.
  `"story-3-booklet"`).
- **`storyType`** — the new `<book-type>`.
- **`title` / `tagline` / `description`** — marketing copy lifted from the master template's
  "Customer-facing description" (trim pricing prose). Don't invent claims.
- **`priceUsd`** — US **cents** (e.g. `2900` = $29). Add a `PLACEHOLDER_<BOOK>_PRICE_USD`
  constant beside the existing ones; the real charge is configured on the LS variant (Step 5),
  and the two must agree — confirm the final number with the PM. The storefront formats it via
  `formatPriceUsd(cents)` from `lib/catalog/price.ts`.
- **`illustrationCount`** — **DERIVED**, never hardcoded: `buildProduct` already sets it from
  `getStory(storyType).illustrationSlots.length`, so it can't drift from the engine. Leave
  that as-is.
- **`sampleImages`** — public web paths under `public/samples/<book-id>/` (Step 6).
- `lsVariantId` is left `undefined` in the catalog **on purpose** — see Step 5.

### Client-safe boundary (do not break this)

`lib/catalog/products.ts` is imported by the **public storefront**, so its whole module graph
must stay free of Puppeteer and any `node:`/fs/engine module. The chain
`products.ts → getStory (registry) → lib/story/<book>.ts` must reach **scene identity** only
through the neutral **`lib/story/scenes.ts`** (`SCENE_PAGE_IDS` / `SceneId`) — **never**
through `lib/ai/*`. The public boundary guard (`lib/runtime/surface.boundary.test.ts`) bans
**all of `lib/ai/*`** from the public closure outright, so a registry/product helper that
imported a prompt builder would break the public build. (For a book with its own scene list,
keep that list in its product module or a neutral `lib/story/<book>/scenes.ts`, not in
`lib/ai/`.) The `pdfFilename` helper lives in `lib/pdf/filename.ts` for the same reason —
importing `lib/pdf/render.ts` would pull `puppeteer` into the client graph.

---

## Step 5 — Lemon Squeezy product / variant (manual fulfilment)

Create one Lemon Squeezy product/variant for the book, set to **manual fulfilment** (no
auto-download — our worker delivers in 24–48h). Record its variant id via the per-product
env var **`LEMONSQUEEZY_VARIANT_<PRODUCT_ID>`** (the `productId` upper-cased with `-`→`_`,
e.g. `LEMONSQUEEZY_VARIANT_STORY_3_BOOKLET`). This is **non-secret runtime config** resolved
**server-side at checkout** (`app/(public)/api/checkout/route.ts`) — it is deliberately **not**
in the client-safe catalog module. Add the new var to **`.env.local.example`** beside the
existing `LEMONSQUEEZY_VARIANT_STORY_1_BOOK` / `_STORY_2_LETTER` lines (keep it in sync).

The price configured on the LS variant must match the catalog's `priceUsd` (Step 4).

---

## Step 6 — Samples

Generate a few **Low**-tier sample books for the storefront detail page and save the chosen
pages, web-optimized (~800px JPEG), under `public/samples/<book-id>/`; reference them in the
catalog's `sampleImages` (Step 4). **Low is the default cost tier** for real book runs
(`generateAllIllustrations` defaults scenes to `low`; `medium`/`high` are deliberate opt-in
overrides for final/cover renders) — a sample book is ~$0.07–$0.08, not ~$0.70. Don't commit
the canonical QA fixtures; pull sample frames from a fresh Low run.

---

## The standing guards (every new book must clear these)

1. **The book's own merge/variant unit tests** (colocated, e.g.
   `lib/story/<book>/merge.test.ts` + `variants.test.ts`, mirroring the Story-2 suite):
   - **Zero surviving placeholders** across the full variant matrix (no `{token}` / `[FIELD]`
     in any resolved page).
   - The template's **"died"/euphemism rule** (Story 1) and **banned-phrase list** (Story 2's
     "fur baby" / "rainbow bridge" / "watching over you" / etc.) asserted across every
     combination.
   - **Optional-field handling** (a blank optional field is omitted cleanly — no dangling
     separator, no `MergeError`); `MergeError` reporting for a missing **required** field;
     the brace-injection regression.
2. **Byte-identity of ALL existing books' PDFs** — the standing regression guard. Existing
   output must not change by one byte. **How to verify:** render an existing book's fixture
   via `npm run render:test fixtures/otis.json` (placeholder SVGs, `$0`, no API) on your
   branch and against a clean `main` tree, then compare **byte length + a
   timestamp-normalized SHA**. The **raw** SHA differs every render because headless Chrome
   stamps a per-render `/CreationDate` + `/ModDate` into the PDF (the only differing bytes);
   normalize those out (or `cmp` and confirm the only differences are at those offsets) before
   comparing. Same length + same normalized SHA = byte-identical. Do this for **every**
   existing book, not just one.
3. **`npm run build`**, **`npm run test:run`**, and **`npx tsc --noEmit`** all green.
4. **The public-boundary test `lib/runtime/surface.boundary.test.ts` still passes** — i.e.
   the new registry/catalog/scene code did not pull `lib/ai/*`, Puppeteer, `node:`/fs, or
   `lib/supabase/server` into the public closure. If the book adds a public page/route, add it
   to `PUBLIC_ENTRIES` / `PUBLIC_API_ENTRIES` there.

---

## The reuse guarantee

A new book needs **zero** changes to Supabase, the batch worker, the admin review desk, or
delivery. The whole commerce loop is product-agnostic and flows **by id**:

`pending_payment → paid → queued → generating → awaiting_review → approved → delivered`

- **Order intake + payment** (PRs 05/06) carry the captured session (`inputs`) verbatim and
  the `storyType`; nothing book-specific.
- **The worker** (`lib/order/worker.ts`, PR-07) drains `queued` orders, downloads the photo,
  and calls `generateAllIllustrations` with the registry-driven slot list for that
  `storyType` — so it generates the right number of images for any book with no edit.
  Locally **`orderId === sessionId`**: the worker writes the book to `./sessions/[orderId].json`
  + `./generated/[orderId]/`.
- **The admin** (PR-08) reuses the preview/repaint/edit stack keyed by that same id, and
  **Approve** renders the final PDF via `getStory(...).pdfFilename` and uploads it — registry-
  driven, product-agnostic.
- **Delivery** (`lib/delivery/`, PR-09) mints a token, emails the link, and serves the PDF;
  the download route names the file via `getStory(storyType).pdfFilename(inputs)`.

If a new book makes you want to touch any of these, the recipe is incomplete — fix the
registry/layout instead.

---

## Worked example skeleton (illustrative — not a committed book)

Adding a hypothetical text-only "Story 3" booklet that **reuses existing layouts** (so Step 3
is skipped). This is a sketch to show the shape, **not** a real title:

```
lib/story/story3/
  master-text.ts     # pages as data, {merge} placeholders, layout tags, illustrationBriefs
  variants.ts        # composeVariants3 + resolveStory3 = mergeStory3(composeVariants3(s), s)
  merge.ts           # buildValues + mergeStory3; reuses clean / substitute / MergeError
  editable-fields.ts # page→field map, FIELD_COPY, setSessionField, getSessionFieldValue
lib/story/story-3.ts # the StoryDefinition wrapper (thin)
lib/pdf/filename.ts  # + bookletPdfFilename(petName) → "<Name>-Life-Story.pdf"
lib/story/wizard-config.ts  # + STORY_3_STEPS + WIZARD_CONFIG entry
lib/session/types.ts        # StoryType += "story-3"; Story3Session/Story3Draft
lib/story/master-text.ts    # + Story3PageId; PageId = …| Story3PageId
lib/catalog/products.ts     # + buildProduct("story-3-booklet", "story-3", {...})
public/samples/story-3-booklet/   # a few Low-tier sample JPEGs
.env.local.example          # + LEMONSQUEEZY_VARIANT_STORY_3_BOOKLET
```

A minimal `StoryDefinition` (in `lib/story/story-3.ts`), mirroring `story-1.ts`:

```ts
export const story3Definition: StoryDefinition = {
  resolve(session) {
    return resolveStory3(session as unknown as Story3Session);
  },
  illustrationSlots: BOOKLET_SCENE_PAGE_IDS, // [] for a text-only book
  pdfFilename(session) {
    return bookletPdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-3"),
  editable: story3Editable,
};
```

And its catalog entry (in `buildCatalog()` in `lib/catalog/products.ts`):

```ts
buildProduct("story-3-booklet", "story-3", {
  title: "A Life Well Lived",
  tagline: "A celebration-of-life booklet to print and share.",
  description: "…",                 // from the master template's customer-facing copy
  priceUsd: PLACEHOLDER_STORY_3_PRICE_USD,
  sampleImages: ["/samples/story-3-booklet/cover.jpg"],
  // illustrationCount is DERIVED by buildProduct from the registry — do not set it
}),
```

Then register it in `REGISTRY` (`lib/story/registry.ts`): `"story-3": story3Definition`.
