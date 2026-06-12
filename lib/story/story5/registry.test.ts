import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story5Definition, NOTE_SCENE_PAGE_IDS } from "@/lib/story/story-5";
import { resolveStory5 } from "@/lib/story/story5/variants";
import { letterToPdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { PageLayout } from "@/lib/story/merge";
import type { Story5PageId } from "@/lib/story/master-text";
import type { StorySession } from "@/lib/session/types";
import { murphySession5, story5SessionWith } from "@/lib/story/story5/fixtures";

// Story-5 registration under test (feature 23): `getStory("story-5")` resolves to
// the product definition, exposing the same five things the pipeline needs from
// every product (resolve / illustrationSlots / pdfFilename / wizard / editable).
// Mirrors registry.test.ts's Story-1/Story-2/Story-4 assertions. The Story-5
// definition types its `resolve`/`pdfFilename` against the shared `StorySession`,
// so we cast the concrete `Story5Session` at the registry seam exactly as a caller
// would.

/** Cast a Story5Session to the registry's `StorySession` param at the seam. */
function asStorySession(): StorySession {
  return murphySession5() as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup — story-5", () => {
  it('returns the Story-5 StoryDefinition for "story-5"', () => {
    const definition = getStory("story-5");
    expect(definition).toBe(story5Definition);
    // The definition exposes everything the pipeline needs.
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
    expect(definition.wizard).toBeDefined();
    expect(definition.editable).toBeDefined();
  });

  it("exposes illustrationSlots equal to NOTE_SCENE_PAGE_IDS (same set and order)", () => {
    const slots = getStory("story-5").illustrationSlots;
    expect(slots).toEqual(NOTE_SCENE_PAGE_IDS);
    expect([...slots]).toEqual([...NOTE_SCENE_PAGE_IDS]);
    // The letter has exactly two Premium slots: cover + the Page-5 belief wash —
    // the same shape as Story 2.
    expect(slots).toEqual(["note-cover", "note-page-5"]);
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory5
// ---------------------------------------------------------------------------

describe("Story-5 definition resolve", () => {
  it("resolves a full 6-page ResolvedStory for the Murphy fixture", () => {
    const story = getStory("story-5").resolve(asStorySession());
    expect(story).toHaveLength(6);
  });

  it("produces the same pages as the direct resolveStory5 entry point", () => {
    const session = murphySession5();
    expect(getStory("story-5").resolve(session as unknown as StorySession)).toEqual(
      resolveStory5(session),
    );
  });

  it("tags every page with the reused letter layouts (letter-cover + 5 letter)", () => {
    // Double-locked independently from STORY_5_LAYOUT in merge.ts.
    const expectedLayout: Record<Story5PageId, PageLayout> = {
      "note-cover": "letter-cover",
      "note-page-2": "letter",
      "note-page-3": "letter",
      "note-page-4": "letter",
      "note-page-5": "letter",
      "note-page-6": "letter",
    };
    const story = getStory("story-5").resolve(asStorySession());
    for (const page of story) {
      expect(page.layout).toBe(expectedLayout[page.id as Story5PageId]);
    }
  });
});

// ---------------------------------------------------------------------------
// Wizard config — the six Story-5 steps
// ---------------------------------------------------------------------------

describe("Story-5 wizard config", () => {
  it("exposes 6 steps: upload → pet → owner → letter → tone → generate", () => {
    const wizard = getStory("story-5").wizard;
    expect(wizard.total).toBe(6);
    expect(wizard.steps.map((s) => s.id)).toEqual([
      "upload",
      "pet",
      "owner",
      "letter",
      "tone",
      "generate",
    ]);
    expect(wizard.steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("the registry's wizard equals getWizardConfig('story-5')", () => {
    expect(getStory("story-5").wizard).toEqual(getWizardConfig("story-5"));
  });
});

// ---------------------------------------------------------------------------
// pdfFilename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("Story-5 pdfFilename via the registry", () => {
  it("equals Letter-to-[PET_NAME].pdf for the Murphy fixture", () => {
    expect(getStory("story-5").pdfFilename(asStorySession())).toBe(
      "Letter-to-Murphy.pdf",
    );
  });

  it("matches the letterToPdfFilename helper (no logic added in the wrapper)", () => {
    const session = murphySession5();
    expect(getStory("story-5").pdfFilename(session as unknown as StorySession)).toBe(
      letterToPdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story5SessionWith({ pet: { name: "Mr Murphy" } });
    expect(getStory("story-5").pdfFilename(session as unknown as StorySession)).toBe(
      "Letter-to-Mr-Murphy.pdf",
    );
  });
});

// ---------------------------------------------------------------------------
// letterToPdfFilename — the pure filename builder cases
// ---------------------------------------------------------------------------

describe("letterToPdfFilename", () => {
  it("follows the Story-5 Letter-to-[PET_NAME].pdf convention", () => {
    expect(letterToPdfFilename("Murphy")).toBe("Letter-to-Murphy.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(letterToPdfFilename("Mr Murphy")).toBe("Letter-to-Mr-Murphy.pdf");
  });

  it("collapses runs of whitespace/punctuation into a single hyphen", () => {
    expect(letterToPdfFilename("Sir  Barks --  a-lot")).toBe(
      "Letter-to-Sir-Barks-a-lot.pdf",
    );
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(letterToPdfFilename("Renée")).toBe("Letter-to-Renee.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(letterToPdfFilename("../../etc/passwd")).toBe(
      "Letter-to-etc-passwd.pdf",
    );
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(letterToPdfFilename("")).toBe("Letter-to-Pet.pdf");
  });

  it("falls back to 'Pet' for a symbol-only name with no usable characters", () => {
    expect(letterToPdfFilename("✦✦✦")).toBe("Letter-to-Pet.pdf");
  });
});
