import { describe, it, expect } from "vitest";

import { pronounObject, pronounPossessive, speciesDescriptor } from "./mappers";
import type { Pronoun, Species } from "./types";

// Pure auto-mappers for the master template's derived merge fields. The
// production checklist treats pronoun consistency as the #1 bug, so every
// pronoun/species pair is asserted explicitly rather than via a loop.

describe("pronounObject", () => {
  it("maps he -> him", () => {
    expect(pronounObject("he")).toBe("him");
  });

  it("maps she -> her", () => {
    expect(pronounObject("she")).toBe("her");
  });

  it("maps they -> them", () => {
    expect(pronounObject("they")).toBe("them");
  });

  it("covers every Pronoun member", () => {
    const all: Pronoun[] = ["he", "she", "they"];
    expect(all.map(pronounObject)).toEqual(["him", "her", "them"]);
  });
});

describe("pronounPossessive", () => {
  it("maps he -> his", () => {
    expect(pronounPossessive("he")).toBe("his");
  });

  it("maps she -> her", () => {
    expect(pronounPossessive("she")).toBe("her");
  });

  it("maps they -> their", () => {
    expect(pronounPossessive("they")).toBe("their");
  });

  it("covers every Pronoun member", () => {
    const all: Pronoun[] = ["he", "she", "they"];
    expect(all.map(pronounPossessive)).toEqual(["his", "her", "their"]);
  });
});

describe("speciesDescriptor", () => {
  it("genders a dog by pronoun: he -> boy", () => {
    expect(speciesDescriptor("dog", "he")).toBe("boy");
  });

  it("genders a dog by pronoun: she -> girl", () => {
    expect(speciesDescriptor("dog", "she")).toBe("girl");
  });

  it("falls back to the neutral noun for a dog: they -> dog", () => {
    expect(speciesDescriptor("dog", "they")).toBe("dog");
  });

  it("maps cat -> kitty", () => {
    expect(speciesDescriptor("cat", "he")).toBe("kitty");
  });

  it("maps rabbit -> bunny", () => {
    expect(speciesDescriptor("rabbit", "he")).toBe("bunny");
  });

  it("maps bird -> bird", () => {
    expect(speciesDescriptor("bird", "he")).toBe("bird");
  });

  it("maps other -> friend", () => {
    expect(speciesDescriptor("other", "he")).toBe("friend");
  });

  it("is pronoun-independent for non-dog species", () => {
    // A non-dog descriptor must not vary with pronoun — a `she` cat is still
    // a "kitty", a `they` rabbit is still a "bunny", etc.
    const nonDog: Species[] = ["cat", "rabbit", "bird", "other"];
    const pronouns: Pronoun[] = ["he", "she", "they"];
    for (const species of nonDog) {
      const [first, ...rest] = pronouns.map((p) => speciesDescriptor(species, p));
      for (const value of rest) {
        expect(value).toBe(first);
      }
    }
  });

  it("produces the master template's expected descriptors", () => {
    // The full pronoun x species matrix, pinned to the template's examples.
    expect(speciesDescriptor("dog", "he")).toBe("boy");
    expect(speciesDescriptor("dog", "she")).toBe("girl");
    expect(speciesDescriptor("dog", "they")).toBe("dog");
    expect(speciesDescriptor("cat", "she")).toBe("kitty");
    expect(speciesDescriptor("rabbit", "they")).toBe("bunny");
    expect(speciesDescriptor("bird", "she")).toBe("bird");
    expect(speciesDescriptor("other", "they")).toBe("friend");
  });
});
