import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import type { Story4PageId } from "@/lib/story/master-text";
import { composeVariants4, resolveStory4 } from "@/lib/story/story4/variants";
import {
  biscuitSession,
  story4SessionWith,
} from "@/lib/story/story4/fixtures";
import type {
  LetterBeliefFrame,
  LetterDeathType,
  LivingOrMemorial,
  Relationship,
  Species,
} from "@/lib/session/types";

// Variant composition + the two-tense engine for Story 4 ("If [PET_NAME] Could
// Talk") under test. Each dimension must change exactly the right page; the
// headline `livingOrMemorial` toggle flips the WHOLE letter between present
// (celebration) and past (grief) tense, and the #1 risk this suite guards is a
// TENSE LEAK — a present-tense sentence surviving into a memorial letter, or a
// past-tense / death-naming sentence surviving into a living one. The wording
// asserted is pinned to the master template (story-4-master-template.md) and
// authored here, not imported from the source, so the assertion tests the text.

// ---------------------------------------------------------------------------
// Local helpers (mirror story2/variants.test.ts)
// ---------------------------------------------------------------------------

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story4PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-4 letter`);
  }
  return page;
}

// The session `Species` union has dog/cat/rabbit/bird/other (no horse slot —
// the template's horse/small-mammal voice folds into the "other" branch).
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const RELATIONSHIPS: Relationship[] = ["single", "couple"];
const DEATH_TYPES: LetterDeathType[] = [
  "peaceful",
  "illness",
  "sudden",
  "euthanasia",
];
const BELIEF_FRAMES: LetterBeliefFrame[] = ["rainbow-bridge", "heaven", "secular"];
const TENSES: LivingOrMemorial[] = ["living", "memorial"];

// ---------------------------------------------------------------------------
// composeVariants4 returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants4", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const composed = composeVariants4(biscuitSession());
    const cover = composed.find((p) => p.id === "talk-cover")!;
    expect(cover.title).toContain("{petName}");
    const page6 = composed.find((p) => p.id === "talk-page-6")!;
    expect(page6.body).toContain("{petName}");
  });

  it("does not bleed state across calls (each starts from a fresh master copy)", () => {
    // A memorial compose must not leak its past-tense / seam lines into a later
    // living compose.
    composeVariants4(
      story4SessionWith({ toggles: { livingOrMemorial: "memorial" } }),
    );
    const living = composeVariants4(biscuitSession());
    const page5 = living.find((p) => p.id === "talk-page-5")!;
    const body = page5.body.join(" ");
    expect(body).toContain("I already have everything.");
    // No memorial seam/close line piled on.
    expect(body).not.toContain("needs forgiving");
    expect(body).not.toContain("Wherever I am now");
    // Living page 5 has exactly the 4 present-tense paragraphs (no appended seams).
    expect(page5.body).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// The two-tense engine — TENSE LEAK guards (the headline risk)
// ---------------------------------------------------------------------------

describe("two-tense engine: memorial path carries no present-tense leak", () => {
  // Memorial pages 2/4 have NO present-tense-allowed exception — assert the
  // whole body. Page 5's FINAL line (the belief-frame close) is intentionally
  // present-tense in all three frames (verbatim "Wherever I am now…" template
  // copy, mirroring Story 2's "Wherever I am now" page), so the page-5 body
  // assertion is scoped to EXCLUDE that last line (see the page-5 block below).
  const PRESENT_TENSE_MARKERS = [
    /\bI am\b/,
    /\bI'm\b/,
    /\bI love\b/,
    /\bI have\b/,
    /\bI notice\b/,
    /\bI'd choose\b/,
  ];

  function assertNoPresentTense(lines: string[], where: string): void {
    const body = lines.join(" ");
    for (const marker of PRESENT_TENSE_MARKERS) {
      expect(
        marker.test(body),
        `present-tense marker ${marker} leaked into ${where}: ${body}`,
      ).toBe(false);
    }
  }

  it("pages 2 and 4 are fully past-tense across the memorial matrix", () => {
    for (const relationship of RELATIONSHIPS) {
      for (const species of SPECIES) {
        const story = resolveStory4(
          story4SessionWith({
            owner: { relationship },
            pet: { species },
            toggles: { livingOrMemorial: "memorial" },
          }),
        );
        assertNoPresentTense(
          pageById(story, "talk-page-2").body,
          `memorial page 2 (${relationship}/${species})`,
        );
        assertNoPresentTense(
          pageById(story, "talk-page-4").body,
          `memorial page 4 (${relationship}/${species})`,
        );
      }
    }
  });

  it("page 5 BODY (excluding the present-tense belief-close line) is past-tense", () => {
    // The memorial page-5 body is [truth, favorite, "not always easy", lastLine,
    // deathSeam, beliefClose]. The final beliefClose line is intentionally
    // present-tense ("Wherever I am now…" / "I'm in the spot by the door…"), so
    // a naive whole-page check would false-positive. Scope to body-minus-close.
    for (const relationship of RELATIONSHIPS) {
      for (const deathType of DEATH_TYPES) {
        for (const beliefFrame of BELIEF_FRAMES) {
          const page5 = pageById(
            resolveStory4(
              story4SessionWith({
                owner: { relationship },
                toggles: {
                  livingOrMemorial: "memorial",
                  deathType,
                  beliefFrame,
                },
              }),
            ),
            "talk-page-5",
          );
          const bodyWithoutClose = page5.body.slice(0, -1);
          assertNoPresentTense(
            bodyWithoutClose,
            `memorial page 5 body (${relationship}/${deathType}/${beliefFrame})`,
          );
        }
      }
    }
  });

  it("the EXCLUDED final page-5 line is the present-tense belief-close (sanity: the exception is real)", () => {
    // Confirms WHY we slice off the last line: it genuinely carries the
    // present-tense belief frame the rest of the memorial page deliberately avoids.
    const CLOSE_BY_FRAME: Record<LetterBeliefFrame, string> = {
      "rainbow-bridge": "Wherever I am now, I'm not tired",
      heaven: "Wherever I am now, there's a room for me",
      secular: "I'm not anywhere now, not the way I was. But I'm in the spot by the door",
    };
    for (const beliefFrame of BELIEF_FRAMES) {
      const page5 = pageById(
        resolveStory4(
          story4SessionWith({
            toggles: { livingOrMemorial: "memorial", beliefFrame },
          }),
        ),
        "talk-page-5",
      );
      const lastLine = page5.body[page5.body.length - 1];
      expect(lastLine).toContain(CLOSE_BY_FRAME[beliefFrame]);
    }
  });
});

describe("two-tense engine: living path never dies, never closes in past tense", () => {
  it("the living letter never says 'died' (or any death euphemism) in any combination", () => {
    const DEATH_WORDS = [
      "died",
      "passed away",
      "went to sleep",
      "crossed the rainbow bridge",
    ];
    for (const relationship of RELATIONSHIPS) {
      for (const species of SPECIES) {
        const story = resolveStory4(
          story4SessionWith({
            owner: { relationship },
            pet: { species },
            // Death-type / belief-frame are DORMANT in the living path; vary them
            // to prove they never inject a death line.
            toggles: {
              livingOrMemorial: "living",
              deathType: "euthanasia",
              beliefFrame: "heaven",
            },
          }),
        );
        const all = story
          .flatMap((p) => p.body)
          .join(" ")
          .toLowerCase();
        for (const word of DEATH_WORDS) {
          expect(
            all,
            `living letter mentions death "${word}" (${relationship}/${species})`,
          ).not.toContain(word);
        }
      }
    }
  });

  it("the living close (Page 6) is present-tense ('I love you. I always do.')", () => {
    const page6 = pageById(resolveStory4(biscuitSession()), "talk-page-6").body.join(
      " ",
    );
    expect(page6).toContain("I love you. I always do.");
    // The memorial past-tense valediction must NOT appear in the living path.
    expect(page6).not.toContain("I loved you. I always will");
    expect(page6).not.toContain("be sad for exactly as long");
  });

  it("the living path never injects the death-type seam or belief-close lines", () => {
    // Those lines are MEMORIAL-ONLY. Even with the toggles set, the living letter
    // must not show them.
    const SEAM_AND_CLOSE_MARKERS = [
      "There is nothing to forgive.",
      "That was enough. That was everything.",
      "needs forgiving",
      "what I kept",
      "Wherever I am now",
      "I'm where you keep me.",
    ];
    for (const deathType of DEATH_TYPES) {
      for (const beliefFrame of BELIEF_FRAMES) {
        const story = resolveStory4(
          story4SessionWith({
            toggles: { livingOrMemorial: "living", deathType, beliefFrame },
          }),
        );
        const all = story.flatMap((p) => p.body).join(" ");
        for (const marker of SEAM_AND_CLOSE_MARKERS) {
          expect(
            all,
            `living letter carries memorial-only line "${marker}" (${deathType}/${beliefFrame})`,
          ).not.toContain(marker);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Living vs memorial change every prose page (and only prose pages)
// ---------------------------------------------------------------------------

describe("livingOrMemorial flips the whole letter's tense", () => {
  it("every prose body page (2–6) differs between living and memorial", () => {
    const living = resolveStory4(biscuitSession());
    const memorial = resolveStory4(
      story4SessionWith({ toggles: { livingOrMemorial: "memorial" } }),
    );
    for (const id of [
      "talk-page-2",
      "talk-page-3",
      "talk-page-4",
      "talk-page-5",
      "talk-page-6",
    ] as const) {
      expect(
        pageById(memorial, id).body,
        `page ${id} should differ between tenses`,
      ).not.toEqual(pageById(living, id).body);
    }
  });

  it("'living' is the DEFAULT (an unset livingOrMemorial reads as living)", () => {
    // The base fixture is living; an explicit "living" must resolve identically.
    const fromDefault = resolveStory4(biscuitSession());
    const fromExplicit = resolveStory4(
      story4SessionWith({ toggles: { livingOrMemorial: "living" } }),
    );
    expect(fromExplicit).toEqual(fromDefault);
  });
});

// ---------------------------------------------------------------------------
// Memorial death type -> the Page 5 seam line
// ---------------------------------------------------------------------------

describe("memorial deathType selects the Page 5 seam line", () => {
  function page5(deathType: LetterDeathType): string {
    return pageById(
      resolveStory4(
        story4SessionWith({
          toggles: { livingOrMemorial: "memorial", deathType },
        }),
      ),
      "talk-page-5",
    ).body.join("\n");
  }

  it("euthanasia: names the kindness of letting go", () => {
    const body = page5("euthanasia");
    expect(body).toContain(
      "the last choice you made for me was the kindest thing anyone ever did",
    );
    expect(body).toContain("There is nothing to forgive.");
  });

  it("sudden: addresses the no-goodbye, not anyone's fault", () => {
    const body = page5("sudden");
    expect(body).toContain("We didn't get the goodbye we wanted.");
    expect(body).toContain("That was enough. That was everything.");
  });

  it("illness: acknowledges the caretaking of the last months", () => {
    const body = page5("illness");
    expect(body).toContain("Those last hard months");
    expect(body).toContain("choosing to stay through it");
  });

  it("peaceful: a long, good life and a soft end", () => {
    const body = page5("peaceful");
    expect(body).toContain("I had a long, good life, and a soft end.");
    expect(body).toContain("needs forgiving");
  });

  it("the seam line carries NO humor marker (the death page is always still)", () => {
    // Product rule: the memorial death-type line is never funny.
    for (const deathType of DEATH_TYPES) {
      const seamLine = pageById(
        resolveStory4(
          story4SessionWith({
            toggles: { livingOrMemorial: "memorial", deathType },
          }),
        ),
        "talk-page-5",
        // seam line is the second-to-last element (close is last).
      ).body.slice(-2, -1)[0];
      expect(seamLine, `deathType=${deathType}`).not.toContain("!");
      const lower = seamLine.toLowerCase();
      for (const marker of [
        "victory lap",
        "steal the socks",
        "bark at nothing",
        "runs in circles",
      ]) {
        expect(lower, `humor marker "${marker}" in seam (${deathType})`).not.toContain(
          marker,
        );
      }
    }
  });

  it("each death type produces a DISTINCT seam line", () => {
    const seams = DEATH_TYPES.map(
      (deathType) =>
        pageById(
          resolveStory4(
            story4SessionWith({
              toggles: { livingOrMemorial: "memorial", deathType },
            }),
          ),
          "talk-page-5",
        ).body.slice(-2, -1)[0],
    );
    expect(new Set(seams).size).toBe(DEATH_TYPES.length);
  });
});

// ---------------------------------------------------------------------------
// Memorial belief frame -> the Page 5 closing frame
// ---------------------------------------------------------------------------

describe("memorial beliefFrame selects the Page 5 closing frame", () => {
  function close(beliefFrame: LetterBeliefFrame): string {
    const body = pageById(
      resolveStory4(
        story4SessionWith({
          toggles: { livingOrMemorial: "memorial", beliefFrame },
        }),
      ),
      "talk-page-5",
    ).body;
    return body[body.length - 1];
  }

  it("rainbow-bridge: not tired, not hurting, sun at four o'clock", () => {
    expect(close("rainbow-bridge")).toContain(
      "Wherever I am now, I'm not tired, and I'm not hurting",
    );
    expect(close("rainbow-bridge")).not.toContain("crossed the rainbow bridge");
  });

  it("heaven: a room, with a door I can hear you through", () => {
    expect(close("heaven")).toContain("there's a room for me");
    expect(close("heaven")).toContain("hear you coming through");
  });

  it("secular: not anywhere now, but in the spot by the door", () => {
    expect(close("secular")).toContain("I'm not anywhere now, not the way I was.");
    expect(close("secular")).toContain("I'm where you keep me.");
    expect(close("secular")).not.toContain("heaven");
  });

  it("each belief frame produces a DISTINCT closing line", () => {
    const closes = BELIEF_FRAMES.map((beliefFrame) => close(beliefFrame));
    expect(new Set(closes).size).toBe(BELIEF_FRAMES.length);
  });

  it("only Page 5 changes between rainbow-bridge and secular (memorial)", () => {
    const a = resolveStory4(
      story4SessionWith({ toggles: { livingOrMemorial: "memorial" } }),
    );
    const b = resolveStory4(
      story4SessionWith({
        toggles: { livingOrMemorial: "memorial", beliefFrame: "secular" },
      }),
    );
    for (const page of a) {
      const other = pageById(b, page.id as Story4PageId);
      if (page.id === "talk-page-5") {
        expect(other.body).not.toEqual(page.body);
      } else {
        expect(other.body).toEqual(page.body);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Relationship -> "you both" / "my favorites"
// ---------------------------------------------------------------------------

describe("relationship drives the addressing", () => {
  it('"couple" produces "you both" on Page 2', () => {
    const page2 = pageById(
      resolveStory4(story4SessionWith({ owner: { relationship: "couple" } })),
      "talk-page-2",
    ).body.join(" ");
    expect(page2).toContain("a heart that points at the two of you like a compass");
    expect(page2).toContain("the letter I'd write you both");
  });

  it('"couple" produces "my favorites" on Page 5 (living)', () => {
    const page5 = pageById(
      resolveStory4(story4SessionWith({ owner: { relationship: "couple" } })),
      "talk-page-5",
    ).body.join(" ");
    expect(page5).toContain("You are my favorites.");
    expect(page5).toContain("The two of you, and the spot by the door");
  });

  it('"single" (default) does NOT use the couple phrasing', () => {
    const story = resolveStory4(biscuitSession());
    const page2 = pageById(story, "talk-page-2").body.join(" ");
    const page5 = pageById(story, "talk-page-5").body.join(" ");
    expect(page2).toContain("the letter I'd write you.");
    expect(page2).not.toContain("you both");
    expect(page5).toContain("You are my favorite.");
    expect(page5).not.toContain("my favorites");
    expect(page5).not.toContain("the two of you");
  });

  it('"couple" addressing also holds in the memorial path', () => {
    const story = resolveStory4(
      story4SessionWith({
        owner: { relationship: "couple" },
        toggles: { livingOrMemorial: "memorial" },
      }),
    );
    // Memorial couple line is past tense: "would have written you both".
    expect(pageById(story, "talk-page-2").body.join(" ")).toContain(
      "the letter I would have written you both",
    );
    expect(pageById(story, "talk-page-5").body.join(" ")).toContain(
      "You were my favorites.",
    );
  });
});

// ---------------------------------------------------------------------------
// Species voice -> Pages 2, 3, 4
// ---------------------------------------------------------------------------

describe("species selects the voice on Pages 2, 3, 4", () => {
  // Page-3 "kind of happy" clause by species, pinned to the template.
  const HAPPY_BY_SPECIES: Record<Species, string> = {
    dog: "the kind that runs in circles for no reason and doesn't need explaining",
    cat: "the kind of happy that loaf-shapes in a sunbeam and decides nothing else needs to happen today",
    rabbit: "the kind of happy that binkies across the floor for no reason at all",
    bird: "the kind of happy that sings when nobody asked",
    other: "the kind of happy that doesn't need a reason",
  };

  it("each species gets the right Page 3 'kind of happy' line", () => {
    for (const species of SPECIES) {
      const page3 = pageById(
        resolveStory4(story4SessionWith({ pet: { species } })),
        "talk-page-3",
      ).body.join(" ");
      expect(page3, `Page 3 happy line for ${species}`).toContain(
        HAPPY_BY_SPECIES[species],
      );
    }
  });

  it("'other' uses the species-neutral fallback voice (no borrowed clause)", () => {
    const page3 = pageById(
      resolveStory4(story4SessionWith({ pet: { species: "other" } })),
      "talk-page-3",
    ).body.join(" ");
    expect(page3).toContain(HAPPY_BY_SPECIES.other);
    expect(page3).not.toContain("loaf-shapes");
    expect(page3).not.toContain("binkies");
  });

  it("the cat voice swaps the Page 2 'stillness' sense line", () => {
    const page2 = pageById(
      resolveStory4(story4SessionWith({ pet: { species: "cat" } })),
      "talk-page-2",
    ).body.join(" ");
    expect(page2).toContain("a stillness that means I know you're there");
    expect(page2).toContain("(even when I'm pretending to look out the window)");
  });

  it("the cat voice swaps the Page 4 'watch and pretend' spot line", () => {
    const page4 = pageById(
      resolveStory4(story4SessionWith({ pet: { species: "cat" } })),
      "talk-page-4",
    ).body.join(" ");
    expect(page4).toContain("watch you and pretend I'm watching something else");
  });

  it("a non-cat species keeps the default Page 2 'ears that hear your car' line", () => {
    const page2 = pageById(
      resolveStory4(story4SessionWith({ pet: { species: "dog" } })),
      "talk-page-2",
    ).body.join(" ");
    expect(page2).toContain("ears that hear your car three houses away");
    expect(page2).not.toContain("a stillness that means");
  });

  it("species fills the Page 6 'As much as a {species} can love' line", () => {
    // The clause renders sentence-initial ("...the only way I know how: ... As
    // much as a dog can love"), so the leading "As" is capitalized.
    for (const species of SPECIES) {
      const page6 = pageById(
        resolveStory4(story4SessionWith({ pet: { species } })),
        "talk-page-6",
      ).body.join(" ");
      expect(page6).toContain(`As much as a ${species} can love`);
    }
  });
});

// ---------------------------------------------------------------------------
// Gift-for -> cover inscription
// ---------------------------------------------------------------------------

describe("giftFor adjusts the cover inscription only", () => {
  it('"friend" appends a gift inscription to the cover subtitle', () => {
    const cover = pageById(
      resolveStory4(story4SessionWith({ toggles: { giftFor: "friend" } })),
      "talk-cover",
    );
    // Still addressed to the owner ("to Sarah").
    expect(cover.subtitle).toContain("to Sarah");
    expect(cover.subtitle).toContain("A gift, given with love.");
  });

  it('"self" (default): no inscription on the cover', () => {
    const cover = pageById(resolveStory4(biscuitSession()), "talk-cover");
    expect(cover.subtitle).toBe("to Sarah");
    expect(cover.subtitle).not.toContain("A gift, given with love.");
  });

  it("the gift inscription does not change the letter body (still to the owner)", () => {
    const gift = resolveStory4(story4SessionWith({ toggles: { giftFor: "friend" } }));
    const self = resolveStory4(biscuitSession());
    for (const page of self) {
      if (page.id === "talk-cover") continue;
      const other = pageById(gift, page.id as Story4PageId);
      expect(other.body).toEqual(page.body);
    }
    // Page 2 still opens "Dear Sarah," (the owner), not the gift-giver.
    expect(pageById(gift, "talk-page-2").body[0]).toBe("Dear Sarah,");
  });
});

// ---------------------------------------------------------------------------
// Sparse {quirks} -> the stock fallback (in BOTH tenses)
// ---------------------------------------------------------------------------

describe("sparse {quirks} falls back to the stock Page-3 line (both tenses)", () => {
  const FALLBACK_LIVING_MARKER = "I love that your hand finds my head without you even looking.";
  const FALLBACK_MEMORIAL_MARKER =
    "I loved that your hand found my head without you even looking.";

  it("blank quirks (living) -> the present-tense stock fallback", () => {
    const page3 = pageById(
      resolveStory4(story4SessionWith({ memories: { quirks: "" } })),
      "talk-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_LIVING_MARKER);
    expect(page3).toContain("I love that you always save me a bite");
  });

  it("whitespace-only quirks (living) -> treated as blank, stock fallback", () => {
    const page3 = pageById(
      resolveStory4(story4SessionWith({ memories: { quirks: "   " } })),
      "talk-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_LIVING_MARKER);
  });

  it("shallow quirks (< 3 chars) -> treated as blank, stock fallback", () => {
    const page3 = pageById(
      resolveStory4(story4SessionWith({ memories: { quirks: "ok" } })),
      "talk-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_LIVING_MARKER);
  });

  it("blank quirks (memorial) -> the PAST-tense stock fallback", () => {
    const page3 = pageById(
      resolveStory4(
        story4SessionWith({
          memories: { quirks: "" },
          toggles: { livingOrMemorial: "memorial" },
        }),
      ),
      "talk-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_MEMORIAL_MARKER);
    expect(page3).toContain("I loved that you always saved me a bite");
    // The living-tense fallback must NOT leak into the memorial page.
    expect(page3).not.toContain(FALLBACK_LIVING_MARKER);
  });

  it("substantial quirks -> the customer's words, NOT the fallback", () => {
    const quirks = "the way you tilt your head when I say your name";
    const page3 = pageById(
      resolveStory4(story4SessionWith({ memories: { quirks } })),
      "talk-page-3",
    ).body.join(" ");
    expect(page3).toContain(quirks);
    expect(page3).not.toContain(FALLBACK_LIVING_MARKER);
  });
});
