// Shared test fixtures for the Story-8 merge/variants suites. A single base
// "Biscuit" Story8Session (the running example from the master template) plus a
// small per-group override helper keeps the test data DRY: every test starts from a
// complete, valid session and patches only the field(s) under test. Mirrors
// lib/story/story7/fixtures.ts (biscuitSession7 / story7SessionWith).
//
// The pet is a scruffy terrier-mix dog so the imagery agent (PR-A's imagery slice)
// can point at the canonical photo for the live Low run. Extra fixtures cover the
// pet-solo hero count, the 3-5 age bracket, and the blank-superpower fallback chain.
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { Story8Session } from "@/lib/session/types";

/**
 * The canonical complete Biscuit session, from the master template's running
 * example: a scruffy terrier-mix dog, the Backyard Mystery theme, pet-plus, age 6-8,
 * with a REAL superpower (so the fallback chain is NOT exercised here — the
 * blank-superpower fixture below covers that). Every required field is present and
 * non-empty; the optional sidekick/nickname fields are present here so a test can
 * exercise both their presence (base) and their absence (override to "" / undefined).
 */
export function biscuitSession8(): Story8Session {
  return {
    id: "test-biscuit-8",
    createdAt: "2026-06-14T00:00:00.000Z",
    status: "ready",
    storyType: "story-8",
    pet: {
      name: "Biscuit",
      species: "dog",
      breedColor: "scruffy brown terrier with one white paw",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/biscuit.jpg",
    },
    adventure: {
      superpower: "the World's Greatest Nose",
      favoriteActivity: "digging giant holes in the garden",
      quirks: "barks at the vacuum like it's a dragon",
      sidekickName: "Leo",
      childName: "Emma",
      nicknames: "Biscey, the goblin",
    },
    toggles: {
      adventureTheme: "backyard-mystery",
      heroCount: "pet-plus",
      childAgeBracket: "6-8",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Biscuit session. */
export interface Story8SessionOverrides {
  pet?: Partial<Story8Session["pet"]>;
  adventure?: Partial<Story8Session["adventure"]>;
  toggles?: Partial<Story8Session["toggles"]>;
}

/**
 * Build a complete Biscuit session with the given group-level field overrides. Only
 * the named fields within each group are replaced; everything else falls back to the
 * base fixture, so a test can express e.g.
 * `{ toggles: { heroCount: "pet-solo" } }` or `{ pet: { species: "cat" } }`.
 */
export function story8SessionWith(
  overrides: Story8SessionOverrides = {},
): Story8Session {
  const base = biscuitSession8();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    adventure: { ...base.adventure, ...overrides.adventure },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}

/**
 * A pet-solo fixture: the lone-hero legend. The child is the reader, not a
 * character, so childName is intentionally absent (and the sidekick too) — exercises
 * the pet-solo rewrites of the call/expedition/discovery/celebration/home beats and
 * the conditional-childName-is-optional path.
 */
export function biscuitSoloSession8(): Story8Session {
  return story8SessionWith({
    adventure: {
      childName: undefined,
      sidekickName: undefined,
    },
    toggles: {
      adventureTheme: "backyard-mystery",
      heroCount: "pet-solo",
      childAgeBracket: "6-8",
    },
  });
}

/**
 * A youngest-reader fixture: pet-plus, age 3-5. Exercises the simplified one-sentence
 * climax + the gentler wobble.
 */
export function biscuitYoungSession8(): Story8Session {
  return story8SessionWith({
    toggles: {
      adventureTheme: "backyard-mystery",
      heroCount: "pet-plus",
      childAgeBracket: "3-5",
    },
  });
}

/**
 * A blank-superpower fixture: a thin order that exercises the full superpower
 * fallback chain. Superpower is blank; favoriteActivity is present, so the chain
 * derives "the very best in the world at …". Tests override favoriteActivity/quirks
 * to walk the rest of the chain.
 */
export function biscuitBlankSuperpowerSession8(): Story8Session {
  return story8SessionWith({
    adventure: {
      superpower: "",
    },
  });
}
