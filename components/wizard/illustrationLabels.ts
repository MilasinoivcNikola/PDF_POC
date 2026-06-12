// Human-friendly labels + ordered slot lists for the generation progress
// checklist (feature 09), per product (feature 18).
//
// The progress UI must be HONEST about what the pipeline actually produces.
//   - Story 1: the `reference` portrait plus the 13 SCENE_PAGE_IDS
//     (cover + page-1…page-12) = 14 images.
//   - Story 2: just the two Premium letter slots — the cover portrait and the
//     belief-frame wash (LETTER_SCENE_PAGE_IDS) = 2 images. There is NO separate
//     `reference` anchor for the letter.
// The prototype's `generating.html` hand-picked a list and labelled it in a warm,
// plain voice; we mirror that voice but key it to the real slot ids so the count
// and the checklist never drift from reality.
//
// Pure (no IO, no React) so it's trivially unit-testable. This module imports only
// `SCENE_PAGE_IDS` (the client-safe Story-1 slot list); the two Story-2 letter
// slots are declared here as a `PageId[]` rather than imported from
// lib/story/story-2.ts (which pulls the server-only PDF renderer) — they are
// asserted equal to the registry's `illustrationSlots` in illustrationLabels.test.ts,
// so they cannot silently drift from what the pipeline actually generates.

import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import type { PageId } from "@/lib/story/master-text";
import type { StoryType } from "@/lib/session/types";

/** A slot in the checklist: "reference" + every illustrated page id. */
export type IllustrationSlot = "reference" | PageId;

/** The Story-1 ordered set of slots the pipeline generates (reference first). */
export const ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "reference",
  ...SCENE_PAGE_IDS,
];

/**
 * The Story-2 ordered set of slots — the two Premium letter images (cover
 * portrait + belief-frame wash). Declared here (not imported from story-2.ts) to
 * keep this module client-safe; the story-2 tests assert these match the
 * registry's `illustrationSlots`.
 */
export const LETTER_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "letter-cover",
  "letter-page-5",
];

/**
 * The Story-4 ordered set of slots — the two Premium "If [PET_NAME] Could Talk"
 * images (cover portrait + the Page-4 daily-joy scene). Declared here (not imported
 * from story-4.ts) to keep this module client-safe; the story-4 tests assert these
 * match the registry's `illustrationSlots`.
 */
export const TALK_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "talk-cover",
  "talk-page-4",
];

/**
 * The Story-5 ordered set of slots — the two Premium "A Letter to [PET_NAME]"
 * images (cover portrait + the figure-free belief-frame wash), the same imagery
 * shape as Story 2. Declared here (not imported from story-5.ts) to keep this
 * module client-safe; the story-5 tests assert these match the registry's
 * `illustrationSlots`.
 */
export const NOTE_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "note-cover",
  "note-page-5",
];

/** The progress-checklist slot list for a product (default Story 1). */
export function illustrationSlotsFor(
  storyType: StoryType,
): readonly IllustrationSlot[] {
  if (storyType === "story-2") {
    return LETTER_ILLUSTRATION_SLOTS;
  }
  if (storyType === "story-4") {
    return TALK_ILLUSTRATION_SLOTS;
  }
  if (storyType === "story-5") {
    return NOTE_ILLUSTRATION_SLOTS;
  }
  return ILLUSTRATION_SLOTS;
}

/**
 * Story-1 labels keyed by slot, in the warm, specific voice of
 * `prototypes/generating.html`, with the pet name woven in. The scene
 * descriptions echo each page's brief in the master template (front door, the
 * bond, favorite activity, sleeping spot, the gentle rest, the comforting place,
 * things to remember, the closing). `Partial` because only the illustrated slots
 * in ILLUSTRATION_SLOTS need a label — `back-cover` (a writing page) never
 * appears in the checklist; an unmapped slot falls back to a plain phrasing.
 */
function story1LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    reference: `Reference portrait — ${name} as they were`,
    cover: "Cover illustration",
    "page-1": `A portrait of ${name}`,
    "page-2": `${name} at the front door`,
    "page-3": `${name} and your child together`,
    "page-4": `${name} doing what they loved`,
    "page-5": `${name} in their favorite resting place`,
    "page-6": "The day to remember",
    "page-7": `${name} resting peacefully`,
    "page-8": `Your child, holding ${name}'s collar`,
    "page-9": "A comforting place",
    "page-10": "Love stays",
    "page-11": "Things to remember — three small scenes",
    "page-12": "The final page — always, always loved",
  };
}

/**
 * Story-2 labels — the two Premium letter images, in the same warm voice but for
 * the adult keepsake (no child). The cover portrait is the pet looking back; the
 * belief-frame wash is the soft sunlit / quiet-object page (no pet figure).
 */
function story2LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    "letter-cover": `Cover portrait — ${name}, looking back`,
    "letter-page-5": "A soft wash for where they are now",
  };
}

/**
 * Story-4 labels — the two Premium "If [PET_NAME] Could Talk" images, in the warm,
 * present-tense voice of the celebration letter. The cover portrait is the pet
 * looking back ("hello, it's me"); the Page-4 scene is the pet doing what they love
 * in the late-afternoon light (the one full scene in the book).
 */
function story4LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    "talk-cover": `Cover portrait — ${name}, looking right back at you`,
    "talk-page-4": `${name} doing what they love`,
  };
}

/**
 * Story-5 labels — the two Premium "A Letter to [PET_NAME]" images, in the warm,
 * owner-voiced tone of the letter written TO the pet. The cover portrait is the
 * pet looking back; the belief-frame wash is the soft sunlit / quiet page (no pet
 * figure), the same imagery shape as Story 2.
 */
function story5LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    "note-cover": `Cover portrait — ${name}, as you remember them`,
    "note-page-5": "A soft wash for where you keep them",
  };
}

/**
 * Resolve a slot's human-friendly checklist label for a given pet name + product.
 * Defaults to the Story-1 labels for a missing/Story-1 type.
 */
export function illustrationLabel(
  slot: IllustrationSlot,
  petName: string,
  storyType: StoryType = "story-1",
): string {
  const name = petName.trim() || "your pet";
  let labels: Partial<Record<IllustrationSlot, string>>;
  if (storyType === "story-2") {
    labels = story2LabelsFor(name);
  } else if (storyType === "story-4") {
    labels = story4LabelsFor(name);
  } else if (storyType === "story-5") {
    labels = story5LabelsFor(name);
  } else {
    labels = story1LabelsFor(name);
  }
  return labels[slot] ?? `Illustration for ${slot}`;
}
