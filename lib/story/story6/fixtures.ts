// Shared test fixtures for the Story-6 merge/variants suites. A single base
// "Biscuit" Story6Session (the running example from the master template) plus a
// small per-group override helper keeps the test data DRY: every test starts from
// a complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/story5/fixtures.ts (murphySession5 / story5SessionWith) for Story 5.
//
// The pet is a Jack-Russell-style senior dog so the imagery agent (PR 25's imagery
// slice) can point at the canonical Jack Russell photo for the live Low run.
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story6Session } from "@/lib/session/types";

/**
 * The canonical complete Biscuit session, from the master template's running
 * example: a senior dog, owner "Sarah" (single), still-here frame, no other pets.
 * Every required field is present and non-empty; the optional owner-message /
 * still-loves / quirks / nickname / date fields are present here so a test can
 * exercise both their presence (base) and their absence (override to "" /
 * undefined).
 */
export function biscuitSession6(): Story6Session {
  return {
    id: "test-biscuit-6",
    createdAt: "2026-06-12T00:00:00.000Z",
    status: "ready",
    storyType: "story-6",
    pet: {
      name: "Biscuit",
      species: "dog",
      breedColor: "Jack Russell gone soft and silver at the muzzle",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/biscuit.jpg",
    },
    owner: {
      names: "Sarah",
      relationship: "single",
    },
    memories: {
      ageOrStage: "13 years young",
      quirks: "the way you sigh like a person when you lie down",
      stillLoves: "still waits at the window every afternoon at four",
      favoriteActivity: "the slow morning walk we still take, just shorter now",
      favoriteRitual: "the cup of coffee I drink with my hand on your back",
      sleepingSpot: "the warm square of sun by the back door",
      favoriteSpots: "the back step at four o'clock, where the light is",
      ownerMessage: "Thank you for every ordinary afternoon.",
      nicknames: "Bis, the old man",
      dateAdopted: "Spring 2013",
    },
    toggles: {
      transitionFrame: "still-here",
      otherPetsInHome: "no",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Biscuit session. */
export interface Story6SessionOverrides {
  pet?: Partial<Story6Session["pet"]>;
  owner?: Partial<Story6Session["owner"]>;
  memories?: Partial<Story6Session["memories"]>;
  toggles?: Partial<Story6Session["toggles"]>;
}

/**
 * Build a complete Biscuit session with the given group-level field overrides.
 * Only the named fields within each group are replaced; everything else falls
 * back to the base fixture, so a test can express e.g.
 * `{ toggles: { transitionFrame: "road-ahead" } }` or
 * `{ pet: { species: "cat" } }`.
 */
export function story6SessionWith(
  overrides: Story6SessionOverrides = {},
): Story6Session {
  const base = biscuitSession6();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    owner: { ...base.owner, ...overrides.owner },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}
