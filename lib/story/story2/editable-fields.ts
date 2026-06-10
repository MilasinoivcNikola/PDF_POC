// The "edit your own words" contract for the Story-2 preview (Option A) — the
// sibling of lib/story/editable-fields.ts (Story 1), but for `Story2Session`.
//
// On the letter preview, an owner may correct THEIR OWN free-text inputs (and the
// pet/owner names) per page — never the fixed master-template prose, never the
// enum/toggle answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story2Session` (pure, no IO),
//   - the gentle UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory2` re-merge on top. Reuses `clean` from the shared
// merge engine, exactly as Story 1 does, so the persisted value is exactly what
// would have been rendered (no double spaces, no `{}` injection).

import type { Story2Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields an owner may edit on the letter preview.
 * These map 1:1 onto session input fields (the names live on the cover; the rest
 * are the per-page letter memories). Enum/toggle answers (species, relationship,
 * deathType, beliefFrame, …) and the optional nicknames/dates are intentionally
 * NOT here — only the five required free-text/name fields the spec lists.
 */
export type EditableField =
  | "petName"
  | "ownerNames"
  | "quirks"
  | "favoriteRitual"
  | "favoriteSpots";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "ownerNames",
  "quirks",
  "favoriteRitual",
  "favoriteSpots",
];

/**
 * The fields that, if blanked, would make `resolveStory2` throw `MergeError`
 * (they back a `{placeholder}` the master/variant text references). They must be
 * rejected before a write, not after. All five are required — Story 2 has no
 * optional editable field (nicknames/dates are not exposed here).
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "ownerNames",
  "quirks",
  "favoriteRitual",
  "favoriteSpots",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which letter page. The names are edited
 * ONCE on the cover (`letter-cover` carries the title "A Letter from [petName]"
 * + "for [ownerNames]"). `quirks` and `favoriteRitual` appear on Page 3 (the "I
 * noticed" page); `favoriteSpots` on Page 5 (where the pet is now). Pages 2, 4
 * and 6 carry only template prose + names, so they have no editor here. A page
 * absent from this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "letter-cover": ["petName", "ownerNames"],
  "letter-page-3": ["quirks", "favoriteRitual"],
  "letter-page-5": ["favoriteSpots"],
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
 * here so the Story-2 module is the single home for its preview UI copy (the
 * sibling `FIELD_COPY` in lib/story/editable-fields.ts owns Story 1's).
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you called them by.",
  },
  ownerNames: {
    label: "Your name, as the letter should address you",
    hint: 'How the letter opens — "Dear …". One name, or two if it was both of you.',
  },
  quirks: {
    label: "The little things they noticed about you",
    hint: "A quirk or two — the way they tilted their head, where their nose always went.",
  },
  favoriteRitual: {
    label: "A ritual that was only yours",
    hint: "The everyday thing you did together — the morning walk, the evening sit.",
  },
  favoriteSpots: {
    label: "Their favorite spots",
    hint: "One to three places they loved — the sunlit corner, the spot by the door.",
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
 * Return a NEW `Story2Session` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses
 * is applied here so the persisted value is exactly what would have been
 * rendered (no double spaces, no `{}` injection).
 *
 * Every field here is required, so an empty cleaned value is NOT special-cased —
 * callers must reject it first (see `isRequiredField` + the shared
 * `isBlankAfterClean`); this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: Story2Session,
  field: EditableField,
  rawValue: string,
): Story2Session {
  const value = clean(rawValue);

  switch (field) {
    case "petName":
      return { ...session, pet: { ...session.pet, name: value } };
    case "ownerNames":
      return { ...session, owner: { ...session.owner, names: value } };
    case "quirks":
      return {
        ...session,
        memories: { ...session.memories, quirks: value },
      };
    case "favoriteRitual":
      return {
        ...session,
        memories: { ...session.memories, favoriteRitual: value },
      };
    case "favoriteSpots":
      return {
        ...session,
        memories: { ...session.memories, favoriteSpots: value },
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
 * pre-fills with).
 */
export function getSessionFieldValue(
  session: Story2Session,
  field: EditableField,
): string {
  switch (field) {
    case "petName":
      return session.pet.name;
    case "ownerNames":
      return session.owner.names;
    case "quirks":
      return session.memories.quirks;
    case "favoriteRitual":
      return session.memories.favoriteRitual;
    case "favoriteSpots":
      return session.memories.favoriteSpots;
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
