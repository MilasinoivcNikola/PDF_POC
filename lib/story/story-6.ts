// The Story-6 product ("While You're Still Here, [PET_NAME]") as a `StoryDefinition`
// for the registry (lib/story/registry). The narrative-layout sibling of
// lib/story/story-1.ts: a thin wrapper around this product's own functions —
// `resolveStory6` (story6/variants.ts) and `tributePdfFilename` (pdf/filename.ts) —
// with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-6")` is only ever reached with a `Story6Session`. We narrow
// to `Story6Session` at that boundary (a guarded cast), exactly as Story 2/4/5 do.
//
// `TRIBUTE_SCENE_PAGE_IDS` lives HERE (the product module), never in lib/ai/* — so
// the registry/catalog public graph stays engine-free (the boundary guard bans
// lib/ai/* from the public closure). The imagery agent (PR 25's imagery slice) owns
// the actual prompt builders and imports the slot type from master-text.ts, never
// the other way around. Same discipline as Story 1's lib/story/scenes.ts.

import type { StorySession, Story6Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
import { resolveStory6 } from "@/lib/story/story6/variants";
import { tributePdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  FIELD_COPY,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
  type EditableField,
} from "@/lib/story/story6/editable-fields";

/**
 * The Story-6 "edit your own words" preview contract. The sibling of Story 1's:
 * wraps this product's own editable-fields module, narrowing the cross-product
 * union session param to `Story6Session` at the registry seam (the same guarded
 * cast `resolve` uses below — `getStory("story-6")` is only ever reached with a
 * `Story6Session`). `field` is narrowed back to `EditableField` only after the
 * route's `isEditableField` allowlist check, so the casts are sound.
 */
const story6Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(
      session as unknown as Story6Session,
      field as EditableField,
      value,
    );
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(
      session as unknown as Story6Session,
      field as EditableField,
    );
  },
};

/**
 * The Story-6 illustrated page slots, in book order. The living tribute has the
 * SAME imagery shape as Story 1 (a locked reference + brief-driven scenes, all
 * reference-anchored): the cover portrait + the page-1 dedication portrait + pages
 * 2-6 (five scenes) — SEVEN slots. The back cover is excluded (a writing page with
 * a decorative border, not a generated scene — the same rule that excludes Story
 * 1's `back-cover`). The registry reads this list from here, mirroring how Story
 * 1/2/4/5 read their slot ids from their own modules.
 *
 * MUST live here (the product module), never in lib/ai/* — the public boundary
 * guard bans lib/ai/* from the registry/catalog public closure.
 */
export const TRIBUTE_SCENE_PAGE_IDS: readonly PageId[] = [
  "tribute-cover",
  "tribute-page-1",
  "tribute-page-2",
  "tribute-page-3",
  "tribute-page-4",
  "tribute-page-5",
  "tribute-page-6",
];

/**
 * The Story-6 product definition. `resolve` wraps `resolveStory6`;
 * `illustrationSlots` is `TRIBUTE_SCENE_PAGE_IDS`; `pdfFilename` builds the
 * production-checklist name `While-Youre-Still-Here-[PET_NAME].pdf`. The session is
 * narrowed to `Story6Session` here — see the module header for why this is sound.
 */
export const story6Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory6(session as unknown as Story6Session);
  },
  illustrationSlots: TRIBUTE_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return tributePdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-6"),
  editable: story6Editable,
};
