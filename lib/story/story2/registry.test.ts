import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story2Definition } from "@/lib/story/story-2";
import { resolveStory2 } from "@/lib/story/story2/variants";
import { letterPdfFilename } from "@/lib/pdf/render";
import type { StorySession } from "@/lib/session/types";
import {
  murphySession,
  story2SessionWith,
} from "@/lib/story/story2/fixtures";

// The Story-2 registry wrapper (lib/story/story-2.ts) under test. `getStory(
// "story-2")` must re-expose the EXISTING resolve fn + filename builder unchanged
// (a thin wrapper, not a reimplementation) so the render/preview pipeline (features
// 16/19) gets the same output it would by calling resolveStory2 directly.

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory2 (identical output)
// ---------------------------------------------------------------------------

describe("Story-2 definition resolve", () => {
  it('getStory("story-2") returns the story2Definition', () => {
    const definition = getStory("story-2");
    expect(definition).toBe(story2Definition);
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
  });

  it("resolves the 6-page letter for the Murphy fixture", () => {
    const story = getStory("story-2").resolve(
      murphySession() as unknown as StorySession,
    );
    expect(story).toHaveLength(6);
    expect(story.map((p) => p.id)).toEqual([
      "letter-cover",
      "letter-page-2",
      "letter-page-3",
      "letter-page-4",
      "letter-page-5",
      "letter-page-6",
    ]);
  });

  it("produces the same pages as the direct resolveStory2 entry point", () => {
    const session = murphySession();
    expect(getStory("story-2").resolve(session as unknown as StorySession)).toEqual(
      resolveStory2(session),
    );
  });

  it("exposes the letter illustration slots (cover + belief-frame page)", () => {
    const slots = getStory("story-2").illustrationSlots;
    expect([...slots]).toEqual(["letter-cover", "letter-page-5"]);
  });
});

// ---------------------------------------------------------------------------
// pdfFilename == Letter-from-[PET_NAME].pdf (path-safe slug)
// ---------------------------------------------------------------------------

describe("Story-2 pdfFilename via the registry", () => {
  it("equals Letter-from-[PET_NAME].pdf for the Murphy fixture", () => {
    expect(
      getStory("story-2").pdfFilename(murphySession() as unknown as StorySession),
    ).toBe("Letter-from-Murphy.pdf");
  });

  it("matches the letterPdfFilename helper (no logic added in the wrapper)", () => {
    const session = murphySession();
    expect(
      getStory("story-2").pdfFilename(session as unknown as StorySession),
    ).toBe(letterPdfFilename(session.pet.name));
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story2SessionWith({ pet: { name: "Mr Murph" } });
    expect(
      getStory("story-2").pdfFilename(session as unknown as StorySession),
    ).toBe("Letter-from-Mr-Murph.pdf");
  });

  it("falls back to 'Pet' for an empty/symbol-only pet name", () => {
    // Mirror Story-1's slug fallback so an unrenderable name still names a file.
    expect(letterPdfFilename("")).toBe("Letter-from-Pet.pdf");
    expect(letterPdfFilename("!!!")).toBe("Letter-from-Pet.pdf");
  });
});
