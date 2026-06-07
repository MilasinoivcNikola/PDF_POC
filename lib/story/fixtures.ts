// Shared test fixtures for the story merge/variants suites. A single base
// "Otis" StorySession (the prototype example from prototypes/preview.html) plus
// a small deep-merge override helper keeps the test data DRY: every test starts
// from a complete, valid session and patches only the field(s) under test.
//
// This file is imported only by *.test.ts files; it carries no production code.

import type { StorySession } from "@/lib/session/types";

/**
 * The canonical complete Otis session, matching the resolved copy shown in
 * prototypes/preview.html: a dog, "he", natural death, rainbow-bridge, age 6-8,
 * no other pets. Every required field is present and non-empty.
 */
export function otisSession(): StorySession {
  return {
    id: "test-otis",
    createdAt: "2026-06-07T00:00:00.000Z",
    status: "ready",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor:
        "sweet rescue mutt, possibly part beagle, with floppy ears and the softest brown eyes",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/otis-by-the-window.jpg",
    },
    child: {
      name: "Emma",
      ageBracket: "6-8",
    },
    memories: {
      favoriteActivity: "chasing tennis balls in the backyard",
      sleepingSpot: "at the foot of your bed",
      favoriteMemory:
        "The day Otis followed her to the lake, and they both came home soaking wet, laughing the whole way.",
    },
    toggles: {
      deathType: "natural",
      beliefFrame: "rainbow-bridge",
      otherPetsInHome: "no",
    },
    images: [],
  };
}

/** A shallow-per-group override patch over the base Otis session. */
export interface SessionOverrides {
  pet?: Partial<StorySession["pet"]>;
  child?: Partial<StorySession["child"]>;
  memories?: Partial<StorySession["memories"]>;
  toggles?: Partial<StorySession["toggles"]>;
}

/**
 * Build a complete Otis session with the given group-level field overrides.
 * Only the named fields within each group are replaced; everything else falls
 * back to the base fixture, so a test can express e.g. `{ pet: { pronoun: "she" } }`.
 */
export function sessionWith(overrides: SessionOverrides = {}): StorySession {
  const base = otisSession();
  return {
    ...base,
    pet: { ...base.pet, ...overrides.pet },
    child: { ...base.child, ...overrides.child },
    memories: { ...base.memories, ...overrides.memories },
    toggles: { ...base.toggles, ...overrides.toggles },
  };
}

// ---------------------------------------------------------------------------
// Helpers shared across both test files
// ---------------------------------------------------------------------------

import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";

/** Every resolved string a page emits: title + subtitle + body + brief. */
export function pageStrings(page: ResolvedPage): string[] {
  return [
    ...(page.title !== undefined ? [page.title] : []),
    ...(page.subtitle !== undefined ? [page.subtitle] : []),
    ...page.body,
    page.illustrationBrief,
  ];
}

/** Every resolved string across the whole story, flattened. */
export function allStrings(story: ResolvedStory): string[] {
  return story.flatMap(pageStrings);
}

/** Find a resolved page by its stable id. */
export function pageById(story: ResolvedStory, id: ResolvedPage["id"]): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved story`);
  }
  return page;
}
