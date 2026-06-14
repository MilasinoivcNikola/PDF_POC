// The "edit your own words" contract for the Story-8 preview (Option A) — the
// narrative-layout sibling of lib/story/story7/editable-fields.ts, for
// `Story8Session` ("The Amazing Adventures of [PET_NAME]"). Used by the future
// preview editor (PR-B wires the UI).
//
// On the adventure preview, a customer may correct THEIR OWN free-text inputs (and
// the pet/child names + the superpower) per page — never the fixed master-template
// prose, never the toggle answers. This module is the single source of truth for:
//   - which fields are editable, and which page they're edited on,
//   - which of them are required (can't be blanked, or re-merge would throw),
//   - how to write one edited value back into a `Story8Session` (pure, no IO),
//   - the playful UI copy (label + hint) for each field's inline editor,
// so the API route (app/api/update-text) and the UI/tests all agree.
//
// Everything here is pure (no IO) and unit-testable. The route layers the disk
// read/write + `resolveStory8` re-merge on top. Reuses `clean` from the shared
// merge engine so the persisted value is exactly what would have been rendered.

import type { Story8Session } from "@/lib/session/types";
import { clean } from "@/lib/story/merge";
import type { PageId } from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Editable field keys
// ---------------------------------------------------------------------------

/**
 * The customer free-text + name fields a customer may edit on the adventure
 * preview. The pet name lives on the cover; the child name + superpower + the
 * activity/quirks/sidekick are the per-scene adventure inputs. The optional-omit
 * nickname field is intentionally NOT here.
 */
export type EditableField =
  | "petName"
  | "childName"
  | "superpower"
  | "favoriteActivity"
  | "quirks"
  | "sidekickName";

/** Every editable field key, for membership checks at the API boundary. */
export const EDITABLE_FIELDS: readonly EditableField[] = [
  "petName",
  "childName",
  "superpower",
  "favoriteActivity",
  "quirks",
  "sidekickName",
];

/**
 * The fields that, if blanked, would either make `resolveStory8` throw (they back a
 * required `{placeholder}`) or silently swap to a derived/stock value — they must be
 * rejected before a write, not after. `petName` is hard-required (no fallback).
 * `superpower` has the derive-from-activity/quirks/species fallback chain, but the
 * preview treats it as required (blanking on the preview should not silently swap to
 * a derived line), matching the other books' policy of making every exposed prose
 * field required. `favoriteActivity` / `quirks` likewise feed the superpower chain
 * and the briefs, so the preview treats them as required. `childName` and
 * `sidekickName` are the genuinely optional fields (a cleaned-empty value clears
 * them) — note `childName` blank is only safe in pet-solo, which the route enforces
 * via the same required-field gate the wizard uses.
 */
export const REQUIRED_EDITABLE_FIELDS: ReadonlySet<EditableField> = new Set([
  "petName",
  "superpower",
  "favoriteActivity",
  "quirks",
]);

// ---------------------------------------------------------------------------
// Page → fields map
// ---------------------------------------------------------------------------

/**
 * Which editable fields are exposed on which page. The pet name is edited ONCE on
 * the cover; the child name on the call (Page 3, where the child first speaks); the
 * superpower on Page 2 (where it is introduced); the favorite activity + quirks on
 * Page 2 (they feed the superpower); the sidekick on Page 5 (the expedition party).
 * The covers/closing/back-cover carry only template prose, so they have no editor
 * here. A page absent from this map has no editable fields.
 */
export const PAGE_EDITABLE_FIELDS: Partial<Record<PageId, readonly EditableField[]>> = {
  "adventure-cover": ["petName"],
  "adventure-special": ["superpower", "favoriteActivity", "quirks"],
  "adventure-call": ["childName"],
  "adventure-deeper": ["sidekickName"],
};

/** The editable fields for one page (empty when the page has none). */
export function editableFieldsForPage(page: PageId): readonly EditableField[] {
  return PAGE_EDITABLE_FIELDS[page] ?? [];
}

// ---------------------------------------------------------------------------
// UI copy
// ---------------------------------------------------------------------------

/**
 * A playful label + hint for each editable field's inline editor, owned here so the
 * Story-8 module is the single home for its preview UI copy. Story 8 is the joyful
 * adventure book — the copy stays fun and warm.
 */
export const FIELD_COPY: Record<EditableField, { label: string; hint: string }> = {
  petName: {
    label: "Your hero's name",
    hint: "The name you call them by — the star of the adventure.",
  },
  childName: {
    label: "The child's name",
    hint: "Who shares the adventure with your pet. Leave blank if your pet adventures solo.",
  },
  superpower: {
    label: "Their superpower",
    hint: "Your pet's real-life quirk, reframed as a special skill — \"the World's Greatest Nose,\" \"Super-Sniffing.\" Leave blank and we'll dream one up from their favorite thing.",
  },
  favoriteActivity: {
    label: "Their favorite thing in the world",
    hint: "What they love most — digging giant holes, chasing the ball, finding every crumb.",
  },
  quirks: {
    label: "The funny little things they do",
    hint: "A quirk or two — barks at the vacuum like it's a dragon, hides socks under the couch.",
  },
  sidekickName: {
    label: "A sidekick, if you'd like one",
    hint: "A sibling or a second pet who joins the quest. Leave blank to keep it just your hero.",
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
 * Return a NEW `Story8Session` with `field` set to the cleaned `rawValue`, written
 * into the correct nested input group. The same `clean()` the merge engine uses is
 * applied here so the persisted value is exactly what would have been rendered (no
 * double spaces, no `{}` injection).
 *
 * `childName` / `sidekickName` are the optional fields — a cleaned-empty value clears
 * them (stored as `""`, which `buildValues` treats as "not provided"). Every other
 * field is required; an empty cleaned value is NOT special-cased here — callers must
 * reject it first; this function just performs the write.
 *
 * Throws on an unknown field key (defense in depth; the route validates first).
 */
export function setSessionField(
  session: Story8Session,
  field: EditableField,
  rawValue: string,
): Story8Session {
  const value = clean(rawValue);

  switch (field) {
    case "petName":
      return { ...session, pet: { ...session.pet, name: value } };
    case "childName":
      return {
        ...session,
        adventure: { ...session.adventure, childName: value },
      };
    case "superpower":
      return {
        ...session,
        adventure: { ...session.adventure, superpower: value },
      };
    case "favoriteActivity":
      return {
        ...session,
        adventure: { ...session.adventure, favoriteActivity: value },
      };
    case "quirks":
      return {
        ...session,
        adventure: { ...session.adventure, quirks: value },
      };
    case "sidekickName":
      return {
        ...session,
        adventure: { ...session.adventure, sidekickName: value },
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
 * pre-fills with). `childName` / `sidekickName` default to "" when absent.
 */
export function getSessionFieldValue(
  session: Story8Session,
  field: EditableField,
): string {
  switch (field) {
    case "petName":
      return session.pet.name;
    case "childName":
      return session.adventure.childName ?? "";
    case "superpower":
      return session.adventure.superpower;
    case "favoriteActivity":
      return session.adventure.favoriteActivity;
    case "quirks":
      return session.adventure.quirks;
    case "sidekickName":
      return session.adventure.sidekickName ?? "";
    default: {
      const exhaustive: never = field;
      throw new Error(`Unknown editable field: ${String(exhaustive)}`);
    }
  }
}
