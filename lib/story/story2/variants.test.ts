import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import type { Story2PageId } from "@/lib/story/master-text";
import { composeVariants2, resolveStory2 } from "@/lib/story/story2/variants";
import {
  murphySession,
  story2SessionWith,
} from "@/lib/story/story2/fixtures";
import type {
  LetterBeliefFrame,
  LetterDeathType,
  Species,
} from "@/lib/session/types";

// Variant composition for Story 2 under test. Each dimension must change exactly
// the right page; the wording asserted is pinned to the master template
// (context/masterstories/story-2-master-template.md), not a paraphrase, and is
// authored here rather than imported from the source.

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story2PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-2 letter`);
  }
  return page;
}

// ---------------------------------------------------------------------------
// composeVariants2 returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants2", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const composed = composeVariants2(murphySession());
    const cover = composed.find((p) => p.id === "letter-cover")!;
    expect(cover.title).toContain("{petName}");
  });

  it("does not bleed state across calls (each starts from a fresh master copy)", () => {
    // A euthanasia compose must not leak into a later peaceful compose.
    composeVariants2(story2SessionWith({ toggles: { deathType: "euthanasia" } }));
    const peaceful = composeVariants2(murphySession());
    const page4 = peaceful.find((p) => p.id === "letter-page-4")!;
    expect(page4.body.join(" ")).toContain("I know what it cost you.");
    expect(page4.body.join(" ")).not.toContain(
      "the choice you made for me",
    );
  });
});

// ---------------------------------------------------------------------------
// Death type -> Page 4
// ---------------------------------------------------------------------------

describe("deathType selects the Page 4 body", () => {
  function page4(deathType: LetterDeathType): string {
    const story = resolveStory2(story2SessionWith({ toggles: { deathType } }));
    return pageById(story, "letter-page-4").body.join("\n");
  }

  it("peaceful (default): the master 'I know what it cost you' framing", () => {
    const body = page4("peaceful");
    expect(body).toContain("I know how it ended.");
    expect(body).toContain("There wasn't.");
    expect(body).not.toContain("the choice you made for me");
  });

  it("euthanasia: names the courage of the choice (bravest love)", () => {
    const body = page4("euthanasia");
    expect(body).toContain(
      "it was the kindest thing anyone has ever done for me",
    );
    expect(body).toContain("That is the bravest love there is.");
    expect(body).not.toContain("the dark hours after");
  });

  it("sudden: addresses the no-goodbye trauma directly", () => {
    const body = page4("sudden");
    expect(body).toContain("I know we didn't get the goodbye we wanted.");
    expect(body).toContain("The last thing I felt was being loved.");
  });

  it("illness: acknowledges the caretaking burden of the last months", () => {
    const body = page4("illness");
    expect(body).toContain(
      "I know how hard those last months were on you",
    );
    expect(body).toContain("choosing to stay through the hard part");
  });

  it("keeps the stable opening and closing across death types", () => {
    for (const deathType of [
      "peaceful",
      "illness",
      "sudden",
      "euthanasia",
    ] as const) {
      const body = page4(deathType);
      expect(body).toContain("I know how it ended.");
      expect(body).toContain(
        "I was loved every day of my life. I was warm, and full, and safe, and known. There is nothing more any of us can ask for.",
      );
    }
  });

  it("only Page 4 changes between peaceful and euthanasia", () => {
    const a = resolveStory2(murphySession());
    const b = resolveStory2(
      story2SessionWith({ toggles: { deathType: "euthanasia" } }),
    );
    for (const page of a) {
      const other = pageById(b, page.id as Story2PageId);
      if (page.id === "letter-page-4") {
        expect(other.body).not.toEqual(page.body);
      } else {
        expect(other.body).toEqual(page.body);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Belief frame -> Page 5
// ---------------------------------------------------------------------------

describe("beliefFrame selects the Page 5 body", () => {
  function page5(beliefFrame: LetterBeliefFrame): string {
    const story = resolveStory2(story2SessionWith({ toggles: { beliefFrame } }));
    return pageById(story, "letter-page-5").body.join("\n");
  }

  it("rainbow-bridge (default): the 'there is a now, somewhere' body", () => {
    const body = page5("rainbow-bridge");
    expect(body).toContain("Wherever I am now — and there is a now, somewhere");
    expect(body).toContain("My body moves the way it did when I was three years old.");
    expect(body).not.toContain("whatever heaven turns out to be");
  });

  it("heaven: explicitly religious, room for reunion", () => {
    const body = page5("heaven");
    expect(body).toContain(
      "whatever heaven turns out to be, it has a room for me",
    );
    expect(body).toContain("a room beside me for you");
  });

  it("secular: comfort from memory/presence, no afterlife claim", () => {
    const body = page5("secular");
    expect(body).toContain("I'm not anywhere now. Not the way I used to be.");
    expect(body).toContain("I am where you keep me. That is more than enough.");
    expect(body).not.toContain("heaven");
  });

  it("favoriteSpots is woven into every belief frame's Page 5", () => {
    const spots = "the windowsill where the morning light landed";
    for (const beliefFrame of [
      "rainbow-bridge",
      "heaven",
      "secular",
    ] as const) {
      const story = resolveStory2(
        story2SessionWith({ memories: { favoriteSpots: spots }, toggles: { beliefFrame } }),
      );
      expect(pageById(story, "letter-page-5").body.join(" ")).toContain(spots);
    }
  });

  it("only Page 5 changes between rainbow-bridge and secular", () => {
    const a = resolveStory2(murphySession());
    const b = resolveStory2(
      story2SessionWith({ toggles: { beliefFrame: "secular" } }),
    );
    for (const page of a) {
      const other = pageById(b, page.id as Story2PageId);
      if (page.id === "letter-page-5") {
        expect(other.body).not.toEqual(page.body);
      } else {
        expect(other.body).toEqual(page.body);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Species voice -> Pages 3 AND 6
// ---------------------------------------------------------------------------

describe("species selects the Page 3 voice line (and fills Page 6)", () => {
  // The per-species "kind of happy that…" line on Page 3, pinned to the template.
  const HAPPY_BY_SPECIES: Record<Species, string> = {
    dog: "the kind that runs in circles for no reason and doesn't need explaining",
    cat: "the kind of happy that loaf-shapes in a sunbeam and decides nothing else needs to happen today",
    rabbit:
      "the kind of happy that binkies across the floor for no reason at all",
    bird: "the kind of happy that sings when nobody asked",
    other:
      "the kind of happy that needs no reason and doesn't need explaining",
  };

  it("each species gets the right Page 3 'kind of happy' line", () => {
    for (const species of [
      "dog",
      "cat",
      "rabbit",
      "bird",
      "other",
    ] as const) {
      const story = resolveStory2(story2SessionWith({ pet: { species } }));
      const page3 = pageById(story, "letter-page-3").body.join(" ");
      expect(
        page3,
        `Page 3 happy line for ${species}`,
      ).toContain(HAPPY_BY_SPECIES[species]);
    }
  });

  it("'other' uses the species-neutral fallback voice line", () => {
    const story = resolveStory2(story2SessionWith({ pet: { species: "other" } }));
    const page3 = pageById(story, "letter-page-3").body.join(" ");
    expect(page3).toContain(HAPPY_BY_SPECIES.other);
    // It must not borrow another species' specific clause.
    expect(page3).not.toContain("loaf-shapes");
    expect(page3).not.toContain("binkies");
  });

  it("species fills Page 6 ('just a {species}' + 'as much as a {species} can love')", () => {
    for (const species of [
      "dog",
      "cat",
      "rabbit",
      "bird",
      "other",
    ] as const) {
      const story = resolveStory2(story2SessionWith({ pet: { species } }));
      const page6 = pageById(story, "letter-page-6").body.join(" ");
      expect(page6).toContain(`"just a ${species}."`);
      expect(page6).toContain(`as much as a ${species} can love`);
    }
  });

  it("the cat voice also swaps the Page 2 'stillness' sense line", () => {
    const story = resolveStory2(story2SessionWith({ pet: { species: "cat" } }));
    const page2 = pageById(story, "letter-page-2").body.join(" ");
    expect(page2).toContain("the kind of stillness that said I knew you were there");
    expect(page2).toContain("(even when I pretended otherwise)");
  });

  it("a non-cat species keeps the default 'ears that heard your car' Page 2 line", () => {
    const story = resolveStory2(story2SessionWith({ pet: { species: "dog" } }));
    const page2 = pageById(story, "letter-page-2").body.join(" ");
    expect(page2).toContain("ears that heard your car before anyone else's");
    expect(page2).not.toContain("the kind of stillness");
  });
});

// ---------------------------------------------------------------------------
// Relationship -> "you both" addressing
// ---------------------------------------------------------------------------

describe("relationship drives the addressing", () => {
  it('"couple" produces "you both" on Page 2', () => {
    const story = resolveStory2(
      story2SessionWith({ owner: { relationship: "couple" } }),
    );
    const page2 = pageById(story, "letter-page-2").body.join(" ");
    expect(page2).toContain("the letter I would have written you both");
    expect(page2).toContain("a heart that was always, always pointed at you both");
  });

  it('"single" (default) does NOT use the couple-only "you both" phrasing', () => {
    const story = resolveStory2(murphySession());
    const page2 = pageById(story, "letter-page-2").body.join(" ");
    expect(page2).toContain("the letter I would have written you.");
    expect(page2).not.toContain("you both");
    expect(page2).not.toContain("which of you needed me");
  });

  it("couple × cat composes the couple framing with the cat stillness", () => {
    const story = resolveStory2(
      story2SessionWith({
        owner: { relationship: "couple" },
        pet: { species: "cat" },
      }),
    );
    const page2 = pageById(story, "letter-page-2").body.join(" ");
    expect(page2).toContain("eyes that knew which of you needed me on any given day");
    expect(page2).toContain("the kind of stillness that said I knew you were there");
    expect(page2).toContain("pointed at you both");
  });
});

// ---------------------------------------------------------------------------
// New pet -> Page 6 extra paragraph
// ---------------------------------------------------------------------------

describe("newPet adjusts the Page 6 closing", () => {
  const NEW_PET_MARKER =
    "if, one day, you let another animal sleep in";

  it('"yes" inserts the extra paragraph BEFORE the always-included ending', () => {
    const story = resolveStory2(
      story2SessionWith({ toggles: { newPet: "yes" } }),
    );
    const page6 = pageById(story, "letter-page-6");
    const body = page6.body.join(" ");
    expect(body).toContain(NEW_PET_MARKER);
    expect(body).toContain("Loving them won't replace me.");

    // The signature ("Murphy") and the always-included "I loved you..." ending
    // must still come AFTER the new-pet paragraph.
    const newPetIdx = page6.body.findIndex((p) => p.includes(NEW_PET_MARKER));
    const endingIdx = page6.body.findIndex((p) =>
      p.startsWith("I loved you. I always did."),
    );
    const sigIdx = page6.body.indexOf("Murphy");
    expect(newPetIdx).toBeGreaterThan(-1);
    expect(endingIdx).toBeGreaterThan(newPetIdx);
    expect(sigIdx).toBeGreaterThan(endingIdx);
  });

  it('"no" (default): the extra paragraph is absent', () => {
    const story = resolveStory2(murphySession());
    const page6 = pageById(story, "letter-page-6").body.join(" ");
    expect(page6).not.toContain(NEW_PET_MARKER);
    // The always-included ending is still present.
    expect(page6).toContain("I loved you. I always did. I always will");
  });
});

// ---------------------------------------------------------------------------
// Gift-for -> cover inscription
// ---------------------------------------------------------------------------

describe("giftFor adjusts the cover inscription", () => {
  it('"friend" adds an inscription to the cover subtitle', () => {
    const story = resolveStory2(story2SessionWith({ toggles: { giftFor: "friend" } }));
    const cover = pageById(story, "letter-cover");
    // The letter body is still addressed to the owner ("for Sarah").
    expect(cover.subtitle).toContain("for Sarah");
    // ...with the gift inscription appended.
    expect(cover.subtitle).toContain("A keepsake, given with love.");
  });

  it('"self" (default): no inscription on the cover', () => {
    const cover = pageById(resolveStory2(murphySession()), "letter-cover");
    expect(cover.subtitle).toBe("for Sarah");
    expect(cover.subtitle).not.toContain("A keepsake, given with love.");
  });

  it("the gift inscription does not change the letter body (still to the owner)", () => {
    const gift = resolveStory2(story2SessionWith({ toggles: { giftFor: "friend" } }));
    const self = resolveStory2(murphySession());
    for (const page of self) {
      if (page.id === "letter-cover") continue;
      const other = pageById(gift, page.id as Story2PageId);
      expect(other.body).toEqual(page.body);
    }
    // Page 2 still opens "Dear Sarah," (the owner), not the gift-giver.
    expect(pageById(gift, "letter-page-2").body[0]).toBe("Dear Sarah,");
  });
});

// ---------------------------------------------------------------------------
// Full-variant smoke (mirror of merge.test.ts, kept here for the variant view)
// ---------------------------------------------------------------------------

describe("every variant combination composes + resolves cleanly", () => {
  it("leaves no {placeholder} across death × belief × relationship × species × gift × newPet", () => {
    const deaths = ["peaceful", "illness", "sudden", "euthanasia"] as const;
    const beliefs = ["rainbow-bridge", "heaven", "secular"] as const;
    const relationships = ["single", "couple"] as const;
    const species = ["dog", "cat", "rabbit", "bird", "other"] as const;
    const gifts = ["self", "friend"] as const;
    const newPets = ["yes", "no"] as const;

    for (const deathType of deaths) {
      for (const beliefFrame of beliefs) {
        for (const relationship of relationships) {
          for (const sp of species) {
            for (const giftFor of gifts) {
              for (const newPet of newPets) {
                const story = resolveStory2(
                  story2SessionWith({
                    pet: { species: sp },
                    owner: { relationship },
                    toggles: { deathType, beliefFrame, giftFor, newPet },
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
                      `unresolved token (${deathType}/${beliefFrame}/${relationship}/${sp}/${giftFor}/${newPet}): ${text}`,
                    ).toBe(false);
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});
