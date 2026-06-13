import { describe, it, expect } from "vitest";

import { biscuitSession6 } from "@/lib/story/story6/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story6/editable-fields";

// The Story-6 "edit your own words" contract — the narrative-layout sibling of
// lib/story/story5/editable-fields.test.ts, over a `Story6Session` (the living
// tribute). Pure module, no IO: the page→field map, per-story allowlist,
// required-blank set, the write-back into the right nested group (with clean()),
// and the round-trip. Story 6 exposes NINE fields — including the Story-1-style
// breedColor + the new ageOrStage / stillLoves / ownerMessage. Only ownerMessage
// is optional (the dedication line); the other eight are required on the preview.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story6 editable-fields — page → field map", () => {
  it("exposes the pet name on the cover only", () => {
    expect(editableFieldsForPage("tribute-cover")).toEqual(["petName"]);
  });

  it("maps the owner name + message to page 1 (the dedication)", () => {
    expect(editableFieldsForPage("tribute-page-1")).toEqual([
      "ownerNames",
      "ownerMessage",
    ]);
  });

  it("maps breedColor + ageOrStage to page 2", () => {
    expect(editableFieldsForPage("tribute-page-2")).toEqual([
      "breedColor",
      "ageOrStage",
    ]);
  });

  it("maps stillLoves + favoriteActivity + favoriteRitual to page 3, quirks to page 4", () => {
    expect(editableFieldsForPage("tribute-page-3")).toEqual([
      "stillLoves",
      "favoriteActivity",
      "favoriteRitual",
    ]);
    expect(editableFieldsForPage("tribute-page-4")).toEqual(["quirks"]);
  });

  it("exposes NO editor on the prose-only / back pages (5, 6, back-cover)", () => {
    for (const id of [
      "tribute-page-5",
      "tribute-page-6",
      "tribute-back-cover",
    ] as const) {
      expect(editableFieldsForPage(id)).toEqual([]);
    }
  });

  it("returns [] for an unmapped page (e.g. a Story-1/2/4/5 page id)", () => {
    expect(editableFieldsForPage("cover")).toEqual([]);
    expect(editableFieldsForPage("letter-cover")).toEqual([]);
    expect(editableFieldsForPage("note-cover")).toEqual([]);
  });

  it("every mapped field is a known editable field, covering them all exactly once", () => {
    const mapped = Object.values(PAGE_EDITABLE_FIELDS).flat();
    for (const field of mapped) {
      expect(EDITABLE_FIELDS).toContain(field);
    }
    expect(new Set(mapped).size).toBe(mapped.length);
    expect(new Set(mapped)).toEqual(new Set(EDITABLE_FIELDS));
  });
});

// ---------------------------------------------------------------------------
// Field-key validation — the per-story allowlist
// ---------------------------------------------------------------------------

