// Shared test fixtures for the Story-4 merge/variants suites. A single base
// "Biscuit" Story4Session (the running example from the master template) plus a
// small per-group override helper keeps the test data DRY: every test starts from
// a complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/story2/fixtures.ts (murphySession / story2SessionWith).
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story4Session } from "@/lib/session/types";

/**
 * The canonical complete Biscuit session, from the master template's running
 * example: a dog, owner "Sarah" (single), the default LIVING path, for self.
 * Every required field is present and non-empty; the optional nickname/date
 * fields are present here so a test can exercise both their presence (base) and
 * their absence (override to "" / undefined). The death-type/belief-frame toggles
 * carry their defaults (dormant in the living path; consulted only when a test
 * flips `livingOrMemorial` to "memorial").
 */
export function biscuitSession(): Story4Session {
  return {
    id: "test-biscuit",
    createdAt: "2026-06-12T00:00:00.000Z",
    status: "ready",
    storyType: "story-4",
    pet: {
      name: "Biscuit",
      species: "dog",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/biscuit.jpg",
    },
    owner: {
      names: "Sarah",
      relationship: "single",
    },
    memories: {
      quirks: "the way I lose my mind when you pick up the leash",
      favoriteRitual: "our walk before coffee, every single morning",
      favoriteSpots: "the spot by the back door where the sun lands at 4pm",
      favoriteActivity: "stealing one sock and running a victory lap",
      nicknames: "Biscy, the gremlin, sir",
      dateAdopted: "March 2023",
      datePassed: "October 2025",
    },
    toggles: {
      livingOrMemorial: "living",
      giftFor: "self",
      deathType: "peaceful",
      beliefFrame: "rainbow-bridge",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Biscuit session. */
export interface Story4SessionOverrides {
  pet?: Partial<Story4Session["pet"]>;
  owner?: Partial<Story4Session["owner"]>;
  memories?: Partial<Story4Session["memories"]>;
  toggles?: Partial<Story4Session["toggles"]>;
}

/**
 * Build a complete Biscuit session with the given group-level field overrides.
 * Only the named fields within each group are replaced; everything else falls
 * back to the base fixture, so a test can express e.g.
 * `{ toggles: { livingOrMemorial: "memorial", deathType: "euthanasia" } }` or
 * `{ owner: { relationship: "couple" } }`.
 */
export function story4SessionWith(
  overrides: Story4SessionOverrides = {},
): Story4Session {
  const base = biscuitSession();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    owner: { ...base.owner, ...overrides.owner },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}
