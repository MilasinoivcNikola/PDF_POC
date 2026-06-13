import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import { story7Definition, WELCOME_SCENE_PAGE_IDS } from "@/lib/story/story-7";
import { resolveStory7 } from "@/lib/story/story7/variants";
import { welcomeHomePdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { PageLayout } from "@/lib/story/merge";
import type { Story7PageId } from "@/lib/story/master-text";
import type { StorySession } from "@/lib/session/types";
import { biscuitSession7, story7SessionWith } from "@/lib/story/story7/fixtures";

// Story-7 registration under test (feature 28): `getStory("story-7")` resolves to
// the product definition, exposing the same five things the pipeline needs from
// every product (resolve / illustrationSlots / pdfFilename / wizard / editable).
// Mirrors story6/registry.test.ts. The Story-7 definition types its resolve/
// pdfFilename against the shared `StorySession`, so we cast the concrete
// `Story7Session` at the registry seam exactly as a caller would.

/** Cast a Story7Session to the registry's `StorySession` param at the seam. */
function asStorySession(): StorySession {
  return biscuitSession7() as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup — story-7", () => {
  it('returns the Story-7 StoryDefinition for "story-7"', () => {
    const definition = getStory("story-7");
    expect(definition).toBe(story7Definition);
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
    expect(definition.wizard).toBeDefined();
    expect(definition.editable).toBeDefined();
  });

  it("exposes illustrationSlots equal to WELCOME_SCENE_PAGE_IDS (8 slots, same order)", () => {
    const slots = getStory("story-7").illustrationSlots;
    expect(slots).toEqual(WELCOME_SCENE_PAGE_IDS);
    expect(slots).toHaveLength(8);
    // The cover + the 7 narrative scene pages (2-8). The dedication reuses the
    // reference; the closing + back cover are not slots.
    expect(slots).toEqual([
      "welcome-cover",
      "welcome-before",
      "welcome-choosing",
      "welcome-drive-home",
      "welcome-first-night",
      "welcome-learning",
      "welcome-now-ours",
      "welcome-belong",
    ]);
    expect(slots).not.toContain("welcome-dedication");
    expect(slots).not.toContain("welcome-closing");
    expect(slots).not.toContain("welcome-back-cover");
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory7
// ---------------------------------------------------------------------------

describe("Story-7 definition resolve", () => {
  it("resolves a full 11-page ResolvedStory for the Biscuit fixture", () => {
    const story = getStory("story-7").resolve(asStorySession());
    expect(story).toHaveLength(11);
  });

  it("produces the same pages as the direct resolveStory7 entry point", () => {
    const session = biscuitSession7();
    expect(getStory("story-7").resolve(session as unknown as StorySession)).toEqual(
      resolveStory7(session),
    );
  });

  it("tags every page with a Story-1 narrative layout, and NONE is `truth`", () => {
    const expectedLayout: Record<Story7PageId, PageLayout> = {
      "welcome-cover": "cover",
      "welcome-dedication": "dedication",
      "welcome-before": "narrative",
      "welcome-choosing": "narrative",
      "welcome-drive-home": "narrative",
      "welcome-first-night": "narrative",
      "welcome-learning": "narrative",
      "welcome-now-ours": "narrative",
      "welcome-belong": "narrative",
      "welcome-closing": "closing",
      "welcome-back-cover": "back-cover",
    };
    const story1Layouts: PageLayout[] = [
      "cover",
      "dedication",
      "narrative",
      "closing",
      "back-cover",
    ];
    const story = getStory("story-7").resolve(asStorySession());
    for (const page of story) {
      expect(page.layout).toBe(expectedLayout[page.id as Story7PageId]);
      expect(page.layout).not.toBe("truth");
      expect(story1Layouts).toContain(page.layout);
    }
  });
});

// ---------------------------------------------------------------------------
// Wizard config — the five Story-7 steps
// ---------------------------------------------------------------------------

describe("Story-7 wizard config", () => {
  it("exposes 5 steps: upload → pet → homecoming → tone → generate", () => {
    const wizard = getStory("story-7").wizard;
    expect(wizard.total).toBe(5);
    expect(wizard.steps.map((s) => s.id)).toEqual([
      "upload",
      "pet",
      "homecoming",
      "tone",
      "generate",
    ]);
    expect(wizard.steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
  });

  it("the registry's wizard equals getWizardConfig('story-7')", () => {
    expect(getStory("story-7").wizard).toEqual(getWizardConfig("story-7"));
  });
});

// ---------------------------------------------------------------------------
// pdfFilename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("Story-7 pdfFilename via the registry", () => {
  it("equals Welcome-Home-[PET_NAME].pdf for the Biscuit fixture", () => {
    expect(getStory("story-7").pdfFilename(asStorySession())).toBe(
      "Welcome-Home-Biscuit.pdf",
    );
  });

  it("matches the welcomeHomePdfFilename helper (no logic added in the wrapper)", () => {
    const session = biscuitSession7();
    expect(getStory("story-7").pdfFilename(session as unknown as StorySession)).toBe(
      welcomeHomePdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story7SessionWith({ pet: { name: "Mr Biscuit" } });
    expect(getStory("story-7").pdfFilename(session as unknown as StorySession)).toBe(
      "Welcome-Home-Mr-Biscuit.pdf",
    );
  });
});

// ---------------------------------------------------------------------------
// welcomeHomePdfFilename — the pure filename builder cases
// ---------------------------------------------------------------------------

describe("welcomeHomePdfFilename", () => {
  it("follows the Welcome-Home-[PET_NAME].pdf convention", () => {
    expect(welcomeHomePdfFilename("Biscuit")).toBe("Welcome-Home-Biscuit.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(welcomeHomePdfFilename("Mr Biscuit")).toBe("Welcome-Home-Mr-Biscuit.pdf");
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(welcomeHomePdfFilename("Renée")).toBe("Welcome-Home-Renee.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(welcomeHomePdfFilename("../../etc/passwd")).toBe(
      "Welcome-Home-etc-passwd.pdf",
    );
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(welcomeHomePdfFilename("")).toBe("Welcome-Home-Pet.pdf");
  });
});
