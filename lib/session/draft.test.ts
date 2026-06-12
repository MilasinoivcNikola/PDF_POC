import { describe, it, expect } from "vitest";

import {
  missingRequiredFields,
  isDraftComplete,
  draftToSession,
  missingRequiredFieldsStory2,
  draftToSessionStory2,
  isStory2Draft,
  missingRequiredFieldsStory4,
  draftToSessionStory4,
  isStory4Draft,
  isStory1Draft,
  missingRequiredFieldsForDraft,
  draftToSessionForDraft,
} from "./draft";
import { newDraft } from "./storage";
import { resolveStory4 } from "@/lib/story/story4/variants";
import type { StoryDraft, Story2Draft, Story4Draft } from "./types";

// The draft→session bridge is pure (no IO, no React), so it is asserted directly.
// Three surfaces:
//   1. missingRequiredFields — the wizard's Generate gate (pet name, child name,
//      photo, breedColor, favoriteActivity, sleepingSpot, favoriteMemory;
//      whitespace-only counts as missing because present() trims).
//   2. isDraftComplete — the boolean mirror of the above.
//   3. draftToSession — assembly that fills skipped optionals with the
//      master-template defaults, trims free-text, drops an empty dedication, and
//      throws when a required field is absent.

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** A draft with all seven required fields present (and nothing else). */
function minimalCompleteDraft(): StoryDraft {
  const draft = newDraft();
  draft.pet.name = "Otis";
  draft.pet.photo = "uploads/sess/photo.jpg";
  draft.pet.breedColor = "rescue mutt with floppy ears";
  draft.child.name = "Emma";
  draft.memories.favoriteActivity = "chasing tennis balls in the backyard";
  draft.memories.sleepingSpot = "at the foot of the bed";
  draft.memories.favoriteMemory = "the day Otis followed Emma to the lake";
  return draft;
}

/** A draft with every input group fully populated. */
function fullDraft(): StoryDraft {
  return {
    id: "draft-id-123",
    createdAt: "2026-06-08T09:00:00.000Z",
    status: "draft",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "rescue mutt with floppy ears",
      pronoun: "he",
      illustrationStyle: "storybook",
      photo: "uploads/sess/photo.jpg",
    },
    child: { name: "Emma", ageBracket: "9-12" },
    memories: {
      favoriteActivity: "chasing tennis balls in the backyard",
      sleepingSpot: "at the foot of the bed",
      favoriteMemory: "the day Otis followed Emma to the lake",
      parentDedication: "For our sweet boy.",
    },
    toggles: {
      deathType: "euthanasia",
      beliefFrame: "heaven",
      otherPetsInHome: "yes",
    },
  };
}

// ---------------------------------------------------------------------------
// missingRequiredFields
// ---------------------------------------------------------------------------

describe("missingRequiredFields", () => {
  it("reports all seven required fields for a fresh newDraft()", () => {
    // newDraft() carries only defaults — none of the seven required fields.
    expect(missingRequiredFields(newDraft())).toEqual([
      "petName",
      "childName",
      "photo",
      "breedColor",
      "favoriteActivity",
      "sleepingSpot",
      "favoriteMemory",
    ]);
  });

  it("returns an empty array when all seven required fields are present", () => {
    expect(missingRequiredFields(minimalCompleteDraft())).toEqual([]);
  });

  it("reports only petName when just the pet name is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.pet.name;
    expect(missingRequiredFields(draft)).toEqual(["petName"]);
  });

  it("reports only childName when just the child name is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.child.name;
    expect(missingRequiredFields(draft)).toEqual(["childName"]);
  });

  it("reports only photo when just the photo is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.pet.photo;
    expect(missingRequiredFields(draft)).toEqual(["photo"]);
  });

  it("reports only breedColor when just the description is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.pet.breedColor;
    expect(missingRequiredFields(draft)).toEqual(["breedColor"]);
  });

  it("reports only favoriteActivity when just that memory is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.memories.favoriteActivity;
    expect(missingRequiredFields(draft)).toEqual(["favoriteActivity"]);
  });

  it("reports only sleepingSpot when just that memory is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.memories.sleepingSpot;
    expect(missingRequiredFields(draft)).toEqual(["sleepingSpot"]);
  });

  it("reports only favoriteMemory when just that memory is missing", () => {
    const draft = minimalCompleteDraft();
    delete draft.memories.favoriteMemory;
    expect(missingRequiredFields(draft)).toEqual(["favoriteMemory"]);
  });

  it("treats whitespace-only values as missing (present() trims)", () => {
    const draft = minimalCompleteDraft();
    draft.pet.name = "   ";
    draft.child.name = "\t\n";
    draft.pet.photo = " ";
    draft.pet.breedColor = "  ";
    draft.memories.favoriteActivity = "\t";
    draft.memories.sleepingSpot = " ";
    draft.memories.favoriteMemory = "\n";
    expect(missingRequiredFields(draft)).toEqual([
      "petName",
      "childName",
      "photo",
      "breedColor",
      "favoriteActivity",
      "sleepingSpot",
      "favoriteMemory",
    ]);
  });

  it("preserves display order across all seven required fields", () => {
    // Even with all seven missing, order is fixed regardless of object shape.
    expect(missingRequiredFields(newDraft())).toEqual([
      "petName",
      "childName",
      "photo",
      "breedColor",
      "favoriteActivity",
      "sleepingSpot",
      "favoriteMemory",
    ]);
  });
});

// ---------------------------------------------------------------------------
// isDraftComplete
// ---------------------------------------------------------------------------

