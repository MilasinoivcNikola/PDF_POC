// The Story-4 product ("If [PET_NAME] Could Talk") as a `StoryDefinition` for the
// registry (lib/story/registry). The sibling of lib/story/story-2.ts: a thin
// wrapper around this product's own functions — `resolveStory4` (story4/variants.ts)
// and `talkPdfFilename` (pdf/filename.ts) — with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-4")` is only ever reached with a `Story4Session`. We narrow
// to `Story4Session` at that boundary (a guarded cast), exactly as Story 2 does.
//
// `TALK_SCENE_PAGE_IDS` lives HERE (the product module), never in lib/ai/* — so the
// registry/catalog public graph stays engine-free (the boundary guard bans
// lib/ai/* from the public closure). PR 21 owns the actual prompt builders.

import type { StorySession, Story4Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
import { resolveStory4 } from "@/lib/story/story4/variants";
import { talkPdfFilename } from "@/lib/pdf/filename";
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
} from "@/lib/story/story4/editable-fields";

/**
 * The Story-4 "edit your own words" preview contract. The sibling of Story 2's:
 * wraps this product's own editable-fields module, narrowing the cross-product
 * union session param to `Story4Session` at the registry seam (the same guarded
 * cast `resolve` uses below — `getStory("story-4")` is only ever reached with a
 * `Story4Session`). `field` is narrowed back to `EditableField` only after the
 * route's `isEditableField` allowlist check, so the casts are sound.
 */
const story4Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(
      session as unknown as Story4Session,
      field as EditableField,
      value,
    );
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(
      session as unknown as Story4Session,
      field as EditableField,
    );
  },
};

/**
 * The Story-4 illustrated page slots, in book order. The celebration letter has
 * Premium imagery only (PR 21): the cover (a pet portrait from the uploaded photo)
 * and the Page-4 "daily joy" scene wash. The registry reads this list from here,
 * mirroring how Story 1/2 read their slot ids from their own modules.
 *
 * MUST live here (the product module), never in lib/ai/* — the public boundary
 * guard bans lib/ai/* from the registry/catalog public closure.
 */
export const TALK_SCENE_PAGE_IDS: readonly PageId[] = [
  "talk-cover",
  "talk-page-4",
];

/**
 * The Story-4 product definition. `resolve` wraps `resolveStory4`;
 * `illustrationSlots` is `TALK_SCENE_PAGE_IDS`; `pdfFilename` builds the
 * production-checklist name `If-[PET_NAME]-Could-Talk.pdf`. The session is narrowed
 * to `Story4Session` here — see the module header for why this is sound.
 */
export const story4Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory4(session as unknown as Story4Session);
  },
  illustrationSlots: TALK_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return talkPdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-4"),
  editable: story4Editable,
};
