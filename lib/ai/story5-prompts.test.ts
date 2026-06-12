import { describe, it, expect } from "vitest";

import { buildStory5SlotPrompts } from "./story5-prompts";
import {
  buildCoverPortraitPrompt,
  buildBeliefWashPrompt,
} from "./story2-prompts";
import { buildReferencePrompt } from "./generate";
import type { LetterBeliefFrame } from "@/lib/session/types";
import { murphySession5, story5SessionWith } from "@/lib/story/story5/fixtures";

// Story 5's imagery shape is IDENTICAL to Story 2's (reference cover + figure-free
// belief wash), so story5-prompts.ts re-keys Story 2's builders to Story 5's slot
// ids — there is no new prompt logic. These assertions confirm exactly that: the
// per-session slot map is the two Premium slots with the right `useReference` flags;
// the cover wires through `buildCoverPortraitPrompt` (carrying the reference path's
// style + consistency clause); and the wash wires through `buildBeliefWashPrompt`
// keyed by the session's belief frame (always photo-/pet-free). Everything is PURE
// (no IO, no SDK), so no OpenAI mock is needed. (buildCoverPortraitPrompt /
// buildBeliefWashPrompt are themselves covered by story2-prompts.test.ts; here we
// verify the Story-5 wiring + re-assert the load-bearing clauses on the actual
// Story-5 prompt strings.)

// ---------------------------------------------------------------------------
// buildStory5SlotPrompts — exactly the two Premium slots, correct useReference
// ---------------------------------------------------------------------------

describe("buildStory5SlotPrompts", () => {
  it("returns exactly the note-cover and note-page-5 slots", () => {
    const prompts = buildStory5SlotPrompts(murphySession5());
    expect(Object.keys(prompts).sort()).toEqual(["note-cover", "note-page-5"]);
  });

  it("the cover slot uses the photo as a reference (useReference: true)", () => {
    const prompts = buildStory5SlotPrompts(murphySession5());
    expect(prompts["note-cover"]?.useReference).toBe(true);
  });

  it("the belief-wash slot uses NO reference (useReference: false)", () => {
    const prompts = buildStory5SlotPrompts(murphySession5());
    expect(prompts["note-page-5"]?.useReference).toBe(false);
  });

  it("wires the cover prompt to buildCoverPortraitPrompt(breedColor + species, style)", () => {
    const session = murphySession5();
    const expected = buildCoverPortraitPrompt(
      `${session.pet.breedColor} ${session.pet.species}`,
      session.pet.illustrationStyle,
    );
    expect(buildStory5SlotPrompts(session)["note-cover"]?.prompt).toBe(expected);
  });

  it("wires the wash prompt to buildBeliefWashPrompt(beliefFrame, style)", () => {
    const session = murphySession5();
    const expected = buildBeliefWashPrompt(
      session.toggles.beliefFrame,
      session.pet.illustrationStyle,
    );
    expect(buildStory5SlotPrompts(session)["note-page-5"]?.prompt).toBe(expected);
  });

  // -------------------------------------------------------------------------
  // Cover slot — carries the reference path's style + consistency clause
  // -------------------------------------------------------------------------

  it("the cover prompt embeds buildReferencePrompt's full output (style + consistency clause)", () => {
    const session = murphySession5();
    const reference = buildReferencePrompt(
      `${session.pet.breedColor} ${session.pet.species}`,
      session.pet.illustrationStyle,
    );
    const cover = buildStory5SlotPrompts(session)["note-cover"]?.prompt;
    expect(cover).toContain(reference);
  });

  it("the cover prompt always carries the exact-appearance consistency clause", () => {
    const cover = buildStory5SlotPrompts(murphySession5())["note-cover"]?.prompt;
    expect(cover).toContain(
      "Maintain the pet's exact appearance — color, markings, and breed characteristics — from the reference photo.",
    );
  });

  it("the cover prompt reflects the chosen illustration style", () => {
    const storybook = buildStory5SlotPrompts(
      story5SessionWith({ pet: { illustrationStyle: "storybook" } }),
    )["note-cover"]?.prompt;
    expect(storybook).toContain("gentle storybook children's-book illustration");
  });

  // -------------------------------------------------------------------------
  // Wash slot — figure-free, keyed by belief frame
  // -------------------------------------------------------------------------

  it("branches the wash prompt on the session's beliefFrame (not Murphy-hardcoded)", () => {
    const rainbow = buildStory5SlotPrompts(
      story5SessionWith({ toggles: { beliefFrame: "rainbow-bridge" } }),
    )["note-page-5"]?.prompt;
    const secular = buildStory5SlotPrompts(
      story5SessionWith({ toggles: { beliefFrame: "secular" } }),
    )["note-page-5"]?.prompt;
    expect(rainbow).not.toBe(secular);
    expect(secular?.toLowerCase()).toMatch(/leash|bed/);
  });

  it("the wash prompt is explicitly pet-free / figure-free for EVERY belief frame", () => {
    // The Page-5 master brief: "abstract, no figure". The wash is photo-free, so
    // the prompt must forbid any animal/figure/person in all branches.
    const frames: LetterBeliefFrame[] = ["rainbow-bridge", "heaven", "secular"];
    for (const frame of frames) {
      const wash = buildStory5SlotPrompts(
        story5SessionWith({ toggles: { beliefFrame: frame } }),
      )["note-page-5"]?.prompt?.toLowerCase();
      expect(wash, frame).toContain("no animal");
      expect(wash, frame).toContain("no figure");
      expect(wash, frame).toContain("no people");
    }
  });

  it("leaves NO literal {placeholder} / [BRACKET] token in either slot prompt", () => {
    const prompts = buildStory5SlotPrompts(murphySession5());
    for (const [slot, slotPrompt] of Object.entries(prompts)) {
      expect(slotPrompt?.prompt, slot).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(slotPrompt?.prompt, slot).not.toMatch(/\[[A-Z_]+\]/);
    }
  });
});
