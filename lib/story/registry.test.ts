import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story1Definition } from "@/lib/story/story-1";
import { resolveStory } from "@/lib/story/variants";
import { storyPdfFilename } from "@/lib/pdf/render";
import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import type { StorySession, StoryType } from "@/lib/session/types";
import { otisSession, sessionWith } from "@/lib/story/fixtures";

// The product registry (feature 14) under test: the single lookup that routes
// render + API paths through `getStory(session.storyType ?? "story-1")` instead
// of importing the Story-1 modules directly. This is a behavior-preserving
// refactor — these tests assert the registry exposes the *existing* Story-1
// functions unchanged (resolver, illustration slots, filename) and honors the
// missing-`storyType` → Story-1 default that keeps on-disk sessions zero-migration.

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup", () => {
  it('returns the Story-1 StoryDefinition for "story-1"', () => {
    const definition = getStory("story-1");
    expect(definition).toBe(story1Definition);
    // The definition exposes the three things the pipeline needs.
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
  });

  it("exposes illustrationSlots equal to the existing SCENE_PAGE_IDS (same set and order)", () => {
    // The registry must re-expose, not redefine, the illustration plan — the AI
    // orchestration + regenerate paths gate on exactly this set.
    const slots = getStory("story-1").illustrationSlots;
    expect(slots).toEqual(SCENE_PAGE_IDS);
    expect([...slots]).toEqual([...SCENE_PAGE_IDS]);
  });

  it('returns the Story-2 StoryDefinition for "story-2"', () => {
    // Feature 15 registers the letter — `getStory("story-2")` now resolves to it
    // (it threw under feature 14, before the definition existed). The definition
    // exposes the same three things the pipeline needs.
    const definition = getStory("story-2");
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
  });

  it("throws for an unknown storyType outside the union", () => {
    // Belt-and-braces against a malformed on-disk value cast through the boundary.
    expect(() => getStory("story-99" as StoryType)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to the existing resolveStory (behavior-preserving)
// ---------------------------------------------------------------------------

describe("Story-1 definition resolve", () => {
  it("resolves a full 14-page ResolvedStory for the Otis fixture", () => {
    const story = getStory("story-1").resolve(otisSession());
    expect(story).toHaveLength(14);
  });

  it("produces the same pages as the direct resolveStory entry point", () => {
    // The refactor keeps resolveStory working by delegating; the registry path
    // and the direct call must yield identical resolved output.
    const session = otisSession();
    expect(getStory("story-1").resolve(session)).toEqual(resolveStory(session));
  });
});

// ---------------------------------------------------------------------------
// storyType defaulting when the field is absent
// ---------------------------------------------------------------------------

describe("missing storyType defaults to Story 1", () => {
  it("a session without storyType resolves via the Story-1 registry path", () => {
    // The Otis fixture predates the field — it carries no `storyType`. Readers
    // default missing → "story-1" with `session.storyType ?? "story-1"`.
    const session = otisSession();
    expect(session.storyType).toBeUndefined();

    const storyType: StoryType = session.storyType ?? "story-1";
    expect(storyType).toBe("story-1");

    const story = getStory(storyType).resolve(session);
    expect(story).toHaveLength(14);
    // Same output as resolving the defaulted type directly.
    expect(story).toEqual(getStory("story-1").resolve(session));
  });

  it("an explicit storyType: 'story-1' resolves identically to the absent case", () => {
    const withType: StorySession = { ...otisSession(), storyType: "story-1" };
    const withoutType = otisSession();
    expect(getStory(withType.storyType ?? "story-1").resolve(withType)).toEqual(
      getStory(withoutType.storyType ?? "story-1").resolve(withoutType),
    );
  });

  it("routes filename via the defaulted type for a session without storyType", () => {
    const session = otisSession();
    const filename = getStory(session.storyType ?? "story-1").pdfFilename(session);
    expect(filename).toBe("Saying-Goodbye-to-Otis.pdf");
  });
});

// ---------------------------------------------------------------------------
// Filename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("pdfFilename via the registry", () => {
  it("equals Saying-Goodbye-to-[PET_NAME].pdf for the Otis fixture", () => {
    expect(getStory("story-1").pdfFilename(otisSession())).toBe(
      "Saying-Goodbye-to-Otis.pdf",
    );
  });

  it("matches the existing storyPdfFilename helper (no logic added in the wrapper)", () => {
    const session = otisSession();
    expect(getStory("story-1").pdfFilename(session)).toBe(
      storyPdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = sessionWith({ pet: { name: "Mr Biscuit" } });
    expect(getStory("story-1").pdfFilename(session)).toBe(
      "Saying-Goodbye-to-Mr-Biscuit.pdf",
    );
  });
});
