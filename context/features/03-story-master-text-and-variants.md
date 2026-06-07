# 03 — Story Master Text, Merge & Variants

> **Craft Area:** 1 — PDF pipeline · **Owner agent:** `pdf-render-specialist`
> **Milestone:** 1 · **Depends on:** 02
> **Branch:** `feature/story-master-text`

## Status

Not Started

## Goals

- Encode the Story-1 master text (cover, dedication, 12 pages, back cover) as data, with merge fields and variant hooks, so a `StorySession` becomes fully-resolved page text with **no `[MERGE_FIELD]` left literal anywhere**.
- Apply the four variant dimensions correctly: age bracket (3-5 / 6-8 / 9-12), death type (Page 7), belief frame (Page 9), other-pets-in-home (Page 11).
- Pronouns and the pet's name are consistent across all pages (the template's #1 production bug).
- Output a typed, ordered `ResolvedStory` structure (per-page text blocks + illustration brief + page number) that feature 04's template renders without further text logic.

## Scope

**In scope**
- `lib/story/master-text.ts` — the master text for every page as structured data (not one big string): each page has its copy with `{merge}` placeholders, an illustration-brief (for the AI prompt builders in 07), and the variant branch points.
- `lib/story/merge.ts` — pure merge engine: substitute `StorySession` values into placeholders; auto-map pronouns and species descriptor (reuse the mappers from feature 02 — do not re-implement); light cleanup of free-text (`favoriteMemory` etc.) such as trimming/whitespace. Never silently leave a placeholder unresolved — surface missing required fields.
- `lib/story/variants.ts` — variant composition:
  - **Age:** 3-5 simplifies Pages 7/8/11; 6-8 is the default master text; 9-12 adds the extra sentences on 7/8/9/11.
  - **Death type:** swaps Page 7 phrasing (natural default / illness / sudden / euthanasia).
  - **Belief frame:** swaps Page 9 (rainbow-bridge default / heaven / secular / none).
  - **Other pets:** appends the extra Page 11 line when `yes`.
- A single entry point, e.g. `resolveStory(session: StorySession): ResolvedStory`, that composes variants then merges, returning the ordered page model.

**Out of scope**
- Rendering / HTML / CSS (feature 04).
- The age-variant *illustration* differences — text only here; illustration briefs feed feature 07.
- Stories 2 and 3 (out of project scope entirely).

## Implementation notes

**Key decisions**
- **Compose variants, then merge.** Select the right text per page based on toggles first, then substitute merge fields. This matches the template's own guidance ("Variants should live in `lib/story/variants.ts` and be composed into the master text before rendering").
- Follow the template's hard rules exactly — they are not stylistic: always use the word **"died"** (never "passed away"/"went to sleep"/"lost"); end on a hopeful page; use the pet's name often. These are baked into the master text; don't paraphrase.
- Keep everything **pure and deterministic** so it's trivially unit-testable and so feature 04 (and the preview in 10) can call it on both server and client.
- Model the page set as: COVER, PAGE 1 (dedication), PAGES 2–12, BACK COVER. The optional `parentDedication` renders on Page 1 only if provided.

**Files**
- `lib/story/master-text.ts`
- `lib/story/merge.ts`
- `lib/story/variants.ts`

## References

- @context/masterstories/story-1-master-template.md — **the** source text, merge fields, variant tables, and the "Quality bar / what to avoid" + production checklist.
- @context/saying-goodbye-to-otis.pdf — a reference of the intended finished wording/feel.
- @prototypes/preview.html — shows resolved copy for the Otis example (sanity-check your output against it).

## Done when

- [ ] `resolveStory()` returns all pages with zero literal `[MERGE_FIELD]` tokens for a complete session.
- [ ] Each variant dimension verifiably changes the right page(s).
- [ ] Pronoun + name consistency holds across all 12 pages.
- [ ] Matches the Otis example copy in `preview.html` for the equivalent inputs.
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author` (high value — this is pure logic):
  - Every merge field substitutes; assert no `[A-Z_]+` placeholder remains.
  - he/she/they pronoun consistency across pages.
  - Each `deathType` → correct Page 7 text; each `beliefFrame` → correct Page 9 text; `otherPetsInHome=yes` → extra Page 11 line.
  - Each age bracket selects the right Page 7/8/11 wording.
  - Missing required field is reported, not rendered as a literal token.
