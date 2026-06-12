// The "edit your own words" contract for the Story-5 preview (Option A) — the
// sibling of lib/story/story2/editable-fields.ts, but for `Story5Session`.
//
// On the letter preview, an owner may correct THEIR OWN free-text inputs (and the
// pet/owner names) per page — never the fixed master-template prose, never the
// enum/toggle answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story5Session` (pure, no IO),
//   - the gentle UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory5` re-merge on top. Reuses `clean` from the shared
// merge engine, exactly as Story 2 does, so the persisted value is exactly what
// would have been rendered (no double spaces, no `{}` injection).
//
// NOTE: the optional-with-fallback free-text (quirks, lastGoodDay, whatIKeep) and
// the optional nickname/date fields are intentionally NOT exposed here — only the
// required free-text/name fields are editable. `quirks` IS editable (it appears on
// Page 3 and is one of the required-ish fields the preview exposes); its blank
// fallback lives in the variant layer, so an edit that re-merges still resolves.

import type { Story5Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields an owner may edit on the letter preview.
 * These map 1:1 onto session input fields (the names live on the cover; the rest
 * are the per-page letter memories). The optional-with-fallback fields
 * (lastGoodDay, whatIKeep) and the optional nicknames/dates are intentionally NOT
 * here — only the required free-text/name fields the spec lists.
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
 * The fields that, if blanked, would make `resolveStory5` throw `MergeError` or
 * leave the page incomplete — they must be rejected before a write, not after.
 * `favoriteRitual` + `favoriteSpots` back live `{placeholder}`s with no fallback;
 * `petName` + `ownerNames` back the salutation/signature. `quirks` has a variant
 * fallback when blank, but the preview still treats it as required (blanking it on
 * the preview should not silently swap to a stock line), matching Story 2's policy
 * of making every exposed editable field required.
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
 * ONCE on the cover (`note-cover` carries the title "A Letter to [petName]" +
 * "from [ownerNames]"). `quirks` and `favoriteRitual` appear on Page 3 (the "thank
 * you for" page); `favoriteSpots` on Page 5 (where the pet is now). Pages 2, 4 and
 * 6 carry only template prose + names, so they have no editor here. A page absent
 * from this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "note-cover": ["petName", "ownerNames"],
  "note-page-3": ["quirks", "favoriteRitual"],
  "note-page-5": ["favoriteSpots"],
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
 * here so the Story-5 module is the single home for its preview UI copy (the
 * sibling `FIELD_COPY` in story2/editable-fields.ts owns Story 2's). Story 5 is the
 * owner writing TO the pet, so the copy addresses the owner's own words.
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you called them by.",
  },
  ownerNames: {
    label: "Your name, as the letter should sign off",
    hint: 'How the letter signs — "from …". One name, or two if it was both of you.',
  },
  quirks: {
    label: "The little things you'd thank them for",
    hint: "A quirk or two — the way they tilted their head, the way their name fit them.",
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
 * Return a NEW `Story5Session` with `field` set to the cleaned `rawValue`, written
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
  session: Story5Session,
  field: EditableField,
  rawValue: string,
): Story5Session {
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
  session: Story5Session,
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