describe("isDraftComplete", () => {
  it("is false for a fresh newDraft()", () => {
    expect(isDraftComplete(newDraft())).toBe(false);
  });

  it("is true once all seven required fields are present", () => {
    expect(isDraftComplete(minimalCompleteDraft())).toBe(true);
  });

  it("is false when any single required field is missing", () => {
    const noPet = minimalCompleteDraft();
    delete noPet.pet.name;
    expect(isDraftComplete(noPet)).toBe(false);

    const noChild = minimalCompleteDraft();
    delete noChild.child.name;
    expect(isDraftComplete(noChild)).toBe(false);

    const noPhoto = minimalCompleteDraft();
    delete noPhoto.pet.photo;
    expect(isDraftComplete(noPhoto)).toBe(false);

    const noBreed = minimalCompleteDraft();
    delete noBreed.pet.breedColor;
    expect(isDraftComplete(noBreed)).toBe(false);

    const noActivity = minimalCompleteDraft();
    delete noActivity.memories.favoriteActivity;
    expect(isDraftComplete(noActivity)).toBe(false);

    const noSpot = minimalCompleteDraft();
    delete noSpot.memories.sleepingSpot;
    expect(isDraftComplete(noSpot)).toBe(false);

    const noMemory = minimalCompleteDraft();
    delete noMemory.memories.favoriteMemory;
    expect(isDraftComplete(noMemory)).toBe(false);
  });

  it("is false when a required field is whitespace-only", () => {
    const draft = minimalCompleteDraft();
    draft.pet.name = "  ";
    expect(isDraftComplete(draft)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// draftToSession — assembly
// ---------------------------------------------------------------------------

describe("draftToSession — required fields & lifecycle", () => {
  it("throws when a required field is missing, naming the missing fields", () => {
    expect(() => draftToSession(newDraft())).toThrow(
      /missing_required_fields: petName, childName, photo, breedColor, favoriteActivity, sleepingSpot, favoriteMemory/,
    );
  });

  it("throws naming only the single missing field", () => {
    const draft = minimalCompleteDraft();
    delete draft.child.name;
    expect(() => draftToSession(draft)).toThrow(
      /missing_required_fields: childName/,
    );
  });

  it("throws when a required free-text field is missing", () => {
    const noBreed = minimalCompleteDraft();
    delete noBreed.pet.breedColor;
    expect(() => draftToSession(noBreed)).toThrow(
      /missing_required_fields: breedColor/,
    );

    const noActivity = minimalCompleteDraft();
    delete noActivity.memories.favoriteActivity;
    expect(() => draftToSession(noActivity)).toThrow(
      /missing_required_fields: favoriteActivity/,
    );

    const noSpot = minimalCompleteDraft();
    delete noSpot.memories.sleepingSpot;
    expect(() => draftToSession(noSpot)).toThrow(
      /missing_required_fields: sleepingSpot/,
    );

    const noMemory = minimalCompleteDraft();
    delete noMemory.memories.favoriteMemory;
    expect(() => draftToSession(noMemory)).toThrow(
      /missing_required_fields: favoriteMemory/,
    );
  });

  it("preserves id, createdAt and sets status to 'generating'", () => {
    const draft = fullDraft();
    const session = draftToSession(draft);
    expect(session.id).toBe(draft.id);
    expect(session.createdAt).toBe(draft.createdAt);
    expect(session.status).toBe("generating");
  });

  it("starts the images manifest empty", () => {
    expect(draftToSession(fullDraft()).images).toEqual([]);
  });
});

describe("draftToSession — required fields carried through", () => {
  it("carries pet name, photo, and child name verbatim (trimmed)", () => {
    const draft = fullDraft();
    const session = draftToSession(draft);
    expect(session.pet.name).toBe("Otis");
    expect(session.pet.photo).toBe("uploads/sess/photo.jpg");
    expect(session.child.name).toBe("Emma");
  });

  it("trims surrounding whitespace from the pet and child names", () => {
    const draft = minimalCompleteDraft();
    draft.pet.name = "  Otis  ";
    draft.child.name = "\tEmma\n";
    const session = draftToSession(draft);
    expect(session.pet.name).toBe("Otis");
    expect(session.child.name).toBe("Emma");
  });

  it("carries the photo reference without trimming it", () => {
    // photo is a path reference, not free-text — the assembler passes it through
    // as-is (draft.pet.photo!), unlike the trimmed free-text fields.
    const draft = minimalCompleteDraft();
    draft.pet.photo = "uploads/sess/photo.jpg";
    expect(draftToSession(draft).pet.photo).toBe("uploads/sess/photo.jpg");
  });

  it("carries explicitly chosen optional enum fields through", () => {
    const session = draftToSession(fullDraft());
    expect(session.pet.species).toBe("dog");
    expect(session.pet.pronoun).toBe("he");
    expect(session.pet.illustrationStyle).toBe("storybook");
    expect(session.child.ageBracket).toBe("9-12");
    expect(session.toggles.deathType).toBe("euthanasia");
    expect(session.toggles.beliefFrame).toBe("heaven");
    expect(session.toggles.otherPetsInHome).toBe("yes");
  });

  it("trims and carries the required free-text fields (description + memories)", () => {
    const draft = minimalCompleteDraft();
    draft.pet.breedColor = "  scruffy mutt  ";
    draft.memories.favoriteActivity = "  chasing balls  ";
    draft.memories.sleepingSpot = "  the foot of the bed ";
    draft.memories.favoriteMemory = " the lake day  ";
    const session = draftToSession(draft);
    expect(session.pet.breedColor).toBe("scruffy mutt");
    expect(session.memories.favoriteActivity).toBe("chasing balls");
    expect(session.memories.sleepingSpot).toBe("the foot of the bed");
    expect(session.memories.favoriteMemory).toBe("the lake day");
  });
});

describe("draftToSession — skipped optionals get master-template defaults", () => {
  it("fills every skipped optional enum/toggle with its documented default", () => {
    // A minimal complete draft (the seven required fields) leaves every
    // enum/toggle skipped except illustrationStyle and beliefFrame, which
    // newDraft() pre-seeds. Re-strip those two so we observe the assembler's own
    // ?? defaults for them too.
    const draft = minimalCompleteDraft();
    delete draft.pet.illustrationStyle;
    delete draft.toggles.beliefFrame;

    const session = draftToSession(draft);

    expect(session.pet.species).toBe("dog");
    expect(session.pet.pronoun).toBe("he");
    expect(session.pet.illustrationStyle).toBe("watercolor");
    expect(session.child.ageBracket).toBe("6-8");
    expect(session.toggles.deathType).toBe("natural");
    expect(session.toggles.beliefFrame).toBe("rainbow-bridge");
    expect(session.toggles.otherPetsInHome).toBe("no");
  });

  it("keeps newDraft()'s illustrationStyle/beliefFrame defaults when not overridden", () => {
    // newDraft() pre-seeds these two; a minimal complete draft should surface
    // them unchanged.
    const session = draftToSession(minimalCompleteDraft());
    expect(session.pet.illustrationStyle).toBe("watercolor");
    expect(session.toggles.beliefFrame).toBe("rainbow-bridge");
  });
});

describe("draftToSession — parentDedication handling", () => {
  it("includes a trimmed parentDedication when provided", () => {
    const draft = minimalCompleteDraft();
    draft.memories.parentDedication = "  For our sweet boy.  ";
    const session = draftToSession(draft);
    expect(session.memories.parentDedication).toBe("For our sweet boy.");
  });

  it("drops parentDedication entirely when absent (key not present)", () => {
    const session = draftToSession(minimalCompleteDraft());
    expect("parentDedication" in session.memories).toBe(false);
    expect(session.memories.parentDedication).toBeUndefined();
  });

  it("drops parentDedication when empty or whitespace-only (never stored as '')", () => {
    const empty = minimalCompleteDraft();
    empty.memories.parentDedication = "";
    expect("parentDedication" in draftToSession(empty).memories).toBe(false);

    const blank = minimalCompleteDraft();
    blank.memories.parentDedication = "   ";
    expect("parentDedication" in draftToSession(blank).memories).toBe(false);
  });
});

describe("draftToSession — round-trip shape", () => {
  it("produces a StorySession whose required merge fields are all non-empty", () => {
    // The merge layer (resolveStory) requires pet name, child name, species,
    // breedColor, pronoun, ageBracket, and the toggle enums. A full draft must
    // assemble into a session that satisfies that shape (asserted structurally,
    // not by running the merge).
    const session = draftToSession(fullDraft());

    expect(session.pet.name.length).toBeGreaterThan(0);
    expect(session.pet.photo.length).toBeGreaterThan(0);
    expect(session.child.name.length).toBeGreaterThan(0);

    // Every enumerated field is defined (string-literal union members).
    expect(session.pet.species).toBeTruthy();
    expect(session.pet.pronoun).toBeTruthy();
    expect(session.pet.illustrationStyle).toBeTruthy();
    expect(session.child.ageBracket).toBeTruthy();
    expect(session.toggles.deathType).toBeTruthy();
    expect(session.toggles.beliefFrame).toBeTruthy();
    expect(session.toggles.otherPetsInHome).toBeTruthy();

    // The four required free-text merge fields are now guaranteed non-empty —
    // they gate Generate, so a written session never carries a blank one (which
    // the merge layer would reject).
    expect(session.pet.breedColor.length).toBeGreaterThan(0);
    expect(session.memories.favoriteActivity.length).toBeGreaterThan(0);
    expect(session.memories.sleepingSpot.length).toBeGreaterThan(0);
    expect(session.memories.favoriteMemory.length).toBeGreaterThan(0);

    // The manifest is present and empty, ready for generation.
    expect(session.images).toEqual([]);
  });
});

// ===========================================================================
// Story 2 — "A Letter from [PET_NAME]" draft → session bridge
// ===========================================================================
//
// The Story-2 analog of the surfaces above:
//   1. missingRequiredFieldsStory2 — the Story-2 Generate gate (pet name, owner
//      names, species, photo, quirks, favoriteRitual, favoriteSpots; whitespace-
//      only counts as missing because present() trims).
//   2. draftToSessionStory2 — assembly that fills skipped optionals with the
//      Story-2 defaults, trims free-text, drops the optional nickname/date fields
//      when blank, and throws when a required field is absent.
//   3. The storyType dispatchers (isStory2Draft / missingRequiredFieldsForDraft /
//      draftToSessionForDraft) — route to the right product's gate/assembler.

/** A Story-2 draft with all seven required fields present (and nothing else). */
function minimalCompleteStory2Draft(): Story2Draft {
  const draft = newDraft("story-2");
  draft.pet.name = "Murphy";
  draft.pet.photo = "uploads/sess/murphy.jpg";
  // species is pre-seeded "dog" by newDraft("story-2").
  draft.owner.names = "Sarah";
  draft.memories.quirks = "the way you tilted your head when I said your name";
  draft.memories.favoriteRitual = "our walk before coffee, every morning";
  draft.memories.favoriteSpots = "the spot by the back door";
  return draft;
}

/** A Story-2 draft with every input group fully populated. */
function fullStory2Draft(): Story2Draft {
  return {
    id: "story2-draft-id-456",
    createdAt: "2026-06-09T09:00:00.000Z",
    status: "draft",
    storyType: "story-2",
    pet: {
      name: "Murphy",
      species: "cat",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "she",
      illustrationStyle: "pencil",
      photo: "uploads/sess/murphy.jpg",
    },
    owner: { names: "Sarah and David", relationship: "couple" },
    memories: {
      quirks: "the way you tilted your head when I said your name",
      favoriteRitual: "our walk before coffee, every morning",
      favoriteSpots: "the spot by the back door where the sun hit at 4pm",
      nicknames: "Murph, Mr. Murph, the worst dog",
      dateAdopted: "March 2014",
      datePassed: "October 2025",
    },
    toggles: {
      deathType: "euthanasia",
      beliefFrame: "heaven",
      giftFor: "friend",
      newPet: "yes",
    },
  };
}

// ---------------------------------------------------------------------------
// missingRequiredFieldsStory2
// ---------------------------------------------------------------------------

describe("missingRequiredFieldsStory2", () => {
  it("reports all required fields except species for a fresh newDraft('story-2')", () => {
    // newDraft("story-2") pre-seeds species: "dog", so only the other six are
    // missing — in display order.
    expect(missingRequiredFieldsStory2(newDraft("story-2"))).toEqual([
      "petName",
      "ownerNames",
      "photo",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
    ]);
  });

  it("returns an empty array when all seven required fields are present", () => {
    expect(missingRequiredFieldsStory2(minimalCompleteStory2Draft())).toEqual(
      [],
    );
  });

  it("reports only petName when just the pet name is missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.pet.name;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["petName"]);
  });

  it("reports only ownerNames when just the owner names are missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.owner.names;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["ownerNames"]);
  });

  it("reports only species when just the species is missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.pet.species;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["species"]);
  });

  it("reports only photo when just the photo is missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.pet.photo;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["photo"]);
  });

  it("reports only quirks when just that field is missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.memories.quirks;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["quirks"]);
  });

  it("reports only favoriteRitual when just that field is missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.memories.favoriteRitual;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["favoriteRitual"]);
  });

  it("reports only favoriteSpots when just that field is missing", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.memories.favoriteSpots;
    expect(missingRequiredFieldsStory2(draft)).toEqual(["favoriteSpots"]);
  });

  it("treats whitespace-only values as missing (present() trims)", () => {
    const draft = minimalCompleteStory2Draft();
    draft.pet.name = "   ";
    draft.owner.names = "\t\n";
    // species is an enum, but present() still rejects a whitespace-only value.
    draft.pet.species = "  " as Story2Draft["pet"]["species"];
    draft.pet.photo = " ";
    draft.memories.quirks = "\t";
    draft.memories.favoriteRitual = " ";
    draft.memories.favoriteSpots = "\n";
    expect(missingRequiredFieldsStory2(draft)).toEqual([
      "petName",
      "ownerNames",
      "species",
      "photo",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
    ]);
  });

  it("ignores the optional nickname/date fields (absent is still complete)", () => {
    const draft = minimalCompleteStory2Draft();
    // No nicknames / dateAdopted / datePassed set — still complete.
    expect(draft.memories.nicknames).toBeUndefined();
    expect(draft.memories.dateAdopted).toBeUndefined();
    expect(draft.memories.datePassed).toBeUndefined();
    expect(missingRequiredFieldsStory2(draft)).toEqual([]);
  });

  it("reports every required field, in display order, when all are missing", () => {
    const draft: Story2Draft = {
      id: "empty-story2",
      createdAt: "2026-06-09T00:00:00.000Z",
      status: "draft",
      storyType: "story-2",
      pet: {},
      owner: {},
      memories: {},
      toggles: {},
    };
    expect(missingRequiredFieldsStory2(draft)).toEqual([
      "petName",
      "ownerNames",
      "species",
      "photo",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
    ]);
  });
});

