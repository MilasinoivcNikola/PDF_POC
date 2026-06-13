// The product registry: the single place each story product registers the three
// things the render + API pipeline needs from it — how to resolve its text, which
// page slots get a generated illustration, and how its downloaded PDF is named.
//
// Routing those lookups through `getStory(session.storyType ?? "story-1")` instead
// of importing the Story-1 modules directly is the seam that lets the app host more
// than one product. Story 1 ("Saying Goodbye"), Story 2 ("A Letter from"), Story 4
// ("If [PET_NAME] Could Talk"), Story 5 ("A Letter to") and Story 6 ("While You're
// Still Here" — the living tribute) are all registered; a type with no definition
// still throws (so an unknown future type is loud rather than silently
// mis-resolved).
//
// This module is a lookup table only — no story logic lives here. Each product's
// definition wraps its own existing functions (see lib/story/story-1.ts,
// lib/story/story-2.ts, lib/story/story-4.ts, lib/story/story-5.ts and
// lib/story/story-6.ts).

import type {
  StorySession,
  Story2Session,
  Story4Session,
  Story5Session,
  Story6Session,
  StoryType,
} from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type { WizardConfig } from "@/lib/story/wizard-config";
import { story1Definition } from "@/lib/story/story-1";
import { story2Definition } from "@/lib/story/story-2";
import { story4Definition } from "@/lib/story/story-4";
import { story5Definition } from "@/lib/story/story-5";
import { story6Definition } from "@/lib/story/story-6";

/**
 * The "edit your own words" contract for the in-browser preview (feature 19),
 * per story. The route + preview components stay generic by typing fields as
 * `string` at this boundary; each product's implementation
 * (lib/story/{editable-fields,story2/editable-fields,story4/editable-fields}.ts)
 * narrows internally. `setSessionField`/`getSessionFieldValue` take the
 * `AnyEditableSession` union and each impl narrows with a `storyType`-guarded cast
 * at the registry seam — exactly the pattern lib/ai/generate.ts uses for Story 2.
 */
export interface EditableFieldsContract {
  /** Every editable field key, for membership checks at the API boundary. */
  EDITABLE_FIELDS: readonly string[];
  /** The editable fields exposed on one page (empty when the page has none). */
  editableFieldsForPage(page: PageId): readonly string[];
  /** Whether `field` is a known editable field for this product. */
  isEditableField(field: string): boolean;
  /** Whether a field is required (rejected if blanked) for this product. */
  isRequiredField(field: string): boolean;
  /** Per-field inline-editor copy (label + hint). */
  fieldCopy: Record<string, { label: string; hint: string }>;
  /** Return a NEW session with the cleaned value written into the right group. */
  setSessionField(
    session: AnyEditableSession,
    field: string,
    value: string,
  ): AnyEditableSession;
  /** The current raw value of an editable field (what the editor pre-fills). */
  getSessionFieldValue(session: AnyEditableSession, field: string): string;
}

/**
 * The cross-product session union the editable-fields contract operates on. Each
 * product's impl narrows to its own concrete session with a `storyType`-guarded
 * cast at the registry seam (the route's `isEditableField` allowlist gates the
 * field, and the storyType discriminant gates the session, before either is used).
 */
export type AnyEditableSession =
  | StorySession
  | Story2Session
  | Story4Session
  | Story5Session
  | Story6Session;

/**
 * Everything the render + API pipeline needs from a story product, in one place.
 *
 * - `resolve` turns a finalized session into the ordered, fully-merged
 *   `ResolvedStory` the renderer consumes (each page already carries its layout).
 * - `illustrationSlots` is the page ids that get a generated scene illustration
 *   (the AI orchestration + regenerate paths gate on this set).
 * - `pdfFilename` builds the download filename for a session.
 * - `wizard` is the per-story wizard configuration (feature 18): the ordered
 *   steps, the step count, and the generation-progress checklist slots. It maps a
 *   `storyType` to its wizard exactly as the other fields map it to its renderer.
 * - `editable` is the per-story "edit your own words" preview contract (feature 19).
 */
export interface StoryDefinition {
  /** Resolve a finalized session into its ordered, merged, laid-out pages. */
  resolve(session: StorySession): ResolvedStory;
  /** Page slots that get a generated scene illustration, in book order. */
  illustrationSlots: readonly PageId[];
  /** The download filename for this session's rendered PDF. */
  pdfFilename(session: StorySession): string;
  /** The wizard steps, step count, and progress checklist for this product. */
  wizard: WizardConfig;
  /** The "edit your own words" preview contract for this product. */
  editable: EditableFieldsContract;
}

/** Each known product's definition, keyed by `StoryType`. */
const REGISTRY: Partial<Record<StoryType, StoryDefinition>> = {
  "story-1": story1Definition,
  "story-2": story2Definition,
  "story-4": story4Definition,
  "story-5": story5Definition,
  "story-6": story6Definition,
};

/**
 * Look up the definition for a story type. Throws for a type with no registered
 * definition (none today — both products are registered); callers pass a
 * defaulted value (`session.storyType ?? "story-1"`), so a missing/legacy
 * `storyType` resolves to the Story-1 definition. The `Partial` typing keeps the
 * throw reachable for any future `StoryType` value added before its definition.
 */
export function getStory(storyType: StoryType): StoryDefinition {
  const definition = REGISTRY[storyType];
  if (!definition) {
    throw new Error(`No story definition registered for storyType: ${storyType}`);
  }
  return definition;
}
