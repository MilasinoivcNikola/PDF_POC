import { describe, it, expect } from "vitest";

import { murphySession } from "@/lib/story/story2/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story2/editable-fields";

// The Story-2 "edit your own words" contract — the sibling of
// lib/story/editable-fields.test.ts, but over a `Story2Session`. Pure module,
// no IO: the page→field map, per-story allowlist, required-blank set, the
// write-back into the right nested group (with clean()), and the round-trip.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story2 editable-fields — page → field map", () => {
  it("exposes the names on the cover only", () => {
    expect(editableFieldsForPage("letter-cover")).toEqual(["petName", "ownerNames"]);
  });

  it("maps quirks + favoriteRitual to page 3, favoriteSpots to page 5", () => {
    expect(editableFieldsForPage("letter-page-3")).toEqual(["quirks", "favoriteRitual"]);
    expect(editableFieldsForPage("letter-page-5")).toEqual(["favoriteSpots"]);
  });

  it("exposes NO editor on the prose-only letter pages", () => {
    for (const id of ["letter-page-2", "letter-page-4", "letter-page-6"] as const) {
      expect(editableFieldsForPage(id)).toEqual([]);
    }
  });

  it("returns [] for an unmapped page (e.g. a Story-1 page id)", () => {
    expect(editableFieldsForPage("cover")).toEqual([]);
    expect(editableFieldsForPage("back-cover")).toEqual([]);
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

describe("story2 editable-fields — isEditableField", () => {
  it("accepts the five Story-2 editable fields", () => {
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

  it("rejects Story-1-only fields, enum/toggle answers, and unknown keys", () => {
    for (const key of [
      "childName", // Story-1-only — not editable on a letter
      "breedColor",
      "favoriteActivity",
      "sleepingSpot",
      "favoriteMemory",
      "parentDedication",
      "species",
      "relationship",
      "deathType",
      "beliefFrame",
      "nicknames",
      "dateAdopted",
      "photo",
      "id",
      "",
    ]) {
      expect(isEditableField(key)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Required-field detection — all five are required on Story 2
// ---------------------------------------------------------------------------

describe("story2 editable-fields — required fields", () => {
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

describe("story2 editable-fields — setSessionField", () => {
  it("writes petName into pet, ownerNames into owner", () => {
    const base = murphySession();
    expect(setSessionField(base, "petName", "Biscuit").pet.name).toBe("Biscuit");
    expect(setSessionField(base, "ownerNames", "Sarah and David").owner.names).toBe(
      "Sarah and David",
    );
  });

  it("writes quirks / favoriteRitual / favoriteSpots into memories", () => {
    const base = murphySession();
    expect(
      setSessionField(base, "quirks", "the head tilt").memories.quirks,
    ).toBe("the head tilt");
    expect(
      setSessionField(base, "favoriteRitual", "the morning walk").memories.favoriteRitual,
    ).toBe("the morning walk");
    expect(
      setSessionField(base, "favoriteSpots", "the sunlit corner").memories.favoriteSpots,
    ).toBe("the sunlit corner");
  });

  it("applies clean(): trims, collapses whitespace, strips braces", () => {
    const out = setSessionField(murphySession(), "quirks", "  the  {head}  tilt  ");
    expect(out.memories.quirks).toBe("the head tilt");
  });

  it("does not mutate the input session (returns a new object + group)", () => {
    const base = murphySession();
    const out = setSessionField(base, "ownerNames", "David");
    expect(base.owner.names).toBe("Sarah");
    expect(out).not.toBe(base);
    expect(out.owner).not.toBe(base.owner);
  });

  it("leaves the unrelated optional fields untouched (nicknames / dates carry through)", () => {
    const out = setSessionField(murphySession(), "petName", "Biscuit");
    expect(out.memories.nicknames).toBe("Murph, Mr. Murph, the worst dog");
    expect(out.memories.dateAdopted).toBe("March 2014");
    expect(out.memories.datePassed).toBe("October 2025");
  });

  it("throws on an unknown field key (the exhaustiveness guard — defense in depth)", () => {
    // The type system prevents this in production (the route validates against
    // the allowlist first), but the runtime `default` branch must never silently
    // no-op. Cast past the compile-time guard to exercise it.
    expect(() =>
      setSessionField(
        murphySession(),
        "childName" as unknown as Parameters<typeof setSessionField>[1],
        "Noah",
      ),
    ).toThrow(/Unknown editable field/);
  });
});

// ---------------------------------------------------------------------------
// getSessionFieldValue — round-trip for the editor pre-fill
// ---------------------------------------------------------------------------

describe("story2 editable-fields — getSessionFieldValue", () => {
  it("returns the current raw value for each field", () => {
    const s = murphySession();
    expect(getSessionFieldValue(s, "petName")).toBe("Murphy");
    expect(getSessionFieldValue(s, "ownerNames")).toBe("Sarah");
    expect(getSessionFieldValue(s, "quirks")).toBe(s.memories.quirks);
    expect(getSessionFieldValue(s, "favoriteRitual")).toBe(s.memories.favoriteRitual);
    expect(getSessionFieldValue(s, "favoriteSpots")).toBe(s.memories.favoriteSpots);
  });

  it("round-trips a written value back out", () => {
    const written = setSessionField(murphySession(), "favoriteSpots", "the back step");
    expect(getSessionFieldValue(written, "favoriteSpots")).toBe("the back step");
  });
});