describe("story6 editable-fields — isEditableField", () => {
  it("accepts the nine Story-6 editable fields", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
    expect(EDITABLE_FIELDS).toEqual([
      "petName",
      "ownerNames",
      "ownerMessage",
      "breedColor",
      "ageOrStage",
      "stillLoves",
      "favoriteActivity",
      "favoriteRitual",
      "quirks",
    ]);
  });

  it("rejects other-product-only fields, the optional-omit memories, enum/toggle answers, and unknown keys", () => {
    for (const key of [
      "childName", // Story-1-only
      "favoriteMemory", // Story-1-only
      "sleepingSpot", // optional-omit memory — NOT editable on the preview
      "favoriteSpots", // optional-omit memory — NOT editable on the preview
      "lastGoodDay", // Story-5-only
      "whatIKeep", // Story-5-only
      "parentDedication",
      "species",
      "relationship",
      "transitionFrame",
      "otherPetsInHome",
      "deathType",
      "beliefFrame",
      "nicknames",
      "dateAdopted",
      "photo",
      "id",
      "",
    ]) {
      expect(isEditableField(key), `should reject "${key}"`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Required-field detection — all but ownerMessage are required on Story 6
// ---------------------------------------------------------------------------

describe("story6 editable-fields — required fields", () => {
  it("treats all editable fields EXCEPT ownerMessage as required", () => {
    expect([...REQUIRED_EDITABLE_FIELDS].sort()).toEqual(
      [
        "ageOrStage",
        "breedColor",
        "favoriteActivity",
        "favoriteRitual",
        "ownerNames",
        "petName",
        "quirks",
        "stillLoves",
      ].sort(),
    );
    // ownerMessage is the one optional editable field (the dedication line).
    expect(isRequiredField("ownerMessage")).toBe(false);
    for (const field of EDITABLE_FIELDS) {
      if (field === "ownerMessage") continue;
      expect(isRequiredField(field)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// setSessionField — pure write-back into the right nested group + clean()
// ---------------------------------------------------------------------------

describe("story6 editable-fields — setSessionField", () => {
  it("writes petName + breedColor into pet, ownerNames into owner", () => {
    const base = biscuitSession6();
    expect(setSessionField(base, "petName", "Otis").pet.name).toBe("Otis");
    expect(
      setSessionField(base, "breedColor", "a silver tabby").pet.breedColor,
    ).toBe("a silver tabby");
    expect(setSessionField(base, "ownerNames", "Sam and Lee").owner.names).toBe(
      "Sam and Lee",
    );
  });

  it("writes the memory fields into memories", () => {
    const base = biscuitSession6();
    expect(
      setSessionField(base, "ageOrStage", "a grand old senior").memories
        .ageOrStage,
    ).toBe("a grand old senior");
    expect(
      setSessionField(base, "stillLoves", "waits at the door").memories
        .stillLoves,
    ).toBe("waits at the door");
    expect(
      setSessionField(base, "favoriteActivity", "the slow walk").memories
        .favoriteActivity,
    ).toBe("the slow walk");
    expect(
      setSessionField(base, "favoriteRitual", "the morning coffee").memories
        .favoriteRitual,
    ).toBe("the morning coffee");
    expect(
      setSessionField(base, "quirks", "the head tilt").memories.quirks,
    ).toBe("the head tilt");
    expect(
      setSessionField(base, "ownerMessage", "Thank you.").memories.ownerMessage,
    ).toBe("Thank you.");
  });

  it("applies clean(): trims, collapses whitespace, strips braces", () => {
    const out = setSessionField(
      biscuitSession6(),
      "quirks",
      "  the  {head}  tilt  ",
    );
    expect(out.memories.quirks).toBe("the head tilt");
  });

  it("clears ownerMessage to '' when the cleaned value is empty (the one optional field)", () => {
    const out = setSessionField(biscuitSession6(), "ownerMessage", "   ");
    expect(out.memories.ownerMessage).toBe("");
  });

  it("does not mutate the input session (returns a new object + group)", () => {
    const base = biscuitSession6();
    const out = setSessionField(base, "ownerNames", "Lee");
    expect(base.owner.names).toBe("Sarah");
    expect(out).not.toBe(base);
    expect(out.owner).not.toBe(base.owner);
  });

  it("leaves unrelated optional fields untouched (nicknames / dateAdopted carry through)", () => {
    const out = setSessionField(biscuitSession6(), "petName", "Otis");
    expect(out.memories.nicknames).toBe("Bis, the old man");
    expect(out.memories.dateAdopted).toBe("Spring 2013");
    expect(out.memories.sleepingSpot).toBe(
      biscuitSession6().memories.sleepingSpot,
    );
    expect(out.memories.favoriteSpots).toBe(
      biscuitSession6().memories.favoriteSpots,
    );
  });

  it("leaves the toggle answers untouched on a write", () => {
    const out = setSessionField(biscuitSession6(), "quirks", "the head tilt");
    expect(out.toggles.transitionFrame).toBe("still-here");
    expect(out.toggles.otherPetsInHome).toBe("no");
  });

  it("throws on an unknown field key (the exhaustiveness guard — defense in depth)", () => {
    expect(() =>
      setSessionField(
        biscuitSession6(),
        "transitionFrame" as unknown as Parameters<typeof setSessionField>[1],
        "road-ahead",
      ),
    ).toThrow(/Unknown editable field/);
  });
});

// ---------------------------------------------------------------------------
// getSessionFieldValue — round-trip for the editor pre-fill
// ---------------------------------------------------------------------------

describe("story6 editable-fields — getSessionFieldValue", () => {
  it("returns the current raw value for each field", () => {
    const s = biscuitSession6();
    expect(getSessionFieldValue(s, "petName")).toBe("Biscuit");
    expect(getSessionFieldValue(s, "breedColor")).toBe(s.pet.breedColor);
    expect(getSessionFieldValue(s, "ownerNames")).toBe("Sarah");
    expect(getSessionFieldValue(s, "ownerMessage")).toBe(s.memories.ownerMessage);
    expect(getSessionFieldValue(s, "ageOrStage")).toBe(s.memories.ageOrStage);
    expect(getSessionFieldValue(s, "stillLoves")).toBe(s.memories.stillLoves);
    expect(getSessionFieldValue(s, "favoriteActivity")).toBe(
      s.memories.favoriteActivity,
    );
    expect(getSessionFieldValue(s, "favoriteRitual")).toBe(
      s.memories.favoriteRitual,
    );
    expect(getSessionFieldValue(s, "quirks")).toBe(s.memories.quirks);
  });

  it("returns '' for an absent ownerMessage", () => {
    const s = biscuitSession6();
    delete s.memories.ownerMessage;
    expect(getSessionFieldValue(s, "ownerMessage")).toBe("");
  });

  it("round-trips a written value back out", () => {
    const written = setSessionField(
      biscuitSession6(),
      "ageOrStage",
      "fourteen and counting",
    );
    expect(getSessionFieldValue(written, "ageOrStage")).toBe(
      "fourteen and counting",
    );
  });
});
