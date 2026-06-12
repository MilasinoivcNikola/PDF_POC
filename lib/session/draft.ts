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
  Story2Draft,
  Story2Session,
  Story4Draft,
  WizardDraft,
  AgeBracket,
  DeathType,
  BeliefFrame,
  IllustrationStyle,
  OtherPetsInHome,
  Pronoun,
  Species,
  Relationship,
  LetterDeathType,
  LetterBeliefFrame,
  GiftFor,
  NewPet,
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

// ===========================================================================
// Story 2 — "A Letter from [PET_NAME]" draft → session bridge
// ===========================================================================
//
// Story 2 has no child. Seven fields are required: pet name, owner names,
// species, photo (the Premium cover uses it), plus the three personal free-text
// fields the letter merges as live placeholders — quirks, favoriteRitual,
// favoriteSpots. A blank in any of those resolves to an empty merge value, which
// `lib/story/story2/merge.ts` treats as a missing field and rejects with a
// MergeError; requiring them here keeps every written letter renderable. The
// optional nicknames/dateAdopted/datePassed stay optional — merge drops a blank
// one rather than printing an empty line — and the enum/toggle fields have
// non-empty defaults that never break merge.

/** A required field the Story-2 wizard gates Generate on. */
export type Story2RequiredField =
  | "petName"
  | "ownerNames"
  | "species"
  | "photo"
  | "quirks"
  | "favoriteRitual"
  | "favoriteSpots";

/** Story-2 defaults the master template assumes when the user skips them. */
const DEFAULT_RELATIONSHIP: Relationship = "single";
const DEFAULT_LETTER_DEATH_TYPE: LetterDeathType = "peaceful";
const DEFAULT_LETTER_BELIEF_FRAME: LetterBeliefFrame = "rainbow-bridge";
const DEFAULT_GIFT_FOR: GiftFor = "self";
const DEFAULT_NEW_PET: NewPet = "no";

/**
 * The required Story-2 fields still missing from a draft, in display order. Empty
 * array means the draft can be finalized. Required = pet name, owner names,
 * species, photo, and the three personal free-text fields (quirks, favoriteRitual,
 * favoriteSpots) the letter merges as live placeholders.
 */
export function missingRequiredFieldsStory2(
  draft: Story2Draft,
): Story2RequiredField[] {
  const missing: Story2RequiredField[] = [];
  if (!present(draft.pet.name)) {
    missing.push("petName");
  }
  if (!present(draft.owner.names)) {
    missing.push("ownerNames");
  }
  if (!present(draft.pet.species)) {
    missing.push("species");
  }
  if (!present(draft.pet.photo)) {
    missing.push("photo");
  }
  if (!present(draft.memories.quirks)) {
    missing.push("quirks");
  }
  if (!present(draft.memories.favoriteRitual)) {
    missing.push("favoriteRitual");
  }
  if (!present(draft.memories.favoriteSpots)) {
    missing.push("favoriteSpots");
  }
  return missing;
}

/**
 * Assemble a finalized `Story2Session` from a complete Story-2 draft, filling any
 * skipped optional fields with the master-template defaults. Throws if a required
 * field (pet name, owner names, species, photo, quirks, favoriteRitual,
 * favoriteSpots) is missing — callers should gate on `missingRequiredFieldsStory2`
 * first. Free-text fields are trimmed; the optional nickname/date fields are
 * dropped rather than stored as "" so merge never prints an empty line.
 */
