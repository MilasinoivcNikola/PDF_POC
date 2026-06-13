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
  Story4Session,
  Story5Draft,
  Story5Session,
  Story6Draft,
  Story6Session,
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
  LivingOrMemorial,
  TransitionFrame,
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
// Story 4 — "If [PET_NAME] Could Talk" draft → session bridge
// ===========================================================================
//
// Story 4 is the celebration twin of Story 2 (a living pet's present-tense
// letter, with a memorial past-tense toggle). It REUSES Story 2's `Owner` group
// and shares Story 2's letter memories PLUS Story 1's `favoriteActivity` (the
// Page-4 "daily joy" beat). EIGHT fields are required: pet name, owner names,
// species, photo (the Premium cover uses it), plus the four personal free-text
// fields the letter merges as live placeholders — quirks, favoriteRitual,
// favoriteSpots, favoriteActivity. A blank in any of those resolves to an empty
// merge value, which `lib/story/story4/merge.ts` treats as a missing field and
// rejects with a MergeError; requiring them here keeps every written letter
// renderable. The optional nicknames/dateAdopted/datePassed stay optional —
// merge drops a blank one rather than printing an empty line — and the
// toggle/enum fields have non-empty defaults that never break merge.
//
// Toggles differ from Story 2: Story 4 has the headline `livingOrMemorial`
// switch and no `newPet`. The death-type/belief-frame answers are dormant in the
// default living path and consulted only when `livingOrMemorial === "memorial"`,
// but they always carry a default so merge never sees an empty enum.

/** A required field the Story-4 wizard gates Generate on. */
export type Story4RequiredField =
  | "petName"
  | "ownerNames"
  | "species"
  | "photo"
  | "quirks"
  | "favoriteRitual"
  | "favoriteSpots"
  | "favoriteActivity";

/** Story-4 defaults the master template assumes when the user skips them. */
const DEFAULT_LIVING_OR_MEMORIAL: LivingOrMemorial = "living";

/** Story-6 default the master template assumes when the user skips it. */
const DEFAULT_TRANSITION_FRAME: TransitionFrame = "still-here";

/**
 * The required Story-4 fields still missing from a draft, in display order. Empty
 * array means the draft can be finalized. Required = pet name, owner names,
 * species, photo, and the four personal free-text fields (quirks, favoriteRitual,
 * favoriteSpots, favoriteActivity) the letter merges as live placeholders.
 */
export function missingRequiredFieldsStory4(
  draft: Story4Draft,
): Story4RequiredField[] {
  const missing: Story4RequiredField[] = [];
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
  if (!present(draft.memories.favoriteActivity)) {
    missing.push("favoriteActivity");
  }
  return missing;
}

/**
 * Assemble a finalized `Story4Session` from a complete Story-4 draft, filling any
 * skipped optional fields with the master-template defaults. Throws if a required
 * field (pet name, owner names, species, photo, quirks, favoriteRitual,
 * favoriteSpots, favoriteActivity) is missing — callers should gate on
 * `missingRequiredFieldsStory4` first. Free-text fields are trimmed; the optional
 * nickname/date fields are dropped rather than stored as "" so merge never prints
 * an empty line.
 */
export function draftToSessionStory4(draft: Story4Draft): Story4Session {
  const missing = missingRequiredFieldsStory4(draft);
  if (missing.length > 0) {
    throw new Error(`missing_required_fields: ${missing.join(", ")}`);
  }

  const { nicknames, dateAdopted, datePassed } = draft.memories;

  return {
    id: draft.id,
    createdAt: draft.createdAt,
    status: "generating",
    storyType: "story-4",
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
      favoriteActivity: draft.memories.favoriteActivity!.trim(),
      ...(present(nicknames) ? { nicknames: nicknames.trim() } : {}),
      ...(present(dateAdopted) ? { dateAdopted: dateAdopted.trim() } : {}),
      ...(present(datePassed) ? { datePassed: datePassed.trim() } : {}),
    },
    toggles: {
      livingOrMemorial:
        draft.toggles.livingOrMemorial ?? DEFAULT_LIVING_OR_MEMORIAL,
      giftFor: draft.toggles.giftFor ?? DEFAULT_GIFT_FOR,
      deathType: draft.toggles.deathType ?? DEFAULT_LETTER_DEATH_TYPE,
      beliefFrame: draft.toggles.beliefFrame ?? DEFAULT_LETTER_BELIEF_FRAME,
    },
    images: [],
  };
}

