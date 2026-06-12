import { describe, it, expect } from "vitest";

import { murphySession5 } from "@/lib/story/story5/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story5/editable-fields";

// The Story-5 "edit your own words" contract — the sibling of
// lib/story/story4/editable-fields.test.ts, over a `Story5Session` (the owner's
// letter TO the pet). Pure module, no IO: the page→field map, per-story allowlist,
// required-blank set, the write-back into the right nested group (with clean()),
// and the round-trip. Story 5 exposes five fields — the same five as Story 2 (no
// Story-1 favoriteActivity); quirks IS editable (and treated as required on the
// preview) even though it's optional-with-fallback in the bridge.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story5 editable-fields — page → field map", () => {
  it("exposes the names on the cover only", () => {
    expect(editableFieldsForPage("note-cover")).toEqual([
      "petName",
      "ownerNames",
    ]);
  });

  it("maps quirks + favoriteRitual to page 3, favoriteSpots to page 5", () => {
    expect(editableFieldsForPage("note-page-3")).toEqual([
      "quirks",
      "favoriteRitual",
    ]);
    expect(editableFieldsForPage("note-page-5")).toEqual(["favoriteSpots"]);
  });

  it("exposes NO editor on the prose-only letter pages (2, 4, 6)", () => {
    for (const id of ["note-page-2", "note-page-4", "note-page-6"] as const) {
      expect(editableFieldsForPage(id)).toEqual([]);
    }
  });

  it("returns [] for an unmapped page (e.g. a Story-1/2/4 page id)", () => {
    expect(editableFieldsForPage("cover")).toEqual([]);
    expect(editableFieldsForPage("letter-cover")).toEqual([]);
    expect(editableFieldsForPage("talk-cover")).toEqual([]);
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

describe("story5 editable-fields — isEditableField", () => {
  it("accepts the five Story-5 editable fields", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
    expect(EDITABLE_FIELDS).toEqual([
      "petName",
      "ownerNames",
      "quirks",
      "favoriteRitual",
      "favoriteSpots",
    ]);
  });

  it("rejects Story-1/4-only fields, the new optionals, enum/toggle answers, and unknown keys", () => {
    for (const key of [
      "childName",
      "breedColor",
      "sleepingSpot",
      "favoriteMemory",
      "favoriteActivity", // Story-4-only, NOT a Story-5 field
      "lastGoodDay", // the new optional-with-fallback field — not editable
      "whatIKeep", // the new optional-with-fallback field — not editable
      "parentDedication",
      "species",
      "relationship",
      "deathType",
      "beliefFrame",
      "giftFor",
      "nicknames",
      "dateAdopted",
      "datePassed",
      "photo",
      "id",
      "",
    ]) {
      expect(isEditableField(key), `should reject "${key}"`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Required-field detection — all five are required on Story 5
// ---------------------------------------------------------------------------

describe("story5 editable-fields — required fields", () => {
  it("treats all five editable fields as required (no optional editable field)", () => {
    expect([...REQUIRED_EDITABLE_FIELDS].sort()).toEqual(
      ["favoriteRitual", "favoriteSpots", "ownerNames", "petName", "quirks"].sort(),
    );
    for (const field of EDITABLE_FIELDS) {
      expect(isRequiredField(field)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// setSessionField — pure write-back into the right nested group + clean()
// ---------------------------------------------------------------------------

describe("story5 editable-fields — setSessionField", () => {
  it("writes petName into pet, ownerNames into owner", () => {
    const base = murphySession5();
    expect(setSessionField(base, "petName", "Otis").pet.name).toBe("Otis");
    expect(setSessionField(base, "ownerNames", "Sam and Lee").owner.names).toBe(
      "Sam and Lee",
    );
  });

  it("writes quirks / favoriteRitual / favoriteSpots into memories", () => {
    const base = murphySession5();
    expect(setSessionField(base, "quirks", "the head tilt").memories.quirks).toBe(
      "the head tilt",
    );
    expect(
      setSessionField(base, "favoriteRitual", "the morning walk").memories
        .favoriteRitual,
    ).toBe("the morning walk");
    expect(
      setSessionField(base, "favoriteSpots", "the sunlit corner").memories
        .favoriteSpots,
    ).toBe("the sunlit corner");
  });

  it("applies clean(): trims, collapses whitespace, strips braces", () => {
    const out = setSessionField(murphySession5(), "quirks", "  the  {head}  tilt  ");
    expect(out.memories.quirks).toBe("the head tilt");
  });

  it("does not mutate the input session (returns a new object + group)", () => {
    const base = murphySession5();
    const out = setSessionField(base, "ownerNames", "Lee");
    expect(base.owner.names).toBe("Sarah");
    expect(out).not.toBe(base);
    expect(out.owner).not.toBe(base.owner);
  });

  it("leaves unrelated optional fields untouched (lastGoodDay / whatIKeep / dates carry through)", () => {
    const out = setSessionField(murphySession5(), "petName", "Otis");
    expect(out.memories.lastGoodDay).toBe(murphySession5().memories.lastGoodDay);
    expect(out.memories.whatIKeep).toBe(murphySession5().memories.whatIKeep);
    expect(out.memories.nicknames).toBe("Murph, Mr. Murph, the worst dog");
    expect(out.memories.dateAdopted).toBe("March 2014");
    expect(out.memories.datePassed).toBe("October 2025");
  });

  it("leaves the toggle answers untouched on a write", () => {
    const out = setSessionField(murphySession5(), "quirks", "the head tilt");
    expect(out.toggles.deathType).toBe("peaceful");
    expect(out.toggles.beliefFrame).toBe("rainbow-bridge");
  });

  it("throws on an unknown field key (the exhaustiveness guard — defense in depth)", () => {
    expect(() =>
      setSessionField(
        murphySession5(),
        "deathType" as unknown as Parameters<typeof setSessionField>[1],
        "euthanasia",
      ),
    ).toThrow(/Unknown editable field/);
  });
});

// ---------------------------------------------------------------------------
// getSessionFieldValue — round-trip for the editor pre-fill
// ---------------------------------------------------------------------------

describe("story5 editable-fields — getSessionFieldValue", () => {
  it("returns the current raw value for each field", () => {
    const s = murphySession5();
    expect(getSessionFieldValue(s, "petName")).toBe("Murphy");
    expect(getSessionFieldValue(s, "ownerNames")).toBe("Sarah");
    expect(getSessionFieldValue(s, "quirks")).toBe(s.memories.quirks);
    expect(getSessionFieldValue(s, "favoriteRitual")).toBe(
      s.memories.favoriteRitual,
    );
    expect(getSessionFieldValue(s, "favoriteSpots")).toBe(
      s.memories.favoriteSpots,
    );
  });

  it("round-trips a written value back out", () => {
    const written = setSessionField(murphySession5(), "favoriteSpots", "the porch");
    expect(getSessionFieldValue(written, "favoriteSpots")).toBe("the porch");
  });
});
