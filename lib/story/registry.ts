// The product registry: the single place each story product registers the three
// things the render + API pipeline needs from it — how to resolve its text, which
// page slots get a generated illustration, and how its downloaded PDF is named.
//
// Routing those lookups through `getStory(session.storyType ?? "story-1")` instead
// of importing the Story-1 modules directly is the seam that lets the app host more
// than one product. Story 1 is the only entry today; the "story-2" letter is added
// by feature 15 — until then `getStory("story-2")` throws (it is never reached,
// because no session carries `storyType: "story-2"` yet).
//
// This module is a lookup table only — no story logic lives here. Each product's
// definition wraps its own existing functions (see lib/story/story-1.ts).

import type { StorySession, StoryType } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import { story1Definition } from "@/lib/story/story-1";

/**
 * Everything the render + API pipeline needs from a story product, in one place.
 *
 * - `resolve` turns a finalized session into the ordered, fully-merged
 *   `ResolvedStory` the renderer consumes (each page already carries its layout).
 * - `illustrationSlots` is the page ids that get a generated scene illustration
 *   (the AI orchestration + regenerate paths gate on this set).
 * - `pdfFilename` builds the download filename for a session.
 *
 * `wizardSteps` is intentionally left out for now — feature 18 (the multi-product
 * wizard) will add it; the interface has room to grow without touching callers.
 */
export interface StoryDefinition {
  /** Resolve a finalized session into its ordered, merged, laid-out pages. */
  resolve(session: StorySession): ResolvedStory;
  /** Page slots that get a generated scene illustration, in book order. */
  illustrationSlots: readonly PageId[];
  /** The download filename for this session's rendered PDF. */
  pdfFilename(session: StorySession): string;
}

/** Each known product's definition, keyed by `StoryType`. */
const REGISTRY: Partial<Record<StoryType, StoryDefinition>> = {
  "story-1": story1Definition,
  // "story-2": added by feature 15 (the letter). Absent until then.
};

/**
 * Look up the definition for a story type. Throws for a type with no registered
 * definition (today: "story-2"); callers always pass a defaulted value
 * (`session.storyType ?? "story-1"`), so a missing/legacy `storyType` resolves to
 * the Story-1 definition and this never throws for current sessions.
 */
export function getStory(storyType: StoryType): StoryDefinition {
  const definition = REGISTRY[storyType];
  if (!definition) {
    throw new Error(`No story definition registered for storyType: ${storyType}`);
  }
  return definition;
}