// ---------------------------------------------------------------------------
// draftToSessionStory2 — assembly
// ---------------------------------------------------------------------------

describe("draftToSessionStory2 — required fields & lifecycle", () => {
  it("throws when required fields are missing, naming them in order", () => {
    // A bare draft (no species, no inputs) names every missing field. Note
    // species is missing here since this draft is built without the pre-seed.
    const draft: Story2Draft = {
      id: "empty-story2",
      createdAt: "2026-06-09T00:00:00.000Z",
      status: "draft",
      storyType: "story-2",
      pet: {},
      owner: {},
      memories: {},
      toggles: {},
    };
    expect(() => draftToSessionStory2(draft)).toThrow(
      /missing_required_fields: petName, ownerNames, species, photo, quirks, favoriteRitual, favoriteSpots/,
    );
  });

  it("throws naming only the single missing field", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.owner.names;
    expect(() => draftToSessionStory2(draft)).toThrow(
      /missing_required_fields: ownerNames/,
    );
  });

  it("throws when a required free-text letter field is missing", () => {
    const noQuirks = minimalCompleteStory2Draft();
    delete noQuirks.memories.quirks;
    expect(() => draftToSessionStory2(noQuirks)).toThrow(
      /missing_required_fields: quirks/,
    );

    const noRitual = minimalCompleteStory2Draft();
    delete noRitual.memories.favoriteRitual;
    expect(() => draftToSessionStory2(noRitual)).toThrow(
      /missing_required_fields: favoriteRitual/,
    );

    const noSpots = minimalCompleteStory2Draft();
    delete noSpots.memories.favoriteSpots;
    expect(() => draftToSessionStory2(noSpots)).toThrow(
      /missing_required_fields: favoriteSpots/,
    );
  });

  it("preserves id/createdAt, sets status 'generating' and storyType 'story-2'", () => {
    const draft = fullStory2Draft();
    const session = draftToSessionStory2(draft);
    expect(session.id).toBe(draft.id);
    expect(session.createdAt).toBe(draft.createdAt);
    expect(session.status).toBe("generating");
    expect(session.storyType).toBe("story-2");
  });

  it("starts the images manifest empty", () => {
    expect(draftToSessionStory2(fullStory2Draft()).images).toEqual([]);
  });
});

