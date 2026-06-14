// The "edit your own words" contract for the Story-9 preview (Option A) — the
// narrative-layout sibling of lib/story/story6/editable-fields.ts, for a
// `Story9Session` ("[PET_NAME] and the New Baby"). Used by the future preview editor
// (PR-B wires the UI).
//
// On the keepsake preview, an owner may correct THEIR OWN free-text inputs (and the
// pet/owner names + the baby's name) per page — never the fixed master-template
// prose, never the toggle answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story9Session` (pure, no IO),
//   - the gentle UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory9` re-merge on top. Reuses `clean` from the shared merge
// engine so the persisted value is exactly what would have been rendered.

import type { Story9Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields an owner may edit on the keepsake preview.
 * The pet name lives on the cover; the owner name + baby name on the dedication; the
 * rest are the per-page memories. `babyName` is editable (optional — it degrades to
 * "the new baby" when blank/expecting); `quirks` is editable (optional-with-fallback
 * — a stock clause replaces it when blank). The optional-omit `nicknames` and the
 * `babyArrival` follow-up are intentionally NOT here — only the fields that appear in
 * editable prose.
 */
export type EditableField =
  | "petName"
  | "ownerNames"
  | "babyName"
  | "breedColor"
  | "favoriteActivity"
  | "sleepingSpot"
  | "quirks";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "ownerNames",
  "babyName",
  "breedColor",
  "favoriteActivity",
  "sleepingSpot",
  "quirks",
];

/**
 * The fields that, if blanked, would make `resolveStory9` throw `MergeError` (they
 * back a `{placeholder}` with no fallback) — they must be rejected before a write,
 * not after. `babyName` is the one truly optional field (it degrades to "the new
 * baby" when cleared). `quirks` has a variant fallback, but the preview treats it as
 * required (blanking on the preview should not silently swap to a stock clause),
 * matching Story 1/5/6's policy of making every exposed prose field required.
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "ownerNames",
  "breedColor",
  "favoriteActivity",
  "sleepingSpot",
  "quirks",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which page. The pet name is edited ONCE on
 * the cover (the title carries "[petName] and the New Baby"); the dedication carries
 * the owner name + the baby name. Page 2 carries the breed/color description; Page 3
 * the favorite activity + sleeping spot + quirks. The covers/back-cover/pages 4-7
 * carry only template prose, so they have no editor here. A page absent from this
 * map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "baby-cover": ["petName"],
  "baby-page-1": ["ownerNames", "babyName"],
  "baby-page-2": ["breedColor"],
  "baby-page-3": ["favoriteActivity", "sleepingSpot", "quirks"],
};

/** The editable fields for one page (empty when the page has none). */
export function editableFieldsForPage(page: PageId): readonly EditableField[] {
  return PAGE_EDITABLE_FIELDS[page] ?? [];
}

// ---------------------------------------------------------------------------
// UI copy
// ---------------------------------------------------------------------------

/**
 * A gentle, human label + hint for each editable field's inline editor, owned here
 * so the Story-9 module is the single home for its preview UI copy. Story 9 is a
 * joyful, growing-family book, so the copy stays warm and forward-looking.
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Their name",
    hint: "The name you call them by.",
  },
  ownerNames: {
    label: "Your family name, as the dedication should read",
    hint: 'How the dedication signs — e.g. "the Garcia family", "Mom and Dad".',
  },
  babyName: {
    label: "The new baby's name, if you have one",
    hint: 'Optional. Leave blank and the book gently says "the new baby" throughout.',
  },
  breedColor: {
    label: "A few words to describe them",
    hint: 'Their breed and coat — e.g. "golden retriever with one floppy ear".',
  },
  favoriteActivity: {
    label: "Their favorite thing in the world",
    hint: 'Something they love — e.g. "chasing tennis balls in the backyard".',
  },
  sleepingSpot: {
    label: "Where they curl up at the end of the day",
    hint: 'Their spot — e.g. "at the foot of the bed", "in the sunny window".',
  },
  quirks: {
    label: "The little things only they do",
    hint: "A quirk or two — the head tilt at the doorbell, the way they sigh when they settle.",
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
 * Return a NEW `Story9Session` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses is
 * applied here so the persisted value is exactly what would have been rendered (no
 * double spaces, no `{}` injection).
 *
 * `babyName` is the one optional field — a cleaned-empty value clears it (stored as
 * `""`, which the merge layer treats as "degrade to the new baby"). Every other
 * field is required; an empty cleaned value is NOT special-cased here — callers must
 * reject it first; this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: Story9Session,
  field: EditableField,
  rawValue: string,
): Story9Session {
  const value = clean(rawValue);

  switch (field) {
    case "petName":
      return { ...session, pet: { ...session.pet, name: value } };
    case "breedColor":
      return { ...session, pet: { ...session.pet, breedColor: value } };
    case "ownerNames":
      return { ...session, owner: { ...session.owner, names: value } };
    case "babyName":
      return { ...session, babyName: value };
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
 * pre-fills with). `babyName` defaults to "" when absent.
 */
export function getSessionFieldValue(
  session: Story9Session,
  field: EditableField,
): string {
  switch (field) {
    case "petName":
      return session.pet.name;
    case "breedColor":
      return session.pet.breedColor;
    case "ownerNames":
      return session.owner.names;
    case "babyName":
      return session.babyName ?? "";
    case "favoriteActivity":
      return session.memories.favoriteActivity;
    case "sleepingSpot":
      return session.memories.sleepingSpot;
    case "quirks":
      return session.memories.quirks;
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
