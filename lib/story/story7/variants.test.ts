import { describe, it, expect } from "vitest";

import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import type { Story7PageId } from "@/lib/story/master-text";
import { composeVariants7, resolveStory7 } from "@/lib/story/story7/variants";
import {
  biscuitSession7,
  story7SessionWith,
} from "@/lib/story/story7/fixtures";

// Variant composition for Story 7 ("Welcome Home — [PET_NAME]'s Gotcha Day") under
// test — the catalog's first JOYFUL, non-memorial book. Six dimensions: occasion,
// adoption source (the 5 origin sentences + thank-you gating), life stage
// (senior/puppy beats), species (cat swaps), child present, family present. Each
// dimension must change exactly the right page, with the optional beats dropping
// cleanly when absent. The wording asserted is pinned to the master template
// (story-7-master-template.md) and authored here, not imported from the source.

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story7PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-7 book`);
  }
  return page;
}

/** The joined body text of a resolved page. */
function bodyOf(story: ResolvedStory, id: Story7PageId): string {
  return pageById(story, id).body.join(" ");
}

// ---------------------------------------------------------------------------
// composeVariants7 returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants7", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const story = composeVariants7(biscuitSession7());
    const all = story.flatMap((p) => [...p.body, p.illustrationBrief]).join(" ");
    expect(all).toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ---------------------------------------------------------------------------
// Dimension 1 — occasion (cover / dedication / Page 7 / closing / back cover)
// ---------------------------------------------------------------------------

describe("dimension: occasion", () => {
  it("new-arrival (default) uses the 'became ours' subtitle + 'welcome home' closing", () => {
    const story = resolveStory7(biscuitSession7());
    expect(pageById(story, "welcome-cover").subtitle).toBe(
      "The story of the day you became ours",
    );
    expect(bodyOf(story, "welcome-closing")).toContain("So welcome home, Biscuit.");
    expect(pageById(story, "welcome-back-cover").title).toBe(
      "The story of Biscuit's first days with us",
    );
  });

  it("gotcha-day-anniversary reframes the cover, Page 7, closing, and back cover", () => {
    const story = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "shelter",
          lifeStage: "adult",
          yearsHome: "3",
        },
      }),
    );
    expect(pageById(story, "welcome-cover").subtitle).toBe(
      "Happy Gotcha Day, Biscuit",
    );
    expect(bodyOf(story, "welcome-now-ours")).toContain(
      "And now, 3 years on, you're just part of it",
    );
    expect(bodyOf(story, "welcome-closing")).toContain("So happy Gotcha Day, Biscuit.");
    expect(bodyOf(story, "welcome-closing")).toContain("3 years ago today");
    expect(pageById(story, "welcome-back-cover").title).toBe(
      "A new memory from this year with Biscuit",
    );
  });

  it("anniversary dedication carries the 'years home, and counting' line", () => {
    const story = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "shelter",
          lifeStage: "adult",
          yearsHome: "3",
        },
      }),
    );
    expect(pageById(story, "welcome-dedication").body).toContain(
      "3 years home, and counting.",
    );
  });

  it("{yearsHome} renders '1 year' singular vs 'N years' plural", () => {
    const one = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "shelter",
          lifeStage: "adult",
          yearsHome: "1",
        },
      }),
    );
    expect(bodyOf(one, "welcome-now-ours")).toContain("1 year on");
    expect(bodyOf(one, "welcome-closing")).toContain("1 year ago today");
    expect(pageById(one, "welcome-dedication").body).toContain(
      "1 year home, and counting.",
    );

    const many = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "shelter",
          lifeStage: "adult",
          yearsHome: "4",
        },
      }),
    );
    expect(bodyOf(many, "welcome-now-ours")).toContain("4 years on");
    expect(bodyOf(many, "welcome-dedication").includes("4 years home, and counting."))
      .toBe(true);
  });

  it("anniversary with no yearsHome degrades gracefully (no dangling {yearsHome}, no crash)", () => {
    const story = resolveStory7(
      story7SessionWith({
        memories: { dateAdopted: "March 2023" },
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "shelter",
          lifeStage: "adult",
          yearsHome: undefined,
        },
      }),
    );
    const dedication = pageById(story, "welcome-dedication").body;
    // No "years home" line (yearsHome absent); the body pages fall back to the
    // new-arrival wording so no {yearsHome} placeholder is ever left to fail merge.
    expect(dedication.join(" ")).not.toContain("home, and counting");
    expect(dedication.every((p) => p.trim().length > 0)).toBe(true);
    expect(bodyOf(story, "welcome-closing")).toContain("So welcome home, Biscuit.");
    expect(bodyOf(story, "welcome-now-ours")).toContain("Now you're just part of it.");
    // The cover subtitle reframe still applies (it carries no {yearsHome}).
    expect(pageById(story, "welcome-cover").subtitle).toBe("Happy Gotcha Day, Biscuit");
  });
});

// ---------------------------------------------------------------------------
// Dimension 2 — adoption source (Page 3 origin sentence + thank-you gating)
// ---------------------------------------------------------------------------

describe("dimension: adoption source — the 5 origin sentences + thank-you gating", () => {
  const fragments: Record<string, string> = {
    shelter: "We went to the shelter not quite sure what we were looking for",
    rescue: "A rescue had been keeping you safe",
    breeder: "We had been counting the days until we could meet you",
    "found-as-stray": "You found us, really.",
    other: "However you came to us",
  };

  for (const [source, fragment] of Object.entries(fragments)) {
    it(`uses the ${source} origin sentence on Page 3`, () => {
      const story = resolveStory7(
        story7SessionWith({
          toggles: {
            occasion: "new-arrival",
            adoptionSource: source as never,
            lifeStage: "adult",
          },
        }),
      );
      expect(bodyOf(story, "welcome-choosing")).toContain(fragment);
    });
  }

  it("includes the thank-you-to-the-past line ONLY for shelter/rescue/found-as-stray", () => {
    const withThanks = ["shelter", "rescue", "found-as-stray"];
    for (const source of withThanks) {
      const story = resolveStory7(
        story7SessionWith({
          toggles: {
            occasion: "new-arrival",
            adoptionSource: source as never,
            lifeStage: "adult",
          },
        }),
      );
      expect(
        bodyOf(story, "welcome-choosing").toLowerCase().includes("thank you"),
        `${source} should thank the past`,
      ).toBe(true);
    }
    for (const source of ["breeder", "other"]) {
      const story = resolveStory7(
        story7SessionWith({
          toggles: {
            occasion: "new-arrival",
            adoptionSource: source as never,
            lifeStage: "adult",
          },
        }),
      );
      expect(
        bodyOf(story, "welcome-choosing").toLowerCase().includes("thank you"),
        `${source} should NOT thank the past`,
      ).toBe(false);
    }
  });

  it("found-as-stray softens the Page-4 opener to 'we took you home'", () => {
    const story = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "new-arrival",
          adoptionSource: "found-as-stray",
          lifeStage: "adult",
        },
      }),
    );
    expect(bodyOf(story, "welcome-drive-home")).toContain(
      "Then we took you home — and you let us",
    );
    expect(bodyOf(story, "welcome-drive-home")).not.toContain(
      "Then we brought you home.",
    );
  });

  it("non-stray sources keep the default 'we brought you home' opener", () => {
    const story = resolveStory7(biscuitSession7()); // shelter
    expect(bodyOf(story, "welcome-drive-home")).toContain(
      "Then we brought you home.",
    );
  });
});

// ---------------------------------------------------------------------------
// Dimension 3 — life stage (senior beats on Pages 2 & 5; puppy lean on Page 4)
// ---------------------------------------------------------------------------

describe("dimension: life stage", () => {
  it("senior-adoption adds the Page-2 'you were waiting too' beat", () => {
    const story = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "new-arrival",
          adoptionSource: "shelter",
          lifeStage: "senior-adoption",
        },
      }),
    );
    expect(bodyOf(story, "welcome-before")).toContain(
      "And somewhere, you were waiting too. You had been waiting a long time.",
    );
  });

  it("senior-adoption adds the Page-5 'a lot of places that weren't home' beat", () => {
    const story = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "new-arrival",
          adoptionSource: "shelter",
          lifeStage: "senior-adoption",
        },
      }),
    );
    expect(bodyOf(story, "welcome-first-night")).toContain(
      "You had slept in a lot of places that weren't home. This one was.",
    );
  });

  it("puppy-kitten leans younger on Page 4 ('fit in the crook of an arm')", () => {
    const story = resolveStory7(
      story7SessionWith({
        toggles: {
          occasion: "new-arrival",
          adoptionSource: "shelter",
          lifeStage: "puppy-kitten",
        },
      }),
    );
    expect(bodyOf(story, "welcome-drive-home")).toContain(
      "You were so small you fit in the crook of an arm.",
    );
  });

  it("adult (default) adds none of the life-stage beats", () => {
    const story = resolveStory7(biscuitSession7()); // adult
    expect(bodyOf(story, "welcome-before")).not.toContain("you were waiting too");
    expect(bodyOf(story, "welcome-first-night")).not.toContain(
      "a lot of places that weren't home",
    );
    expect(bodyOf(story, "welcome-drive-home")).not.toContain(
      "fit in the crook of an arm",
    );
  });
});

// ---------------------------------------------------------------------------
// Dimension 4 — species (Page 2 absence line; Page 5 cat settle-on-cue beat)
// ---------------------------------------------------------------------------

describe("dimension: species", () => {
  it("cat swaps the Page-2 absence line to a windowsill", () => {
    const story = resolveStory7(story7SessionWith({ pet: { species: "cat" } }));
    expect(bodyOf(story, "welcome-before")).toContain(
      "A windowsill with nobody sitting in it.",
    );
    expect(bodyOf(story, "welcome-before")).not.toContain(
      "A walk that nobody asked for.",
    );
  });

  it("cat does not settle on cue on Page 5 ('on your own terms, as always')", () => {
    const story = resolveStory7(story7SessionWith({ pet: { species: "cat" } }));
    expect(bodyOf(story, "welcome-first-night")).toContain(
      "on your own terms, as always",
    );
  });

  it("dog (default) keeps the walk line + the settle-on-cue beat", () => {
    const story = resolveStory7(biscuitSession7()); // dog
    expect(bodyOf(story, "welcome-before")).toContain(
      "A walk that nobody asked for.",
    );
    expect(bodyOf(story, "welcome-first-night")).toContain(
      "the questions went quiet, and you slept.",
    );
  });

  it("rabbit/bird/other fold to the dog-default species text", () => {
    for (const species of ["rabbit", "bird", "other"] as const) {
      const story = resolveStory7(story7SessionWith({ pet: { species } }));
      expect(bodyOf(story, "welcome-before")).toContain(
        "A walk that nobody asked for.",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// species: "other" renders the graceful "friend" noun in printed prose
// ---------------------------------------------------------------------------

describe('species "other" renders "friend" in printed prose (never "a other")', () => {
  // Three pages interpolate {speciesNoun} into prose: Page 3 ("every {speciesNoun}
  // in the whole wide world"), Page 6 ("a {speciesNoun} and a family become a
  // {speciesNoun} and their family" — TWO sites), Page 8 ("the new {speciesNoun}").
  // For "other" all render "friend"; dog/cat/rabbit/bird keep the literal word
  // (byte-identical). bodyOf is BODY prose only — the cover illustration brief keeps
  // the raw "{species}" token (out of scope) and legitimately still says "other".
  it('reads "every friend", "a friend and a family", "the new friend" for "other"', () => {
    const story = resolveStory7(story7SessionWith({ pet: { species: "other" } }));
    const page3 = bodyOf(story, "welcome-choosing");
    const page6 = bodyOf(story, "welcome-learning");
    const page8 = bodyOf(story, "welcome-belong");
    expect(page3).toContain("out of every friend in the whole wide world");
    expect(page6).toContain(
      "how a friend and a family become a friend and their family",
    );
    expect(page8).toContain('You are not "the new friend."');
    // None of the broken raw-word renderings survive.
    expect(page3).not.toContain("every other");
    expect(page6).not.toContain("a other");
    expect(page8).not.toContain("the new other");
  });

  it("dog (default) keeps the literal species word — the swap is a no-op", () => {
    const story = resolveStory7(biscuitSession7()); // dog
    expect(bodyOf(story, "welcome-choosing")).toContain(
      "out of every dog in the whole wide world",
    );
    expect(bodyOf(story, "welcome-learning")).toContain(
      "how a dog and a family become a dog and their family",
    );
    expect(bodyOf(story, "welcome-belong")).toContain('You are not "the new dog."');
  });
});

// ---------------------------------------------------------------------------
// Dimension 5 — child present (Page 6 + Page 8 beats; omit cleanly when absent)
// ---------------------------------------------------------------------------

describe("dimension: child present", () => {
  it("adds the Page-6 'learned you fastest of all' beat when childName is set", () => {
    const story = resolveStory7(story7SessionWith({ memories: { childName: "Leo" } }));
    expect(bodyOf(story, "welcome-learning")).toContain(
      "Leo learned you fastest of all.",
    );
  });

  it("adds the Page-8 child beat when childName is set", () => {
    const story = resolveStory7(story7SessionWith({ memories: { childName: "Leo" } }));
    expect(bodyOf(story, "welcome-belong")).toContain(
      "most of all, some days, to Leo",
    );
  });

  it("omits both child beats cleanly when childName is absent", () => {
    const story = resolveStory7(
      story7SessionWith({ memories: { childName: undefined } }),
    );
    expect(bodyOf(story, "welcome-learning")).not.toContain(
      "learned you fastest of all",
    );
    expect(bodyOf(story, "welcome-belong")).not.toContain("most of all, some days");
    // The default Page-8 closer is intact.
    expect(bodyOf(story, "welcome-belong")).toContain(
      "You belong to us, and we belong to you",
    );
  });
});

// ---------------------------------------------------------------------------
// Dimension 6 — family members present (Page 7 'your people are' swap)
// ---------------------------------------------------------------------------

describe("dimension: family members present", () => {
  it("swaps the Page-7 'your people are' sentence to the named household", () => {
    const story = resolveStory7(
      story7SessionWith({
        memories: { familyMembers: "Maria, James, and the cat Pepper" },
      }),
    );
    expect(bodyOf(story, "welcome-now-ours")).toContain(
      "Your people are Maria, James, and the cat Pepper.",
    );
  });

  it("falls back to the owner names when familyMembers is absent", () => {
    const story = resolveStory7(
      story7SessionWith({ memories: { familyMembers: undefined } }),
    );
    expect(bodyOf(story, "welcome-now-ours")).toContain("Your people are Maria.");
  });
});

// ---------------------------------------------------------------------------
// Fallbacks — sparse homecoming memory / blank quirks (these live in merge.ts)
// ---------------------------------------------------------------------------

describe("optional-with-fallback inputs", () => {
  it("Page-4 falls back when homecomingMemory is blank", () => {
    const story = resolveStory7(
      story7SessionWith({ memories: { homecomingMemory: "" } }),
    );
    expect(bodyOf(story, "welcome-drive-home")).toContain(
      "You were so small in such a big new world.",
    );
  });

  it("Page-6 falls back when quirks is blank", () => {
    const story = resolveStory7(story7SessionWith({ memories: { quirks: "" } }));
    const body = bodyOf(story, "welcome-learning");
    expect(body).toContain(
      "We learned the way you tilt your head when you're thinking.",
    );
    // Regression: the blank-quirks fallback is a whole verbatim paragraph that
    // already opens with "We learned" and ends with a period. It must REPLACE the
    // "We learned {quirks}." line, not fill its slot — otherwise the prefix and the
    // period double up ("We learned We learned …only yours..").
    expect(body).not.toContain("We learned We learned");
    expect(body).not.toContain("yours..");
  });

  it("Page-6 keeps the 'We learned …' frame when quirks IS supplied", () => {
    const story = resolveStory7(
      story7SessionWith({ memories: { quirks: "the head-tilt at 'walk'" } }),
    );
    const body = bodyOf(story, "welcome-learning");
    expect(body).toContain("We learned the head-tilt at 'walk'.");
    expect(body).not.toContain("We learned We learned");
  });
});
