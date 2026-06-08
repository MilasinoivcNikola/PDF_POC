import { describe, it, expect } from "vitest";

import {
  missingRequiredFields,
  isDraftComplete,
  draftToSession,
} from "./draft";
import { newDraft } from "./storage";
import type { StoryDraft } from "./types";

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
