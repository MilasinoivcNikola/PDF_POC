// The Story-8 product ("The Amazing Adventures of [PET_NAME]") as a
// `StoryDefinition` for the registry (lib/story/registry). The narrative-layout
// sibling of lib/story/story-7.ts: a thin wrapper around this product's own
// functions — `resolveStory8` (story8/variants.ts) and `adventurePdfFilename`
// (pdf/filename.ts) — with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-8")` is only ever reached with a `Story8Session`. We narrow
// to `Story8Session` at that boundary (a guarded cast), exactly as Story 2/4/5/6/7 do.
//
// `ADVENTURE_SCENE_PAGE_IDS` lives HERE (the product module), never in lib/ai/* — so
// the registry/catalog public graph stays engine-free (the boundary guard bans
// lib/ai/* from the public closure). The imagery agent (PR-A's imagery slice) owns
// the actual prompt builders and imports the slot type from master-text.ts, never
// the other way around. Same discipline as Story 1's lib/story/scenes.ts and Story
// 6's TRIBUTE_SCENE_PAGE_IDS / Story 7's WELCOME_SCENE_PAGE_IDS.

import type { StorySession, Story8Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type {
  EditableFieldsContract,
  StoryDefinition,
} from "@/lib/story/registry";
import { resolveStory8 } from "@/lib/story/story8/variants";
import { adventurePdfFilename } from "@/lib/pdf/filename";
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
} from "@/lib/story/story8/editable-fields";

/**
 * The Story-8 "edit your own words" preview contract. The sibling of Story 7's:
 * wraps this product's own editable-fields module, narrowing the cross-product union
 * session param to `Story8Session` at the registry seam (the same guarded cast
 * `resolve` uses below — `getStory("story-8")` is only ever reached with a
 * `Story8Session`). `field` is narrowed back to `EditableField` only after the
 * route's `isEditableField` allowlist check, so the casts are sound.
 */
const story8Editable: EditableFieldsContract = {
  EDITABLE_FIELDS,
  editableFieldsForPage,
  isEditableField,
  isRequiredField: (field: string): boolean =>
    isEditableField(field) && isRequiredField(field),
  fieldCopy: FIELD_COPY,
  setSessionField(session, field, value) {
    return setSessionField(
      session as unknown as Story8Session,
      field as EditableField,
      value,
    );
  },
  getSessionFieldValue(session, field) {
    return getSessionFieldValue(
      session as unknown as Story8Session,
      field as EditableField,
    );
  },
};

/**
 * The Story-8 illustrated page slots, in book order — TEN slots: the cover + the
 * nine adventure scene pages (Pages 1-9). Per the master template's locked decision:
 * Pages 10 (`adventure-home`) and 11 (`adventure-closing`) REUSE existing imagery
 * (the calm celebration / the cover-reference framing) and the back cover gets a
 * decorative border — none of them are slots. Every slot is reference-anchored (the
 * pet is the hero of every scene). The registry reads this list from here, mirroring
 * how Story 1/2/4/5/6/7 read their slot ids from their own modules.
 *
 * MUST live here (the product module), never in lib/ai/* — the public boundary guard
 * bans lib/ai/* from the registry/catalog public closure.
 */
export const ADVENTURE_SCENE_PAGE_IDS: readonly PageId[] = [
  "adventure-cover",
  "adventure-ordinary",
  "adventure-special",
  "adventure-call",
  "adventure-clue",
  "adventure-deeper",
  "adventure-discovery",
  "adventure-wobble",
  "adventure-climax",
  "adventure-celebration",
];

/**
 * The Story-8 product definition. `resolve` wraps `resolveStory8`;
 * `illustrationSlots` is `ADVENTURE_SCENE_PAGE_IDS` (10); `pdfFilename` builds the
 * production-checklist name `Amazing-Adventures-of-[PET_NAME].pdf`. The session is
 * narrowed to `Story8Session` here — see the module header for why this is sound.
 */
export const story8Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory8(session as unknown as Story8Session);
  },
  illustrationSlots: ADVENTURE_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return adventurePdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-8"),
  editable: story8Editable,
};
