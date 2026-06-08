// Pure helpers bridging the wizard's in-progress `StoryDraft` (localStorage) to a
// finalized `StorySession` (./sessions/[id].json). Kept free of IO and React so
// they unit-test without mocks: the wizard's required-field gate and the
// draft→session assembly both live here, single-sourced.
//
// Seven fields are required: pet name, child name, photo, plus the four personal
// free-text fields the master text references as live merge placeholders —
// breedColor, favoriteActivity, sleepingSpot, favoriteMemory. A blank in any of
// those resolves to an empty merge value, which `lib/story/merge.ts` treats as a
// missing field and rejects with a MergeError; requiring them here keeps every
// written session renderable. The optional parent dedication and the enum/toggle
// fields stay optional — they have non-empty defaults that never break merge.

import type {
  StoryDraft,
  StorySession,
  AgeBracket,
  DeathType,
  BeliefFrame,
  IllustrationStyle,
  OtherPetsInHome,
  Pronoun,
  Species,
} from "@/lib/session/types";

/** A required field the wizard gates Generate on. */
export type RequiredField =
  | "petName"
  | "childName"
  | "photo"
  | "breedColor"
  | "favoriteActivity"
  | "sleepingSpot"
  | "favoriteMemory";

/** Default toggles/brackets the master template assumes when the user skips them. */
const DEFAULT_SPECIES: Species = "dog";
const DEFAULT_PRONOUN: Pronoun = "he";
const DEFAULT_ILLUSTRATION_STYLE: IllustrationStyle = "watercolor";
const DEFAULT_AGE_BRACKET: AgeBracket = "6-8";
const DEFAULT_DEATH_TYPE: DeathType = "natural";
const DEFAULT_BELIEF_FRAME: BeliefFrame = "rainbow-bridge";
const DEFAULT_OTHER_PETS: OtherPetsInHome = "no";

/** Whether a free-text value is present (non-empty after trimming). */
function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The required fields still missing from a draft, in display order. Empty array
 * means the draft can be finalized. Required = pet name, child name, photo, and
 * the four personal free-text fields (breedColor, favoriteActivity, sleepingSpot,
 * favoriteMemory) the master text merges as live placeholders.
 */
export function missingRequiredFields(draft: StoryDraft): RequiredField[] {
  const missing: RequiredField[] = [];
  if (!present(draft.pet.name)) {
    missing.push("petName");
  }
  if (!present(draft.child.name)) {
    missing.push("childName");
  }
  if (!present(draft.pet.photo)) {
    missing.push("photo");
  }
  if (!present(draft.pet.breedColor)) {
    missing.push("breedColor");
  }
  if (!present(draft.memories.favoriteActivity)) {
    missing.push("favoriteActivity");
  }
  if (!present(draft.memories.sleepingSpot)) {
    missing.push("sleepingSpot");
  }
  if (!present(draft.memories.favoriteMemory)) {
    missing.push("favoriteMemory");
  }
  return missing;
}

/** Whether the draft has every required field and can be assembled into a session. */
export function isDraftComplete(draft: StoryDraft): boolean {
  return missingRequiredFields(draft).length === 0;
}

/**
 * Assemble a finalized `StorySession` from a complete draft, filling any skipped
 * optional fields with the master-template defaults. Throws if a required field
 * (pet name, child name, photo, breedColor, favoriteActivity, sleepingSpot,
 * favoriteMemory) is missing — callers should gate on `missingRequiredFields`
 * first. Free-text fields are trimmed; the optional dedication is dropped rather
 * than stored as "".
 */
export function draftToSession(draft: StoryDraft): StorySession {
  const missing = missingRequiredFields(draft);
  if (missing.length > 0) {
    throw new Error(`missing_required_fields: ${missing.join(", ")}`);
  }

  const dedication = draft.memories.parentDedication;

  return {
    id: draft.id,
    createdAt: draft.createdAt,
    status: "generating",
    pet: {
      name: draft.pet.name!.trim(),
      species: draft.pet.species ?? DEFAULT_SPECIES,
      breedColor: draft.pet.breedColor!.trim(),
      pronoun: draft.pet.pronoun ?? DEFAULT_PRONOUN,
      illustrationStyle:
        draft.pet.illustrationStyle ?? DEFAULT_ILLUSTRATION_STYLE,
      photo: draft.pet.photo!,
    },
    child: {
      name: draft.child.name!.trim(),
      ageBracket: draft.child.ageBracket ?? DEFAULT_AGE_BRACKET,
    },
    memories: {
      favoriteActivity: draft.memories.favoriteActivity!.trim(),
      sleepingSpot: draft.memories.sleepingSpot!.trim(),
      favoriteMemory: draft.memories.favoriteMemory!.trim(),
      ...(present(dedication) ? { parentDedication: dedication.trim() } : {}),
    },
    toggles: {
      deathType: draft.toggles.deathType ?? DEFAULT_DEATH_TYPE,
      beliefFrame: draft.toggles.beliefFrame ?? DEFAULT_BELIEF_FRAME,
      otherPetsInHome: draft.toggles.otherPetsInHome ?? DEFAULT_OTHER_PETS,
    },
    images: [],
  };
}