describe("draftToSessionStory2 — required fields carried through (trimmed)", () => {
  it("carries pet name, photo, owner names and species verbatim", () => {
    const session = draftToSessionStory2(fullStory2Draft());
    expect(session.pet.name).toBe("Murphy");
    expect(session.pet.photo).toBe("uploads/sess/murphy.jpg");
    expect(session.pet.species).toBe("cat");
    expect(session.owner.names).toBe("Sarah and David");
  });

  it("trims surrounding whitespace from names, quirks, ritual and spots", () => {
    const draft = minimalCompleteStory2Draft();
    draft.pet.name = "  Murphy  ";
    draft.owner.names = "\tSarah\n";
    draft.memories.quirks = "  head tilts  ";
    draft.memories.favoriteRitual = " the morning walk ";
    draft.memories.favoriteSpots = "\tthe back door\n";
    const session = draftToSessionStory2(draft);
    expect(session.pet.name).toBe("Murphy");
    expect(session.owner.names).toBe("Sarah");
    expect(session.memories.quirks).toBe("head tilts");
    expect(session.memories.favoriteRitual).toBe("the morning walk");
    expect(session.memories.favoriteSpots).toBe("the back door");
  });

  it("carries the photo reference without trimming it", () => {
    const draft = minimalCompleteStory2Draft();
    draft.pet.photo = "uploads/sess/murphy.jpg";
    expect(draftToSessionStory2(draft).pet.photo).toBe(
      "uploads/sess/murphy.jpg",
    );
  });

  it("carries explicitly chosen optional enum/toggle fields through", () => {
    const session = draftToSessionStory2(fullStory2Draft());
    expect(session.pet.pronoun).toBe("she");
    expect(session.pet.illustrationStyle).toBe("pencil");
    expect(session.owner.relationship).toBe("couple");
    expect(session.toggles.deathType).toBe("euthanasia");
    expect(session.toggles.beliefFrame).toBe("heaven");
    expect(session.toggles.giftFor).toBe("friend");
    expect(session.toggles.newPet).toBe("yes");
  });
});

