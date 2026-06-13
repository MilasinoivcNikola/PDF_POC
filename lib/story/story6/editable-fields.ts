// The "edit your own words" contract for the Story-6 preview (Option A) — the
// narrative-layout sibling of lib/story/editable-fields.ts (Story 1), for
// `Story6Session`. Used by the future preview editor (PR 26 wires the UI).
//
// On the tribute preview, an owner may correct THEIR OWN free-text inputs (and the
// pet/owner names) per page — never the fixed master-template prose, never the
// toggle answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story6Session` (pure, no IO),
//   - the gentle UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory6` re-merge on top. Reuses `clean` from the shared
// merge engine so the persisted value is exactly what would have been rendered.

import type { Story6Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields an owner may edit on the tribute preview.
 * The names live on the cover; the rest are the per-page memories/description.
 * The optional-omit fields (sleepingSpot, favoriteSpots) and the optional
 * nickname/date are intentionally NOT here — only the fields that appear in
 * editable prose. `ownerMessage`, `stillLoves` and `quirks` ARE editable
 * (optional with a fallback / dedication block).
 */
export type EditableField =
  | "petName"
  | "ownerNames"
  | "ownerMessage"
  | "breedColor"
  | "ageOrStage"
  | "stillLoves"
  | "favoriteActivity"
  | "favoriteRitual"
  | "quirks";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "ownerNames",
  "ownerMessage",
  "breedColor",
  "ageOrStage",
  "stillLoves",
  "favoriteActivity",
  "favoriteRitual",
  "quirks",
];

/**
 * The fields that, if blanked, would make `resolveStory6` throw `MergeError`
 * (they back a `{placeholder}` with no fallback) — they must be rejected before a
 * write, not after. `ownerMessage` is the one truly optional field (the dedication
 * block; a cleaned-empty value clears it). `stillLoves` + `quirks` have variant
 * fallbacks, but the preview treats them as required (blanking on the preview
 * should not silently swap to a stock line), matching Story 1/5's policy of making
 * every exposed prose field required.
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "ownerNames",
  "breedColor",
  "ageOrStage",
  "stillLoves",
  "favoriteActivity",
  "favoriteRitual",
  "quirks",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which page. Names are edited ONCE on the
 * cover (the title carries "While You're Still Here, [petName]"; the dedication
 * carries the owner message + "— [ownerNames]"). Page 2 carries the breed/age
 * description; Page 3 the still-loves + ritual + activity; Page 4 the quirks. The
 * covers/back-cover/pages 5-6 carry only template prose, so they have no editor
 * here. A page absent from this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "tribute-cover": ["petName"],
  "tribute-page-1": ["ownerNames", "ownerMessage"],
  "tribute-page-2": ["breedColor", "ageOrStage"],
  "tribute-page-3": ["stillLoves", "favoriteActivity", "favoriteRitual"],
  "tribute-page-4": ["quirks"],
};

/** The editable fields for one page (empty when the page has none). */
export function editableFieldsForPage(page: PageId): readonly EditableField[] {
  return PAGE_EDITABLE_FIELDS[page] ?? [];
}

// ---------------------------------------------------------------------------
// UI copy
// ---------------------------------------------------------------------------

/**
 * A gentle, human label + hint for each editable field's inline editor, owned
 * here so the Story-6 module is the single home for its preview UI copy. Story 6
 * is the owner celebrating a pet who is STILL HERE, so the copy stays present
 * tense.
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you call them by.",
  },
  ownerNames: {
    label: "Your name, as the dedication should read",
    hint: "How the dedication signs — one name, or two if it's both of you.",
  },
  ownerMessage: {
    label: "A line for the dedication, if you'd like one",
    hint: "An optional few words to say to them, printed on the dedication. Leave blank to omit it.",
  },
  breedColor: {
    label: "A few words to describe them",
    hint: "Their breed and coat — the grey at the muzzle, the soft silver, whatever is true now.",
  },
  ageOrStage: {
    label: "Their age or stage",
    hint: 'Where they are in life — "13 years young", "a grand old senior".',
  },
  stillLoves: {
    label: "What they still love",
    hint: "Something they still do, in the present — waits at the window at four, follows the sun across the floor.",
  },
  favoriteActivity: {
    label: "Something you still do together",
    hint: "The slow walk, the morning routine — a little smaller now, and still yours.",
  },
  favoriteRitual: {
    label: "A ritual that's only yours",
    hint: "The everyday thing — the coffee with your hand on their back, the evening sit.",
  },
  quirks: {
    label: "The little things only they do",
    hint: "A quirk or two — the way they sigh when they lie down, the head tilt at their name.",
  },
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Whether `field` is a known editable field key. */
export function isEditableField(field: string): field is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(field);
}

/** Whether a field is required (rejected if blanked). */
export function isRequiredField(field: EditableField): boolean {
  return REQUIRED_EDITABLE_FIELDS.has(field);
}

// ---------------------------------------------------------------------------
// Pure write-back
// ---------------------------------------------------------------------------

/**
 * Return a NEW `Story6Session` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses is
 * applied here so the persisted value is exactly what would have been rendered (no
 * double spaces, no `{}` injection).
 *
 * `ownerMessage` is the one optional field — a cleaned-empty value clears it
 * (stored as `""`, which `buildValues` treats as "not provided"). Every other
 * field is required; an empty cleaned value is NOT special-cased here — callers
 * must reject it first; this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: Story6Session,
  field: EditableField,
  rawValue: string,
): Story6Session {
  const value = clean(rawValue);

  switch (field) {
    case "petName":
      return { ...session, pet: { ...session.pet, name: value } };
    case "breedColor":
      return { ...session, pet: { ...session.pet, breedColor: value } };
    case "ownerNames":
      return { ...session, owner: { ...session.owner, names: value } };
    case "ownerMessage":
      return {
        ...session,
        memories: { ...session.memories, ownerMessage: value },
      };
    case "ageOrStage":
      return {
        ...session,
        memories: { ...session.memories, ageOrStage: value },
      };
    case "stillLoves":
      return {
        ...session,
        memories: { ...session.memories, stillLoves: value },
      };
    case "favoriteActivity":
      return {
        ...session,
        memories: { ...session.memories, favoriteActivity: value },
      };
    case "favoriteRitual":
      return {
        ...session,
        memories: { ...session.memories, favoriteRitual: value },
      };
    case "quirks":
      return {
        ...session,
        memories: { ...session.memories, quirks: value },
      };
    default: {
      // Exhaustiveness guard — an unknown key never silently no-ops.
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}

/**
 * The current raw value of an editable field on a session (what the inline editor
 * pre-fills with). `ownerMessage` defaults to "" when absent.
 */
export function getSessionFieldValue(
  session: Story6Session,
  field: EditableField,
): string {
  switch (field) {
    case "petName":
      return session.pet.name;
    case "breedColor":
      return session.pet.breedColor;
    case "ownerNames":
      return session.owner.names;
    case "ownerMessage":
      return session.memories.ownerMessage ?? "";
    case "ageOrStage":
      return session.memories.ageOrStage;
    case "stillLoves":
      return session.memories.stillLoves;
    case "favoriteActivity":
      return session.memories.favoriteActivity;
    case "favoriteRitual":
      return session.memories.favoriteRitual;
    case "quirks":
      return session.memories.quirks;
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
