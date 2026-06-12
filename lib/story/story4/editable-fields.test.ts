import { describe, it, expect } from "vitest";

import { biscuitSession } from "@/lib/story/story4/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story4/editable-fields";

// The Story-4 "edit your own words" contract — the sibling of
// lib/story/story2/editable-fields.test.ts, over a `Story4Session`. Pure module,
// no IO: the page→field map, per-story allowlist, required-blank set, the
// write-back into the right nested group (with clean()), and the round-trip.
// Story 4 has the five Story-2 fields PLUS the reused Story-1 `favoriteActivity`.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story4 editable-fields — page → field map", () => {
  it("exposes the names on the cover only", () => {
    expect(editableFieldsForPage("talk-cover")).toEqual(["petName", "ownerNames"]);
  });

  it("maps quirks + favoriteRitual to page 3, favoriteActivity + favoriteSpots to page 4", () => {
    expect(editableFieldsForPage("talk-page-3")).toEqual([
      "quirks",
      "favoriteRitual",
    ]);
    expect(editableFieldsForPage("talk-page-4")).toEqual([
      "favoriteActivity",
      "favoriteSpots",
    ]);
  });

  it("exposes NO editor on the prose-only letter pages (2, 5, 6)", () => {
    for (const id of ["talk-page-2", "talk-page-5", "talk-page-6"] as const) {
      expect(editableFieldsForPage(id)).toEqual([]);
    }
  });

  it("returns [] for an unmapped page (e.g. a Story-1/2 page id)", () => {
    expect(editableFieldsForPage("cover")).toEqual([]);
    expect(editableFieldsForPage("letter-cover")).toEqual([]);
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

describe("story4 editable-fields — isEditableField", () => {
  it("accepts the six Story-4 editable fields", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
    expect(EDITABLE_FIELDS).toEqual([
      "petName",
      "ownerNames",
      "quirks",
      "favoriteRitual",
      "favoriteActivity",
      "favoriteSpots",
    ]);
  });

  it("rejects Story-1-only fields, enum/toggle answers, and unknown keys", () => {
    for (const key of [
      "childName",
      "breedColor",
      "sleepingSpot",
      "favoriteMemory",
      "parentDedication",
      "species",
      "relationship",
      "livingOrMemorial", // the headline toggle is NOT editable
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
// Required-field detection — all six are required on Story 4
// ---------------------------------------------------------------------------

describe("story4 editable-fields — required fields", () => {
  it("treats all six editable fields as required (no optional editable field)", () => {
    expect([...REQUIRED_EDITABLE_FIELDS].sort()).toEqual(
      [
        "favoriteActivity",
        "favoriteRitual",
        "favoriteSpots",
        "ownerNames",
        "petName",
        "quirks",
      ].sort(),
    );
    for (const field of EDITABLE_FIELDS) {
      expect(isRequiredField(field)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// setSessionField — pure write-back into the right nested group + clean()
// ---------------------------------------------------------------------------

describe("story4 editable-fields — setSessionField", () => {
  it("writes petName into pet, ownerNames into owner", () => {
    const base = biscuitSession();
    expect(setSessionField(base, "petName", "Otis").pet.name).toBe("Otis");
    expect(setSessionField(base, "ownerNames", "Sam and Lee").owner.names).toBe(
      "Sam and Lee",
    );
  });

  it("writes quirks / favoriteRitual / favoriteActivity / favoriteSpots into memories", () => {
    const base = biscuitSession();
    expect(setSessionField(base, "quirks", "the head tilt").memories.quirks).toBe(
      "the head tilt",
    );
    expect(
      setSessionField(base, "favoriteRitual", "the morning walk").memories.favoriteRitual,
    ).toBe("the morning walk");
    expect(
      setSessionField(base, "favoriteActivity", "the zoomies").memories.favoriteActivity,
    ).toBe("the zoomies");
    expect(
      setSessionField(base, "favoriteSpots", "the sunlit corner").memories.favoriteSpots,
    ).toBe("the sunlit corner");
  });

  it("applies clean(): trims, collapses whitespace, strips braces", () => {
    const out = setSessionField(biscuitSession(), "quirks", "  the  {head}  tilt  ");
    expect(out.memories.quirks).toBe("the head tilt");
  });

  it("does not mutate the input session (returns a new object + group)", () => {
    const base = biscuitSession();
    const out = setSessionField(base, "ownerNames", "Lee");
    expect(base.owner.names).toBe("Sarah");
    expect(out).not.toBe(base);
    expect(out.owner).not.toBe(base.owner);
  });

  it("leaves unrelated optional fields untouched (nicknames / dates carry through)", () => {
    const out = setSessionField(biscuitSession(), "petName", "Otis");
    expect(out.memories.nicknames).toBe("Biscy, the gremlin, sir");
    expect(out.memories.dateAdopted).toBe("March 2023");
    expect(out.memories.datePassed).toBe("October 2025");
  });

  it("leaves the headline tense toggle untouched on a write", () => {
    const out = setSessionField(biscuitSession(), "quirks", "the leash meltdown");
    expect(out.toggles.livingOrMemorial).toBe("living");
  });

  it("throws on an unknown field key (the exhaustiveness guard — defense in depth)", () => {
    expect(() =>
      setSessionField(
        biscuitSession(),
        "livingOrMemorial" as unknown as Parameters<typeof setSessionField>[1],
        "memorial",
      ),
    ).toThrow(/Unknown editable field/);
  });
});

// ---------------------------------------------------------------------------
// getSessionFieldValue — round-trip for the editor pre-fill
// ---------------------------------------------------------------------------

describe("story4 editable-fields — getSessionFieldValue", () => {
  it("returns the current raw value for each field", () => {
    const s = biscuitSession();
    expect(getSessionFieldValue(s, "petName")).toBe("Biscuit");
    expect(getSessionFieldValue(s, "ownerNames")).toBe("Sarah");
    expect(getSessionFieldValue(s, "quirks")).toBe(s.memories.quirks);
    expect(getSessionFieldValue(s, "favoriteRitual")).toBe(s.memories.favoriteRitual);
    expect(getSessionFieldValue(s, "favoriteActivity")).toBe(
      s.memories.favoriteActivity,
    );
    expect(getSessionFieldValue(s, "favoriteSpots")).toBe(s.memories.favoriteSpots);
  });

  it("round-trips a written value back out", () => {
    const written = setSessionField(biscuitSession(), "favoriteActivity", "fetch");
    expect(getSessionFieldValue(written, "favoriteActivity")).toBe("fetch");
  });
});
