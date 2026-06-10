// The Story-1 product as a `StoryDefinition` for the registry (lib/story/registry).
//
// This is a thin wrapper, NOT a reimplementation: it re-exposes the EXISTING
// Story-1 functions — `resolveStory` (variants.ts, feature 03), `SCENE_PAGE_IDS`
// (ai/prompts.ts, feature 07), and `storyPdfFilename` (pdf/render.ts, feature 05) —
// with no logic change, so Story-1 output is unaffected. Keeping the wrapper here
// (rather than inline in registry.ts) keeps the registry purely a lookup table and
// gives feature 15's Story 2 an obvious sibling module to mirror.

import type { StorySession } from "@/lib/session/types";
import { resolveStory } from "@/lib/story/variants";
import type { ResolvedStory } from "@/lib/story/merge";
import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import { storyPdfFilename } from "@/lib/pdf/filename";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
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
} from "@/lib/story/editable-fields";

/**
 * The Story-1 "edit your own words" preview contract. Wraps this product's own
 * editable-fields module, widening the session param to the cross-product union
 * (the registry seam has already routed by `storyType`, so a Story-1 session is
 * what reaches here — the same guarded-cast pattern lib/ai/generate.ts uses).
 * `field` is narrowed back to `EditableField` only after the route's
 * `isEditableField` allowlist check, so the casts are sound.
 */
const story1Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(session as StorySession, field as EditableField, value);
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(session as StorySession, field as EditableField);
  },
};

/**
 * The Story-1 product definition. `resolve` is the existing `resolveStory`;
 * `illustrationSlots` is the existing `SCENE_PAGE_IDS`; `pdfFilename` builds the
 * production-checklist name `Saying-Goodbye-to-[PET_NAME].pdf` from the existing
 * `storyPdfFilename` helper. `wizard` is the Story-1 step config (feature 18). No
 * behavior is added here.
 */
export const story1Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory(session);
  },
  illustrationSlots: SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return storyPdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-1"),
  editable: story1Editable,
};
