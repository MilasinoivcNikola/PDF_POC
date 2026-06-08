import { describe, it, expect } from "vitest";

import {
  buildScenePrompts,
  buildScenePromptFromPage,
  SCENE_PAGE_IDS,
} from "./prompts";
import type { IllustrationStyle } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import { resolveStory } from "@/lib/story/variants";
import { pageById } from "@/lib/story/fixtures";
import { otisSession, sessionWith } from "@/lib/story/fixtures";

// Everything in lib/ai/prompts.ts is PURE (no IO, no SDK), so these assertions
// run directly on a session — no OpenAI mock needed. We check that the full
// scene set resolves, that NO `{placeholder}` token survives into any prompt,
// that the customer's personalization is present, and that the style +
// pet-consistency clauses are baked into every scene.

// ---------------------------------------------------------------------------
// SCENE_PAGE_IDS — the scene set must match the prototype/generating.html set
// ---------------------------------------------------------------------------

describe("SCENE_PAGE_IDS", () => {
  it("covers the cover + pages 1–12, and excludes the back cover", () => {
    expect(SCENE_PAGE_IDS).toEqual([
      "cover",
      "page-1",
      "page-2",
      "page-3",
      "page-4",
      "page-5",
      "page-6",
      "page-7",
      "page-8",
      "page-9",
      "page-10",
      "page-11",
      "page-12",
    ]);
  });

  it("is exactly 13 illustrated slots (cover + 12 pages)", () => {
    expect(SCENE_PAGE_IDS).toHaveLength(13);
  });

  it("does not include the back cover (a writing page, not a pet scene)", () => {
    expect(SCENE_PAGE_IDS).not.toContain("back-cover");
  });
});

// ---------------------------------------------------------------------------
// buildScenePromptFromPage — one resolved page → one scene prompt
// ---------------------------------------------------------------------------

describe("buildScenePromptFromPage", () => {
  const story = resolveStory(otisSession());

  it("wraps the resolved illustration brief in the 'same pet' framing", () => {
    const cover = pageById(story, "cover");
    const prompt = buildScenePromptFromPage(cover, "watercolor");
    expect(prompt).toContain(
      "Children's-book scene of the same pet shown in the reference images:",
    );
    // The page's resolved brief text is carried through verbatim (trimmed).
    expect(prompt).toContain(cover.illustrationBrief.trim());
  });

  it("carries the style/consistency clause with warm-pastel + golden-hour wording", () => {
    const page4 = pageById(story, "page-4");
    const prompt = buildScenePromptFromPage(page4, "watercolor");
    expect(prompt).toContain("Warm pastel palette");
    expect(prompt).toContain("soft golden-hour light");
    expect(prompt).toContain("no pure black");
    // The same-animal pet-consistency requirement.
    expect(prompt).toContain(
      "The pet must be the same animal as in the reference images",
    );
    expect(prompt).toContain("identical breed markings, coat color, eye color, and body posture");
    // Child rendered stylized (3/4 or from behind) per the style guide.
    expect(prompt).toContain("3/4 view or seen from behind");
  });

  it("reflects the chosen illustration style phrasing", () => {
    const cover = pageById(story, "cover");
    expect(buildScenePromptFromPage(cover, "watercolor")).toContain(
      "soft watercolor children's-book style",
    );
    expect(buildScenePromptFromPage(cover, "storybook")).toContain(
      "gentle storybook children's-book style",
    );
    expect(buildScenePromptFromPage(cover, "pencil")).toContain(
      "soft pencil-sketch children's-book style",
    );
  });
});

// ---------------------------------------------------------------------------
// buildScenePrompts — every scene prompt for a session
// ---------------------------------------------------------------------------

