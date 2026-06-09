import { describe, it, expect } from "vitest";

import {
  buildCoverPortraitPrompt,
  buildBeliefWashPrompt,
  buildStory2SlotPrompts,
} from "./story2-prompts";
import { buildReferencePrompt } from "./generate";
import type {
  IllustrationStyle,
  LetterBeliefFrame,
} from "@/lib/session/types";
import { murphySession, story2SessionWith } from "@/lib/story/story2/fixtures";

// Everything in lib/ai/story2-prompts.ts is PURE (no IO, no SDK), so these
// assertions run directly on a session — no OpenAI mock needed. We check that the
// cover-portrait prompt reuses the reference path's style + consistency clause and
// adds the keepsake-cover framing; that the belief-wash prompt branches per
// `beliefFrame` and is always photo-/pet-free; and that the per-session slot map
// is exactly the two Premium slots with the right `useReference` flags.

// ---------------------------------------------------------------------------
// buildCoverPortraitPrompt — reuses the reference path + keepsake framing
// ---------------------------------------------------------------------------

describe("buildCoverPortraitPrompt", () => {
  it("embeds buildReferencePrompt's full output (style + consistency clause)", () => {
    // The cover IS essentially the reference-illustration path, so the entire
    // reference prompt must be carried through verbatim.
    const reference = buildReferencePrompt("a rescue mutt", "watercolor");
    const cover = buildCoverPortraitPrompt("a rescue mutt", "watercolor");
    expect(cover).toContain(reference);
  });

  it("carries the watercolor style phrasing (via the reference clause)", () => {
    const cover = buildCoverPortraitPrompt("a rescue mutt", "watercolor");
    expect(cover).toContain("soft watercolor children's-book illustration");
  });

  it("always carries the exact-appearance consistency clause", () => {
    const cover = buildCoverPortraitPrompt("a tabby cat", "storybook");
    expect(cover).toContain(
      "Maintain the pet's exact appearance — color, markings, and breed characteristics — from the reference photo.",
    );
  });

  it("adds the keepsake-cover framing: single subject, looking back, white space", () => {
    const cover = buildCoverPortraitPrompt("a bunny", "pencil");
    expect(cover).toContain("single subject");
    expect(cover).toContain("looking back");
    expect(cover).toContain("white space");
    // "the cover of a book of poems, not a children's product" intent.
    expect(cover).toContain("book of poems");
  });

  it("reflects the chosen illustration style", () => {
    expect(buildCoverPortraitPrompt("a dog", "watercolor")).toContain(
      "soft watercolor children's-book illustration",
    );
    expect(buildCoverPortraitPrompt("a dog", "storybook")).toContain(
      "gentle storybook children's-book illustration",
    );
    expect(buildCoverPortraitPrompt("a dog", "pencil")).toContain(
      "soft pencil-sketch children's-book illustration",
    );
  });

  it("leaves NO literal {placeholder} token in the prompt", () => {
    const cover = buildCoverPortraitPrompt(
      "a sweet rescue mutt with the lopsided grin",
      "watercolor",
    );
    expect(cover).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ---------------------------------------------------------------------------
// buildBeliefWashPrompt — branches per beliefFrame, always pet-free
// ---------------------------------------------------------------------------

describe("buildBeliefWashPrompt", () => {
  const frames: LetterBeliefFrame[] = ["rainbow-bridge", "heaven", "secular"];

  it("produces a distinct prompt for each of the three belief frames", () => {
    const prompts = frames.map((f) => buildBeliefWashPrompt(f, "watercolor"));
    expect(new Set(prompts).size).toBe(frames.length);
  });

  it("rainbow-bridge renders an abstract sunlit meadow", () => {
    const prompt = buildBeliefWashPrompt("rainbow-bridge", "watercolor");
    expect(prompt).toContain("meadow");
    expect(prompt.toLowerCase()).toContain("golden hour");
  });

  it("heaven renders an abstract sunlit landscape", () => {
    const prompt = buildBeliefWashPrompt("heaven", "watercolor");
    expect(prompt.toLowerCase()).toMatch(/landscape|meadow/);
  });

  it("secular renders a single quiet object (leash hook / empty bed), not a meadow", () => {
    const prompt = buildBeliefWashPrompt("secular", "watercolor");
    expect(prompt.toLowerCase()).toMatch(/leash|bed/);
  });

  it("EVERY frame is explicitly pet-free / figure-free (no animal, no figure, no people)", () => {
    // The Page-5 master brief: "abstract, no figure". The wash is photo-free, so
    // the prompt must explicitly forbid any animal/figure/person in all branches.
    for (const frame of frames) {
      const prompt = buildBeliefWashPrompt(frame, "watercolor").toLowerCase();
      expect(prompt, frame).toContain("no animal");
      expect(prompt, frame).toContain("no figure");
      expect(prompt, frame).toContain("no people");
    }
  });

  it("applies the chosen illustration style phrasing in each frame", () => {
    expect(buildBeliefWashPrompt("rainbow-bridge", "watercolor")).toContain(
      "soft watercolor",
    );
    expect(buildBeliefWashPrompt("heaven", "storybook")).toContain(
      "gentle storybook",
    );
    expect(buildBeliefWashPrompt("secular", "pencil")).toContain(
      "soft pencil-sketch",
    );
  });

  it("covers every IllustrationStyle with a distinct phrase", () => {
    const styles: IllustrationStyle[] = ["watercolor", "storybook", "pencil"];
    const prompts = styles.map((s) => buildBeliefWashPrompt("rainbow-bridge", s));
    expect(new Set(prompts).size).toBe(styles.length);
  });

  it("leaves NO literal {placeholder} token in any frame", () => {
    for (const frame of frames) {
      expect(buildBeliefWashPrompt(frame, "watercolor"), frame).not.toMatch(
        /\{[a-zA-Z]+\}/,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// buildStory2SlotPrompts — exactly the two Premium slots, correct useReference
// ---------------------------------------------------------------------------

describe("buildStory2SlotPrompts", () => {
  it("returns exactly the letter-cover and letter-page-5 slots", () => {
    const prompts = buildStory2SlotPrompts(murphySession());
    expect(Object.keys(prompts).sort()).toEqual(["letter-cover", "letter-page-5"]);
  });

  it("the cover slot uses the photo as a reference (useReference: true)", () => {
    const prompts = buildStory2SlotPrompts(murphySession());
    expect(prompts["letter-cover"]?.useReference).toBe(true);
  });

  it("the belief-wash slot uses NO reference (useReference: false)", () => {
    const prompts = buildStory2SlotPrompts(murphySession());
    expect(prompts["letter-page-5"]?.useReference).toBe(false);
  });

  it("wires the cover prompt to buildCoverPortraitPrompt(breedColor + species, style)", () => {
    const session = murphySession();
    const expected = buildCoverPortraitPrompt(
      `${session.pet.breedColor} ${session.pet.species}`,
      session.pet.illustrationStyle,
    );
    expect(buildStory2SlotPrompts(session)["letter-cover"]?.prompt).toBe(expected);
  });

  it("wires the wash prompt to buildBeliefWashPrompt(beliefFrame, style)", () => {
    const session = murphySession();
    const expected = buildBeliefWashPrompt(
      session.toggles.beliefFrame,
      session.pet.illustrationStyle,
    );
    expect(buildStory2SlotPrompts(session)["letter-page-5"]?.prompt).toBe(expected);
  });

  it("branches the wash prompt on the session's beliefFrame (not Murphy-hardcoded)", () => {
    const rainbow = buildStory2SlotPrompts(
      story2SessionWith({ toggles: { beliefFrame: "rainbow-bridge" } }),
    )["letter-page-5"]?.prompt;
    const secular = buildStory2SlotPrompts(
      story2SessionWith({ toggles: { beliefFrame: "secular" } }),
    )["letter-page-5"]?.prompt;
    expect(rainbow).not.toBe(secular);
    expect(secular?.toLowerCase()).toMatch(/leash|bed/);
  });

  it("leaves NO literal {placeholder} token in either slot prompt", () => {
    const prompts = buildStory2SlotPrompts(murphySession());
    for (const [slot, slotPrompt] of Object.entries(prompts)) {
      expect(slotPrompt?.prompt, slot).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });
});
