# 02 — Session Types & Storage

> **Craft Area:** 3 — App/UI (shared data contract) · **Owner agent:** `nextjs-ui-builder`
> **Milestone:** 1 · **Depends on:** 01
> **Branch:** `feature/session-types`

## Status

Not Started

## Goals

- A single, authoritative TypeScript model of a Story-1 order (`StoryInput` / session state) that every craft area imports — the wizard writes it, the story-merge layer reads it, the AI pipeline reads the pet fields, the PDF renderer consumes the merged result.
- Browser persistence: wizard progress survives a refresh via `localStorage`.
- Disk persistence: a session can be written to / read from `./sessions/[id].json` so generated images and the rendered PDF can be tied back to inputs.
- The types encode every merge field and toggle the master template needs, so feature 03 has nothing to guess.

## Scope

**In scope**
- `lib/session/types.ts` — types covering all Story-1 inputs and derived/runtime state:
  - Pet: `name`, `species`, `speciesDescriptor` (derivable), `breedColor`, `pronoun` (`he|she|they`) and derived object/possessive forms, `photo` reference, `illustrationStyle` (`watercolor|storybook|pencil`).
  - Child: `name`, `ageBracket` (`3-5|6-8|9-12`).
  - Memories: `favoriteActivity`, `sleepingSpot`, `favoriteMemory`, optional `parentDedication`.
  - Toggles: `deathType` (`natural|illness|sudden|euthanasia`), `beliefFrame` (`rainbow-bridge|heaven|secular|none`), `otherPetsInHome` (`yes|no`).
  - Runtime: `id`, `createdAt`, `status` (e.g. `draft|generating|ready`), generated-image manifest (per-page image paths + the prompt/reference hashes used — needed for caching in feature 07), and PDF output path.
- `lib/session/storage.ts` — helpers:
  - `localStorage` load/save/clear for the in-progress wizard draft (SSR-safe — guard `window`).
  - Disk helpers to read/write `./sessions/[id].json` (server-side only).
  - `createSessionId()` and a `newDraft()` factory with sane defaults (default `illustrationStyle: 'watercolor'`, `beliefFrame: 'rainbow-bridge'`).
- Small pure helpers for the auto-mapped fields: pronoun → object/possessive, species → `SPECIES_DESCRIPTOR` ("dog" → "good boy"/"sweet girl" depends on pronoun, "cat" → "kitty", etc.). (Feature 03 may also need these — define them here once and import them there. Decide ownership: put the pure mappers here in `lib/session/` or in `lib/story/`; pick one and don't duplicate.)

**Out of scope**
- React Context / the wizard UI itself (feature 08 builds that on top of these helpers).
- Any database — JSON files only, per plan.
- File upload handling for the photo bytes (feature 06 owns `/api/upload`); here we only model the *reference* to the photo (path/filename).

## Implementation notes

**Key decisions**
- This is the contract three agents share — keep it small, explicit, and well-commented. Prefer string-literal unions over loose `string` for every enumerated field so merge/variant code (03) and prompt builders (07) get exhaustive `switch` safety.
- Distinguish **draft** (what the wizard holds in `localStorage`, fields optional as the user fills them) from a **finalized session** (written to disk at Generate time, required fields present). A `StoryDraft` (partial) vs `StorySession` (complete) split keeps both layers honest.
- Keep disk and `localStorage` helpers in the same module but clearly separated; never import the Node `fs` path into client components.

**Files**
- `lib/session/types.ts`
- `lib/session/storage.ts`

## References

- @context/masterstories/story-1-master-template.md — "Merge fields" + "Special-case toggles" tables are the field list.
- @context/local-prototype-plan.md — "File persistence" and wizard step structure.
- @prototypes/wizard.html — the inputs the form actually collects.

## Done when

- [ ] Types compile and cover every merge field + toggle in the Story-1 template.
- [ ] `localStorage` helpers are SSR-safe and round-trip a draft.
- [ ] Disk helpers read/write `./sessions/[id].json`.
- [ ] Pronoun + species-descriptor mappers exist in exactly one place and are unit-tested.
- [ ] `npm run build` + `npm run test:run` pass.

## Tests

- `test-author`: pronoun mapping (he/she/they → object/possessive), species-descriptor mapping, `newDraft()` defaults, JSON round-trip of a session.