describe("draftToSessionStory2 — skipped optionals get defaults", () => {
  it("fills skipped pet enums and toggles with their documented Story-2 defaults", () => {
    // A minimal complete draft leaves pronoun, relationship, and every toggle
    // except beliefFrame skipped; also strip illustrationStyle/beliefFrame to
    // observe the assembler's own ?? defaults.
    const draft = minimalCompleteStory2Draft();
    delete draft.pet.illustrationStyle;
    delete draft.toggles.beliefFrame;

    const session = draftToSessionStory2(draft);

    expect(session.pet.species).toBe("dog");
    expect(session.pet.pronoun).toBe("he");
    expect(session.pet.illustrationStyle).toBe("watercolor");
    expect(session.owner.relationship).toBe("single");
    expect(session.toggles.deathType).toBe("peaceful");
    expect(session.toggles.beliefFrame).toBe("rainbow-bridge");
    expect(session.toggles.giftFor).toBe("self");
    expect(session.toggles.newPet).toBe("no");
  });

  it("fills breedColor with an empty string when the optional description is skipped", () => {
    // breedColor is NOT required for Story 2 (the cover uses the photo, not a
    // text breed), so a skipped one assembles to "" rather than throwing.
    const draft = minimalCompleteStory2Draft();
    expect(draft.pet.breedColor).toBeUndefined();
    expect(draftToSessionStory2(draft).pet.breedColor).toBe("");
  });

  it("trims breedColor when it is provided", () => {
    const draft = minimalCompleteStory2Draft();
    draft.pet.breedColor = "  scruffy mutt  ";
    expect(draftToSessionStory2(draft).pet.breedColor).toBe("scruffy mutt");
  });
});

