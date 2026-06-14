import { describe, it, expect } from "vitest";

import {
  buildStory8SlotPrompts,
  buildScenePromptFromPage,
  ADVENTURE_SCENE_PAGE_IDS,
} from "./story8-prompts";
import { resolveStory8 } from "@/lib/story/story8/variants";
import { biscuitSession8 } from "@/lib/story/story8/fixtures";

// Story-8 scene prompt-builder tests (feature 31, PR-A). PURE — no SDK, no network,
// no fs. PR-A refactored the PR-0 prototype builder to read each scene page's
// resolved `illustrationBrief` from `resolveStory8` (the single source); the
// pose-discipline / dynamic-watercolor clause and the climax side-leap rule stay in
// the builder. Story 8's imagery is the catalog's first dynamic action set, so the
// central craft rule is POSE DISCIPLINE. These tests pin (spec §5):
//   1. Exactly the 10 ADVENTURE_SCENE_PAGE_IDS, all useReference:true.
//   2. No surviving {placeholder}/[FIELD] token in any prompt (merge applied).
//   3. Every prompt has the same-animal/markings anchor AND the 3/4 pose rule.
//   4. The climax prompt carries the side-leap / no-foreshortening instruction;
//      no other slot does.
//   5. No prompt instructs a face-obscuring costume — the ban phrasing is present.

const SESSION = biscuitSession8();

describe("buildStory8SlotPrompts", () => {
  it("returns exactly the 10 slots, all useReference:true", () => {
    const prompts = buildStory8SlotPrompts(SESSION);

    const slots = Object.keys(prompts);
    expect(slots).toHaveLength(10);
    expect(ADVENTURE_SCENE_PAGE_IDS).toHaveLength(10);

    // Every illustrated slot id is present and reference-anchored.
    for (const slot of ADVENTURE_SCENE_PAGE_IDS) {
      const slotPrompt = prompts[slot as keyof typeof prompts];
      expect(slotPrompt, slot).toBeDefined();
      expect(slotPrompt!.useReference, slot).toBe(true);
    }
  });

  it("leaves no {placeholder} or [FIELD] token in any prompt", () => {
    const prompts = buildStory8SlotPrompts(SESSION);
    for (const [slot, p] of Object.entries(prompts)) {
      expect(p!.prompt, slot).not.toMatch(/\{[a-zA-Z]/); // no {placeholder}
      expect(p!.prompt, slot).not.toMatch(/\[[A-Z_]+\]/); // no [MERGE_FIELD]
      // The merged pet name is woven into every prompt (proof merge ran).
      expect(p!.prompt, slot).toContain("Biscuit");
    }
  });

  it("the climax prompt carries the side-leap / no-foreshortening instruction", () => {
    const prompts = buildStory8SlotPrompts(SESSION);
    const climax = prompts["adventure-climax"]!;
    expect(climax.prompt).toMatch(/3\/4 side leap/i);
    expect(climax.prompt).toMatch(/full profile\/silhouette/i);
    expect(climax.prompt).toMatch(/never a foreshortened lunge toward the camera/i);
  });

  it("only the climax slot gets the explicit side-leap instruction", () => {
    const prompts = buildStory8SlotPrompts(SESSION);
    for (const [slot, p] of Object.entries(prompts)) {
      if (slot === "adventure-climax") continue;
      expect(p!.prompt, slot).not.toMatch(/3\/4 side leap/i);
    }
  });

  it("carries the same-animal / markings anchor AND the 3/4 pose rule on every prompt", () => {
    const prompts = buildStory8SlotPrompts(SESSION);
    for (const [slot, p] of Object.entries(prompts)) {
      expect(p!.prompt, slot).toMatch(/same animal as in the reference images/i);
      expect(p!.prompt, slot).toMatch(/identical breed markings/i);
      expect(p!.prompt, slot).toMatch(/3\/4 or side dynamic pose/i);
      expect(p!.prompt, slot).toMatch(/no extreme foreshortening/i);
    }
  });

  it("never instructs a face-obscuring costume — it bans one instead", () => {
    const prompts = buildStory8SlotPrompts(SESSION);
    for (const [slot, p] of Object.entries(prompts)) {
      // The discipline phrasing is present...
      expect(p!.prompt, slot).toMatch(
        /must not obscure the face, eyes, ears, or markings/i,
      );
      // ...and no prompt ever asks for a costume/hat OVER the face/eyes.
      expect(p!.prompt, slot).not.toMatch(
        /(costume|hat|prop)[^.]*over (the )?(face|eyes|head)/i,
      );
    }
  });

  it("carries the dynamic-watercolor palette modifier on every prompt", () => {
    const prompts = buildStory8SlotPrompts(SESSION);
    for (const [slot, p] of Object.entries(prompts)) {
      expect(p!.prompt, slot).toMatch(/soft warm watercolor but dynamic/i);
      expect(p!.prompt, slot).toMatch(/never flat-cartoon or clipart/i);
    }
  });

  it("reflects the chosen illustration style in the prompts", () => {
    const pencil = buildStory8SlotPrompts({
      ...SESSION,
      pet: { ...SESSION.pet, illustrationStyle: "pencil" },
    });
    expect(pencil["adventure-cover"]!.prompt).toMatch(/pencil-sketch/i);

    const storybook = buildStory8SlotPrompts({
      ...SESSION,
      pet: { ...SESSION.pet, illustrationStyle: "storybook" },
    });
    expect(storybook["adventure-cover"]!.prompt).toMatch(/storybook/i);
  });
});

describe("buildScenePromptFromPage", () => {
  it("builds a single slot from a resolved page with the pet woven in", () => {
    const story = resolveStory8(SESSION);
    const cover = story.find((p) => p.id === "adventure-cover")!;
    const built = buildScenePromptFromPage(cover, "watercolor");
    expect(built.useReference).toBe(true);
    expect(built.prompt).toContain("Biscuit");
    expect(built.prompt).toMatch(/HERO SHOT/);
    // A pure scene page (no climax) never carries the side-leap clause.
    expect(built.prompt).not.toMatch(/3\/4 side leap/i);
  });

  it("only the climax page gets the explicit side-leap instruction", () => {
    const story = resolveStory8(SESSION);
    const climax = story.find((p) => p.id === "adventure-climax")!;
    const built = buildScenePromptFromPage(climax, "watercolor");
    expect(built.prompt).toMatch(/3\/4 side leap/i);
  });
});
