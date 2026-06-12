import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story4Definition, TALK_SCENE_PAGE_IDS } from "@/lib/story/story-4";
import { resolveStory4 } from "@/lib/story/story4/variants";
import { talkPdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { PageLayout } from "@/lib/story/merge";
import type { Story4PageId } from "@/lib/story/master-text";
import type { StorySession } from "@/lib/session/types";
import { biscuitSession, story4SessionWith } from "@/lib/story/story4/fixtures";

// Story-4 registration under test (feature 20): `getStory("story-4")` resolves to
// the product definition, exposing the same five things the pipeline needs from
// every product (resolve / illustrationSlots / pdfFilename / wizard / editable).
// Mirrors registry.test.ts's Story-1/Story-2 assertions. The Story-4 definition
// types its `resolve`/`pdfFilename` against the shared `StorySession`, so we cast
// the concrete `Story4Session` at the registry seam exactly as a caller would.

/** Cast a Story4Session to the registry's `StorySession` param at the seam. */
function asStorySession(): StorySession {
  return biscuitSession() as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup — story-4", () => {
  it('returns the Story-4 StoryDefinition for "story-4"', () => {
    const definition = getStory("story-4");
    expect(definition).toBe(story4Definition);
    // The definition exposes everything the pipeline needs.
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
    expect(definition.wizard).toBeDefined();
    expect(definition.editable).toBeDefined();
  });

  it("exposes illustrationSlots equal to TALK_SCENE_PAGE_IDS (same set and order)", () => {
    const slots = getStory("story-4").illustrationSlots;
    expect(slots).toEqual(TALK_SCENE_PAGE_IDS);
    expect([...slots]).toEqual([...TALK_SCENE_PAGE_IDS]);
    // The celebration letter has exactly two Premium slots: cover + the Page-4 wash.
    expect(slots).toEqual(["talk-cover", "talk-page-4"]);
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory4
// ---------------------------------------------------------------------------

describe("Story-4 definition resolve", () => {
  it("resolves a full 6-page ResolvedStory for the Biscuit fixture", () => {
    const story = getStory("story-4").resolve(asStorySession());
    expect(story).toHaveLength(6);
  });

  it("produces the same pages as the direct resolveStory4 entry point", () => {
    const session = biscuitSession();
    expect(getStory("story-4").resolve(session as unknown as StorySession)).toEqual(
      resolveStory4(session),
    );
  });

  it("tags every page with the reused letter layouts (letter-cover + 5 letter)", () => {
    // Double-locked independently from STORY_4_LAYOUT in merge.ts.
    const expectedLayout: Record<Story4PageId, PageLayout> = {
      "talk-cover": "letter-cover",
      "talk-page-2": "letter",
      "talk-page-3": "letter",
      "talk-page-4": "letter",
      "talk-page-5": "letter",
      "talk-page-6": "letter",
    };
    const story = getStory("story-4").resolve(asStorySession());
    for (const page of story) {
      expect(page.layout).toBe(expectedLayout[page.id as Story4PageId]);
    }
  });
});

// ---------------------------------------------------------------------------
// Wizard config — the six Story-4 steps
// ---------------------------------------------------------------------------

describe("Story-4 wizard config", () => {
  it("exposes 6 steps: upload → pet → owner → letter → tone → generate", () => {
    const wizard = getStory("story-4").wizard;
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

  it("the registry's wizard equals getWizardConfig('story-4')", () => {
    expect(getStory("story-4").wizard).toEqual(getWizardConfig("story-4"));
  });
});

// ---------------------------------------------------------------------------
// pdfFilename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("Story-4 pdfFilename via the registry", () => {
  it("equals If-[PET_NAME]-Could-Talk.pdf for the Biscuit fixture", () => {
    expect(getStory("story-4").pdfFilename(asStorySession())).toBe(
      "If-Biscuit-Could-Talk.pdf",
    );
  });

  it("matches the talkPdfFilename helper (no logic added in the wrapper)", () => {
    const session = biscuitSession();
    expect(getStory("story-4").pdfFilename(session as unknown as StorySession)).toBe(
      talkPdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story4SessionWith({ pet: { name: "Mr Biscuit" } });
    expect(getStory("story-4").pdfFilename(session as unknown as StorySession)).toBe(
      "If-Mr-Biscuit-Could-Talk.pdf",
    );
  });
});

// ---------------------------------------------------------------------------
// talkPdfFilename — the pure filename builder cases
// ---------------------------------------------------------------------------

describe("talkPdfFilename", () => {
  it("follows the Story-4 If-[PET_NAME]-Could-Talk.pdf convention", () => {
    expect(talkPdfFilename("Biscuit")).toBe("If-Biscuit-Could-Talk.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(talkPdfFilename("Mr Biscuit")).toBe("If-Mr-Biscuit-Could-Talk.pdf");
  });

  it("collapses runs of whitespace/punctuation into a single hyphen", () => {
    expect(talkPdfFilename("Sir  Barks --  a-lot")).toBe(
      "If-Sir-Barks-a-lot-Could-Talk.pdf",
    );
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(talkPdfFilename("Renée")).toBe("If-Renee-Could-Talk.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(talkPdfFilename("../../etc/passwd")).toBe(
      "If-etc-passwd-Could-Talk.pdf",
    );
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(talkPdfFilename("")).toBe("If-Pet-Could-Talk.pdf");
  });

  it("falls back to 'Pet' for a symbol-only name with no usable characters", () => {
    expect(talkPdfFilename("✦✦✦")).toBe("If-Pet-Could-Talk.pdf");
  });
});
