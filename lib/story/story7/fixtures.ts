// Shared test fixtures for the Story-7 merge/variants suites. A single base
// "Biscuit" Story7Session (the running example from the master template) plus a
// small per-group override helper keeps the test data DRY: every test starts from
// a complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/story6/fixtures.ts (biscuitSession6 / story6SessionWith).
//
// The pet is a scruffy terrier-mix dog so the imagery agent (PR-A's imagery slice)
// can point at the canonical photo for the live Low run. Two extra fixtures cover
// the anniversary occasion and the senior-adoption / found-as-stray path.
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story7Session } from "@/lib/session/types";

/**
 * The canonical complete Biscuit session, from the master template's running
 * example: a scruffy terrier-mix dog, owner "Maria" (single), the new-arrival
 * occasion, adopted from a shelter, adult life stage. Every required field is
 * present and non-empty; the optional child/family/nickname/date fields are
 * present here so a test can exercise both their presence (base) and their absence
 * (override to "" / undefined).
 */
export function biscuitSession7(): Story7Session {
  return {
    id: "test-biscuit-7",
    createdAt: "2026-06-13T00:00:00.000Z",
    status: "ready",
    storyType: "story-7",
    pet: {
      name: "Biscuit",
      species: "dog",
      breedColor: "scruffy terrier mix with one ear that won't stay down",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/biscuit.jpg",
    },
    owner: {
      names: "Maria",
      relationship: "single",
    },
    memories: {
      favoriteActivity:
        "stealing socks and parading them around the kitchen",
      sleepingSpot: "in the crook of the couch by the window",
      quirks:
        "the head-tilt when you say 'walk'; the sigh before sleep",
      homecomingMemory:
        "He shook the whole car ride and then fell asleep on Leo's lap before we hit the driveway.",
      familyMembers: "Maria, James, and the cat Pepper",
      childName: "Leo",
      nicknames: "Biscuit-boy, the gremlin",
      dateAdopted: "March 2026",
    },
    toggles: {
      occasion: "new-arrival",
      adoptionSource: "shelter",
      lifeStage: "adult",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Biscuit session. */
export interface Story7SessionOverrides {
  pet?: Partial<Story7Session["pet"]>;
  owner?: Partial<Story7Session["owner"]>;
  memories?: Partial<Story7Session["memories"]>;
  toggles?: Partial<Story7Session["toggles"]>;
}

/**
 * Build a complete Biscuit session with the given group-level field overrides.
 * Only the named fields within each group are replaced; everything else falls
 * back to the base fixture, so a test can express e.g.
 * `{ toggles: { occasion: "gotcha-day-anniversary", yearsHome: "3" } }` or
 * `{ pet: { species: "cat" } }`.
 */
export function story7SessionWith(
  overrides: Story7SessionOverrides = {},
): Story7Session {
  const base = biscuitSession7();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    owner: { ...base.owner, ...overrides.owner },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}

/**
 * An anniversary-occasion fixture: the same Biscuit, three years home, celebrating
 * Gotcha Day. Exercises the cover/dedication/Page-7/closing/back-cover reframes and
 * the {yearsHome} plural path.
 */
export function biscuitAnniversarySession7(): Story7Session {
  return story7SessionWith({
    toggles: {
      occasion: "gotcha-day-anniversary",
      adoptionSource: "shelter",
      lifeStage: "adult",
      yearsHome: "3",
    },
  });
}

/**
 * A senior-adoption / found-as-stray fixture: an older cat who turned up as a
 * stray and stayed. Exercises the Page-2 & Page-5 senior beats, the found-as-stray
 * origin sentence + Page-4 softening, and the cat species swaps. No child name.
 */
export function pepperStraySession7(): Story7Session {
  return story7SessionWith({
    pet: {
      name: "Pepper",
      species: "cat",
      breedColor: "grey tabby with a notched ear",
      pronoun: "she",
    },
    memories: {
      childName: undefined,
      familyMembers: undefined,
      homecomingMemory: "",
      quirks: "",
    },
    toggles: {
      occasion: "new-arrival",
      adoptionSource: "found-as-stray",
      lifeStage: "senior-adoption",
    },
  });
}
