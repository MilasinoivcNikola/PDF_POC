import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story6Definition, TRIBUTE_SCENE_PAGE_IDS } from "@/lib/story/story-6";
import { resolveStory6 } from "@/lib/story/story6/variants";
import { tributePdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { PageLayout } from "@/lib/story/merge";
import type { Story6PageId } from "@/lib/story/master-text";
import type { StorySession } from "@/lib/session/types";
import { biscuitSession6, story6SessionWith } from "@/lib/story/story6/fixtures";

// Story-6 registration under test (feature 25): `getStory("story-6")` resolves to
// the product definition, exposing the same five things the pipeline needs from
// every product (resolve / illustrationSlots / pdfFilename / wizard / editable).
// Mirrors registry.test.ts's Story-1/2/4/5 assertions. The Story-6 definition types
// its `resolve`/`pdfFilename` against the shared `StorySession`, so we cast the
// concrete `Story6Session` at the registry seam exactly as a caller would.

/** Cast a Story6Session to the registry's `StorySession` param at the seam. */
function asStorySession(): StorySession {
  return biscuitSession6() as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup — story-6", () => {
  it('returns the Story-6 StoryDefinition for "story-6"', () => {
    const definition = getStory("story-6");
    expect(definition).toBe(story6Definition);
    // The definition exposes everything the pipeline needs.
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
    expect(definition.wizard).toBeDefined();
    expect(definition.editable).toBeDefined();
  });

  it("exposes illustrationSlots equal to TRIBUTE_SCENE_PAGE_IDS (same set and order)", () => {
    const slots = getStory("story-6").illustrationSlots;
    expect(slots).toEqual(TRIBUTE_SCENE_PAGE_IDS);
    expect([...slots]).toEqual([...TRIBUTE_SCENE_PAGE_IDS]);
    // The tribute has 7 reference-anchored slots (Story 1's shape): cover + the
    // page-1 dedication portrait + pages 2-6. The back cover is a writing page,
    // excluded — like Story 1's `back-cover`.
    expect(slots).toEqual([
      "tribute-cover",
      "tribute-page-1",
      "tribute-page-2",
      "tribute-page-3",
      "tribute-page-4",
      "tribute-page-5",
      "tribute-page-6",
    ]);
    expect(slots).not.toContain("tribute-back-cover");
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory6
// ---------------------------------------------------------------------------

describe("Story-6 definition resolve", () => {
  it("resolves a full 8-page ResolvedStory for the Biscuit fixture", () => {
    const story = getStory("story-6").resolve(asStorySession());
    expect(story).toHaveLength(8);
  });

  it("produces the same pages as the direct resolveStory6 entry point", () => {
    const session = biscuitSession6();
    expect(getStory("story-6").resolve(session as unknown as StorySession)).toEqual(
      resolveStory6(session),
    );
  });

  it("tags every page with the reused Story-1 narrative layouts (never `truth`)", () => {
    // Double-locked independently from STORY_6_LAYOUT in merge.ts.
    const expectedLayout: Record<Story6PageId, PageLayout> = {
      "tribute-cover": "cover",
      "tribute-page-1": "dedication",
      "tribute-page-2": "narrative",
      "tribute-page-3": "narrative",
      "tribute-page-4": "narrative",
      "tribute-page-5": "love",
      "tribute-page-6": "love",
      "tribute-back-cover": "back-cover",
    };
    const story = getStory("story-6").resolve(asStorySession());
    for (const page of story) {
      expect(page.layout).toBe(expectedLayout[page.id as Story6PageId]);
      expect(page.layout).not.toBe("truth");
    }
  });
});

// ---------------------------------------------------------------------------
// Wizard config — the five Story-6 steps
// ---------------------------------------------------------------------------

describe("Story-6 wizard config", () => {
  it("exposes 5 steps: upload → pet → tribute → tone → generate", () => {
    const wizard = getStory("story-6").wizard;
    expect(wizard.total).toBe(5);
    expect(wizard.steps.map((s) => s.id)).toEqual([
      "upload",
      "pet",
      "tribute",
      "tone",
      "generate",
    ]);
    expect(wizard.steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
  });

  it("the registry's wizard equals getWizardConfig('story-6')", () => {
    expect(getStory("story-6").wizard).toEqual(getWizardConfig("story-6"));
  });
});

// ---------------------------------------------------------------------------
// pdfFilename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("Story-6 pdfFilename via the registry", () => {
  it("equals While-Youre-Still-Here-[PET_NAME].pdf for the Biscuit fixture", () => {
    expect(getStory("story-6").pdfFilename(asStorySession())).toBe(
      "While-Youre-Still-Here-Biscuit.pdf",
    );
  });

  it("matches the tributePdfFilename helper (no logic added in the wrapper)", () => {
    const session = biscuitSession6();
    expect(getStory("story-6").pdfFilename(session as unknown as StorySession)).toBe(
      tributePdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story6SessionWith({ pet: { name: "Mr Biscuit" } });
    expect(getStory("story-6").pdfFilename(session as unknown as StorySession)).toBe(
      "While-Youre-Still-Here-Mr-Biscuit.pdf",
    );
  });
});

// ---------------------------------------------------------------------------
// tributePdfFilename — the pure filename builder cases
// ---------------------------------------------------------------------------

describe("tributePdfFilename", () => {
  it("follows the While-Youre-Still-Here-[PET_NAME].pdf convention", () => {
    expect(tributePdfFilename("Biscuit")).toBe("While-Youre-Still-Here-Biscuit.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(tributePdfFilename("Mr Biscuit")).toBe(
      "While-Youre-Still-Here-Mr-Biscuit.pdf",
    );
  });

  it("collapses runs of whitespace/punctuation into a single hyphen", () => {
    expect(tributePdfFilename("Sir  Barks --  a-lot")).toBe(
      "While-Youre-Still-Here-Sir-Barks-a-lot.pdf",
    );
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(tributePdfFilename("Renée")).toBe("While-Youre-Still-Here-Renee.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(tributePdfFilename("../../etc/passwd")).toBe(
      "While-Youre-Still-Here-etc-passwd.pdf",
    );
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(tributePdfFilename("")).toBe("While-Youre-Still-Here-Pet.pdf");
  });

  it("falls back to 'Pet' for a symbol-only name with no usable characters", () => {
    expect(tributePdfFilename("✦✦✦")).toBe("While-Youre-Still-Here-Pet.pdf");
  });
});