describe("draftToSessionStory2 — optional nickname/date fields dropped when blank", () => {
  it("carries trimmed nickname/date fields when provided", () => {
    const draft = minimalCompleteStory2Draft();
    draft.memories.nicknames = "  Murph  ";
    draft.memories.dateAdopted = " March 2014 ";
    draft.memories.datePassed = "\tOctober 2025\n";
    const session = draftToSessionStory2(draft);
    expect(session.memories.nicknames).toBe("Murph");
    expect(session.memories.dateAdopted).toBe("March 2014");
    expect(session.memories.datePassed).toBe("October 2025");
  });

  it("omits the keys entirely when the optional fields are absent", () => {
    const session = draftToSessionStory2(minimalCompleteStory2Draft());
    expect("nicknames" in session.memories).toBe(false);
    expect("dateAdopted" in session.memories).toBe(false);
    expect("datePassed" in session.memories).toBe(false);
    expect(session.memories.nicknames).toBeUndefined();
    expect(session.memories.dateAdopted).toBeUndefined();
    expect(session.memories.datePassed).toBeUndefined();
  });

  it("omits the keys when the optional fields are empty or whitespace-only (never '')", () => {
    const draft = minimalCompleteStory2Draft();
    draft.memories.nicknames = "";
    draft.memories.dateAdopted = "   ";
    draft.memories.datePassed = "\t";
    const session = draftToSessionStory2(draft);
    expect("nicknames" in session.memories).toBe(false);
    expect("dateAdopted" in session.memories).toBe(false);
    expect("datePassed" in session.memories).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Story-type dispatchers
// ---------------------------------------------------------------------------

describe("isStory2Draft", () => {
  it("is true for a Story-2 draft", () => {
    expect(isStory2Draft(newDraft("story-2"))).toBe(true);
  });

  it("is false for a Story-1 draft (no storyType)", () => {
    expect(isStory2Draft(newDraft())).toBe(false);
  });

  it("is false for a Story-1 draft that explicitly carries storyType 'story-1'", () => {
    const draft = newDraft();
    draft.storyType = "story-1";
    expect(isStory2Draft(draft)).toBe(false);
  });
});

describe("missingRequiredFieldsForDraft — routes per storyType", () => {
  it("routes a Story-2 draft to the Story-2 gate (reports ownerNames)", () => {
    const draft = minimalCompleteStory2Draft();
    delete draft.owner.names;
    expect(missingRequiredFieldsForDraft(draft)).toEqual(["ownerNames"]);
  });

  it("routes a Story-1 draft to the Story-1 gate (reports childName)", () => {
    const draft = minimalCompleteDraft();
    delete draft.child.name;
    expect(missingRequiredFieldsForDraft(draft)).toEqual(["childName"]);
  });

  it("routes a draft with no storyType to the Story-1 gate (legacy default)", () => {
    const draft = newDraft();
    expect(draft.storyType).toBeUndefined();
    expect(missingRequiredFieldsForDraft(draft)).toEqual(
      missingRequiredFields(draft),
    );
  });
});

describe("draftToSessionForDraft — routes per storyType", () => {
  it("routes a Story-2 draft to draftToSessionStory2 (storyType 'story-2')", () => {
    const session = draftToSessionForDraft(fullStory2Draft());
    expect(session.storyType).toBe("story-2");
    expect("owner" in session).toBe(true);
    expect("child" in session).toBe(false);
  });

  it("routes a Story-1 draft to draftToSession (no owner group)", () => {
    const session = draftToSessionForDraft(fullDraft());
    expect("child" in session).toBe(true);
    expect("owner" in session).toBe(false);
  });
});

// ===========================================================================
// Story 4 — "If [PET_NAME] Could Talk" draft → session bridge
// ===========================================================================
//
// The celebration twin of Story 2. It REUSES Story 2's `Owner` group and shares
// the letter memories PLUS Story 1's `favoriteActivity`, so EIGHT fields are
// required: pet name, owner names, species, photo, quirks, favoriteRitual,
// favoriteSpots, favoriteActivity. Its toggles differ — the headline
// `livingOrMemorial` switch (default "living"), no `newPet`. The surfaces mirror
// Story 2:
//   1. missingRequiredFieldsStory4 — the Story-4 Generate gate (whitespace-only
//      counts as missing because present() trims).
//   2. draftToSessionStory4 — assembly that fills skipped optionals with the
//      Story-4 defaults (incl. livingOrMemorial: "living"), trims free-text, drops
//      the optional nickname/date fields when blank, throws when a required field
//      is absent.
//   3. The dispatchers (isStory4Draft / missingRequiredFieldsForDraft /
//      draftToSessionForDraft) — which previously THREW "not wired yet (PR 22)" for
//      a Story-4 draft and now route to the Story-4 functions.

/** A Story-4 draft with all eight required fields present (and nothing else). */
function minimalCompleteStory4Draft(): Story4Draft {
  const draft = newDraft("story-4");
  draft.pet.name = "Biscuit";
  draft.pet.photo = "uploads/sess/biscuit.jpg";
  // species is pre-seeded "dog" by newDraft("story-4").
  draft.owner.names = "Sarah";
  draft.memories.quirks = "the way I lose my mind when you pick up the leash";
  draft.memories.favoriteRitual = "our walk before coffee, every single morning";
  draft.memories.favoriteSpots = "the spot by the back door where the sun lands";
  draft.memories.favoriteActivity = "stealing one sock and running a victory lap";
  return draft;
}

/** A Story-4 draft with every input group fully populated. */
function fullStory4Draft(): Story4Draft {
  return {
    id: "story4-draft-id-789",
    createdAt: "2026-06-12T09:00:00.000Z",
    status: "draft",
    storyType: "story-4",
    pet: {
      name: "Biscuit",
      species: "cat",
      breedColor: "tuxedo cat with the lopsided whiskers",
      pronoun: "she",
      illustrationStyle: "pencil",
      photo: "uploads/sess/biscuit.jpg",
    },
    owner: { names: "Sarah and David", relationship: "couple" },
    memories: {
      quirks: "the way I lose my mind when you pick up the leash",
      favoriteRitual: "our walk before coffee, every single morning",
      favoriteSpots: "the spot by the back door where the sun lands at 4pm",
      favoriteActivity: "stealing one sock and running a victory lap",
      nicknames: "Biscy, the gremlin, sir",
      dateAdopted: "March 2023",
      datePassed: "October 2025",
    },
    toggles: {
      livingOrMemorial: "memorial",
      giftFor: "friend",
      deathType: "euthanasia",
      beliefFrame: "heaven",
    },
  };
}

// ---------------------------------------------------------------------------
// missingRequiredFieldsStory4
// ---------------------------------------------------------------------------

describe("missingRequiredFieldsStory4", () => {
  it("reports all required fields except species for a fresh newDraft('story-4')", () => {
    // newDraft("story-4") pre-seeds species: "dog", so only the other seven are
    // missing — in display order.
    expect(missingRequiredFieldsStory4(newDraft("story-4"))).toEqual([
      "petName",
      "ownerNames",
      "photo",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
      "favoriteActivity",
    ]);
  });

  it("returns an empty array when all eight required fields are present", () => {
    expect(missingRequiredFieldsStory4(minimalCompleteStory4Draft())).toEqual(
      [],
    );
  });

  it("reports only petName when just the pet name is missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.pet.name;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["petName"]);
  });

  it("reports only ownerNames when just the owner names are missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.owner.names;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["ownerNames"]);
  });

  it("reports only species when just the species is missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.pet.species;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["species"]);
  });

  it("reports only photo when just the photo is missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.pet.photo;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["photo"]);
  });

  it("reports only quirks when just that field is missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.memories.quirks;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["quirks"]);
  });

  it("reports only favoriteRitual when just that field is missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.memories.favoriteRitual;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["favoriteRitual"]);
  });

  it("reports only favoriteSpots when just that field is missing", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.memories.favoriteSpots;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["favoriteSpots"]);
  });

  it("reports only favoriteActivity when just that field is missing (the Story-1 reuse)", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.memories.favoriteActivity;
    expect(missingRequiredFieldsStory4(draft)).toEqual(["favoriteActivity"]);
  });

  it("treats whitespace-only values as missing (present() trims)", () => {
    const draft = minimalCompleteStory4Draft();
    draft.pet.name = "   ";
    draft.owner.names = "\t\n";
    draft.pet.species = "  " as Story4Draft["pet"]["species"];
    draft.pet.photo = " ";
    draft.memories.quirks = "\t";
    draft.memories.favoriteRitual = " ";
    draft.memories.favoriteSpots = "\n";
    draft.memories.favoriteActivity = "  ";
    expect(missingRequiredFieldsStory4(draft)).toEqual([
      "petName",
      "ownerNames",
      "species",
      "photo",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
      "favoriteActivity",
    ]);
  });

  it("ignores the optional nickname/date fields (absent is still complete)", () => {
    const draft = minimalCompleteStory4Draft();
    expect(draft.memories.nicknames).toBeUndefined();
    expect(draft.memories.dateAdopted).toBeUndefined();
    expect(draft.memories.datePassed).toBeUndefined();
    expect(missingRequiredFieldsStory4(draft)).toEqual([]);
  });

  it("reports every required field, in display order, when all are missing", () => {
    const draft: Story4Draft = {
      id: "empty-story4",
      createdAt: "2026-06-12T00:00:00.000Z",
      status: "draft",
      storyType: "story-4",
      pet: {},
      owner: {},
      memories: {},
      toggles: {},
    };
    expect(missingRequiredFieldsStory4(draft)).toEqual([
      "petName",
      "ownerNames",
      "species",
      "photo",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
      "favoriteActivity",
    ]);
  });
});

// ---------------------------------------------------------------------------
// draftToSessionStory4 — assembly
// ---------------------------------------------------------------------------

