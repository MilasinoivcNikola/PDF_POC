import { describe, it, expect } from "vitest";

import { otisSession } from "@/lib/story/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isBlankAfterClean,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/editable-fields";

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("editable-fields — page → field map", () => {
  it("exposes names + dedication on the cover/dedication spread only", () => {
    expect(editableFieldsForPage("cover")).toEqual(["petName", "childName"]);
    expect(editableFieldsForPage("page-1")).toEqual(["parentDedication"]);
  });

  it("maps each memory/description field to its page", () => {
    expect(editableFieldsForPage("page-2")).toEqual(["breedColor"]);
    expect(editableFieldsForPage("page-4")).toEqual(["favoriteActivity"]);
    expect(editableFieldsForPage("page-5")).toEqual(["sleepingSpot"]);
    expect(editableFieldsForPage("page-6")).toEqual(["favoriteMemory"]);
  });

  it("exposes NO editor on template-only / name-only pages and the back cover", () => {
    for (const id of [
      "page-3",
      "page-7",
      "page-8",
      "page-9",
      "page-10",
      "page-11",
      "page-12",
      "back-cover",
    ] as const) {
      expect(editableFieldsForPage(id)).toEqual([]);
    }
  });

  it("every mapped field is a known editable field, with no duplicates", () => {
    const mapped = Object.values(PAGE_EDITABLE_FIELDS).flat();
    for (const field of mapped) {
      expect(EDITABLE_FIELDS).toContain(field);
    }
    expect(new Set(mapped).size).toBe(mapped.length);
    // The map covers every editable field exactly once.
    expect(new Set(mapped)).toEqual(new Set(EDITABLE_FIELDS));
  });
});

// ---------------------------------------------------------------------------
// Field-key validation
// ---------------------------------------------------------------------------

describe("editable-fields — isEditableField", () => {
  it("accepts the known fields", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
  });

  it("rejects unknown / out-of-scope keys", () => {
    for (const key of ["species", "pronoun", "ageBracket", "deathType", "photo", "id", ""]) {
      expect(isEditableField(key)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Required-field / blank detection
// ---------------------------------------------------------------------------

describe("editable-fields — required-field + blank detection", () => {
  it("treats the six story-backing fields as required, parentDedication as optional", () => {
    expect([...REQUIRED_EDITABLE_FIELDS].sort()).toEqual(
      ["breedColor", "childName", "favoriteActivity", "favoriteMemory", "petName", "sleepingSpot"].sort(),
    );
    expect(isRequiredField("parentDedication")).toBe(false);
    expect(isRequiredField("petName")).toBe(true);
  });

  it("isBlankAfterClean applies merge's clean() (whitespace + braces collapse)", () => {
    expect(isBlankAfterClean("")).toBe(true);
    expect(isBlankAfterClean("   ")).toBe(true);
    expect(isBlankAfterClean("{}")).toBe(true);
    expect(isBlankAfterClean(" {  } ")).toBe(true);
    expect(isBlankAfterClean("Otis")).toBe(false);
    expect(isBlankAfterClean("  a  ")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setSessionField — pure write-back into the right nested group + clean()
// ---------------------------------------------------------------------------

describe("editable-fields — setSessionField", () => {
  it("writes petName / breedColor into pet", () => {
    const base = otisSession();
    const a = setSessionField(base, "petName", "Biscuit");
    expect(a.pet.name).toBe("Biscuit");
    const b = setSessionField(base, "breedColor", "a black tabby");
    expect(b.pet.breedColor).toBe("a black tabby");
  });

  it("writes childName into child", () => {
    const out = setSessionField(otisSession(), "childName", "Noah");
    expect(out.child.name).toBe("Noah");
  });

  it("writes the memory fields into memories", () => {
    const base = otisSession();
    expect(setSessionField(base, "favoriteActivity", "naps").memories.favoriteActivity).toBe("naps");
    expect(setSessionField(base, "sleepingSpot", "the sofa").memories.sleepingSpot).toBe("the sofa");
    expect(setSessionField(base, "favoriteMemory", "the lake").memories.favoriteMemory).toBe("the lake");
  });

  it("applies clean(): trims, collapses whitespace, strips braces", () => {
    const out = setSessionField(otisSession(), "favoriteMemory", "  the  {best}  day  ");
    expect(out.memories.favoriteMemory).toBe("the best day");
  });

  it("does not mutate the input session (returns a new object)", () => {
    const base = otisSession();
    const out = setSessionField(base, "petName", "Biscuit");
    expect(base.pet.name).toBe("Otis");
    expect(out).not.toBe(base);
    expect(out.pet).not.toBe(base.pet);
  });

  it("clears parentDedication when cleaned-empty (stored as '')", () => {
    const withDedication = setSessionField(otisSession(), "parentDedication", "We miss you.");
    expect(withDedication.memories.parentDedication).toBe("We miss you.");
    const cleared = setSessionField(withDedication, "parentDedication", "   ");
    expect(cleared.memories.parentDedication).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getSessionFieldValue — round-trip for the editor pre-fill
// ---------------------------------------------------------------------------

describe("editable-fields — getSessionFieldValue", () => {
  it("returns the current raw value for each field", () => {
    const s = otisSession();
    expect(getSessionFieldValue(s, "petName")).toBe("Otis");
    expect(getSessionFieldValue(s, "childName")).toBe("Emma");
    expect(getSessionFieldValue(s, "breedColor")).toBe(s.pet.breedColor);
    expect(getSessionFieldValue(s, "favoriteActivity")).toBe(s.memories.favoriteActivity);
    expect(getSessionFieldValue(s, "sleepingSpot")).toBe(s.memories.sleepingSpot);
    expect(getSessionFieldValue(s, "favoriteMemory")).toBe(s.memories.favoriteMemory);
  });

  it("defaults an absent parentDedication to ''", () => {
    expect(getSessionFieldValue(otisSession(), "parentDedication")).toBe("");
    const withDedication = setSessionField(otisSession(), "parentDedication", "x");
    expect(getSessionFieldValue(withDedication, "parentDedication")).toBe("x");
  });
});
