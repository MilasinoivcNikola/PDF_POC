// The "edit your own words" contract for the Story-4 preview (Option A) — the
// sibling of lib/story/story2/editable-fields.ts, but for `Story4Session`.
//
// On the letter preview, an owner may correct THEIR OWN free-text inputs (and the
// pet/owner names) per page — never the fixed master-template prose, never the
// enum/toggle answers (including the headline living/memorial tense). This module
// is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story4Session` (pure, no IO),
//   - the gentle UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory4` re-merge on top. Reuses `clean` from the shared
// merge engine, exactly as Story 1/2 do, so the persisted value is exactly what
// would have been rendered (no double spaces, no `{}` injection).
//
// Story 4 is the celebration twin of Story 2 and shares its five free-text/name
// fields, PLUS the reused Story-1 `favoriteActivity` (the Page-4 "daily joy"
// beat). All six are required (each backs a `{placeholder}` the text references),
// so blanking any would make `resolveStory4` throw — they must be rejected before
// a write. The optional nicknames/dates are intentionally NOT editable here.

import type { Story4Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields an owner may edit on the Story-4 preview.
 * The names live on the cover; the rest are the per-page letter memories. The
 * headline `livingOrMemorial` toggle and the other enum answers (species,
 * relationship, deathType, beliefFrame, giftFor) and the optional nicknames/dates
 * are intentionally NOT here.
 */
export type EditableField =
  | "petName"
  | "ownerNames"
  | "quirks"
  | "favoriteRitual"
  | "favoriteActivity"
  | "favoriteSpots";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "ownerNames",
  "quirks",
  "favoriteRitual",
  "favoriteActivity",
  "favoriteSpots",
];

/**
 * The fields that, if blanked, would make `resolveStory4` throw `MergeError`
 * (they back a `{placeholder}` the master/variant text references). They must be
 * rejected before a write, not after. All six are required — Story 4 has no
 * optional editable field (nicknames/dates are not exposed here).
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "ownerNames",
  "quirks",
  "favoriteRitual",
  "favoriteActivity",
  "favoriteSpots",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which letter page. The names are edited
 * ONCE on the cover (`talk-cover` carries the title "If [petName] Could Talk" +
 * "to [ownerNames]"). `quirks` and `favoriteRitual` appear on Page 3 (the "I love
 * this about us" page); `favoriteActivity` and `favoriteSpots` on Page 4 (the
 * "daily joy" page). Pages 2, 5, 6 carry only template prose + names, so they have
 * no editor here. A page absent from this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "talk-cover": ["petName", "ownerNames"],
  "talk-page-3": ["quirks", "favoriteRitual"],
  "talk-page-4": ["favoriteActivity", "favoriteSpots"],
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
 * here so the Story-4 module is the single home for its preview UI copy. Tone is
 * the celebration register (present tense, warm), not the grief register.
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you call them by.",
  },
  ownerNames: {
    label: "Your name, as the letter should address you",
    hint: 'How the letter opens — "Dear …". One name, or two if it\'s both of you.',
  },
  quirks: {
    label: "The little things they do that you love",
    hint: "A quirk or two — the head-tilt at their name, the leash-meltdown, the sock heist.",
  },
  favoriteRitual: {
    label: "A ritual that's only yours",
    hint: "The everyday thing you do together — the morning walk, the evening sit.",
  },
  favoriteActivity: {
    label: "Their favorite thing to do",
    hint: "The ordinary joy — chasing the ball, a victory lap, the daily zoomies.",
  },
  favoriteSpots: {
    label: "Their favorite spots",
    hint: "One to three places they love — the sunlit corner, the spot by the door.",
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
 * Return a NEW `Story4Session` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses
 * is applied here so the persisted value is exactly what would have been
 * rendered (no double spaces, no `{}` injection).
 *
 * Every field here is required, so an empty cleaned value is NOT special-cased —
 * callers must reject it first; this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: Story4Session,
  field: EditableField,
  rawValue: string,
): Story4Session {
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
    case "favoriteActivity":
      return {
        ...session,
        memories: { ...session.memories, favoriteActivity: value },
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
  session: Story4Session,
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
    case "favoriteActivity":
      return session.memories.favoriteActivity;
    case "favoriteSpots":
      return session.memories.favoriteSpots;
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
