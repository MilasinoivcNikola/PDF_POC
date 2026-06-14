import { describe, it, expect } from "vitest";

import { biscuitSession9 } from "@/lib/story/story9/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story9/editable-fields";

// The Story-9 "edit your own words" contract — the narrative-layout sibling of
// lib/story/story6/editable-fields.test.ts, over a `Story9Session` ("[PET_NAME] and
// the New Baby"). Pure module, no IO: the page→field map, per-story allowlist,
// required-blank set, the write-back into the right nested group (with clean()), and
// the round-trip. Story 9 exposes SEVEN fields — the names (petName/ownerNames),
// the optional babyName, the Story-1-style breedColor, and the per-page memories
// (favoriteActivity/sleepingSpot/quirks). Only babyName is optional; the other six
// are required on the preview.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story9 editable-fields — page → field map", () => {
  it("exposes the pet name on the cover only", () => {
    expect(editableFieldsForPage("baby-cover")).toEqual(["petName"]);
  });

  it("maps the owner name + baby name to page 1 (the dedication)", () => {
    expect(editableFieldsForPage("baby-page-1")).toEqual([
      "ownerNames",
      "babyName",
    ]);
  });

  it("maps breedColor to page 2", () => {
    expect(editableFieldsForPage("baby-page-2")).toEqual(["breedColor"]);
  });

  it("maps favoriteActivity + sleepingSpot + quirks to page 3", () => {
    expect(editableFieldsForPage("baby-page-3")).toEqual([
      "favoriteActivity",
      "sleepingSpot",
      "quirks",
    ]);
  });

  it("exposes NO editor on the prose-only / back pages (4-7, back-cover)", () => {
    for (const id of [
      "baby-page-4",
      "baby-page-5",
      "baby-page-6",
      "baby-page-7",
      "baby-back-cover",
    ] as const) {
      expect(editableFieldsForPage(id)).toEqual([]);
    }
  });

  it("returns [] for an unmapped page (e.g. a Story-1/6 page id)", () => {
    expect(editableFieldsForPage("cover")).toEqual([]);
    expect(editableFieldsForPage("tribute-cover")).toEqual([]);
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

describe("story9 editable-fields — isEditableField", () => {
  it("accepts the seven Story-9 editable fields", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
    expect(EDITABLE_FIELDS).toEqual([
      "petName",
      "ownerNames",
      "babyName",
      "breedColor",
      "favoriteActivity",
      "sleepingSpot",
      "quirks",
    ]);
  });

  it("rejects other-product-only fields, the optional-omit memories, toggle answers, and unknown keys", () => {
    for (const key of [
      "childName", // Story-1/7/8-only
      "favoriteMemory", // Story-1-only
      "ageOrStage", // Story-6-only
      "babyArrival", // optional follow-up — NOT editable on the preview
      "nicknames", // optional-omit memory — NOT editable on the preview
      "species",
      "relationship",
      "babyStatus",
      "otherPetsInHome",
      "photo",
      "id",
      "",
    ]) {
      expect(isEditableField(key), `should reject "${key}"`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Required-field detection — all but babyName are required on Story 9
// ---------------------------------------------------------------------------

describe("story9 editable-fields — required fields", () => {
  it("treats all editable fields EXCEPT babyName as required", () => {
    expect([...REQUIRED_EDITABLE_FIELDS].sort()).toEqual(
      [
        "breedColor",
        "favoriteActivity",
        "ownerNames",
        "petName",
        "quirks",
        "sleepingSpot",
      ].sort(),
    );
    // babyName is the one optional editable field (degrades to "the new baby").
    expect(isRequiredField("babyName")).toBe(false);
    for (const field of EDITABLE_FIELDS) {
      if (field === "babyName") continue;
      expect(isRequiredField(field)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// setSessionField — pure write-back into the right nested group + clean()
// ---------------------------------------------------------------------------

describe("story9 editable-fields — setSessionField", () => {
  it("writes petName + breedColor into pet, ownerNames into owner, babyName to the root", () => {
    const base = biscuitSession9();
    expect(setSessionField(base, "petName", "Otis").pet.name).toBe("Otis");
    expect(
      setSessionField(base, "breedColor", "a silver tabby").pet.breedColor,
    ).toBe("a silver tabby");
    expect(setSessionField(base, "ownerNames", "the Lee family").owner.names).toBe(
      "the Lee family",
    );
    expect(setSessionField(base, "babyName", "Mia").babyName).toBe("Mia");
  });

  it("writes the memory fields into memories", () => {
    const base = biscuitSession9();
    expect(
      setSessionField(base, "favoriteActivity", "digging holes").memories
        .favoriteActivity,
    ).toBe("digging holes");
    expect(
      setSessionField(base, "sleepingSpot", "the sunny window").memories
        .sleepingSpot,
    ).toBe("the sunny window");
    expect(
      setSessionField(base, "quirks", "the head tilt").memories.quirks,
    ).toBe("the head tilt");
  });

  it("applies clean(): trims, collapses whitespace, strips braces", () => {
    const out = setSessionField(biscuitSession9(), "quirks", "  the  {head}  tilt  ");
    expect(out.memories.quirks).toBe("the head tilt");
  });

  it("clears babyName to '' when the cleaned value is empty (the one optional field)", () => {
    const out = setSessionField(biscuitSession9(), "babyName", "   ");
    expect(out.babyName).toBe("");
  });

  it("does not mutate the input session (returns a new object + group)", () => {
    const base = biscuitSession9();
    const out = setSessionField(base, "ownerNames", "Lee");
    expect(base.owner.names).toBe("Garcia");
    expect(out).not.toBe(base);
    expect(out.owner).not.toBe(base.owner);
  });

  it("leaves unrelated optional fields untouched (nicknames / babyArrival carry through)", () => {
    const out = setSessionField(biscuitSession9(), "petName", "Otis");
    expect(out.memories.nicknames).toBe("Biscuit-boy, the goblin");
    expect(out.babyArrival).toBe("this spring");
  });

  it("leaves the toggle answers untouched on a write", () => {
    const out = setSessionField(biscuitSession9(), "quirks", "the head tilt");
    expect(out.toggles.babyStatus).toBe("expecting");
    expect(out.toggles.otherPetsInHome).toBe("no");
  });

  it("throws on an unknown field key (the exhaustiveness guard — defense in depth)", () => {
    expect(() =>
      setSessionField(
        biscuitSession9(),
        "babyStatus" as unknown as Parameters<typeof setSessionField>[1],
        "arrived",
      ),
    ).toThrow(/Unknown editable field/);
  });
});

// ---------------------------------------------------------------------------
// getSessionFieldValue — round-trip for the editor pre-fill
// ---------------------------------------------------------------------------

describe("story9 editable-fields — getSessionFieldValue", () => {
  it("returns the current raw value for each field", () => {
    const s = biscuitSession9();
    expect(getSessionFieldValue(s, "petName")).toBe("Biscuit");
    expect(getSessionFieldValue(s, "breedColor")).toBe(s.pet.breedColor);
    expect(getSessionFieldValue(s, "ownerNames")).toBe("Garcia");
    expect(getSessionFieldValue(s, "babyName")).toBe("Noah");
    expect(getSessionFieldValue(s, "favoriteActivity")).toBe(
      s.memories.favoriteActivity,
    );
    expect(getSessionFieldValue(s, "sleepingSpot")).toBe(s.memories.sleepingSpot);
    expect(getSessionFieldValue(s, "quirks")).toBe(s.memories.quirks);
  });

  it("returns '' for an absent babyName", () => {
    const s = biscuitSession9();
    delete s.babyName;
    expect(getSessionFieldValue(s, "babyName")).toBe("");
  });

  it("round-trips a written value back out", () => {
    const written = setSessionField(biscuitSession9(), "favoriteActivity", "zoomies");
    expect(getSessionFieldValue(written, "favoriteActivity")).toBe("zoomies");
  });
});
