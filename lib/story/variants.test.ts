import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import { composeVariants, resolveStory } from "@/lib/story/variants";
import type {
  AgeBracket,
  BeliefFrame,
  DeathType,
} from "@/lib/session/types";
import { otisSession, sessionWith, pageById } from "@/lib/story/fixtures";

// Variant composition under test. Each dimension must change exactly the right
// page(s); the wording asserted here is pinned to the master template
// (context/masterstories/story-1-master-template.md), not a paraphrase.

// ---------------------------------------------------------------------------
// composeVariants returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const composed = composeVariants(otisSession());
    const cover = composed.find((p) => p.id === "cover")!;
    expect(cover.title).toContain("{petName}");
  });

  it("does not mutate across calls (each starts from a fresh master copy)", () => {
    // A euthanasia compose must not bleed into a later natural compose.
    composeVariants(sessionWith({ toggles: { deathType: "euthanasia" } }));
    const natural = composeVariants(otisSession());
    const page7 = natural.find((p) => p.id === "page-7")!;
    expect(page7.body.join(" ")).toContain("{petName}'s body got tired.");
    expect(page7.body.join(" ")).not.toContain("a doctor helps them");
  });
});

// ---------------------------------------------------------------------------
// Death type → Page 7
// ---------------------------------------------------------------------------

