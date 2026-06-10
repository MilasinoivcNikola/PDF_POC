// The "edit your own words" contract for the in-browser preview (Option A).
//
// On the preview, a parent may correct THEIR OWN free-text inputs (and the two
// names) per page — never the fixed master-template prose, never the enum/toggle
// answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `StorySession` (pure, no IO),
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory` re-merge on top.

import type { StorySession } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields a parent may edit on the preview. These
 * map 1:1 onto session input fields (the names live on the cover/dedication
 * spread; the rest are the per-page memories/description). Enum/toggle answers
 * (species, pronoun, ageBracket, deathType, …) are intentionally NOT here.
 */
export type EditableField =
  | "petName"
  | "childName"
  | "parentDedication"
  | "breedColor"
  | "favoriteActivity"
  | "sleepingSpot"
  | "favoriteMemory";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "childName",
  "parentDedication",
  "breedColor",
  "favoriteActivity",
  "sleepingSpot",
  "favoriteMemory",
];

/**
 * The fields that, if blanked, would make `resolveStory` throw `MergeError`
 * (they back a `{placeholder}` the master/variant text references). They must be
 * rejected before a write, not after. `parentDedication` is intentionally absent
 * — it is the one optional field, so a cleaned-empty value clears it.
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "childName",
  "breedColor",
  "favoriteActivity",
  "sleepingSpot",
  "favoriteMemory",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which page. Names appear on nearly every
 * page, so they're edited ONCE on the cover/dedication spread (`cover` carries
 * the title + names; `page-1` carries the optional parent dedication). Pages
 * 3 and 7–12 and the back cover carry only template prose + names, so they have
 * no editor here. A page absent from this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  cover: ["petName", "childName"],
  "page-1": ["parentDedication"],
  "page-2": ["breedColor"],
  "page-4": ["favoriteActivity"],
  "page-5": ["sleepingSpot"],
  "page-6": ["favoriteMemory"],
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
 * here so this module is the single home for Story 1's preview UI copy (the
 * sibling `FIELD_COPY` in lib/story/story2/editable-fields.ts owns Story 2's).
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you used when calling them home.",
  },
  childName: {
    label: "Your child's name",
    hint: "Who the book is written for.",
  },
  parentDedication: {
    label: "A dedication, if you'd like one",
    hint: "An optional few words, printed on the dedication page. Leave blank to omit it.",
  },
  breedColor: {
    label: "A few words to describe them",
    hint: "The kind of detail you'd mention to a stranger.",
  },
  favoriteActivity: {
    label: "Their favorite thing to do",
    hint: "What they loved most in the world.",
  },
  sleepingSpot: {
    label: "Where they liked to sleep",
    hint: "Their favorite warm, safe place.",
  },
  favoriteMemory: {
    label: "A favorite memory",
    hint: "One or two sentences about a day to remember.",
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

/**
 * Whether a raw value is blank once the merge engine's `clean()` is applied —
 * the single shared definition of "this would empty the field" used by the
 * route's required-field guard and the client's gentle block.
 */
export function isBlankAfterClean(value: string): boolean {
  return clean(value) === "";
}

// ---------------------------------------------------------------------------
// Pure write-back
// ---------------------------------------------------------------------------

/**
 * Return a NEW `StorySession` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses
 * is applied here so the persisted value is exactly what would have been
 * rendered (no double spaces, no `{}` injection).
 *
 * For `parentDedication`, a cleaned-empty value clears it — stored as `""`, which
 * `buildValues` (merge.ts) treats as "not provided" (it only surfaces a non-empty
 * dedication). For every required field, an empty cleaned value is NOT special-
 * cased here — callers must reject it first (see `isBlankAfterClean` /
 * `isRequiredField`); this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: StorySession,
  field: EditableField,
  rawValue: string,
): StorySession {
  const value = clean(rawValue);

  switch (field) {
    case "petName":
      return { ...session, pet: { ...session.pet, name: value } };
    case "breedColor":
      return { ...session, pet: { ...session.pet, breedColor: value } };
    case "childName":
      return { ...session, child: { ...session.child, name: value } };
    case "favoriteActivity":
      return {
        ...session,
        memories: { ...session.memories, favoriteActivity: value },
      };
    case "sleepingSpot":
      return {
        ...session,
        memories: { ...session.memories, sleepingSpot: value },
      };
    case "favoriteMemory":
      return {
        ...session,
        memories: { ...session.memories, favoriteMemory: value },
      };
    case "parentDedication":
      return {
        ...session,
        memories: { ...session.memories, parentDedication: value },
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
 * pre-fills with). `parentDedication` defaults to "" when absent.
 */
export function getSessionFieldValue(
  session: StorySession,
  field: EditableField,
): string {
  switch (field) {
    case "petName":
      return session.pet.name;
    case "breedColor":
      return session.pet.breedColor;
    case "childName":
      return session.child.name;
    case "favoriteActivity":
      return session.memories.favoriteActivity;
    case "sleepingSpot":
      return session.memories.sleepingSpot;
    case "favoriteMemory":
      return session.memories.favoriteMemory;
    case "parentDedication":
      return session.memories.parentDedication ?? "";
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