// ===========================================================================
// Story 5 — "A Letter to [PET_NAME]" draft → session bridge
// ===========================================================================
//
// Story 5 is the inverse/companion of Story 2 (the OWNER's second-person voice
// writing a letter TO the pet who died, single-tense past). It REUSES Story 2's
// `Owner` group and shares Story 2's letter memories PLUS the two genuinely new
// fields `lastGoodDay` + `whatIKeep` (`Story5Memories`). SIX fields are required:
// pet name, owner names, species, photo (the Premium cover uses it), plus the two
// personal free-text fields the letter merges as live placeholders with NO
// fallback — favoriteRitual, favoriteSpots. One fewer than Story 2 because
// `quirks` is optional-with-fallback here (the variant layer supplies a stock
// Page-3 line when it is blank), as are `lastGoodDay` / `whatIKeep` — so they are
// dropped-when-blank rather than required. The optional nicknames/dateAdopted/
// datePassed stay optional too — merge drops a blank one rather than printing an
// empty line — and the toggle/enum fields have non-empty defaults that never
// break merge.
//
// Toggles are the simplest of the letter products: just `deathType` +
// `beliefFrame` (no `giftFor`, no `newPet`, no `livingOrMemorial`).

/** A required field the Story-5 wizard gates Generate on. */
export type Story5RequiredField =
  | "petName"
  | "ownerNames"
  | "species"
  | "photo"
  | "favoriteRitual"
  | "favoriteSpots";

/**
 * The required Story-5 fields still missing from a draft, in display order. Empty
 * array means the draft can be finalized. Required = pet name, owner names,
 * species, photo, and the two personal free-text fields (favoriteRitual,
 * favoriteSpots) the letter merges as live placeholders with no fallback. `quirks`
 * / `lastGoodDay` / `whatIKeep` are optional-with-fallback, so they are NOT here.
 */
export function missingRequiredFieldsStory5(
  draft: Story5Draft,
): Story5RequiredField[] {
  const missing: Story5RequiredField[] = [];
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
  if (!present(draft.memories.favoriteRitual)) {
    missing.push("favoriteRitual");
  }
  if (!present(draft.memories.favoriteSpots)) {
    missing.push("favoriteSpots");
  }
  return missing;
}

/**
 * Assemble a finalized `Story5Session` from a complete Story-5 draft, filling any
 * skipped optional fields with the master-template defaults. Throws if a required
 * field (pet name, owner names, species, photo, favoriteRitual, favoriteSpots) is
 * missing — callers should gate on `missingRequiredFieldsStory5` first. Free-text
 * fields are trimmed; the optional-with-fallback (quirks, lastGoodDay, whatIKeep)
 * and the optional nickname/date fields are dropped rather than stored as "" so
 * merge applies its fallback / never prints an empty line.
 */
export function draftToSessionStory5(draft: Story5Draft): Story5Session {
  const missing = missingRequiredFieldsStory5(draft);
  if (missing.length > 0) {
    throw new Error(`missing_required_fields: ${missing.join(", ")}`);
  }

  const { quirks, lastGoodDay, whatIKeep, nicknames, dateAdopted, datePassed } =
    draft.memories;

  return {
    id: draft.id,
    createdAt: draft.createdAt,
    status: "generating",
    storyType: "story-5",
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
      quirks: present(quirks) ? quirks.trim() : "",
      favoriteRitual: draft.memories.favoriteRitual!.trim(),
      favoriteSpots: draft.memories.favoriteSpots!.trim(),
      ...(present(lastGoodDay) ? { lastGoodDay: lastGoodDay.trim() } : {}),
      ...(present(whatIKeep) ? { whatIKeep: whatIKeep.trim() } : {}),
      ...(present(nicknames) ? { nicknames: nicknames.trim() } : {}),
      ...(present(dateAdopted) ? { dateAdopted: dateAdopted.trim() } : {}),
      ...(present(datePassed) ? { datePassed: datePassed.trim() } : {}),
    },
    toggles: {
      deathType: draft.toggles.deathType ?? DEFAULT_LETTER_DEATH_TYPE,
      beliefFrame: draft.toggles.beliefFrame ?? DEFAULT_LETTER_BELIEF_FRAME,
    },
    images: [],
  };
}

