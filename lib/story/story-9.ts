// The Story-9 product ("[PET_NAME] and the New Baby") as a `StoryDefinition` for
// the registry (lib/story/registry). The narrative-layout sibling of
// lib/story/story-6.ts: a thin wrapper around this product's own functions —
// `resolveStory9` (story9/variants.ts) and `newBabyPdfFilename` (pdf/filename.ts) —
// with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-9")` is only ever reached with a `Story9Session`. We narrow to
// `Story9Session` at that boundary (a guarded cast), exactly as Story 2/4/5/6 do.
//
// `STORY_9_SCENE_PAGE_IDS` lives HERE (the product module), never in lib/ai/* — so
// the registry/catalog public graph stays engine-free (the boundary guard bans
// lib/ai/* from the public closure). The imagery agent (PR-A's imagery slice) owns
// the actual prompt builders and imports the slot type from master-text.ts, never
// the other way around. Same discipline as Story 1's lib/story/scenes.ts.

import type { StorySession, Story9Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
import { resolveStory9 } from "@/lib/story/story9/variants";
import { newBabyPdfFilename } from "@/lib/pdf/filename";
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
} from "@/lib/story/story9/editable-fields";

/**
 * The Story-9 "edit your own words" preview contract. The sibling of Story 6's:
 * wraps this product's own editable-fields module, narrowing the cross-product union
 * session param to `Story9Session` at the registry seam (the same guarded cast
 * `resolve` uses below — `getStory("story-9")` is only ever reached with a
 * `Story9Session`). `field` is narrowed back to `EditableField` only after the
 * route's `isEditableField` allowlist check, so the casts are sound.
 */
const story9Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(
      session as unknown as Story9Session,
      field as EditableField,
      value,
    );
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(
      session as unknown as Story9Session,
      field as EditableField,
    );
  },
};

/**
 * The Story-9 illustrated page slots, in book order. The keepsake has the SAME
 * imagery shape as Story 1 (a locked reference + brief-driven scenes, all
 * reference-anchored — only the PET is photo-anchored): the cover portrait + pages
 * 2-7 (six scenes) — SEVEN slots. The page-1 dedication (a treatment portrait) and
 * the back cover (a writing page with a decorative border) are excluded — the same
 * split the master template specifies (dedication/back-cover are not generated
 * scenes). The registry reads this list from here, mirroring how Story 1/2/4/5/6
 * read their slot ids from their own modules.
 *
 * MUST live here (the product module), never in lib/ai/* — the public boundary guard
 * bans lib/ai/* from the registry/catalog public closure.
 */
export const STORY_9_SCENE_PAGE_IDS: readonly PageId[] = [
  "baby-cover",
  "baby-page-2",
  "baby-page-3",
  "baby-page-4",
  "baby-page-5",
  "baby-page-6",
  "baby-page-7",
];

/**
 * The Story-9 product definition. `resolve` wraps `resolveStory9`;
 * `illustrationSlots` is `STORY_9_SCENE_PAGE_IDS`; `pdfFilename` builds the
 * production-checklist name `[PET_NAME]-and-the-New-Baby.pdf`. The session is
 * narrowed to `Story9Session` here — see the module header for why this is sound.
 */
export const story9Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory9(session as unknown as Story9Session);
  },
  illustrationSlots: STORY_9_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return newBabyPdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-9"),
  editable: story9Editable,
};
