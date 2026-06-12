import { describe, it, expect } from "vitest";

import {
  buildJoyScenePrompt,
  buildStory4SlotPrompts,
} from "./story4-prompts";
import { buildCoverPortraitPrompt } from "./story2-prompts";
import { buildReferencePrompt } from "./generate";
import type { IllustrationStyle } from "@/lib/session/types";
import { biscuitSession, story4SessionWith } from "@/lib/story/story4/fixtures";

// Everything in lib/ai/story4-prompts.ts is PURE (no IO, no SDK), so these
// assertions run directly on a session — no OpenAI mock needed. Story 4 ("If
// [PET_NAME] Could Talk") is the living twin of Story 2, but its imagery shape
// DIVERGES in one load-bearing way: BOTH Premium slots reference the photo (the
// pet appears in the cover portrait AND the page-4 daily-joy scene), whereas
// Story 2's Page-5 belief wash was figure-free / photo-free. We lock that
// divergence here: the page-4 scene reuses the same "maintain the pet's exact
// appearance" consistency clause the reference path uses, and both slots carry
// `useReference: true`. We also pin the page-4 art's PATH-INDEPENDENCE — the
// living/memorial tense affects only the text, never the art.

// ---------------------------------------------------------------------------
// buildJoyScenePrompt — the one full scene: pet doing the activity, in the spot
// ---------------------------------------------------------------------------

describe("buildJoyScenePrompt", () => {
  it("includes the favorite activity from the session", () => {
    const prompt = buildJoyScenePrompt(biscuitSession(), "watercolor");
    expect(prompt).toContain(
      biscuitSession().memories.favoriteActivity,
    );
  });

  it("includes the favorite spot from the session", () => {
    const prompt = buildJoyScenePrompt(biscuitSession(), "watercolor");
    expect(prompt).toContain(biscuitSession().memories.favoriteSpots);
  });

  it("frames the scene in warm golden-hour light", () => {
    const prompt = buildJoyScenePrompt(biscuitSession(), "watercolor").toLowerCase();
    expect(prompt).toContain("golden-hour");
    expect(prompt).toMatch(/warm|sun/);
  });

  it("carries the exact-appearance consistency clause (it IS the pet — reference-anchored)", () => {
    // The headline divergence from Story 2's figure-free wash: this scene is the
    // real pet, so it must carry the same consistency clause buildReferencePrompt
    // uses, to keep the full-width animal recognizably the same.
    const prompt = buildJoyScenePrompt(biscuitSession(), "storybook");
    expect(prompt).toContain(
      "Maintain the pet's exact appearance — color, markings, and breed characteristics — from the reference photo.",
    );
  });

  it("references the uploaded photo (so the orchestrator anchors the pet)", () => {
    const prompt = buildJoyScenePrompt(biscuitSession(), "watercolor");
    expect(prompt).toContain("reference photo");
  });

  it("weaves the pet description (breedColor + species) into the scene", () => {
    const session = biscuitSession();
    const prompt = buildJoyScenePrompt(session, "watercolor");
    expect(prompt).toContain(
      `${session.pet.breedColor} ${session.pet.species}`,
    );
  });

  it("is PATH-INDEPENDENT: byte-identical for a living vs memorial session", () => {
    // The memorial tense changes only the TEXT (the letter wording), never the
    // art. So the page-4 scene prompt must be identical regardless of the toggle.
    const living = buildJoyScenePrompt(
      story4SessionWith({ toggles: { livingOrMemorial: "living" } }),
      "watercolor",
    );
    const memorial = buildJoyScenePrompt(
      story4SessionWith({ toggles: { livingOrMemorial: "memorial" } }),
      "watercolor",
    );
    expect(memorial).toBe(living);
  });

  it("reflects the chosen illustration style", () => {
    expect(buildJoyScenePrompt(biscuitSession(), "watercolor")).toContain(
      "soft watercolor",
    );
    expect(buildJoyScenePrompt(biscuitSession(), "storybook")).toContain(
      "gentle storybook",
    );
    expect(buildJoyScenePrompt(biscuitSession(), "pencil")).toContain(
      "soft pencil-sketch",
    );
  });

  it("covers every IllustrationStyle with a distinct phrase", () => {
    const styles: IllustrationStyle[] = ["watercolor", "storybook", "pencil"];
    const prompts = styles.map((s) => buildJoyScenePrompt(biscuitSession(), s));
    expect(new Set(prompts).size).toBe(styles.length);
  });

  it("degrades gracefully when activity + spot are blank (no surviving tokens, no dangling punctuation)", () => {
    // Sparse-input handling: an empty activity/spot must not leave a literal
    // {placeholder} or a malformed sentence. Mirrors the Story-2 sparse-input
    // checks — a blank field falls back to a generic, well-formed clause.
    const sparse = buildJoyScenePrompt(
      story4SessionWith({ memories: { favoriteActivity: "", favoriteSpots: "" } }),
      "watercolor",
    );
    expect(sparse).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(sparse).not.toMatch(/\[[A-Z_]+\]/);
    expect(sparse).not.toContain(", .");
  });

  it("leaves NO literal {placeholder} / [BRACKET] token in the prompt", () => {
    const prompt = buildJoyScenePrompt(biscuitSession(), "watercolor");
    expect(prompt).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(prompt).not.toMatch(/\[[A-Z_]+\]/);
  });
});

