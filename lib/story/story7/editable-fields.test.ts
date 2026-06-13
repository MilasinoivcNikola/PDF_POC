import { describe, it, expect } from "vitest";

import { biscuitSession7 } from "@/lib/story/story7/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story7/editable-fields";

// The Story-7 "edit your own words" contract — the narrative-layout sibling of
// lib/story/story6/editable-fields.test.ts, over a `Story7Session` (the homecoming
// book). Pure module, no IO: the page→field map, per-story allowlist, required-blank
// set, the write-back into the right nested group (with clean()), and the
// round-trip. Story 7 exposes EIGHT fields; childName + familyMembers are the
// optional ones, the other six are required on the preview.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story7 editable-fields — page → field map", () => {
  it("exposes the pet name on the cover only", () => {
    expect(editableFieldsForPage("welcome-cover")).toEqual(["petName"]);
  });

  it("maps the owner name to the dedication", () => {
    expect(editableFieldsForPage("welcome-dedication")).toEqual(["ownerNames"]);
  });

  it("maps the homecoming memory to Page 4 (the drive home)", () => {
    expect(editableFieldsForPage("welcome-drive-home")).toEqual([
      "homecomingMemory",
    ]);
  });

  it("maps the sleeping spot to Page 5 (the first night)", () => {
    expect(editableFieldsForPage("welcome-first-night")).toEqual(["sleepingSpot"]);
  });

  it("maps quirks + childName to Page 6 (learning each other)", () => {
    expect(editableFieldsForPage("welcome-learning")).toEqual([
      "quirks",
      "childName",
    ]);
  });

  it("maps favoriteActivity + familyMembers to Page 7 (now you're ours)", () => {
    expect(editableFieldsForPage("welcome-now-ours")).toEqual([
      "favoriteActivity",
      "familyMembers",
    ]);
  });

  it("returns no editable fields for the covers / closing / before / choosing / belong", () => {
    expect(editableFieldsForPage("welcome-before")).toEqual([]);
    expect(editableFieldsForPage("welcome-choosing")).toEqual([]);
    expect(editableFieldsForPage("welcome-belong")).toEqual([]);
    expect(editableFieldsForPage("welcome-closing")).toEqual([]);
    expect(editableFieldsForPage("welcome-back-cover")).toEqual([]);
  });

  it("the page map only references known editable fields", () => {
    for (const fields of Object.values(PAGE_EDITABLE_FIELDS)) {
      for (const field of fields ?? []) {
        expect(EDITABLE_FIELDS).toContain(field);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Allowlist + required set
// ---------------------------------------------------------------------------

describe("story7 editable-fields — allowlist + required set", () => {
  it("isEditableField accepts every known field and rejects others", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
    expect(isEditableField("breedColor")).toBe(false); // not exposed
    expect(isEditableField("nicknames")).toBe(false);
    expect(isEditableField("nope")).toBe(false);
  });

  it("required = everything except the optional childName / familyMembers", () => {
    expect(isRequiredField("petName")).toBe(true);
    expect(isRequiredField("ownerNames")).toBe(true);
    expect(isRequiredField("homecomingMemory")).toBe(true);
    expect(isRequiredField("quirks")).toBe(true);
    expect(isRequiredField("favoriteActivity")).toBe(true);
    expect(isRequiredField("sleepingSpot")).toBe(true);
    expect(isRequiredField("childName")).toBe(false);
    expect(isRequiredField("familyMembers")).toBe(false);
    expect(REQUIRED_EDITABLE_FIELDS.size).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Write-back + read round-trip
// ---------------------------------------------------------------------------

describe("story7 editable-fields — setSessionField / getSessionFieldValue", () => {
  it("writes each field into the right nested group and reads it back", () => {
    const base = biscuitSession7();
    const cases: [Parameters<typeof setSessionField>[1], string][] = [
      ["petName", "Waffles"],
      ["ownerNames", "The Rodriguez family"],
      ["homecomingMemory", "She slept the whole way home."],
      ["quirks", "the slow blink at dinner time"],
      ["favoriteActivity", "chasing the laser dot up the wall"],
      ["sleepingSpot", "on the warm laundry"],
      ["childName", "Mia"],
      ["familyMembers", "Ana and the dog Rex"],
    ];
    for (const [field, value] of cases) {
      const next = setSessionField(base, field, value);
      expect(getSessionFieldValue(next, field)).toBe(value);
      // The write is immutable — the base is unchanged.
      expect(getSessionFieldValue(base, field)).not.toBe(value);
    }
  });

  it("applies clean() on write (collapses whitespace, strips braces)", () => {
    const next = setSessionField(
      biscuitSession7(),
      "favoriteActivity",
      "  stealing  {socks}  ",
    );
    expect(getSessionFieldValue(next, "favoriteActivity")).toBe("stealing socks");
  });

  it("clearing an optional field stores an empty string", () => {
    const next = setSessionField(biscuitSession7(), "childName", "   ");
    expect(getSessionFieldValue(next, "childName")).toBe("");
  });
});