describe("deathType selects the Page 7 body", () => {
  function page7Body(deathType: DeathType): string {
    const story = resolveStory(sessionWith({ toggles: { deathType } }));
    return pageById(story, "page-7").body.join("\n");
  }

  it("natural (default): uses the master body", () => {
    const body = page7Body("natural");
    expect(body).toContain("Otis's body got tired.");
    expect(body).toContain('And then, very gently, his body stopped working. That is what "died" means.');
  });

  it("illness: names the long sickness, keeps the word \"died\"", () => {
    const body = page7Body("illness");
    expect(body).toContain("had been sick for a long time");
    expect(body).toMatch(/\bdied\b/);
    expect(body).not.toContain("Otis's body got tired.");
  });

  it("sudden: verbatim template variant", () => {
    const body = page7Body("sudden");
    expect(body).toContain(
      "Sometimes, Otis's body got tired all at once, without warning. We didn't get to say goodbye the way we wanted to. That is one of the hardest parts. It is not anyone's fault.",
    );
    expect(body).toMatch(/\bdied\b/);
  });

  it("euthanasia: verbatim template variant, uses the object pronoun", () => {
    const body = page7Body("euthanasia");
    expect(body).toContain(
      "When a pet's body is too tired or hurting, sometimes a doctor helps them stop hurting. That is the kindest thing we can do for someone we love. Otis's body stopped working, very gently, with people who loved him right there.",
    );
    expect(body).toMatch(/\bdied\b/);
  });

  it("only Page 7 changes between natural and euthanasia", () => {
    const a = resolveStory(otisSession());
    const b = resolveStory(sessionWith({ toggles: { deathType: "euthanasia" } }));
    for (const page of a) {
      const other = pageById(b, page.id);
      if (page.id === "page-7") {
        expect(other.body).not.toEqual(page.body);
      } else {
        expect(other.body).toEqual(page.body);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Belief frame → Page 9
// ---------------------------------------------------------------------------

describe("beliefFrame selects the Page 9 body", () => {
  function page9Body(beliefFrame: BeliefFrame): string {
    const story = resolveStory(sessionWith({ toggles: { beliefFrame } }));
    return pageById(story, "page-9").body.join("\n");
  }

  it("rainbow-bridge (default): the Rainbow Bridge meadow body", () => {
    const body = page9Body("rainbow-bridge");
    expect(body).toContain("Some people say there is a place called the Rainbow Bridge.");
    expect(body).toContain(
      "Where Otis is free to spend his days chasing tennis balls in the backyard.",
    );
    // Regression: favoriteActivity is stored as a gerund ("chasing …"), so the
    // Page 9 frame must not jam it after "can" (the old "can chasing" bug).
    expect(body).not.toContain("can chasing");
  });

  it("heaven: verbatim peaceful-place body", () => {
    const body = page9Body("heaven");
    expect(body).toContain(
      "Many families believe that pets who die go to a peaceful place — a sunny meadow, or heaven, or somewhere their bodies are not tired anymore.",
    );
    expect(body).toContain("Wherever Otis is now, he is at peace.");
    expect(body).not.toContain("Rainbow Bridge");
  });

  it("secular: the memory-stays body", () => {
    const body = page9Body("secular");
    expect(body).toContain("Otis's body is not here anymore.");
    expect(body).toContain("all of that stays in our hearts. That is where Otis lives now.");
    expect(body).not.toContain("Rainbow Bridge");
  });

  it("none: intentionally reuses the secular body (no afterlife claim)", () => {
    expect(page9Body("none")).toBe(page9Body("secular"));
  });

  it("only Page 9 changes between rainbow-bridge and heaven", () => {
    const a = resolveStory(otisSession());
    const b = resolveStory(sessionWith({ toggles: { beliefFrame: "heaven" } }));
    for (const page of a) {
      const other = pageById(b, page.id);
      if (page.id === "page-9") {
        expect(other.body).not.toEqual(page.body);
      } else {
        expect(other.body).toEqual(page.body);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Other pets → Page 11
// ---------------------------------------------------------------------------

describe("otherPetsInHome appends to Page 11", () => {
  const EXTRA =
    "And when the other pets in your home want extra cuddles, they probably miss Otis too. You can comfort each other.";

  it('"yes" appends the extra line as the final Page 11 paragraph', () => {
    const story = resolveStory(sessionWith({ toggles: { otherPetsInHome: "yes" } }));
    const body = pageById(story, "page-11").body;
    expect(body[body.length - 1]).toBe(EXTRA);
  });

  it('"no" does not append the extra line', () => {
    const story = resolveStory(otisSession());
    const body = pageById(story, "page-11").body;
    expect(body.join("\n")).not.toContain("want extra cuddles");
  });
});

// ---------------------------------------------------------------------------
// Age bracket → Pages 7 / 8 / 9 / 11
// ---------------------------------------------------------------------------

describe("ageBracket selects the right Page 7 / 8 / 11 wording", () => {
  function pages(ageBracket: AgeBracket, deathType: DeathType = "natural") {
    const story = resolveStory(
      sessionWith({ child: { ageBracket }, toggles: { deathType } }),
    );
    return {
      p7: pageById(story, "page-7").body.join("\n"),
      p8: pageById(story, "page-8").body.join("\n"),
      p9: pageById(story, "page-9").body.join("\n"),
      p11: pageById(story, "page-11").body.join("\n"),
    };
  }

  describe("3-5 (preschool simplification)", () => {
    it("uses the simplified Page 7 wording", () => {
      const { p7 } = pages("3-5");
      expect(p7).toContain("After a long, happy life, Otis's body got very tired.");
      expect(p7).toContain('That is what "died" means.');
      expect(p7).not.toContain("a beginning, a middle, and an end");
    });

    it("uses the simplified Page 8 (single feeling) wording", () => {
      const { p8 } = pages("3-5");
      expect(p8).toContain("This might make Emma feel sad. Maybe very sad.");
      expect(p8).toContain("It's okay to feel sad. It means you loved Otis.");
      expect(p8).not.toContain("Maybe angry");
    });

    it("reduces Page 11 to two actions", () => {
      const { p11 } = pages("3-5");
      expect(p11).toContain("Look at a picture and remember.");
      expect(p11).toContain("Say Otis's name.");
      expect(p11).not.toContain("Tell a story about");
    });

    it("OVERRIDES the death-type Page-7 swap (3-5 has its own single body)", () => {
      // Even with euthanasia selected, 3-5 must show the simplified body, not
      // the euthanasia variant.
      const { p7 } = pages("3-5", "euthanasia");
      expect(p7).toContain("After a long, happy life, Otis's body got very tired.");
      expect(p7).not.toContain("a doctor helps them stop hurting");
    });
  });

  describe("6-8 (default)", () => {
    it("uses the unmodified master bodies for 7 / 8 / 11", () => {
      const def = resolveStory(otisSession());
      const six = resolveStory(sessionWith({ child: { ageBracket: "6-8" } }));
      for (const id of ["page-7", "page-8", "page-11"] as const) {
        expect(pageById(six, id).body).toEqual(pageById(def, id).body);
      }
    });
  });

  describe("9-12 (older child, appends extras)", () => {
    it("appends the extra sentence on Page 7", () => {
      const { p7 } = pages("9-12");
      // Keeps the default master body...
      expect(p7).toContain("Otis's body got tired.");
      // ...and adds the older-child line.
      expect(p7).toContain(
        "It is one of the hardest things about being alive: the people and animals we love don't stay forever. But the love does.",
      );
    });

    it("appends the grief-comes-in-waves line on Page 8", () => {
      const { p8 } = pages("9-12");
      expect(p8).toContain(
        "Some days Emma will feel okay, and then he will feel sad again out of nowhere. Grief is like that. It comes in waves.",
      );
    });

    it("appends the love-another-pet line on Page 11", () => {
      const { p11 } = pages("9-12");
      expect(p11).toContain(
        "And when Emma is ready, it is okay to love another pet someday. Loving a new pet does not replace Otis. It just means Emma's heart is big enough for both.",
      );
    });

    it("adds the Page-9 euthanasia line ONLY when deathType is euthanasia", () => {
      const EUTH_LINE =
        "If Emma is wondering whether anything could have been done differently — the answer is no. Letting Otis go was the most loving choice.";

      const withEuth = pages("9-12", "euthanasia");
      expect(withEuth.p9).toContain(EUTH_LINE);

      const withNatural = pages("9-12", "natural");
      expect(withNatural.p9).not.toContain(EUTH_LINE);
    });
  });
});

// ---------------------------------------------------------------------------
// Full-variant smoke: every combination still resolves with no leftover token
// ---------------------------------------------------------------------------

describe("every variant combination resolves cleanly", () => {
  it("leaves no {placeholder} across all age × death × belief × pets combos", () => {
    const ages = ["3-5", "6-8", "9-12"] as const;
    const deaths = ["natural", "illness", "sudden", "euthanasia"] as const;
    const beliefs = ["rainbow-bridge", "heaven", "secular", "none"] as const;
    const pets = ["yes", "no"] as const;

    for (const ageBracket of ages) {
      for (const deathType of deaths) {
        for (const beliefFrame of beliefs) {
          for (const otherPetsInHome of pets) {
            const story = resolveStory(
              sessionWith({
                child: { ageBracket },
                toggles: { deathType, beliefFrame, otherPetsInHome },
              }),
            );
            for (const page of story) {
              const strings = [
                ...(page.title !== undefined ? [page.title] : []),
                ...(page.subtitle !== undefined ? [page.subtitle] : []),
                ...page.body,
                page.illustrationBrief,
              ];
              for (const text of strings) {
                PLACEHOLDER_PATTERN.lastIndex = 0;
                expect(
                  PLACEHOLDER_PATTERN.test(text),
                  `unresolved token (${ageBracket}/${deathType}/${beliefFrame}/${otherPetsInHome}): ${text}`,
                ).toBe(false);
              }
            }
          }
        }
      }
    }
  });
});