// ---------------------------------------------------------------------------
// buildStory4SlotPrompts — exactly two Premium slots, BOTH reference-anchored
// ---------------------------------------------------------------------------

describe("buildStory4SlotPrompts", () => {
  it("returns exactly the talk-cover and talk-page-4 slots", () => {
    const prompts = buildStory4SlotPrompts(biscuitSession());
    expect(Object.keys(prompts).sort()).toEqual(["talk-cover", "talk-page-4"]);
  });

  it("the cover slot uses the photo as a reference (useReference: true)", () => {
    const prompts = buildStory4SlotPrompts(biscuitSession());
    expect(prompts["talk-cover"]?.useReference).toBe(true);
  });

  it("the page-4 scene slot ALSO uses the photo as a reference (useReference: true) — the divergence from Story 2", () => {
    // THE headline test: Story 2's page-5 wash was `useReference: false`; Story 4's
    // page-4 scene is the real pet, so it is `useReference: true`. Both Story-4
    // slots are reference-anchored.
    const prompts = buildStory4SlotPrompts(biscuitSession());
    expect(prompts["talk-page-4"]?.useReference).toBe(true);
  });

  it("BOTH slots carry useReference: true", () => {
    const prompts = buildStory4SlotPrompts(biscuitSession());
    for (const [slot, slotPrompt] of Object.entries(prompts)) {
      expect(slotPrompt?.useReference, slot).toBe(true);
    }
  });

  it("wires the cover prompt to buildCoverPortraitPrompt(breedColor + species, style)", () => {
    const session = biscuitSession();
    const expected = buildCoverPortraitPrompt(
      `${session.pet.breedColor} ${session.pet.species}`,
      session.pet.illustrationStyle,
    );
    expect(buildStory4SlotPrompts(session)["talk-cover"]?.prompt).toBe(expected);
  });

  it("the cover prompt embeds buildReferencePrompt's output (style + consistency clause)", () => {
    const session = biscuitSession();
    const reference = buildReferencePrompt(
      `${session.pet.breedColor} ${session.pet.species}`,
      session.pet.illustrationStyle,
    );
    const cover = buildStory4SlotPrompts(session)["talk-cover"]?.prompt;
    expect(cover).toContain(reference);
  });

  it("the cover prompt carries the exact-appearance consistency clause", () => {
    const cover = buildStory4SlotPrompts(biscuitSession())["talk-cover"]?.prompt;
    expect(cover).toContain(
      "Maintain the pet's exact appearance — color, markings, and breed characteristics — from the reference photo.",
    );
  });

  it("wires the page-4 prompt to buildJoyScenePrompt(session, style)", () => {
    const session = biscuitSession();
    const expected = buildJoyScenePrompt(session, session.pet.illustrationStyle);
    expect(buildStory4SlotPrompts(session)["talk-page-4"]?.prompt).toBe(expected);
  });

  it("reflects the session's illustration style in both slots", () => {
    const session = story4SessionWith({ pet: { illustrationStyle: "pencil" } });
    const prompts = buildStory4SlotPrompts(session);
    expect(prompts["talk-cover"]?.prompt).toContain("soft pencil-sketch");
    expect(prompts["talk-page-4"]?.prompt).toContain("soft pencil-sketch");
  });

  it("leaves NO literal {placeholder} / [BRACKET] token in either slot prompt", () => {
    const prompts = buildStory4SlotPrompts(biscuitSession());
    for (const [slot, slotPrompt] of Object.entries(prompts)) {
      expect(slotPrompt?.prompt, slot).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(slotPrompt?.prompt, slot).not.toMatch(/\[[A-Z_]+\]/);
    }
  });
});
