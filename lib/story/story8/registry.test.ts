import { describe, it, expect } from "vitest";

import { getStory } from "@/lib/story/registry";
import {
  story8Definition,
  ADVENTURE_SCENE_PAGE_IDS,
} from "@/lib/story/story-8";
import { resolveStory8 } from "@/lib/story/story8/variants";
import { adventurePdfFilename } from "@/lib/pdf/filename";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { PageLayout } from "@/lib/story/merge";
import type { Story8PageId } from "@/lib/story/master-text";
import type { StorySession } from "@/lib/session/types";
import { biscuitSession8, story8SessionWith } from "@/lib/story/story8/fixtures";

// Story-8 registration under test (feature 31): `getStory("story-8")` resolves to
// the product definition, exposing the same five things the pipeline needs from
// every product (resolve / illustrationSlots / pdfFilename / wizard / editable).
// Mirrors story7/registry.test.ts. The Story-8 definition types its resolve/
// pdfFilename against the shared `StorySession`, so we cast the concrete
// `Story8Session` at the registry seam exactly as a caller would.

/** Cast a Story8Session to the registry's `StorySession` param at the seam. */
function asStorySession(): StorySession {
  return biscuitSession8() as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Registry lookup
// ---------------------------------------------------------------------------

describe("getStory registry lookup — story-8", () => {
  it('returns the Story-8 StoryDefinition for "story-8"', () => {
    const definition = getStory("story-8");
    expect(definition).toBe(story8Definition);
    expect(typeof definition.resolve).toBe("function");
    expect(typeof definition.pdfFilename).toBe("function");
    expect(Array.isArray(definition.illustrationSlots)).toBe(true);
    expect(definition.wizard).toBeDefined();
    expect(definition.editable).toBeDefined();
  });

  it("exposes illustrationSlots equal to ADVENTURE_SCENE_PAGE_IDS (10 slots, same order)", () => {
    const slots = getStory("story-8").illustrationSlots;
    expect(slots).toEqual(ADVENTURE_SCENE_PAGE_IDS);
    expect(slots).toHaveLength(10);
    // The cover + the 9 adventure scene pages (1-9), in book order.
    expect(slots).toEqual([
      "adventure-cover",
      "adventure-ordinary",
      "adventure-special",
      "adventure-call",
      "adventure-clue",
      "adventure-deeper",
      "adventure-discovery",
      "adventure-wobble",
      "adventure-climax",
      "adventure-celebration",
    ]);
    // Pages 10/11 + back cover REUSE imagery (no slot).
    expect(slots).not.toContain("adventure-home");
    expect(slots).not.toContain("adventure-closing");
    expect(slots).not.toContain("adventure-back-cover");
  });
});

// ---------------------------------------------------------------------------
// resolve delegates to resolveStory8
// ---------------------------------------------------------------------------

describe("Story-8 definition resolve", () => {
  it("resolves a full 13-page ResolvedStory for the Biscuit fixture", () => {
    const story = getStory("story-8").resolve(asStorySession());
    expect(story).toHaveLength(13);
  });

  it("produces the same pages as the direct resolveStory8 entry point", () => {
    const session = biscuitSession8();
    expect(getStory("story-8").resolve(session as unknown as StorySession)).toEqual(
      resolveStory8(session),
    );
  });

  it("tags every page with a Story-1 narrative layout, and NONE is dedication/love/truth", () => {
    const expectedLayout: Record<Story8PageId, PageLayout> = {
      "adventure-cover": "cover",
      "adventure-ordinary": "narrative",
      "adventure-special": "narrative",
      "adventure-call": "narrative",
      "adventure-clue": "narrative",
      "adventure-deeper": "narrative",
      "adventure-discovery": "narrative",
      "adventure-wobble": "narrative",
      "adventure-climax": "narrative",
      "adventure-celebration": "narrative",
      "adventure-home": "narrative",
      "adventure-closing": "closing",
      "adventure-back-cover": "back-cover",
    };
    const story1Layouts: PageLayout[] = [
      "cover",
      "narrative",
      "closing",
      "back-cover",
    ];
    const story = getStory("story-8").resolve(asStorySession());
    for (const page of story) {
      expect(page.layout).toBe(expectedLayout[page.id as Story8PageId]);
      for (const forbidden of ["dedication", "love", "truth"] as const) {
        expect(page.layout).not.toBe(forbidden);
      }
      expect(story1Layouts).toContain(page.layout);
    }
  });
});

// ---------------------------------------------------------------------------
// Wizard config — the five Story-8 steps
// ---------------------------------------------------------------------------

describe("Story-8 wizard config", () => {
  it("exposes 5 steps: upload → pet → adventure → tone → generate", () => {
    const wizard = getStory("story-8").wizard;
    expect(wizard.total).toBe(5);
    expect(wizard.steps.map((s) => s.id)).toEqual([
      "upload",
      "pet",
      "adventure",
      "tone",
      "generate",
    ]);
    expect(wizard.steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
  });

  it("the registry's wizard equals getWizardConfig('story-8')", () => {
    expect(getStory("story-8").wizard).toEqual(getWizardConfig("story-8"));
  });
});

// ---------------------------------------------------------------------------
// pdfFilename via the registry == the production-checklist convention
// ---------------------------------------------------------------------------

describe("Story-8 pdfFilename via the registry", () => {
  it("equals Amazing-Adventures-of-[PET_NAME].pdf for the Biscuit fixture", () => {
    expect(getStory("story-8").pdfFilename(asStorySession())).toBe(
      "Amazing-Adventures-of-Biscuit.pdf",
    );
  });

  it("matches the adventurePdfFilename helper (no logic added in the wrapper)", () => {
    const session = biscuitSession8();
    expect(getStory("story-8").pdfFilename(session as unknown as StorySession)).toBe(
      adventurePdfFilename(session.pet.name),
    );
  });

  it("derives the name from the session's pet name (slugified)", () => {
    const session = story8SessionWith({ pet: { name: "Mr Biscuit" } });
    expect(getStory("story-8").pdfFilename(session as unknown as StorySession)).toBe(
      "Amazing-Adventures-of-Mr-Biscuit.pdf",
    );
  });
});

// ---------------------------------------------------------------------------
// adventurePdfFilename — the pure filename builder cases
// ---------------------------------------------------------------------------

describe("adventurePdfFilename", () => {
  it("follows the Amazing-Adventures-of-[PET_NAME].pdf convention", () => {
    expect(adventurePdfFilename("Biscuit")).toBe("Amazing-Adventures-of-Biscuit.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(adventurePdfFilename("Mr Biscuit")).toBe(
      "Amazing-Adventures-of-Mr-Biscuit.pdf",
    );
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(adventurePdfFilename("Renée")).toBe("Amazing-Adventures-of-Renee.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(adventurePdfFilename("../../etc/passwd")).toBe(
      "Amazing-Adventures-of-etc-passwd.pdf",
    );
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(adventurePdfFilename("")).toBe("Amazing-Adventures-of-Pet.pdf");
  });
});