export function draftToSessionStory2(draft: Story2Draft): Story2Session {
  const missing = missingRequiredFieldsStory2(draft);
  if (missing.length > 0) {
    throw new Error(`missing_required_fields: ${missing.join(", ")}`);
  }

  const { nicknames, dateAdopted, datePassed } = draft.memories;

  return {
    id: draft.id,
    createdAt: draft.createdAt,
    status: "generating",
    storyType: "story-2",
    pet: {
      name: draft.pet.name!.trim(),
      species: draft.pet.species ?? DEFAULT_SPECIES,
      breedColor: draft.pet.breedColor?.trim() ?? "",
      pronoun: draft.pet.pronoun ?? DEFAULT_PRONOUN,
      illustrationStyle:
        draft.pet.illustrationStyle ?? DEFAULT_ILLUSTRATION_STYLE,
      photo: draft.pet.photo!,
    },
    owner: {
      names: draft.owner.names!.trim(),
      relationship: draft.owner.relationship ?? DEFAULT_RELATIONSHIP,
    },
    memories: {
      quirks: draft.memories.quirks!.trim(),
      favoriteRitual: draft.memories.favoriteRitual!.trim(),
      favoriteSpots: draft.memories.favoriteSpots!.trim(),
      ...(present(nicknames) ? { nicknames: nicknames.trim() } : {}),
      ...(present(dateAdopted) ? { dateAdopted: dateAdopted.trim() } : {}),
      ...(present(datePassed) ? { datePassed: datePassed.trim() } : {}),
    },
    toggles: {
      deathType: draft.toggles.deathType ?? DEFAULT_LETTER_DEATH_TYPE,
      beliefFrame: draft.toggles.beliefFrame ?? DEFAULT_LETTER_BELIEF_FRAME,
      giftFor: draft.toggles.giftFor ?? DEFAULT_GIFT_FOR,
      newPet: draft.toggles.newPet ?? DEFAULT_NEW_PET,
    },
    images: [],
  };
}

// ===========================================================================
// Story-type dispatchers — branch on the draft's storyType
// ===========================================================================
//
// The Generate step holds a `WizardDraft` (either product) and needs the right
// gate + assembler without knowing which. A missing `storyType` is Story 1
// (legacy drafts), so the dispatch keys on `draft.storyType ?? "story-1"`.

/** True if the draft is a Story-2 draft (narrows the union for callers). */
export function isStory2Draft(draft: WizardDraft): draft is Story2Draft {
  return draft.storyType === "story-2";
}

/**
 * True if the draft is a Story-4 draft (narrows the union for callers). Story 4's
 * wizard/order assembly is owned by a later PR (PR 22); until then no UI ever
 * creates a Story-4 draft, so the dispatchers below treat one as not-yet-wired.
 */
export function isStory4Draft(draft: WizardDraft): draft is Story4Draft {
  return draft.storyType === "story-4";
}

/** True if the draft is a Story-1 draft (the default — no/legacy `storyType`). */
export function isStory1Draft(draft: WizardDraft): draft is StoryDraft {
  return !isStory2Draft(draft) && !isStory4Draft(draft);
}

/**
 * The required fields still missing from a draft of a wired product, as string
 * codes (the union of `RequiredField` | `Story2RequiredField`). The Generate step
 * uses this to gate and to drive the "go fix it" links per product. Story 4's
 * wizard is not wired yet (PR 22); a Story-4 draft is unreachable here.
 */
export function missingRequiredFieldsForDraft(
  draft: WizardDraft,
): (RequiredField | Story2RequiredField)[] {
  if (isStory2Draft(draft)) return missingRequiredFieldsStory2(draft);
  if (isStory4Draft(draft)) {
    throw new Error("Story 4 draft assembly is not wired yet (PR 22)");
  }
  return missingRequiredFields(draft);
}

/**
 * Assemble the finalized session for a draft of a wired product. Throws if a
 * required field is missing — callers gate on `missingRequiredFieldsForDraft`
 * first. Returns the `StorySession | Story2Session` union; the POST body the
 * /api/session route validates carries `storyType` so the server re-branches.
 * Story 4's draft→session assembly is not wired yet (PR 22).
 */
export function draftToSessionForDraft(
  draft: WizardDraft,
): StorySession | Story2Session {
  if (isStory2Draft(draft)) return draftToSessionStory2(draft);
  if (isStory4Draft(draft)) {
    throw new Error("Story 4 draft assembly is not wired yet (PR 22)");
  }
  return draftToSession(draft);
}
