// The product registry: the single place each story product registers the three
// things the render + API pipeline needs from it — how to resolve its text, which
// page slots get a generated illustration, and how its downloaded PDF is named.
//
// Routing those lookups through `getStory(session.storyType ?? "story-1")` instead
// of importing the Story-1 modules directly is the seam that lets the app host more
// than one product. Story 1 ("Saying Goodbye") and Story 2 ("A Letter") are both
// registered; a type with no definition still throws (so an unknown future type is
// loud rather than silently mis-resolved).
//
// This module is a lookup table only — no story logic lives here. Each product's
// definition wraps its own existing functions (see lib/story/story-1.ts and
// lib/story/story-2.ts).

import type { StorySession, StoryType } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import { story1Definition } from "@/lib/story/story-1";
import { story2Definition } from "@/lib/story/story-2";

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
  "story-2": story2Definition,
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