describe("draftToSessionStory4 — required fields & lifecycle", () => {
  it("throws when required fields are missing, naming them in order", () => {
    const draft: Story4Draft = {
      id: "empty-story4",
      createdAt: "2026-06-12T00:00:00.000Z",
      status: "draft",
      storyType: "story-4",
      pet: {},
      owner: {},
      memories: {},
      toggles: {},
    };
    expect(() => draftToSessionStory4(draft)).toThrow(
      /missing_required_fields: petName, ownerNames, species, photo, quirks, favoriteRitual, favoriteSpots, favoriteActivity/,
    );
  });

  it("throws naming only the single missing field", () => {
    const draft = minimalCompleteStory4Draft();
    delete draft.owner.names;
    expect(() => draftToSessionStory4(draft)).toThrow(
      /missing_required_fields: ownerNames/,
    );
  });

  it("throws when a required free-text letter field is missing", () => {
    const noQuirks = minimalCompleteStory4Draft();
    delete noQuirks.memories.quirks;
    expect(() => draftToSessionStory4(noQuirks)).toThrow(
      /missing_required_fields: quirks/,
    );

    const noRitual = minimalCompleteStory4Draft();
    delete noRitual.memories.favoriteRitual;
    expect(() => draftToSessionStory4(noRitual)).toThrow(
      /missing_required_fields: favoriteRitual/,
    );

    const noSpots = minimalCompleteStory4Draft();
    delete noSpots.memories.favoriteSpots;
    expect(() => draftToSessionStory4(noSpots)).toThrow(
      /missing_required_fields: favoriteSpots/,
    );

    const noActivity = minimalCompleteStory4Draft();
    delete noActivity.memories.favoriteActivity;
    expect(() => draftToSessionStory4(noActivity)).toThrow(
      /missing_required_fields: favoriteActivity/,
    );
  });

  it("preserves id/createdAt, sets status 'generating' and storyType 'story-4'", () => {
    const draft = fullStory4Draft();
    const session = draftToSessionStory4(draft);
    expect(session.id).toBe(draft.id);
    expect(session.createdAt).toBe(draft.createdAt);
    expect(session.status).toBe("generating");
    expect(session.storyType).toBe("story-4");
  });

  it("starts the images manifest empty", () => {
    expect(draftToSessionStory4(fullStory4Draft()).images).toEqual([]);
  });
});

describe("draftToSessionStory4 — required fields carried through (trimmed)", () => {
  it("carries pet name, photo, owner names and species verbatim", () => {
    const session = draftToSessionStory4(fullStory4Draft());
    expect(session.pet.name).toBe("Biscuit");
    expect(session.pet.photo).toBe("uploads/sess/biscuit.jpg");
    expect(session.pet.species).toBe("cat");
    expect(session.owner.names).toBe("Sarah and David");
  });

  it("trims surrounding whitespace from names, quirks, ritual, activity and spots", () => {
    const draft = minimalCompleteStory4Draft();
    draft.pet.name = "  Biscuit  ";
    draft.owner.names = "\tSarah\n";
    draft.memories.quirks = "  the leash meltdown  ";
    draft.memories.favoriteRitual = " the morning walk ";
    draft.memories.favoriteSpots = "\tthe back door\n";
    draft.memories.favoriteActivity = "  the victory lap  ";
    const session = draftToSessionStory4(draft);
    expect(session.pet.name).toBe("Biscuit");
    expect(session.owner.names).toBe("Sarah");
    expect(session.memories.quirks).toBe("the leash meltdown");
    expect(session.memories.favoriteRitual).toBe("the morning walk");
    expect(session.memories.favoriteSpots).toBe("the back door");
    expect(session.memories.favoriteActivity).toBe("the victory lap");
  });

  it("carries the photo reference without trimming it", () => {
    const draft = minimalCompleteStory4Draft();
    draft.pet.photo = "uploads/sess/biscuit.jpg";
    expect(draftToSessionStory4(draft).pet.photo).toBe(
      "uploads/sess/biscuit.jpg",
    );
  });

  it("carries explicitly chosen optional enum/toggle fields through", () => {
    const session = draftToSessionStory4(fullStory4Draft());
    expect(session.pet.pronoun).toBe("she");
    expect(session.pet.illustrationStyle).toBe("pencil");
    expect(session.owner.relationship).toBe("couple");
    expect(session.toggles.livingOrMemorial).toBe("memorial");
    expect(session.toggles.giftFor).toBe("friend");
    expect(session.toggles.deathType).toBe("euthanasia");
    expect(session.toggles.beliefFrame).toBe("heaven");
  });
});

describe("draftToSessionStory4 — skipped optionals get defaults", () => {
  it("fills skipped pet enums and toggles with their documented Story-4 defaults", () => {
    // A minimal complete draft leaves pronoun, relationship, giftFor and deathType
    // skipped; also strip illustrationStyle / livingOrMemorial / beliefFrame (which
    // newDraft("story-4") pre-seeds) to observe the assembler's own ?? defaults.
    const draft = minimalCompleteStory4Draft();
    delete draft.pet.illustrationStyle;
    delete draft.toggles.livingOrMemorial;
    delete draft.toggles.beliefFrame;

    const session = draftToSessionStory4(draft);

    expect(session.pet.species).toBe("dog");
    expect(session.pet.pronoun).toBe("he");
    expect(session.pet.illustrationStyle).toBe("watercolor");
    expect(session.owner.relationship).toBe("single");
    // The headline tense toggle defaults to the celebration (living) path.
    expect(session.toggles.livingOrMemorial).toBe("living");
    expect(session.toggles.giftFor).toBe("self");
    expect(session.toggles.deathType).toBe("peaceful");
    expect(session.toggles.beliefFrame).toBe("rainbow-bridge");
  });

  it("keeps newDraft()'s livingOrMemorial/beliefFrame defaults when not overridden", () => {
    // newDraft("story-4") pre-seeds these two; a minimal complete draft should
    // surface them unchanged (living, not memorial).
    const session = draftToSessionStory4(minimalCompleteStory4Draft());
    expect(session.toggles.livingOrMemorial).toBe("living");
    expect(session.toggles.beliefFrame).toBe("rainbow-bridge");
  });

  it("does NOT carry a newPet toggle (Story 4 has no such field)", () => {
    const session = draftToSessionStory4(fullStory4Draft());
    expect("newPet" in session.toggles).toBe(false);
  });

  it("fills breedColor with an empty string when the optional description is skipped", () => {
    // breedColor is NOT required for Story 4 (the Premium cover uses the photo), so
    // a skipped one assembles to "" rather than throwing.
    const draft = minimalCompleteStory4Draft();
    expect(draft.pet.breedColor).toBeUndefined();
    expect(draftToSessionStory4(draft).pet.breedColor).toBe("");
  });

  it("trims breedColor when it is provided", () => {
    const draft = minimalCompleteStory4Draft();
    draft.pet.breedColor = "  scruffy mutt  ";
    expect(draftToSessionStory4(draft).pet.breedColor).toBe("scruffy mutt");
  });
});

