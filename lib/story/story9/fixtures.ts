// Shared test fixtures for the Story-9 merge/variants suites. A single base
// "Biscuit" Story9Session (the running example from the master template) plus a small
// per-group override helper keeps the test data DRY: every test starts from a
// complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/story6/fixtures.ts (biscuitSession6 / story6SessionWith).
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story9Session } from "@/lib/session/types";

/**
 * The canonical complete Biscuit session: a dog, the "Garcia family", expecting (no
 * baby name yet), no other pets. Every required field is present and non-empty; the
 * optional baby name / baby arrival / quirks / nickname fields are present here so a
 * test can exercise both their presence (base) and their absence (override to "" /
 * undefined). `babyName` is present but, since `babyStatus` is "expecting", the merge
 * layer still degrades it to "the new baby" — overriding the toggle to "arrived"
 * surfaces the name.
 */
export function biscuitSession9(): Story9Session {
  return {
    id: "test-biscuit-9",
    createdAt: "2026-06-14T00:00:00.000Z",
    status: "ready",
    storyType: "story-9",
    pet: {
      name: "Biscuit",
      species: "dog",
      breedColor: "golden retriever with one floppy ear",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/biscuit.jpg",
    },
    owner: {
      names: "Garcia",
      relationship: "couple",
    },
    memories: {
      favoriteActivity: "chasing tennis balls in the backyard",
      sleepingSpot: "at the foot of the bed",
      quirks: "the way you tilt your head when the doorbell rings",
      nicknames: "Biscuit-boy, the goblin",
    },
    toggles: {
      babyStatus: "expecting",
      otherPetsInHome: "no",
    },
    babyName: "Noah",
    babyArrival: "this spring",
    images: [],
  };
}

/** A shallow-per-group override patch over the base Biscuit session. */
export interface Story9SessionOverrides {
  pet?: Partial<Story9Session["pet"]>;
  owner?: Partial<Story9Session["owner"]>;
  memories?: Partial<Story9Session["memories"]>;
  toggles?: Partial<Story9Session["toggles"]>;
  babyName?: string;
  babyArrival?: string;
}

/**
 * Build a complete Biscuit session with the given group-level field overrides. Only
 * the named fields within each group are replaced; everything else falls back to the
 * base fixture, so a test can express e.g. `{ toggles: { babyStatus: "arrived" } }`
 * or `{ pet: { species: "cat" } }`. `babyName`/`babyArrival` live on the root and are
 * overridden directly (use `""` to test the blank/degrade path).
 */
export function story9SessionWith(
  overrides: Story9SessionOverrides = {},
): Story9Session {
  const base = biscuitSession9();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    owner: { ...base.owner, ...overrides.owner },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
    babyName: "babyName" in overrides ? overrides.babyName : base.babyName,
    babyArrival:
      "babyArrival" in overrides ? overrides.babyArrival : base.babyArrival,
  };
}