// ===========================================================================
// Story 6 — "While You're Still Here, [PET_NAME]" draft → session bridge
// ===========================================================================
//
// Story 6 is the living tribute — the FIRST narrative-layout new book since Story
// 1, and the only product made BEFORE a pet dies. Unlike the letters, it is a
// narrative book, so it REUSES the Story-1 `Pet` group IN FULL (keeping pronoun +
// illustrationStyle), plus the Story-2 `Owner` group (the narrator's voice). There
// is NO child. EIGHT fields are required: pet name, species, breedColor (the
// narrative book merges it as a live placeholder, like Story 1), owner names,
// ageOrStage (NEW — a live placeholder), favoriteRitual, favoriteActivity (both
// live placeholders), and photo. A blank in any of those would resolve to an empty
// merge value, which `lib/story/story6/merge.ts` rejects with a MergeError;
// requiring them here keeps every written tribute renderable.
//
// `stillLoves` / `quirks` are optional-with-fallback (the PR-25 variant layer
// supplies a stock line when blank), and `favoriteSpots` / `sleepingSpot` /
// `ownerMessage` / `nicknames` / `dateAdopted` are optional-omit (no dangling
// artifact). `favoriteSpots` + `sleepingSpot` are NON-optional on the type
// (`Story6Memories`), so a blank one is stored as "" (the variant layer treats ""
// as "not provided"); the genuinely-optional fields are dropped when blank so merge
// never prints an empty line.
//
// Toggles are the simplest after Story 5: `transitionFrame` (the defining Page-5
// register) + `otherPetsInHome` (the Story-1 union, reused). There is deliberately
// NO `deathType`/`beliefFrame` — the memorial conversion is dropped (PM, 2026-06-12).

/** A required field the Story-6 wizard gates Generate on. */
export type Story6RequiredField =
  | "petName"
  | "species"
  | "breedColor"
  | "ownerNames"
  | "ageOrStage"
  | "favoriteRitual"
  | "favoriteActivity"
  | "photo";

/**
 * The required Story-6 fields still missing from a draft, in display order. Empty
 * array means the draft can be finalized. Required = pet name, species, breedColor,
 * owner names, ageOrStage, favoriteRitual, favoriteActivity, photo — the live
 * `{placeholder}` fields the tribute merges with no fallback. `stillLoves` /
 * `quirks` are optional-with-fallback, and `favoriteSpots` / `sleepingSpot` /
 * `ownerMessage` / `nicknames` / `dateAdopted` are optional-omit, so they are NOT
 * here.
 */
export function missingRequiredFieldsStory6(
  draft: Story6Draft,
): Story6RequiredField[] {
  const missing: Story6RequiredField[] = [];
  if (!present(draft.pet.name)) {
    missing.push("petName");
  }
  if (!present(draft.pet.species)) {
    missing.push("species");
  }
  if (!present(draft.pet.breedColor)) {
    missing.push("breedColor");
  }
  if (!present(draft.owner.names)) {
    missing.push("ownerNames");
  }
  if (!present(draft.memories.ageOrStage)) {
    missing.push("ageOrStage");
  }
  if (!present(draft.memories.favoriteRitual)) {
    missing.push("favoriteRitual");
  }
  if (!present(draft.memories.favoriteActivity)) {
    missing.push("favoriteActivity");
  }
  if (!present(draft.pet.photo)) {
    missing.push("photo");
  }
  return missing;
}

/**
 * Assemble a finalized `Story6Session` from a complete Story-6 draft, filling any
 * skipped optional fields with the master-template defaults. Throws if a required
 * field (pet name, species, breedColor, owner names, ageOrStage, favoriteRitual,
 * favoriteActivity, photo) is missing — callers should gate on
 * `missingRequiredFieldsStory6` first. Free-text fields are trimmed; the
 * optional-with-fallback (stillLoves, quirks) and non-optional `favoriteSpots` /
 * `sleepingSpot` are stored as "" when blank so the variant layer supplies its
 * fallback; the genuinely-optional ownerMessage/nicknames/dateAdopted are dropped
 * rather than stored as "" so merge never prints an empty line.
 */
