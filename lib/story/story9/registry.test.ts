import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story9Definition, STORY_9_SCENE_PAGE_IDS } from "@/lib/story/story-9";
import { resolveStory9 } from "@/lib/story/story9/variants";
import { newBabyPdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { PageLayout } from "@/lib/story/merge";
import type { Story9PageId } from "@/lib/story/master-text";
import type { StorySession } from "@/lib/session/types";
import { biscuitSession9, story9SessionWith } from "@/lib/story/story9/fixtures";

// Story-9 registration under test (feature 33): `getStory("story-9")` resolves to the
// product definition, exposing the same five things the pipeline needs from every
// product (resolve / illustrationSlots / pdfFilename / wizard / editable). Mirrors
// registry.test.ts's Story-1/2/4/5 + story6/registry.test.ts's Story-6 assertions.
// The Story-9 definition types its `resolve`/`pdfFilename` against the shared
// `StorySession`, so we cast the concrete `Story9Session` at the registry seam.

/** Cast a Story9Session to the registry's `StorySession` param at the seam. */
function asStorySession(): StorySession {
  return biscuitSession9() as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup — story-9", () => {
  it('returns the Story-9 StoryDefinition for "story-9"', () => {
    const definition = getStory("story-9");
    expect(definition).toBe(story9Definition);
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
    expect(definition.wizard).toBeDefined();
    expect(definition.editable).toBeDefined();
  });

  it("exposes illustrationSlots equal to STORY_9_SCENE_PAGE_IDS — exactly 7", () => {
    const slots = getStory("story-9").illustrationSlots;
    expect(slots).toEqual(STORY_9_SCENE_PAGE_IDS);
    expect([...slots]).toEqual([...STORY_9_SCENE_PAGE_IDS]);
    expect(slots).toHaveLength(7);
    // The keepsake has 7 reference-anchored slots (Story 1's shape): cover + pages
    // 2-7. The page-1 dedication portrait, the page-8 closing, + the back cover are
    // excluded (treatment / writing pages, not generated scenes).
    expect(slots).toEqual([
      "baby-cover",
      "baby-page-2",
      "baby-page-3",
      "baby-page-4",
      "baby-page-5",
      "baby-page-6",
      "baby-page-7",
    ]);
    expect(slots).not.toContain("baby-page-1");
    expect(slots).not.toContain("baby-page-8");
    expect(slots).not.toContain("baby-back-cover");
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory9
// ---------------------------------------------------------------------------

describe("Story-9 definition resolve", () => {
  it("resolves a full 10-page ResolvedStory for the Biscuit fixture", () => {
    const story = getStory("story-9").resolve(asStorySession());
    expect(story).toHaveLength(10);
  });

  it("produces the same pages as the direct resolveStory9 entry point", () => {
    const session = biscuitSession9();
    expect(getStory("story-9").resolve(session as unknown as StorySession)).toEqual(
      resolveStory9(session),
    );
  });

  it("tags every page with the reused Story-1 narrative layouts (incl. `closing`, never `truth`)", () => {
    const expectedLayout: Record<Story9PageId, PageLayout> = {
      "baby-cover": "cover",
      "baby-page-1": "dedication",
      "baby-page-2": "narrative",
      "baby-page-3": "narrative",
      "baby-page-4": "narrative",
      "baby-page-5": "narrative",
      "baby-page-6": "narrative",
      "baby-page-7": "love",
      "baby-page-8": "closing",
      "baby-back-cover": "back-cover",
    };
    const story = getStory("story-9").resolve(asStorySession());
    for (const page of story) {
      expect(page.layout).toBe(expectedLayout[page.id as Story9PageId]);
      expect(page.layout).not.toBe("truth");
    }
    // The closing page is present and reuses the existing `closing` layout.
    expect(story.map((p) => p.layout)).toContain("closing");
  });
});

// ---------------------------------------------------------------------------
// Wizard config — the five Story-9 steps
// ---------------------------------------------------------------------------

describe("Story-9 wizard config", () => {
  it("exposes 5 steps: upload → pet → baby → tone → generate", () => {
    const wizard = getStory("story-9").wizard;
    expect(wizard.total).toBe(5);
    expect(wizard.steps.map((s) => s.id)).toEqual([
      "upload",
      "pet",
      "baby",
      "tone",
      "generate",
    ]);
    expect(wizard.steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
  });

  it("the registry's wizard equals getWizardConfig('story-9')", () => {
    expect(getStory("story-9").wizard).toEqual(getWizardConfig("story-9"));
  });
});

// ---------------------------------------------------------------------------
// pdfFilename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("Story-9 pdfFilename via the registry", () => {
  it("equals [PET_NAME]-and-the-New-Baby.pdf for the Biscuit fixture", () => {
    expect(getStory("story-9").pdfFilename(asStorySession())).toBe(
      "Biscuit-and-the-New-Baby.pdf",
    );
  });

  it("matches the newBabyPdfFilename helper (no logic added in the wrapper)", () => {
    const session = biscuitSession9();
    expect(getStory("story-9").pdfFilename(session as unknown as StorySession)).toBe(
      newBabyPdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story9SessionWith({ pet: { name: "Mr Biscuit" } });
    expect(getStory("story-9").pdfFilename(session as unknown as StorySession)).toBe(
      "Mr-Biscuit-and-the-New-Baby.pdf",
    );
  });
});

// ---------------------------------------------------------------------------
// newBabyPdfFilename — the pure filename builder cases
// ---------------------------------------------------------------------------

describe("newBabyPdfFilename", () => {
  it("follows the [PET_NAME]-and-the-New-Baby.pdf convention", () => {
    expect(newBabyPdfFilename("Biscuit")).toBe("Biscuit-and-the-New-Baby.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(newBabyPdfFilename("Mr Biscuit")).toBe(
      "Mr-Biscuit-and-the-New-Baby.pdf",
    );
  });

  it("collapses runs of whitespace/punctuation into a single hyphen", () => {
    expect(newBabyPdfFilename("Sir  Barks --  a-lot")).toBe(
      "Sir-Barks-a-lot-and-the-New-Baby.pdf",
    );
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(newBabyPdfFilename("Renée")).toBe("Renee-and-the-New-Baby.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(newBabyPdfFilename("../../etc/passwd")).toBe(
      "etc-passwd-and-the-New-Baby.pdf",
    );
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(newBabyPdfFilename("")).toBe("Pet-and-the-New-Baby.pdf");
  });

  it("falls back to 'Pet' for a symbol-only name with no usable characters", () => {
    expect(newBabyPdfFilename("✦✦✦")).toBe("Pet-and-the-New-Baby.pdf");
  });
});
