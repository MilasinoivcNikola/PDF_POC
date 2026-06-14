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

/**
 * The Story-6 ordered set of slots — the living tribute is a NARRATIVE book with
 * the SAME imagery shape as Story 1: a `reference` portrait anchor (generated
 * first, not a book page) PLUS the seven `tribute-*` page slots = EIGHT images. The
 * seven page ids are declared here (not imported from story-6.ts) to keep this
 * module client-safe; the story-6 tests assert the page slots match the registry's
 * `illustrationSlots` (which is the 7 page ids — the `reference` anchor is not a
 * registry slot, exactly like Story 1).
 */
export const TRIBUTE_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "reference",
  "tribute-cover",
  "tribute-page-1",
  "tribute-page-2",
  "tribute-page-3",
  "tribute-page-4",
  "tribute-page-5",
  "tribute-page-6",
];

/**
 * The Story-7 ordered set of slots — the homecoming book is a NARRATIVE book with
 * the SAME reference-anchored shape as Story 1/6: a `reference` portrait anchor
 * (generated first, not a book page) PLUS the eight `welcome-*` page slots = NINE
 * images. (Story 7 mixes 7 reference-anchored scenes with one figure-free
 * `welcome-before` wash, but the pet is still locked to a reference, so the anchor
 * is generated.) The eight page ids are declared here (not imported from
 * story-7.ts) to keep this module client-safe; the story-7 tests assert the page
 * slots match the registry's `illustrationSlots` (the 8 page ids — the `reference`
 * anchor is not a registry slot, exactly like Story 1/6).
 */
export const WELCOME_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "reference",
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
 * The Story-8 ordered set of slots — the kids' adventure is a NARRATIVE book with
 * the SAME reference-anchored shape as Story 1/6/7: a `reference` portrait anchor
 * (generated first, not a book page) PLUS the ten `adventure-*` page slots = ELEVEN
 * images. ALL ten scenes are reference-anchored (Approach B — the pet must stay
 * on-model across every action pose), so the anchor is generated. The ten page ids
 * are declared here (not imported from story-8.ts) to keep this module client-safe;
 * the story-8 tests assert the page slots match the registry's `illustrationSlots`
 * (the 10 page ids — the `reference` anchor is not a registry slot, like Story 1/6/7).
 */
export const ADVENTURE_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "reference",
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
 * The Story-9 ordered set of slots — the new-baby keepsake is a NARRATIVE book with
 * the SAME reference-anchored shape as Story 1/6/7: a `reference` portrait anchor
 * (generated first, not a book page) PLUS the seven `baby-*` page slots = EIGHT
 * images. ALL seven scenes are reference-anchored (Approach A — only the PET is
 * photo-anchored; the baby/adults are rendered generically), so the anchor is
 * generated. The seven page ids are declared here (not imported from story-9.ts) to
 * keep this module client-safe; the story-9 tests assert the page slots match the
 * registry's `illustrationSlots` (the 7 page ids — the `reference` anchor is not a
 * registry slot, like Story 1/6/7).
 */
export const NEWBABY_ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "reference",
  "baby-cover",
  "baby-page-2",
  "baby-page-3",
  "baby-page-4",
  "baby-page-5",
  "baby-page-6",
  "baby-page-7",
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
  if (storyType === "story-6") {
    return TRIBUTE_ILLUSTRATION_SLOTS;
  }
  if (storyType === "story-7") {
    return WELCOME_ILLUSTRATION_SLOTS;
  }
  if (storyType === "story-8") {
    return ADVENTURE_ILLUSTRATION_SLOTS;
  }
  if (storyType === "story-9") {
    return NEWBABY_ILLUSTRATION_SLOTS;
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
 * Story-6 labels — the living-tribute slots, in a warm, PRESENT-tense voice (a pet
 * who is still here). The reference portrait anchors the look; then the cover, the
 * dedication portrait, and the five tribute scenes — each painted from the photo.
 */
function story6LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    reference: `Reference portrait — ${name}, as they are now`,
    "tribute-cover": "Cover illustration",
    "tribute-page-1": `A portrait of ${name}`,
    "tribute-page-2": `${name} at home, in the everyday light`,
    "tribute-page-3": `${name} doing what they still love`,
    "tribute-page-4": `${name} and the small things only they do`,
    "tribute-page-5": `${name} in a quiet, peaceful moment`,
    "tribute-page-6": "The time you have together",
  };
}

/**
 * Story-7 labels — the homecoming slots, in a warm, PRESENT-tense voice (a joyful
 * book about a pet who just came home). The reference portrait anchors the look;
 * then the cover, the figure-free "empty house before" wash (the only page the pet
 * is absent from), and the seven scenes that trace the day they came home and
 * became family — each painted from the photo.
 */
function story7LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    reference: `Reference portrait — ${name}, exactly as they are`,
    "welcome-cover": "Cover illustration",
    "welcome-before": "The house before — quiet, waiting",
    "welcome-choosing": `The day you found ${name}`,
    "welcome-drive-home": `${name} on the way home`,
    "welcome-first-night": `${name}'s first night home`,
    "welcome-learning": `Getting to know ${name}`,
    "welcome-now-ours": `${name}, fully home`,
    "welcome-belong": `${name} belongs here`,
  };
}

/**
 * Story-8 labels — the kids'-adventure slots, in a playful, action voice (a joyful
 * "save the day" quest). The reference portrait anchors the look (the locked
 * likeness Approach B carries through every action pose); then the hero cover and
 * the ten adventure scenes — each painted from the photo, the pet the hero throughout.
 */
function story8LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    reference: `Reference portrait — ${name}, the hero, locked in`,
    "adventure-cover": `The hero's cover — ${name}, ready for anything`,
    "adventure-ordinary": `${name} on an ordinary morning`,
    "adventure-special": `${name}'s amazing superpower`,
    "adventure-call": "The call to adventure — a mystery!",
    "adventure-clue": `${name} sniffs out the first clue`,
    "adventure-deeper": "Deeper into the backyard expedition",
    "adventure-discovery": "The big discovery",
    "adventure-wobble": "The wobble — a moment of doubt",
    "adventure-climax": `The big leap — ${name} saves the day`,
    "adventure-celebration": `${name}, the hero of the whole backyard`,
  };
}

/**
 * Story-9 labels — the new-baby keepsake slots, in a warm, forward-looking voice (a
 * happy, growing-family book). The reference portrait anchors the look (only the PET
 * is photo-anchored — Approach A; the baby/adults are kept generic); then the cover
 * and the six scenes that trace the pet's place as the first family member and the
 * baby's big sibling — each painted from the photo.
 */
function story9LabelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    reference: `Reference portrait — ${name}, the first family member`,
    "baby-cover": "Cover illustration",
    "baby-page-2": `${name} at home — here first`,
    "baby-page-3": `${name} doing what they love`,
    "baby-page-4": "Something is changing — a gentle scene",
    "baby-page-5": `${name}, the big sibling`,
    "baby-page-6": `${name} and the new baby together`,
    "baby-page-7": "Love grows — the whole family",
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
  } else if (storyType === "story-6") {
    labels = story6LabelsFor(name);
  } else if (storyType === "story-7") {
    labels = story7LabelsFor(name);
  } else if (storyType === "story-8") {
    labels = story8LabelsFor(name);
  } else if (storyType === "story-9") {
    labels = story9LabelsFor(name);
  } else {
    labels = story1LabelsFor(name);
  }
  return labels[slot] ?? `Illustration for ${slot}`;
}
