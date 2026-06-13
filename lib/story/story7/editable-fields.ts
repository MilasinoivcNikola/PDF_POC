// The "edit your own words" contract for the Story-7 preview (Option A) — the
// narrative-layout sibling of lib/story/story6/editable-fields.ts, for
// `Story7Session` ("Welcome Home — [PET_NAME]'s Gotcha Day"). Used by the future
// preview editor (PR-B wires the UI).
//
// On the homecoming preview, an owner may correct THEIR OWN free-text inputs (and
// the pet/owner names) per page — never the fixed master-template prose, never the
// toggle answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story7Session` (pure, no IO),
//   - the gentle UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory7` re-merge on top. Reuses `clean` from the shared
// merge engine so the persisted value is exactly what would have been rendered.

import type { Story7Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields an owner may edit on the homecoming
 * preview. The names live on the cover/dedication; the rest are the per-page
 * memories. The optional-omit child/family fields ARE editable (they appear in
 * editable prose when set); the optional nickname/date are intentionally NOT here.
 */
export type EditableField =
  | "petName"
  | "ownerNames"
  | "homecomingMemory"
  | "quirks"
  | "favoriteActivity"
  | "sleepingSpot"
  | "childName"
  | "familyMembers";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "ownerNames",
  "homecomingMemory",
  "quirks",
  "favoriteActivity",
  "sleepingSpot",
  "childName",
  "familyMembers",
];

/**
 * The fields that, if blanked, would either make `resolveStory7` throw (they back
 * a `{placeholder}` with no fallback) or silently swap to a stock line — they must
 * be rejected before a write, not after. `petName` / `ownerNames` /
 * `favoriteActivity` / `sleepingSpot` are hard-required (no fallback);
 * `homecomingMemory` + `quirks` have variant fallbacks but the preview treats them
 * as required (blanking on the preview should not silently swap to a stock line),
 * matching Story 1/5/6's policy of making every exposed prose field required.
 * `childName` + `familyMembers` are the genuinely optional fields (a cleaned-empty
 * value clears them).
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "ownerNames",
  "homecomingMemory",
  "quirks",
  "favoriteActivity",
  "sleepingSpot",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which page. The pet name is edited ONCE on
 * the cover; the owner names on the dedication (Page 1). Page 4 carries the
 * homecoming memory; Page 5 the sleeping spot; Page 6 the quirks + the optional
 * child name (the "learned you fastest" beat); Page 7 the favorite activity + the
 * optional family members (the "your people are…" swap). The covers/closing/back-
 * cover carry only template prose, so they have no editor here. A page absent from
 * this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "welcome-cover": ["petName"],
  "welcome-dedication": ["ownerNames"],
  "welcome-drive-home": ["homecomingMemory"],
  "welcome-first-night": ["sleepingSpot"],
  "welcome-learning": ["quirks", "childName"],
  "welcome-now-ours": ["favoriteActivity", "familyMembers"],
};

/** The editable fields for one page (empty when the page has none). */
export function editableFieldsForPage(page: PageId): readonly EditableField[] {
  return PAGE_EDITABLE_FIELDS[page] ?? [];
}

// ---------------------------------------------------------------------------
// UI copy
// ---------------------------------------------------------------------------

/**
 * A gentle, warm label + hint for each editable field's inline editor, owned here
 * so the Story-7 module is the single home for its preview UI copy. Story 7 is the
 * joyful book — the copy stays celebratory, never sentimental.
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you call them by.",
  },
  ownerNames: {
    label: "Your name, as the dedication should read",
    hint: "How the dedication signs — one name, or two if it's both of you, or the family name.",
  },
  homecomingMemory: {
    label: "Your first-day memory",
    hint: "A sentence or two about bringing them home — the trembling car ride, the first nap. Leave blank for a gentle stand-in.",
  },
  quirks: {
    label: "The little things only they do",
    hint: "A quirk or two — the head-tilt at 'walk', the stolen sock parade. Leave blank for a gentle stand-in.",
  },
  favoriteActivity: {
    label: "Their favorite thing in the world",
    hint: "What they love most — stealing socks, the morning zoomies, the long evening walk.",
  },
  sleepingSpot: {
    label: "Where they sleep",
    hint: "Their spot — the crook of the couch, the foot of the bed, the warm square of sun.",
  },
  childName: {
    label: "A child's name, if you'd like to include one",
    hint: "Adds a line or two naming a child in the family. Leave blank to omit it.",
  },
  familyMembers: {
    label: "Who's in the home, if you'd like to name them",
    hint: "The people and any pets already there — \"Maria, James, and the cat Pepper.\" Leave blank to keep it general.",
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
 * Return a NEW `Story7Session` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses is
 * applied here so the persisted value is exactly what would have been rendered (no
 * double spaces, no `{}` injection).
 *
 * `childName` / `familyMembers` are the optional fields — a cleaned-empty value
 * clears them (stored as `""`, which `buildValues` treats as "not provided"). Every
 * other field is required; an empty cleaned value is NOT special-cased here —
 * callers must reject it first; this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: Story7Session,
  field: EditableField,
  rawValue: string,
): Story7Session {
  const value = clean(rawValue);

  switch (field) {
    case "petName":
      return { ...session, pet: { ...session.pet, name: value } };
    case "ownerNames":
      return { ...session, owner: { ...session.owner, names: value } };
    case "homecomingMemory":
      return {
        ...session,
        memories: { ...session.memories, homecomingMemory: value },
      };
    case "quirks":
      return {
        ...session,
        memories: { ...session.memories, quirks: value },
      };
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
    case "childName":
      return {
        ...session,
        memories: { ...session.memories, childName: value },
      };
    case "familyMembers":
      return {
        ...session,
        memories: { ...session.memories, familyMembers: value },
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
 * pre-fills with). `childName` / `familyMembers` default to "" when absent.
 */
export function getSessionFieldValue(
  session: Story7Session,
  field: EditableField,
): string {
  switch (field) {
    case "petName":
      return session.pet.name;
    case "ownerNames":
      return session.owner.names;
    case "homecomingMemory":
      return session.memories.homecomingMemory;
    case "quirks":
      return session.memories.quirks;
    case "favoriteActivity":
      return session.memories.favoriteActivity;
    case "sleepingSpot":
      return session.memories.sleepingSpot;
    case "childName":
      return session.memories.childName ?? "";
    case "familyMembers":
      return session.memories.familyMembers ?? "";
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