describe("draftToSessionStory4 — optional nickname/date fields dropped when blank", () => {
  it("carries trimmed nickname/date fields when provided", () => {
    const draft = minimalCompleteStory4Draft();
    draft.memories.nicknames = "  Biscy  ";
    draft.memories.dateAdopted = " March 2023 ";
    draft.memories.datePassed = "\tOctober 2025\n";
    const session = draftToSessionStory4(draft);
    expect(session.memories.nicknames).toBe("Biscy");
    expect(session.memories.dateAdopted).toBe("March 2023");
    expect(session.memories.datePassed).toBe("October 2025");
  });

  it("omits the keys entirely when the optional fields are absent", () => {
    const session = draftToSessionStory4(minimalCompleteStory4Draft());
    expect("nicknames" in session.memories).toBe(false);
    expect("dateAdopted" in session.memories).toBe(false);
    expect("datePassed" in session.memories).toBe(false);
    expect(session.memories.nicknames).toBeUndefined();
    expect(session.memories.dateAdopted).toBeUndefined();
    expect(session.memories.datePassed).toBeUndefined();
  });

  it("omits the keys when the optional fields are empty or whitespace-only (never '')", () => {
    const draft = minimalCompleteStory4Draft();
    draft.memories.nicknames = "";
    draft.memories.dateAdopted = "   ";
    draft.memories.datePassed = "\t";
    const session = draftToSessionStory4(draft);
    expect("nicknames" in session.memories).toBe(false);
    expect("dateAdopted" in session.memories).toBe(false);
    expect("datePassed" in session.memories).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Story-4 round-trip — a complete draft resolves with no MergeError
// ---------------------------------------------------------------------------
//
// The headline correctness check for the bridge: a session assembled from a
// complete Story-4 draft must resolve through the merge layer cleanly — on BOTH
// tense paths. resolveStory4 throws a MergeError if any live merge placeholder is
// empty, so a clean resolve proves the assembler filled every required free-text
// field and every enum/toggle default the merge text references.

describe("draftToSessionStory4 — round-trip through resolveStory4", () => {
  it("a complete living draft assembles into a session that resolves (no MergeError)", () => {
    const draft = minimalCompleteStory4Draft();
    draft.toggles.livingOrMemorial = "living";
    const session = draftToSessionStory4(draft);
    expect(session.toggles.livingOrMemorial).toBe("living");
    const story = resolveStory4(session);
    // 6-page letter (cover + 5 pages); each page free of surviving placeholders.
    expect(story.length).toBeGreaterThan(0);
    for (const page of story) {
      for (const line of page.body) {
        expect(line).not.toMatch(/[{[][A-Z_]+[}\]]/);
      }
    }
  });

  it("a complete memorial draft assembles into a session that resolves (no MergeError)", () => {
    // The memorial path consults death-type + belief-frame, which the assembler
    // always defaults — so a draft that only flips the tense still resolves.
    const draft = minimalCompleteStory4Draft();
    draft.toggles.livingOrMemorial = "memorial";
    const session = draftToSessionStory4(draft);
    expect(session.toggles.livingOrMemorial).toBe("memorial");
    expect(() => resolveStory4(session)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Story-type dispatchers — Story 4
// ---------------------------------------------------------------------------

describe("isStory4Draft", () => {
  it("is true for a Story-4 draft", () => {
    expect(isStory4Draft(newDraft("story-4"))).toBe(true);
  });

  it("is false for a Story-1 draft (no storyType) and a Story-2 draft", () => {
    expect(isStory4Draft(newDraft())).toBe(false);
    expect(isStory4Draft(newDraft("story-2"))).toBe(false);
  });
});

describe("isStory1Draft", () => {
  it("is true for a Story-1 draft (no storyType) and one tagged 'story-1'", () => {
    expect(isStory1Draft(newDraft())).toBe(true);
    const tagged = newDraft();
    tagged.storyType = "story-1";
    expect(isStory1Draft(tagged)).toBe(true);
  });

  it("is false for a Story-2 or Story-4 draft (so a letter draft narrows to neither)", () => {
    expect(isStory1Draft(newDraft("story-2"))).toBe(false);
    expect(isStory1Draft(newDraft("story-4"))).toBe(false);
  });
});

describe("missingRequiredFieldsForDraft — routes a Story-4 draft", () => {
  it("routes a Story-4 draft to the Story-4 gate (reports favoriteActivity)", () => {
    // favoriteActivity is unique to the Story-4 required set among the letter
    // products — reporting it proves the dispatch hit Story 4, not Story 2.
    const draft = minimalCompleteStory4Draft();
    delete draft.memories.favoriteActivity;
    expect(missingRequiredFieldsForDraft(draft)).toEqual(["favoriteActivity"]);
  });

  it("no longer throws 'not wired yet' for a Story-4 draft (PR 22 wired it)", () => {
    expect(() =>
      missingRequiredFieldsForDraft(minimalCompleteStory4Draft()),
    ).not.toThrow();
    expect(missingRequiredFieldsForDraft(minimalCompleteStory4Draft())).toEqual(
      [],
    );
  });
});

describe("draftToSessionForDraft — routes a Story-4 draft", () => {
  it("routes a Story-4 draft to draftToSessionStory4 (storyType 'story-4')", () => {
    const session = draftToSessionForDraft(fullStory4Draft());
    expect(session.storyType).toBe("story-4");
    expect("owner" in session).toBe(true);
    expect("child" in session).toBe(false);
  });

  it("no longer throws 'not wired yet' for a Story-4 draft (PR 22 wired it)", () => {
    // Before PR 22 the dispatcher threw for a Story-4 draft; now it must produce a
    // valid Story4Session that carries the living/memorial toggle.
    const draft = minimalCompleteStory4Draft();
    expect(() => draftToSessionForDraft(draft)).not.toThrow();
    const session = draftToSessionForDraft(draft);
    expect(session.storyType).toBe("story-4");
    expect(
      (session as { toggles: { livingOrMemorial: string } }).toggles
        .livingOrMemorial,
    ).toBe("living");
  });
});
