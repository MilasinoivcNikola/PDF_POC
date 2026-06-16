import { describe, it, expect } from "vitest";

import {
  buildStory9SlotPrompts,
  buildScenePromptFromPage,
} from "./story9-prompts";
import { biscuitSession9, story9SessionWith } from "@/lib/story/story9/fixtures";
import { STORY_9_SCENE_PAGE_IDS } from "@/lib/story/story-9";

// Story-9 prompt-builder tests (feature 33, imagery slice). PURE — no SDK, no
// network, no fs. Story 9's imagery is STORY 1'S SHAPE: brief-driven per-scene
// prompts, ALL reference-anchored (no figure-free wash). These tests pin:
//   1. Exactly the 7 STORY_9_SCENE_PAGE_IDS are built (cover + pages 2-7), all
//      `useReference: true`.
//   2. Every prompt is brief-driven (carries the resolved brief text) and ends with
//      the consistency clause ("same animal as in the reference images").
//   3. The Approach-A rule: ONLY the pet is photo-anchored; the baby + every adult
//      figure is abstract, no identifiable / specific human face — present in every
//      slot's clause.
//   4. Low cost tier is the default (scene generation hard rule) — asserted via the
//      orchestrator default, not here; this module is tier-agnostic by design (it
//      only builds prompt strings, never sets a tier), so we pin that it carries NO
//      medium/high tier wording that could override the engine's low default.
//   5. No surviving `{placeholder}`/`[BRACKET]` token in any prompt.

describe("buildStory9SlotPrompts", () => {
  it("builds exactly the 7 scene slots, all reference-anchored", () => {
    const prompts = buildStory9SlotPrompts(biscuitSession9());
    const keys = Object.keys(prompts).sort();

    expect(STORY_9_SCENE_PAGE_IDS).toHaveLength(7);
    expect(keys).toEqual([...STORY_9_SCENE_PAGE_IDS].sort());

    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      const sp = prompts[slot as keyof typeof prompts];
      expect(sp, slot).toBeTruthy();
      // ALL seven show the actual pet — no figure-free wash anywhere.
      expect(sp!.useReference, slot).toBe(true);
    }
  });

  it("does not include the dedication, page-1, or back-cover (writing/treatment pages, not slots)", () => {
    const prompts = buildStory9SlotPrompts(biscuitSession9());
    expect(prompts).not.toHaveProperty("baby-page-1");
    expect(prompts).not.toHaveProperty("baby-back-cover");
  });

  it("every prompt is brief-driven and carries the pet-anchor consistency clause", () => {
    const prompts = buildStory9SlotPrompts(biscuitSession9());
    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      // The shared "same animal as the reference" consistency instruction (pet anchor).
      expect(prompt, slot).toMatch(/same animal as in the reference images/i);
      expect(prompt, slot).toMatch(/maintain the pet's exact appearance/i);
      // Brief-driven: references the locked reference illustration framing.
      expect(prompt, slot).toMatch(/reference/i);
      // The pet is the only photo-anchored subject.
      expect(prompt, slot).toMatch(/only photo-anchored subject/i);
    }
  });

  it("bakes the abstract-human / no-specific-face rule into every slot", () => {
    const prompts = buildStory9SlotPrompts(biscuitSession9());
    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      // Baby is an abstract presence, never a specific/recognizable face.
      expect(prompt, slot).toMatch(/abstract presence/i);
      expect(prompt, slot).toMatch(
        /never a specific, detailed, or recognizable baby face/i,
      );
      // Adult/family figures stylized, 3/4 or from behind, no identifiable face.
      expect(prompt, slot).toMatch(/no identifiable human face/i);
      expect(prompt, slot).toMatch(/3\/4 view or\s+from behind/i);
    }
  });

  it("does not hardcode a medium/high cost tier (engine defaults scene gen to low)", () => {
    const prompts = buildStory9SlotPrompts(biscuitSession9());
    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      // This module builds prompt strings only — it must never carry tier wording
      // that the orchestrator's low default would have to fight.
      expect(prompt, slot).not.toMatch(/quality:\s*(medium|high)/i);
    }
  });

  it("merges the pet's name/description into the prompts — no surviving tokens", () => {
    const prompts = buildStory9SlotPrompts(biscuitSession9());
    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      const prompt = prompts[slot as keyof typeof prompts]!.prompt;
      expect(prompt, slot).not.toMatch(/\{[a-zA-Z]/); // no {placeholder}
      expect(prompt, slot).not.toMatch(/\[[A-Z_]+\]/); // no [MERGE_FIELD]
    }
    // Page-2 brief mentions the pet by name.
    expect(prompts["baby-page-2"]!.prompt).toMatch(/Biscuit/);
  });

  it("reflects babyStatus on Pages 4/6 — abstract when expecting, bundle present when arrived", () => {
    const expecting = buildStory9SlotPrompts(
      story9SessionWith({ toggles: { babyStatus: "expecting" } }),
    );
    // Expecting: the baby is not present yet on Page 4.
    expect(expecting["baby-page-4"]!.prompt).toMatch(
      /baby is not present yet/i,
    );

    const arrived = buildStory9SlotPrompts(
      story9SessionWith({ toggles: { babyStatus: "arrived" } }),
    );
    // Arrived: Page 4's brief rewrites in lockstep with its body — the baby is
    // present now (arrived framing), never the expecting "not present yet" line.
    expect(arrived["baby-page-4"]!.prompt).toMatch(/arrived framing/i);
    expect(arrived["baby-page-4"]!.prompt).toMatch(/baby is present now/i);
    expect(arrived["baby-page-4"]!.prompt).not.toMatch(/baby is not present yet/i);
    // Both framings still keep the baby abstract / faceless (the hard rule holds
    // regardless of status).
    expect(arrived["baby-page-4"]!.prompt).toMatch(/abstract presence/i);
    expect(arrived["baby-page-6"]!.prompt).toMatch(/abstract presence/i);
  });

  it("reflects the chosen illustration style in the consistency clause", () => {
    const pencil = buildStory9SlotPrompts(
      story9SessionWith({ pet: { illustrationStyle: "pencil" } }),
    );
    expect(pencil["baby-cover"]!.prompt).toMatch(/pencil-sketch/i);

    const storybook = buildStory9SlotPrompts(
      story9SessionWith({ pet: { illustrationStyle: "storybook" } }),
    );
    expect(storybook["baby-cover"]!.prompt).toMatch(/storybook/i);
  });
});

describe("buildScenePromptFromPage", () => {
  it("wraps the resolved brief in the same-pet framing + style clause", () => {
    const page = {
      id: "baby-page-3" as const,
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
    // The abstract-human rule rides along even on a brief with no human in it.
    expect(prompt).toMatch(/no identifiable human face/i);
  });
});
