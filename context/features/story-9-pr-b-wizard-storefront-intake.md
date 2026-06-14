# Story 9 (PR-B): Wizard, Storefront & Order Intake

> Book: **"[PET_NAME] and the New Baby"** — the family-transition keepsake.
> Source of truth: `context/masterstories/story-9-master-template.md`.
> Depends on: PR-A (`feature/story9-text`) merged.
> Branch: `feature/story9-wizard`.

## Status

Not Started

## Scope

Make Story 9 **creatable** (a `/create` wizard path) and **sellable** (a `/books`
storefront card + public order intake). No engine, worker, admin, Supabase, delivery, or
state-machine changes — the reuse guarantee holds; orders flow through the existing
machinery by id.

## Goals

1. **Wizard** (`WIZARD_CONFIG` + the create-flow step UI):
   - Add the Story-9 step sequence. Reuses the upload + pet steps; adds a **baby/family
     step** collecting the three new fields: `babyName` (optional), `babyStatus`
     (expecting | arrived toggle, **default expecting**), `babyArrival` (optional
     free-text), plus the reused `otherPetsInHome` toggle.
   - **Conditional reveal:** `babyName` is only meaningfully used when `babyStatus =
     arrived`. Per the Story-8 PR-B lesson, **gate the conditional field at generate, not
     at the step** — an expecting order with a blank name must complete cleanly (degrades
     to "the new baby"). No wizard dead-end.
   - Draft → `Story9Session` mapping; required vs optional field validation at the
     generate boundary.

2. **Storefront** (`lib/catalog/products.ts` + `/books`):
   - `buildProduct("story-9-newbaby", "story-9", {...})` at **`priceUsd: 2700`** ($27).
     `illustrationCount` **derives** from `illustrationSlots.length` (= 7) — never hardcode.
   - Web-optimized `sampleImages` under `public/samples/story-9-newbaby/` (cover + one
     interior, e.g. the Page 5 "big sibling" or Page 7 "love grows" hero).
   - Customer-facing copy from the masterstory's product-page description block.

3. **Public order intake**: the order form accepts the Story-9 fields and writes a
   `pending_payment` order + photo to Supabase via the existing public intake route —
   same path as Stories 5–8. Confirm the LS variant id wiring (`LEMONSQUEEZY_VARIANT_…`)
   and that the configured LS price matches `priceUsd` (2700 cents).

4. **Preview editing** (if not delivered in PR-A): the `editable-fields` contract so an
   owner can edit their own free-text/names on the preview → re-merge → re-render ($0).
   Editable: petName, ownerNames, breedColor, favoriteActivity, sleepingSpot, quirks,
   babyName, babyArrival.

## Guards / standing tests

- Wizard-config and catalog tests updated for the new entry.
- Existing boundary + gate tests stay green (no new operator/public route — intake reuses
  the existing public order route).

## Notes / decisions

- **$27**, default **expecting** — locked with PM 2026-06-14.
- This is a **#7 niche probe** with no named competitor — ship lean, merchandise it
  honestly, and let real traffic give the demand signal. Do not over-invest.
- Completes Story 9.
