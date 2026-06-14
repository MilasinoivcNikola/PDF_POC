import { describe, it, expect } from "vitest";

import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import type { Story8PageId } from "@/lib/story/master-text";
import { composeVariants8, resolveStory8 } from "@/lib/story/story8/variants";
import {
  biscuitSession8,
  story8SessionWith,
} from "@/lib/story/story8/fixtures";

// Variant composition for Story 8 ("The Amazing Adventures of [PET_NAME]") under
// test — the catalog's first JOYFUL kids' adventure. Five dimensions: adventure
// theme (backyard-mystery authored; others fall back), hero count (pet-solo rewrites
// the child out), age bracket (3-5 simplifies climax + gentles the wobble; 9-12
// lengthens), species (the superpower stock — exercised in merge.test.ts), sidekick
// present (Page-5 party line, pet-plus only). Each dimension must change exactly the
// right page. The wording asserted is pinned to the master template
// (story-8-master-template.md) and authored here, not imported from the source.

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story8PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-8 book`);
  }
  return page;
}

/** The joined body text of a resolved page. */
function bodyOf(story: ResolvedStory, id: Story8PageId): string {
  return pageById(story, id).body.join(" ");
}

// ---------------------------------------------------------------------------
// composeVariants8 returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants8", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const story = composeVariants8(biscuitSession8());
    const all = story.flatMap((p) => [...p.body, p.illustrationBrief]).join(" ");
    expect(all).toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ---------------------------------------------------------------------------
// Dimension 1 — adventure theme (backyard-mystery only; others fall back)
// ---------------------------------------------------------------------------

describe("dimension: adventure theme", () => {
  it("backyard-mystery (default) fills the backyard arc", () => {
    const story = resolveStory8(biscuitSession8());
    expect(pageById(story, "adventure-cover").subtitle).toContain(
      "The Backyard Mystery",
    );
    expect(bodyOf(story, "adventure-discovery")).toContain(
      "high up in the old oak tree",
    );
  });

  it("a non-authored theme falls back to backyard-mystery (never a half-themed page)", () => {
    for (const theme of ["sea-voyage", "space-rescue", "enchanted-forest"] as const) {
      const story = resolveStory8(
        story8SessionWith({
          toggles: {
            adventureTheme: theme,
            heroCount: "pet-plus",
            childAgeBracket: "6-8",
          },
        }),
      );
      // Identical to the backyard-mystery render (the fallback is total, not partial).
      const backyard = resolveStory8(biscuitSession8());
      expect(story, theme).toEqual(backyard);
    }
  });
});

// ---------------------------------------------------------------------------
// Dimension 2 — hero count (pet-solo rewrites the call + expedition + child out)
// ---------------------------------------------------------------------------

describe("dimension: hero count", () => {
  it("pet-plus (default) keeps the child as a co-adventurer", () => {
    const story = resolveStory8(biscuitSession8());
    expect(pageById(story, "adventure-cover").subtitle).toBe(
      "The Backyard Mystery — starring Emma and Biscuit",
    );
    expect(bodyOf(story, "adventure-call")).toContain(
      "\"My favorite red sock is GONE!\" said Emma.",
    );
    expect(bodyOf(story, "adventure-deeper")).toContain(
      "The trail led Biscuit and Emma on a grand backyard expedition.",
    );
  });

  it("pet-solo recasts the child as the reader on the call beat (Page 3)", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { childName: undefined, sidekickName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    expect(pageById(story, "adventure-cover").subtitle).toBe(
      "The Backyard Mystery — starring Biscuit",
    );
    expect(bodyOf(story, "adventure-call")).toContain(
      "Nobody else noticed. But Biscuit did. Biscuit always did.",
    );
    expect(bodyOf(story, "adventure-call")).not.toContain("said Emma");
  });

  it("pet-solo rewrites the first-clue cheer child-free (Page 4)", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { childName: undefined, sidekickName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    // The pet finds the clue in the lone-hero voice — no child cheering.
    expect(bodyOf(story, "adventure-clue")).toContain(
      "Biscuit found it! Nobody else had noticed a thing. But Biscuit did.",
    );
    expect(bodyOf(story, "adventure-clue")).not.toContain("cheered");
    expect(bodyOf(story, "adventure-clue")).not.toContain("the child");
  });

  it("pet-plus keeps the child cheering on the first clue (Page 4)", () => {
    const story = resolveStory8(biscuitSession8());
    expect(bodyOf(story, "adventure-clue")).toContain(
      "\"You found it!\" cheered Emma.",
    );
  });

  it("pet-solo sends the pet alone on the expedition (Page 5, no child)", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { childName: undefined, sidekickName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    expect(bodyOf(story, "adventure-deeper")).toContain(
      "The trail led Biscuit on a grand backyard expedition.",
    );
    expect(bodyOf(story, "adventure-deeper")).not.toContain("and Emma");
  });

  it("pet-solo drops the child from every other scene too (Pages 1, 2, 6, 9, 10)", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { childName: undefined, sidekickName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    expect(bodyOf(story, "adventure-ordinary")).toContain(
      "the very best friend a family could ask for",
    );
    expect(bodyOf(story, "adventure-discovery")).toContain(
      "was the missing red sock!",
    );
    expect(bodyOf(story, "adventure-celebration")).toContain(
      "The favorite red sock was found.",
    );
    expect(bodyOf(story, "adventure-home")).toContain(
      "in his favorite warm spot",
    );
  });
});

// ---------------------------------------------------------------------------
// Dimension 3 — age bracket (3-5 simplifies climax + gentles wobble; 9-12 lengthens)
// ---------------------------------------------------------------------------

describe("dimension: age bracket", () => {
  it("6-8 (default) uses the master climax", () => {
    const climax = bodyOf(resolveStory8(biscuitSession8()), "adventure-climax");
    expect(climax).toContain("With one MIGHTY, magnificent, never-before-seen leap");
  });

  it("3-5 simplifies the climax to one clean action sentence", () => {
    const story = resolveStory8(
      story8SessionWith({
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-plus",
          childAgeBracket: "3-5",
        },
      }),
    );
    expect(bodyOf(story, "adventure-climax")).toContain(
      "With one big, brave jump, Biscuit helped the baby bird back to its branch. Safe!",
    );
    expect(bodyOf(story, "adventure-climax")).not.toContain(
      "never-before-seen leap",
    );
  });

  it("3-5 gentles the wobble (shorter, even milder)", () => {
    const story = resolveStory8(
      story8SessionWith({
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-plus",
          childAgeBracket: "3-5",
        },
      }),
    );
    expect(bodyOf(story, "adventure-wobble")).toContain(
      "But the adventure wasn't quite over.",
    );
    // The 3-5 wobble drops the "frightened cheep" intensity of the 6-8 master.
    expect(bodyOf(story, "adventure-wobble")).not.toContain("frightened cheep");
  });

  it("9-12 lengthens the climax and keeps the sequel hook", () => {
    const story = resolveStory8(
      story8SessionWith({
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-plus",
          childAgeBracket: "9-12",
        },
      }),
    );
    expect(bodyOf(story, "adventure-climax")).toContain(
      "absolutely-never-before-attempted leap",
    );
    // The sequel hook (closing) is unchanged by age.
    expect(bodyOf(story, "adventure-closing")).toContain(
      "until the next amazing adventure",
    );
  });
});

// ---------------------------------------------------------------------------
// Dimension 5 — sidekick present (Page-5 party line, pet-plus only)
// ---------------------------------------------------------------------------

describe("dimension: sidekick present", () => {
  it("inserts the Page-5 party line when sidekickName is set AND pet-plus", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { sidekickName: "Leo", childName: "Emma" },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-plus",
          childAgeBracket: "6-8",
        },
      }),
    );
    expect(bodyOf(story, "adventure-deeper")).toContain(
      "Biscuit, Emma, and Leo followed the trail together.",
    );
  });

  it("omits the party line when sidekickName is absent", () => {
    const story = resolveStory8(
      story8SessionWith({ adventure: { sidekickName: undefined } }),
    );
    expect(bodyOf(story, "adventure-deeper")).not.toContain(
      "followed the trail together",
    );
  });

  it("does NOT insert the party line in pet-solo even when sidekickName is set", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { sidekickName: "Leo", childName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    expect(bodyOf(story, "adventure-deeper")).not.toContain(
      "followed the trail together",
    );
  });
});
