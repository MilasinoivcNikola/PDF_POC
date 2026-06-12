// The Story-5 product ("A Letter to [PET_NAME]") as a `StoryDefinition` for the
// registry (lib/story/registry). The sibling of lib/story/story-2.ts: a thin
// wrapper around this product's own functions — `resolveStory5` (story5/variants.ts)
// and `letterToPdfFilename` (pdf/filename.ts) — with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-5")` is only ever reached with a `Story5Session`. We narrow
// to `Story5Session` at that boundary (a guarded cast), exactly as Story 2 does.
//
// `NOTE_SCENE_PAGE_IDS` lives HERE (the product module), never in lib/ai/* — so the
// registry/catalog public graph stays engine-free (the boundary guard bans
// lib/ai/* from the public closure). The imagery agent (PR 23's imagery slice) owns
// the actual prompt builders and imports the slot type from master-text.ts, never
// the other way around.

import type { StorySession, Story5Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
import { resolveStory5 } from "@/lib/story/story5/variants";
import { letterToPdfFilename } from "@/lib/pdf/filename";
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
} from "@/lib/story/story5/editable-fields";

/**
 * The Story-5 "edit your own words" preview contract. The sibling of Story 2's:
 * wraps this product's own editable-fields module, narrowing the cross-product
 * union session param to `Story5Session` at the registry seam (the same guarded
 * cast `resolve` uses below — `getStory("story-5")` is only ever reached with a
 * `Story5Session`). `field` is narrowed back to `EditableField` only after the
 * route's `isEditableField` allowlist check, so the casts are sound.
 */
const story5Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(
      session as unknown as Story5Session,
      field as EditableField,
      value,
    );
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(
      session as unknown as Story5Session,
      field as EditableField,
    );
  },
};

/**
 * The Story-5 illustrated page slots, in book order. The letter TO the pet has the
 * same Premium imagery shape as Story 2: the cover (a pet portrait from the
 * uploaded photo) and the Page-5 belief-frame wash. The registry reads this list
 * from here, mirroring how Story 1/2/4 read their slot ids from their own modules.
 *
 * MUST live here (the product module), never in lib/ai/* — the public boundary
 * guard bans lib/ai/* from the registry/catalog public closure.
 */
export const NOTE_SCENE_PAGE_IDS: readonly PageId[] = [
  "note-cover",
  "note-page-5",
];

/**
 * The Story-5 product definition. `resolve` wraps `resolveStory5`;
 * `illustrationSlots` is `NOTE_SCENE_PAGE_IDS`; `pdfFilename` builds the
 * production-checklist name `Letter-to-[PET_NAME].pdf`. The session is narrowed
 * to `Story5Session` here — see the module header for why this is sound.
 */
export const story5Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory5(session as unknown as Story5Session);
  },
  illustrationSlots: NOTE_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return letterToPdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-5"),
  editable: story5Editable,
};