export function draftToSessionStory6(draft: Story6Draft): Story6Session {
  const missing = missingRequiredFieldsStory6(draft);
  if (missing.length > 0) {
    throw new Error(`missing_required_fields: ${missing.join(", ")}`);
  }

  const {
    quirks,
    stillLoves,
    favoriteSpots,
    sleepingSpot,
    ownerMessage,
    nicknames,
    dateAdopted,
  } = draft.memories;

  return {
    id: draft.id,
    createdAt: draft.createdAt,
    status: "generating",
    storyType: "story-6",
    pet: {
      name: draft.pet.name!.trim(),
      species: draft.pet.species ?? DEFAULT_SPECIES,
      breedColor: draft.pet.breedColor!.trim(),
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
      ageOrStage: draft.memories.ageOrStage!.trim(),
      quirks: present(quirks) ? quirks.trim() : "",
      stillLoves: present(stillLoves) ? stillLoves.trim() : "",
      favoriteActivity: draft.memories.favoriteActivity!.trim(),
      favoriteRitual: draft.memories.favoriteRitual!.trim(),
      sleepingSpot: present(sleepingSpot) ? sleepingSpot.trim() : "",
      favoriteSpots: present(favoriteSpots) ? favoriteSpots.trim() : "",
      ...(present(ownerMessage) ? { ownerMessage: ownerMessage.trim() } : {}),
      ...(present(nicknames) ? { nicknames: nicknames.trim() } : {}),
      ...(present(dateAdopted) ? { dateAdopted: dateAdopted.trim() } : {}),
    },
    toggles: {
      transitionFrame:
        draft.toggles.transitionFrame ?? DEFAULT_TRANSITION_FRAME,
      otherPetsInHome: draft.toggles.otherPetsInHome ?? DEFAULT_OTHER_PETS,
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

/** True if the draft is a Story-4 draft (narrows the union for callers). */
export function isStory4Draft(draft: WizardDraft): draft is Story4Draft {
  return draft.storyType === "story-4";
}

/** True if the draft is a Story-5 draft (narrows the union for callers). */
export function isStory5Draft(draft: WizardDraft): draft is Story5Draft {
  return draft.storyType === "story-5";
}

/** True if the draft is a Story-6 draft (the living tribute; narrows the union). */
export function isStory6Draft(draft: WizardDraft): draft is Story6Draft {
  return draft.storyType === "story-6";
}

/** True if the draft is a Story-1 draft (the default — no/legacy `storyType`). */
export function isStory1Draft(draft: WizardDraft): draft is StoryDraft {
  return (
    !isStory2Draft(draft) &&
    !isStory4Draft(draft) &&
    !isStory5Draft(draft) &&
    !isStory6Draft(draft)
  );
}

/**
 * The required fields still missing from a draft of a wired product, as string
 * codes (the union of `RequiredField` | `Story2RequiredField` |
 * `Story4RequiredField` | `Story5RequiredField` | `Story6RequiredField`). The
 * Generate step + the public order form use this to gate and to drive the "go fix
 * it" links per product.
 */
export function missingRequiredFieldsForDraft(
  draft: WizardDraft,
): (
  | RequiredField
  | Story2RequiredField
  | Story4RequiredField
  | Story5RequiredField
  | Story6RequiredField
)[] {
  if (isStory2Draft(draft)) return missingRequiredFieldsStory2(draft);
  if (isStory4Draft(draft)) return missingRequiredFieldsStory4(draft);
  if (isStory5Draft(draft)) return missingRequiredFieldsStory5(draft);
  if (isStory6Draft(draft)) return missingRequiredFieldsStory6(draft);
  return missingRequiredFields(draft);
}

/**
 * Assemble the finalized session for a draft of a wired product. Throws if a
 * required field is missing — callers gate on `missingRequiredFieldsForDraft`
 * first. Returns the `StorySession | Story2Session | Story4Session | Story5Session
 * | Story6Session` union; the POST body the /api/session + /api/order routes
 * validate carries `storyType` so the server re-branches.
 */
export function draftToSessionForDraft(
  draft: WizardDraft,
):
  | StorySession
  | Story2Session
  | Story4Session
  | Story5Session
  | Story6Session {
  if (isStory2Draft(draft)) return draftToSessionStory2(draft);
  if (isStory4Draft(draft)) return draftToSessionStory4(draft);
  if (isStory5Draft(draft)) return draftToSessionStory5(draft);
  if (isStory6Draft(draft)) return draftToSessionStory6(draft);
  return draftToSession(draft);
}
