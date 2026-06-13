import { describe, it, expect } from "vitest";

import {
  buildStory6SlotPrompts,
  buildScenePromptFromPage,
} from "./story6-prompts";
import { biscuitSession6, story6SessionWith } from "@/lib/story/story6/fixtures";
import { TRIBUTE_SCENE_PAGE_IDS } from "@/lib/story/story-6";

// Story-6 prompt-builder tests (feature 25, imagery slice). PURE — no SDK, no
// network, no fs. Story 6's imagery is STORY 1'S SHAPE: brief-driven per-scene
// prompts, ALL reference-anchored (no figure-free wash). These tests pin:
//   1. Exactly the 7 TRIBUTE_SCENE_PAGE_IDS are built (cover + page-1 dedication +
//      pages 2-6), all `useReference: true`.
//   2. Every prompt is brief-driven (carries the resolved brief text) and ends with
//      the consistency clause ("same animal as in the reference images").
//   3. No surviving `{placeholder}`/`[BRACKET]` token in any prompt.

describe("buildStory6SlotPrompts", () => {
  it("builds exactly the 7 tribute slots, all reference-anchored", () => {
    const prompts = buildStory6SlotPrompts(biscuitSession6());
    const keys = Object.keys(prompts).sort();

    expect(TRIBUTE_SCENE_PAGE_IDS).toHaveLength(7);
    expect(keys).toEqual([...TRIBUTE_SCENE_PAGE_IDS].sort());

    for (const slot of TRIBUTE_SCENE_PAGE_IDS) {
      const sp = prompts[slot as keyof typeof prompts];
      expect(sp, slot).toBeTruthy();
      // ALL seven show the actual pet — no figure-free wash anywhere.
      expect(sp!.useReference, slot).toBe(true);
    }
  });

  it("does not include the back-cover (a writing page, not a slot)", () => {
    const prompts = buildStory6SlotPrompts(biscuitSession6());
    expect(prompts).not.toHaveProperty("tribute-back-cover");
  });

  it("every prompt is brief-driven and carries the consistency clause", () => {
    const prompts = buildStory6SlotPrompts(biscuitSession6());
    for (const slot of TRIBUTE_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      // The shared "same animal as the reference" consistency instruction.
      expect(prompt, slot).toMatch(/same animal as in the reference images/i);
      expect(prompt, slot).toMatch(/maintain the pet's exact appearance/i);
      // Brief-driven: references the locked reference illustration framing.
      expect(prompt, slot).toMatch(/reference/i);
    }
  });

  it("merges the pet's name/description into the prompts — no surviving tokens", () => {
    const prompts = buildStory6SlotPrompts(biscuitSession6());
    for (const slot of TRIBUTE_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      expect(prompt, slot).not.toMatch(/\{[a-zA-Z]/); // no {placeholder}
      expect(prompt, slot).not.toMatch(/\[[A-Z_]+\]/); // no [MERGE_FIELD]
    }
    // Page-2 brief mentions the pet by name + breed/color.
    expect(prompts["tribute-page-2"]!.prompt).toMatch(/Biscuit/);
  });

  it("reflects the chosen illustration style in the consistency clause", () => {
    const pencil = buildStory6SlotPrompts(
      story6SessionWith({ pet: { illustrationStyle: "pencil" } }),
    );
    expect(pencil["tribute-cover"]!.prompt).toMatch(/pencil-sketch/i);

    const storybook = buildStory6SlotPrompts(
      story6SessionWith({ pet: { illustrationStyle: "storybook" } }),
    );
    expect(storybook["tribute-cover"]!.prompt).toMatch(/storybook/i);
  });
});

describe("buildScenePromptFromPage", () => {
  it("wraps the resolved brief in the same-pet framing + style clause", () => {
    const page = {
      id: "tribute-page-3" as const,
      layout: "narrative" as const,
      pageNumber: 3,
      title: "",
      body: [],
      illustrationBrief: "Biscuit at the window in golden light.",
    };
    const prompt = buildScenePromptFromPage(page, "watercolor");
    expect(prompt).toContain("Biscuit at the window in golden light.");
    expect(prompt).toMatch(/same pet shown in the reference images/i);
    expect(prompt).toMatch(/soft watercolor/i);
  });
});
