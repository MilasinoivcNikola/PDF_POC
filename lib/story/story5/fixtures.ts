// Shared test fixtures for the Story-5 merge/variants suites. A single base
// "Murphy" Story5Session (the running example from the master template) plus a
// small per-group override helper keeps the test data DRY: every test starts from
// a complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/story2/fixtures.ts (murphySession / story2SessionWith) for Story 2.
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story5Session } from "@/lib/session/types";

/**
 * The canonical complete Murphy session, from the master template's running
 * example: a dog, owner "Sarah" (single), peaceful death, rainbow-bridge. Every
 * required field is present and non-empty; the optional last-good-day / what-I-keep
 * / nickname / date fields are present here so a test can exercise both their
 * presence (base) and their absence (override to "" / undefined).
 */
export function murphySession5(): Story5Session {
  return {
    id: "test-murphy-5",
    createdAt: "2026-06-12T00:00:00.000Z",
    status: "ready",
    storyType: "story-5",
    pet: {
      name: "Murphy",
      species: "dog",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/murphy.jpg",
    },
    owner: {
      names: "Sarah",
      relationship: "single",
    },
    memories: {
      quirks: "the way you tilted your head when I said your name",
      favoriteRitual: "our walk before coffee, every morning",
      favoriteSpots: "the spot by the back door where the sun hit at 4pm",
      lastGoodDay:
        "the last good Saturday, when you stole half my toast and slept in the sun all afternoon",
      whatIKeep: "your collar on the hook, the dent you left in the couch",
      nicknames: "Murph, Mr. Murph, the worst dog",
      dateAdopted: "March 2014",
      datePassed: "October 2025",
    },
    toggles: {
      deathType: "peaceful",
      beliefFrame: "rainbow-bridge",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Murphy session. */
export interface Story5SessionOverrides {
  pet?: Partial<Story5Session["pet"]>;
  owner?: Partial<Story5Session["owner"]>;
  memories?: Partial<Story5Session["memories"]>;
  toggles?: Partial<Story5Session["toggles"]>;
}

/**
 * Build a complete Murphy session with the given group-level field overrides.
 * Only the named fields within each group are replaced; everything else falls
 * back to the base fixture, so a test can express e.g.
 * `{ toggles: { deathType: "euthanasia" } }` or `{ owner: { relationship: "couple" } }`.
 */
export function story5SessionWith(
  overrides: Story5SessionOverrides = {},
): Story5Session {
  const base = murphySession5();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    owner: { ...base.owner, ...overrides.owner },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}
