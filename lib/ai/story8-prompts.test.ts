import { describe, it, expect } from "vitest";

import {
  buildStory8PrototypePrompts,
  buildStory8PrototypePrompt,
  ADVENTURE_PROTOTYPE_SLOT_IDS,
} from "./story8-prompts";
import type { IllustrationStyle } from "@/lib/session/types";

// Story-8 prototype prompt-builder tests (feature 30, the PR-0 go/no-go gate).
// PURE — no SDK, no network, no fs. Story 8's imagery is the catalog's first
// dynamic action set, so the central craft rule is POSE DISCIPLINE. These tests
// pin that the builder bakes that rule into every prompt and produces exactly the
// 10 Backyard-Mystery slots in book order:
//   1. Exactly the 10 ADVENTURE_PROTOTYPE_SLOT_IDS, in table/book order, all
//      useReference:true.
//   2. No surviving {placeholder}/[FIELD] token in any prompt (pet/style merged in).
//   3. The climax prompt has the side-leap / no-foreshortening instruction.
//   4. Every prompt has the same-animal/markings anchor AND the 3/4 pose rule.
//   5. No prompt instructs a face-obscuring costume — the discipline phrasing
//      ("must not obscure the face") is present instead.

const STYLE: IllustrationStyle = "watercolor";
const PET = "scruffy brown terrier dog";

describe("buildStory8PrototypePrompts", () => {
  it("returns exactly the 10 slots in book/table order, all useReference:true", () => {
    const prompts = buildStory8PrototypePrompts(PET, STYLE);

    expect(prompts).toHaveLength(10);
    expect(ADVENTURE_PROTOTYPE_SLOT_IDS).toHaveLength(10);

    // The exact slot id sequence, in the spec's table (book) order.
    expect(prompts.map((p) => p.slot)).toEqual([
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

    for (const p of prompts) {
      expect(p.useReference, p.slot).toBe(true);
    }
  });

  it("leaves no {placeholder} or [FIELD] token in any prompt", () => {
    const prompts = buildStory8PrototypePrompts(PET, STYLE);
    for (const p of prompts) {
      expect(p.prompt, p.slot).not.toMatch(/\{[a-zA-Z]/); // no {placeholder}
      expect(p.prompt, p.slot).not.toMatch(/\[[A-Z_]+\]/); // no [MERGE_FIELD]
      // The pet description is woven into every prompt.
      expect(p.prompt, p.slot).toContain(PET);
    }
  });

  it("the climax prompt carries the side-leap / no-foreshortening instruction", () => {
    const prompts = buildStory8PrototypePrompts(PET, STYLE);
    const climax = prompts.find((p) => p.slot === "adventure-climax")!;
    expect(climax.prompt).toMatch(/3\/4 side leap/i);
    expect(climax.prompt).toMatch(/full profile\/silhouette/i);
    expect(climax.prompt).toMatch(/never a foreshortened lunge toward the camera/i);
  });

  it("carries the same-animal / markings anchor AND the 3/4 pose rule on every prompt", () => {
    const prompts = buildStory8PrototypePrompts(PET, STYLE);
    for (const p of prompts) {
      expect(p.prompt, p.slot).toMatch(/same animal as in the reference images/i);
      expect(p.prompt, p.slot).toMatch(/identical breed markings/i);
      expect(p.prompt, p.slot).toMatch(/3\/4 or side dynamic pose/i);
      expect(p.prompt, p.slot).toMatch(/no extreme foreshortening/i);
    }
  });

  it("never instructs a face-obscuring costume — it bans one instead", () => {
    const prompts = buildStory8PrototypePrompts(PET, STYLE);
    for (const p of prompts) {
      // The discipline phrasing is present...
      expect(p.prompt, p.slot).toMatch(
        /must not obscure the face, eyes, ears, or markings/i,
      );
      // ...and no prompt ever asks for a costume/hat OVER the face/eyes.
      expect(p.prompt, p.slot).not.toMatch(/(costume|hat|prop)[^.]*over (the )?(face|eyes|head)/i);
    }
  });

  it("carries the dynamic-watercolor palette modifier on every prompt", () => {
    const prompts = buildStory8PrototypePrompts(PET, STYLE);
    for (const p of prompts) {
      expect(p.prompt, p.slot).toMatch(/soft warm watercolor but dynamic/i);
      expect(p.prompt, p.slot).toMatch(/never flat-cartoon or clipart/i);
    }
  });

  it("reflects the chosen illustration style in the prompts", () => {
    const pencil = buildStory8PrototypePrompts(PET, "pencil");
    expect(pencil[0].prompt).toMatch(/pencil-sketch/i);

    const storybook = buildStory8PrototypePrompts(PET, "storybook");
    expect(storybook[0].prompt).toMatch(/storybook/i);
  });

  it("degrades gracefully when the pet description is blank", () => {
    const prompts = buildStory8PrototypePrompts("", STYLE);
    for (const p of prompts) {
      expect(p.prompt, p.slot).not.toMatch(/\{[a-zA-Z]/);
      expect(p.prompt, p.slot).toContain("the pet in the reference images");
    }
  });
});

describe("buildStory8PrototypePrompt", () => {
  it("builds a single slot with the pet woven into the beat brief", () => {
    const cover = buildStory8PrototypePrompt("adventure-cover", PET, STYLE);
    expect(cover.slot).toBe("adventure-cover");
    expect(cover.useReference).toBe(true);
    expect(cover.prompt).toContain(PET);
    expect(cover.prompt).toMatch(/HERO SHOT/);
  });

  it("only the climax slot gets the explicit side-leap instruction", () => {
    const clue = buildStory8PrototypePrompt("adventure-clue", PET, STYLE);
    expect(clue.prompt).not.toMatch(/3\/4 side leap/i);

    const climax = buildStory8PrototypePrompt("adventure-climax", PET, STYLE);
    expect(climax.prompt).toMatch(/3\/4 side leap/i);
  });
});
