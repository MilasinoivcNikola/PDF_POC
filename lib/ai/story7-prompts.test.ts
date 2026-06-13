import { describe, it, expect } from "vitest";

import {
  buildStory7SlotPrompts,
  buildScenePromptFromPage,
} from "./story7-prompts";
import {
  biscuitSession7,
  biscuitAnniversarySession7,
  story7SessionWith,
} from "@/lib/story/story7/fixtures";
import { WELCOME_SCENE_PAGE_IDS } from "@/lib/story/story-7";

// Story-7 prompt-builder tests (feature 28, imagery slice). PURE — no SDK, no
// network, no fs. Story 7's imagery is a MIXED set: 7 reference-anchored scenes +
// 1 figure-free `welcome-before` wash. These tests pin:
//   1. Exactly the 8 WELCOME_SCENE_PAGE_IDS are built.
//   2. `welcome-before` carries useReference:false; the other 7 carry true.
//   3. The Story-7 palette modifier ("a beginning not a sunset") is on every prompt;
//      the same-animal consistency clause is on the 7 reference-anchored slots.
//   4. No surviving {placeholder}/[BRACKET] token in any prompt (brief-driven).

describe("buildStory7SlotPrompts", () => {
  it("builds exactly the 8 welcome slots", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    const keys = Object.keys(prompts).sort();

    expect(WELCOME_SCENE_PAGE_IDS).toHaveLength(8);
    expect(keys).toEqual([...WELCOME_SCENE_PAGE_IDS].sort());

    for (const slot of WELCOME_SCENE_PAGE_IDS) {
      const sp = prompts[slot as keyof typeof prompts];
      expect(sp, slot).toBeTruthy();
    }
  });

  it("welcome-before is figure-free (useReference:false); the other 7 are reference-anchored", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    for (const slot of WELCOME_SCENE_PAGE_IDS) {
      const sp = prompts[slot as keyof typeof prompts]!;
      if (slot === "welcome-before") {
        expect(sp.useReference, slot).toBe(false);
      } else {
        expect(sp.useReference, slot).toBe(true);
      }
    }
  });

  it("does not include the dedication, closing, or back-cover (not slots)", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    expect(prompts).not.toHaveProperty("welcome-dedication");
    expect(prompts).not.toHaveProperty("welcome-closing");
    expect(prompts).not.toHaveProperty("welcome-back-cover");
  });

  it("carries the Story-7 palette modifier on every prompt", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    for (const slot of WELCOME_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      expect(prompt, slot).toMatch(/golden-morning light/i);
      expect(prompt, slot).toMatch(/a beginning not a sunset/i);
    }
  });

  it("carries the same-animal consistency clause on the 7 reference-anchored slots", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    for (const slot of WELCOME_SCENE_PAGE_IDS) {
      if (slot === "welcome-before") continue;
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      expect(prompt, slot).toMatch(/same animal as in the reference images/i);
      expect(prompt, slot).toMatch(/maintain the pet's exact appearance/i);
    }
  });

  it("the figure-free welcome-before wash asks for no animal and no consistency clause", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    const before = prompts["welcome-before"]!.prompt;
    expect(before).toMatch(/no animal/i);
    expect(before).not.toMatch(/same animal as in the reference images/i);
  });

  it("carries the emotional-progression beats on the choosing and belonging slots", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    expect(prompts["welcome-choosing"]!.prompt).toMatch(/curious or a little unsure/i);
    expect(prompts["welcome-now-ours"]!.prompt).toMatch(/fully joyful/i);
    expect(prompts["welcome-belong"]!.prompt).toMatch(/fully joyful/i);
  });

  it("is brief-driven — no surviving {placeholder}/[FIELD] tokens", () => {
    const prompts = buildStory7SlotPrompts(biscuitSession7());
    for (const slot of WELCOME_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      expect(prompt, slot).not.toMatch(/\{[a-zA-Z]/); // no {placeholder}
      expect(prompt, slot).not.toMatch(/\[[A-Z_]+\]/); // no [MERGE_FIELD]
    }
    // The reference-anchored slots merge the pet's name into the brief.
    expect(prompts["welcome-cover"]!.prompt).toMatch(/Biscuit/);
  });

  it("reflects the chosen illustration style in the prompts", () => {
    const pencil = buildStory7SlotPrompts(
      story7SessionWith({ pet: { illustrationStyle: "pencil" } }),
    );
    expect(pencil["welcome-cover"]!.prompt).toMatch(/pencil-sketch/i);
    // The figure-free wash also picks up the chosen style.
    expect(pencil["welcome-before"]!.prompt).toMatch(/pencil-sketch/i);

    const storybook = buildStory7SlotPrompts(
      story7SessionWith({ pet: { illustrationStyle: "storybook" } }),
    );
    expect(storybook["welcome-cover"]!.prompt).toMatch(/storybook/i);
  });

  it("resolves the anniversary fixture without leaving tokens (variant path)", () => {
    const prompts = buildStory7SlotPrompts(biscuitAnniversarySession7());
    for (const slot of WELCOME_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      expect(prompt, slot).not.toMatch(/\{[a-zA-Z]/);
      expect(prompt, slot).not.toMatch(/\[[A-Z_]+\]/);
    }
  });
});

describe("buildScenePromptFromPage", () => {
  it("wraps a reference-anchored brief in the same-pet framing + style clause", () => {
    const page = {
      id: "welcome-now-ours" as const,
      layout: "narrative" as const,
      pageNumber: 7,
      title: "",
      body: [],
      illustrationBrief: "Biscuit doing zoomies in golden morning light.",
    };
    const sp = buildScenePromptFromPage(page, "watercolor");
    expect(sp.useReference).toBe(true);
    expect(sp.prompt).toContain("Biscuit doing zoomies in golden morning light.");
    expect(sp.prompt).toMatch(/same pet shown in the reference images/i);
    expect(sp.prompt).toMatch(/soft watercolor/i);
    expect(sp.prompt).toMatch(/a beginning not a sunset/i);
  });

  it("builds welcome-before figure-free with no consistency clause", () => {
    const page = {
      id: "welcome-before" as const,
      layout: "narrative" as const,
      pageNumber: 2,
      title: "",
      body: [],
      illustrationBrief: "An empty dog bed in a sunlit room.",
    };
    const sp = buildScenePromptFromPage(page, "watercolor");
    expect(sp.useReference).toBe(false);
    expect(sp.prompt).toContain("An empty dog bed in a sunlit room.");
    expect(sp.prompt).toMatch(/no animal/i);
    expect(sp.prompt).not.toMatch(/same animal as in the reference images/i);
  });
});