describe("buildScenePrompts", () => {
  it("produces a prompt for exactly the SCENE_PAGE_IDS set", () => {
    const prompts = buildScenePrompts(otisSession());
    expect(Object.keys(prompts).sort()).toEqual([...SCENE_PAGE_IDS].sort());
  });

  it("does not produce a prompt for the back cover", () => {
    const prompts = buildScenePrompts(otisSession());
    expect(prompts).not.toHaveProperty("back-cover");
  });

  it("leaves NO literal {placeholder} token in any scene prompt", () => {
    // The central production-checklist rule, carried into the art prompts: a
    // surviving "{petName}" etc. would mean the brief wasn't merged.
    const prompts = buildScenePrompts(otisSession());
    for (const [page, prompt] of Object.entries(prompts)) {
      expect(prompt, `page ${page}`).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });

  it("personalizes prompts with the pet name, child name, activity, and sleeping spot", () => {
    const prompts = buildScenePrompts(otisSession());

    // Pet name appears across the set (cover, page-1, etc.).
    expect(prompts["cover"]).toContain("Otis");
    // Child name on the cover brief ("...with Emma...").
    expect(prompts["cover"]).toContain("Emma");
    // Favorite activity merged into Page 4's brief.
    expect(prompts["page-4"]).toContain("chasing tennis balls in the backyard");
    // Sleeping spot merged into Page 5's brief.
    expect(prompts["page-5"]).toContain("at the foot of your bed");
  });

  it("derives the object pronoun into the cover brief ('leaning against him')", () => {
    const he = buildScenePrompts(otisSession());
    expect(he["cover"]).toContain("leaning against him");

    const she = buildScenePrompts(sessionWith({ pet: { pronoun: "she" } }));
    expect(she["cover"]).toContain("leaning against her");

    const they = buildScenePrompts(sessionWith({ pet: { pronoun: "they" } }));
    expect(they["cover"]).toContain("leaning against them");
  });

  it("applies the chosen illustration style to every scene prompt", () => {
    const prompts = buildScenePrompts(
      sessionWith({ pet: { illustrationStyle: "pencil" } }),
    );
    for (const [page, prompt] of Object.entries(prompts)) {
      expect(prompt, `page ${page}`).toContain(
        "soft pencil-sketch children's-book style",
      );
    }
  });

  it("carries the consistency clause on every scene prompt", () => {
    const prompts = buildScenePrompts(otisSession());
    for (const [page, prompt] of Object.entries(prompts)) {
      expect(prompt, `page ${page}`).toContain(
        "The pet must be the same animal as in the reference images",
      );
    }
  });

  it("personalizes correctly for a cat with a different child/activity (not Otis-hardcoded)", () => {
    const session = sessionWith({
      pet: {
        name: "Mittens",
        species: "cat",
        breedColor: "black tabby with a white chest patch",
        pronoun: "she",
      },
      child: { name: "Leo" },
      memories: {
        favoriteActivity: "napping in the sunbeam by the window",
        sleepingSpot: "on the warm radiator",
      },
    });
    const prompts = buildScenePrompts(session);
    expect(prompts["cover"]).toContain("Mittens");
    expect(prompts["cover"]).toContain("Leo");
    expect(prompts["page-4"]).toContain("napping in the sunbeam by the window");
    expect(prompts["page-5"]).toContain("on the warm radiator");
    // No leftover Otis-specific data.
    expect(prompts["cover"]).not.toContain("Otis");
  });

  it("throws MergeError for a sparse session with a blank required field", () => {
    // A blank child name is a missing required merge field — the brief carries
    // {childName}, so resolveStory throws and so must the prompt builder.
    const sparse = sessionWith({ child: { name: "" } });
    expect(() => buildScenePrompts(sparse)).toThrowError(
      /missing or empty merge field/i,
    );
  });

  it("covers every IllustrationStyle with distinct prompt text", () => {
    const styles: IllustrationStyle[] = ["watercolor", "storybook", "pencil"];
    const covers = styles.map(
      (style) => buildScenePrompts(sessionWith({ pet: { illustrationStyle: style } }))["cover"],
    );
    expect(new Set(covers).size).toBe(styles.length);
  });

  it("produces a non-empty prompt for every illustrated page", () => {
    const prompts = buildScenePrompts(otisSession());
    for (const page of SCENE_PAGE_IDS as PageId[]) {
      expect(prompts[page], `page ${page}`).toBeTruthy();
      expect(prompts[page].length, `page ${page}`).toBeGreaterThan(50);
    }
  });
});
