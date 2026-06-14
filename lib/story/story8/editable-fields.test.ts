import { describe, it, expect } from "vitest";

import { biscuitSession8 } from "@/lib/story/story8/fixtures";
import {
  EDITABLE_FIELDS,
  PAGE_EDITABLE_FIELDS,
  REQUIRED_EDITABLE_FIELDS,
  editableFieldsForPage,
  getSessionFieldValue,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/story8/editable-fields";

// The Story-8 "edit your own words" contract — the narrative-layout sibling of
// lib/story/story7/editable-fields.test.ts, over a `Story8Session` (the adventure
// book). Pure module, no IO: the page→field map, per-story allowlist, required-blank
// set, the write-back into the right nested group (with clean()), and the
// round-trip. Story 8 exposes SIX fields; childName + sidekickName are the optional
// ones, the other four are required on the preview.

// ---------------------------------------------------------------------------
// Page → field map
// ---------------------------------------------------------------------------

describe("story8 editable-fields — page → field map", () => {
  it("exposes the pet name on the cover only", () => {
    expect(editableFieldsForPage("adventure-cover")).toEqual(["petName"]);
  });

  it("maps superpower + favoriteActivity + quirks to Page 2 (what made them special)", () => {
    expect(editableFieldsForPage("adventure-special")).toEqual([
      "superpower",
      "favoriteActivity",
      "quirks",
    ]);
  });

  it("maps the child name to Page 3 (the call)", () => {
    expect(editableFieldsForPage("adventure-call")).toEqual(["childName"]);
  });

  it("maps the sidekick name to Page 5 (the expedition)", () => {
    expect(editableFieldsForPage("adventure-deeper")).toEqual(["sidekickName"]);
  });

  it("returns no editable fields for the other pages", () => {
    expect(editableFieldsForPage("adventure-ordinary")).toEqual([]);
    expect(editableFieldsForPage("adventure-clue")).toEqual([]);
    expect(editableFieldsForPage("adventure-wobble")).toEqual([]);
    expect(editableFieldsForPage("adventure-climax")).toEqual([]);
    expect(editableFieldsForPage("adventure-closing")).toEqual([]);
    expect(editableFieldsForPage("adventure-back-cover")).toEqual([]);
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

describe("story8 editable-fields — allowlist + required set", () => {
  it("isEditableField accepts every known field and rejects others", () => {
    for (const field of EDITABLE_FIELDS) {
      expect(isEditableField(field)).toBe(true);
    }
    expect(isEditableField("breedColor")).toBe(false); // not exposed
    expect(isEditableField("nicknames")).toBe(false);
    expect(isEditableField("nope")).toBe(false);
  });

  it("required = everything except the optional childName / sidekickName", () => {
    expect(isRequiredField("petName")).toBe(true);
    expect(isRequiredField("superpower")).toBe(true);
    expect(isRequiredField("favoriteActivity")).toBe(true);
    expect(isRequiredField("quirks")).toBe(true);
    expect(isRequiredField("childName")).toBe(false);
    expect(isRequiredField("sidekickName")).toBe(false);
    expect(REQUIRED_EDITABLE_FIELDS.size).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Write-back + read round-trip
// ---------------------------------------------------------------------------

describe("story8 editable-fields — setSessionField / getSessionFieldValue", () => {
  it("writes each field into the right nested group and reads it back", () => {
    const base = biscuitSession8();
    const cases: [Parameters<typeof setSessionField>[1], string][] = [
      ["petName", "Waffles"],
      ["childName", "Mia"],
      ["superpower", "the Mightiest Wag"],
      ["favoriteActivity", "chasing the laser dot up the wall"],
      ["quirks", "howls at the doorbell"],
      ["sidekickName", "Rex"],
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
      biscuitSession8(),
      "favoriteActivity",
      "  digging  {giant}  holes  ",
    );
    expect(getSessionFieldValue(next, "favoriteActivity")).toBe(
      "digging giant holes",
    );
  });

  it("clearing an optional field stores an empty string", () => {
    const next = setSessionField(biscuitSession8(), "sidekickName", "   ");
    expect(getSessionFieldValue(next, "sidekickName")).toBe("");
  });
});
