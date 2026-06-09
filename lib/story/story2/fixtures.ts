// Shared test fixtures for the Story-2 merge/variants suites. A single base
// "Murphy" Story2Session (the running example from the master template) plus a
// small per-group override helper keeps the test data DRY: every test starts from
// a complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/fixtures.ts (otisSession / sessionWith) for Story 1.
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story2Session } from "@/lib/session/types";

/**
 * The canonical complete Murphy session, from the master template's running
 * example: a dog, owner "Sarah" (single), peaceful death, rainbow-bridge, for
 * self, no new pet. Every required field is present and non-empty; the optional
 * nickname/date fields are present here so a test can exercise both their
 * presence (base) and their absence (override to "" / undefined).
 */
export function murphySession(): Story2Session {
  return {
    id: "test-murphy",
    createdAt: "2026-06-07T00:00:00.000Z",
    status: "ready",
    storyType: "story-2",
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
      nicknames: "Murph, Mr. Murph, the worst dog",
      dateAdopted: "March 2014",
      datePassed: "October 2025",
    },
    toggles: {
      deathType: "peaceful",
      beliefFrame: "rainbow-bridge",
      giftFor: "self",
      newPet: "no",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Murphy session. */
export interface Story2SessionOverrides {
  pet?: Partial<Story2Session["pet"]>;
  owner?: Partial<Story2Session["owner"]>;
  memories?: Partial<Story2Session["memories"]>;
  toggles?: Partial<Story2Session["toggles"]>;
}

/**
 * Build a complete Murphy session with the given group-level field overrides.
 * Only the named fields within each group are replaced; everything else falls
 * back to the base fixture, so a test can express e.g.
 * `{ toggles: { deathType: "euthanasia" } }` or `{ owner: { relationship: "couple" } }`.
 */
export function story2SessionWith(
  overrides: Story2SessionOverrides = {},
): Story2Session {
  const base = murphySession();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    owner: { ...base.owner, ...overrides.owner },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}
