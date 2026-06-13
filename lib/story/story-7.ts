// The Story-7 product ("Welcome Home — [PET_NAME]'s Gotcha Day") as a
// `StoryDefinition` for the registry (lib/story/registry). The narrative-layout
// sibling of lib/story/story-6.ts: a thin wrapper around this product's own
// functions — `resolveStory7` (story7/variants.ts) and `welcomeHomePdfFilename`
// (pdf/filename.ts) — with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-7")` is only ever reached with a `Story7Session`. We narrow
// to `Story7Session` at that boundary (a guarded cast), exactly as Story 2/4/5/6 do.
//
// `WELCOME_SCENE_PAGE_IDS` lives HERE (the product module), never in lib/ai/* — so
// the registry/catalog public graph stays engine-free (the boundary guard bans
// lib/ai/* from the public closure). The imagery agent (PR-A's imagery slice) owns
// the actual prompt builders and imports the slot type from master-text.ts, never
// the other way around. Same discipline as Story 1's lib/story/scenes.ts and Story
// 6's TRIBUTE_SCENE_PAGE_IDS.

import type { StorySession, Story7Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
import { resolveStory7 } from "@/lib/story/story7/variants";
import { welcomeHomePdfFilename } from "@/lib/pdf/filename";
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
} from "@/lib/story/story7/editable-fields";

/**
 * The Story-7 "edit your own words" preview contract. The sibling of Story 6's:
 * wraps this product's own editable-fields module, narrowing the cross-product
 * union session param to `Story7Session` at the registry seam (the same guarded
 * cast `resolve` uses below — `getStory("story-7")` is only ever reached with a
 * `Story7Session`). `field` is narrowed back to `EditableField` only after the
 * route's `isEditableField` allowlist check, so the casts are sound.
 */
const story7Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(
      session as unknown as Story7Session,
      field as EditableField,
      value,
    );
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(
      session as unknown as Story7Session,
      field as EditableField,
    );
  },
};

/**
 * The Story-7 illustrated page slots, in book order — EIGHT slots. The cover + the
 * seven narrative scene pages (pages 2-8). Per the master template's locked
 * decision: the dedication portrait REUSES the locked reference image (not a slot),
 * and the closing + back cover get decorative/reused treatments (not slots). The
 * `welcome-before` page is the figure-free one (the pet is deliberately absent),
 * but it is still a generated slot (a prompt-only wash). The registry reads this
 * list from here, mirroring how Story 1/2/4/5/6 read their slot ids from their own
 * modules.
 *
 * MUST live here (the product module), never in lib/ai/* — the public boundary
 * guard bans lib/ai/* from the registry/catalog public closure.
 */
export const WELCOME_SCENE_PAGE_IDS: readonly PageId[] = [
  "welcome-cover",
  "welcome-before",
  "welcome-choosing",
  "welcome-drive-home",
  "welcome-first-night",
  "welcome-learning",
  "welcome-now-ours",
  "welcome-belong",
];

/**
 * The Story-7 product definition. `resolve` wraps `resolveStory7`;
 * `illustrationSlots` is `WELCOME_SCENE_PAGE_IDS` (8); `pdfFilename` builds the
 * production-checklist name `Welcome-Home-[PET_NAME].pdf`. The session is narrowed
 * to `Story7Session` here — see the module header for why this is sound.
 */
export const story7Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory7(session as unknown as Story7Session);
  },
  illustrationSlots: WELCOME_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return welcomeHomePdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-7"),
  editable: story7Editable,
};
