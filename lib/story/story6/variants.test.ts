import { describe, it, expect } from "vitest";

import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import type { Story6PageId } from "@/lib/story/master-text";
import { composeVariants6, resolveStory6 } from "@/lib/story/story6/variants";
import {
  biscuitSession6,
  story6SessionWith,
} from "@/lib/story/story6/fixtures";
import type {
  OtherPetsInHome,
  Species,
  TransitionFrame,
} from "@/lib/session/types";

// Variant composition + the single-tense engine for Story 6 ("While You're Still
// Here, [PET_NAME]") under test. Story 6 is the first NARRATIVE-layout new book
// since Story 1, written TO and ABOUT a pet who is STILL ALIVE, in PRESENT TENSE,
// always. Unlike Story 4 there is NO two-tense engine — there is one defining
// toggle (`transitionFrame`) plus the age band / species / other-pets dimensions.
// The #1 risk this suite guards is a tense/death leak — a past-tense or farewell
// sentence surviving into the living tribute, or `road-ahead` over-naming the
// future. Each dimension must change exactly the right page. The wording asserted
// is pinned to the master template (story-6-master-template.md) and authored here,
// not imported from the source, so the assertion tests the text.

// ---------------------------------------------------------------------------
// Local helpers (mirror story4/variants.test.ts)
// ---------------------------------------------------------------------------

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story6PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-6 tribute`);
  }
  return page;
}

const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const TRANSITION_FRAMES: TransitionFrame[] = ["still-here", "road-ahead"];
const OTHER_PETS: OtherPetsInHome[] = ["yes", "no"];

// Representative free-text that drives each age band (the band is derived from the
// free-text `ageOrStage` by deriveAgeBand): a number ≥ 15 → very-senior; a
// diagnosis signal without a senior age → younger-diagnosed; otherwise senior.
const AGE_BY_BAND = {
  senior: "13 years young",
  "very-senior": "almost fifteen, a grand old senior",
  "younger-diagnosed": "two, and facing something hard — the vet said not long",
} as const;
type AgeBandKey = keyof typeof AGE_BY_BAND;
const AGE_BANDS: AgeBandKey[] = ["senior", "very-senior", "younger-diagnosed"];

// ---------------------------------------------------------------------------
// composeVariants6 returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants6", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const composed = composeVariants6(biscuitSession6());
    const cover = composed.find((p) => p.id === "tribute-cover")!;
    expect(cover.title).toContain("{petName}");
    const page2 = composed.find((p) => p.id === "tribute-page-2")!;
    expect(page2.body.join(" ")).toContain("{petName}");
  });

  it("does not bleed state across calls (each starts from a fresh master copy)", () => {
    // A road-ahead compose must not leak its forward-looking closer into a later
    // still-here compose, and a very-senior compose must not leave its Page-2 line.
    composeVariants6(
      story6SessionWith({
        toggles: { transitionFrame: "road-ahead" },
        memories: { ageOrStage: AGE_BY_BAND["very-senior"] },
      }),
    );
    const stillHere = composeVariants6(biscuitSession6());
    const page5 = stillHere.find((p) => p.id === "tribute-page-5")!;
    const closer = page5.body[page5.body.length - 1];
    // Still-here closer is gratitude; no future-naming road-ahead line.
    expect(closer).toContain("So this is what I'm choosing instead: to be glad.");
    expect(closer).not.toContain("the road ahead is shorter");
    // The senior default Page 2 has exactly its 4 paragraphs (no very-senior append).
    const page2 = stillHere.find((p) => p.id === "tribute-page-2")!;
    expect(page2.body).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Present-tense / tense-leak guard (the living-tribute quality bar)
// ---------------------------------------------------------------------------
//
// Story 6 is the living analog of Story 4's tense guard: there is no memorial
// path, so the rule is simply "the pet is alive" — no past-tense farewell, no
// banned euphemism, death is NEVER named, and the `truth` death layout never
// appears. The road-ahead variant is the ONLY place the future may be named, and
// even there death itself is never spoken.

describe("present-tense / living-tribute quality bar holds across every combination", () => {
  /** Run `fn` for every transitionFrame × age band × species × otherPets combo. */
  function forEachCombination(
    fn: (story: ResolvedStory, label: string) => void,
  ): void {
    for (const transitionFrame of TRANSITION_FRAMES) {
      for (const band of AGE_BANDS) {
        for (const species of SPECIES) {
          for (const otherPetsInHome of OTHER_PETS) {
            const story = resolveStory6(
              story6SessionWith({
                pet: { species },
                memories: { ageOrStage: AGE_BY_BAND[band] },
                toggles: { transitionFrame, otherPetsInHome },
              }),
            );
            fn(story, `${transitionFrame}/${band}/${species}/${otherPetsInHome}`);
          }
        }
      }
    }
  }

  // The customer's age-or-stage free-text legitimately carries the only mention of
  // "hard" / mortality language (the younger-diagnosed opener), so the death/past
  // checks scope to the published prose with the {ageOrStage} value held constant
  // — the banned phrases below are template-authored and must never appear.
  const BANNED_PHRASES = [
    "passed away",
    "put to sleep",
    "crossing over",
    "rainbow bridge",
    "better place",
    "watching over",
    "watch over",
    "fur baby",
  ];

  // Past-tense / farewell markers a living tribute must never speak. Authored
  // against the template's "celebration, never pre-burial" rule (mirrors Story 4's
  // tense-leak guard, scoped here to "no past / no farewell").
  const FAREWELL_MARKERS = [
    /\bgoodbye\b/i,
    /\bsaying goodbye\b/i,
    /\byou died\b/i,
    /\byou're gone\b/i,
    /\byou are gone\b/i,
    /\bafter you('re| are) gone\b/i,
    /\bwhen you('re| are) gone\b/i,
    /\bI lost you\b/i,
    /\bwe lost\b/i,
  ];

  function allProse(story: ResolvedStory): string {
    return story
      .flatMap((p) => [
        ...(p.title !== undefined ? [p.title] : []),
        ...(p.subtitle !== undefined ? [p.subtitle] : []),
        ...p.body,
      ])
      .join("\n");
  }

  it("never uses a banned euphemism in any combination", () => {
    forEachCombination((story, label) => {
      const prose = allProse(story).toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(prose.includes(phrase), `banned phrase "${phrase}" (${label})`).toBe(
          false,
        );
      }
    });
  });

  it("the pet never claims to watch over the owner ('watch(ing) over')", () => {
    const overOwner = /watch(?:ing|es)?\s+over\b/i;
    forEachCombination((story, label) => {
      expect(
        overOwner.test(allProse(story)),
        `"watch(ing) over" appeared (${label})`,
      ).toBe(false);
    });
  });

  it("never speaks the pet as gone (no farewell / past-tense death markers)", () => {
    forEachCombination((story, label) => {
      const prose = allProse(story);
      for (const marker of FAREWELL_MARKERS) {
        expect(
          marker.test(prose),
          `farewell/past-death marker ${marker} leaked (${label})`,
        ).toBe(false);
      }
    });
  });

  it("never names death in the living path (no 'die'/'died'/'death' in the prose)", () => {
    // The whole book is the LIVING path — death is never named anywhere, in any
    // combination (the road-ahead variant names finitude without naming death).
    const deathWords = /\b(die|died|dies|dying|death|dead)\b/i;
    forEachCombination((story, label) => {
      expect(
        deathWords.test(allProse(story)),
        `death named in the living tribute (${label})`,
      ).toBe(false);
    });
  });

  it("never assigns the `truth` (death) layout to any page in any combination", () => {
    forEachCombination((story, label) => {
      for (const page of story) {
        expect(page.layout, `${page.id} got the death layout (${label})`).not.toBe(
          "truth",
        );
      }
    });
  });
});

// ---------------------------------------------------------------------------
// transitionFrame — names the future once (road-ahead) or never (still-here)
// ---------------------------------------------------------------------------

describe("transitionFrame drives Page 5's closer only", () => {
  function page5(frame: TransitionFrame): ResolvedPage {
    return pageById(
      resolveStory6(story6SessionWith({ toggles: { transitionFrame: frame } })),
      "tribute-page-5",
    );
  }

  it("'still-here' (default) ends on gratitude with NO mention of the future", () => {
    const closer = page5("still-here").body.slice(-1)[0];
    expect(closer).toContain("So this is what I'm choosing instead: to be glad.");
    // No forward-looking road-ahead language.
    expect(closer).not.toContain("the road ahead");
    expect(closer).not.toContain("shorter than the one behind");
  });

  it("'road-ahead' replaces ONLY the closer with a single forward-looking line", () => {
    const closer = page5("road-ahead").body.slice(-1)[0];
    expect(closer).toContain("I know the road ahead is shorter than the one behind us.");
    // Still resolves to gladness; finitude named, death never named.
    expect(closer).toContain("today, I'm choosing to be glad");
    expect(closer).not.toMatch(/\b(die|died|death|dead)\b/i);
  });

  it("'road-ahead' names the future exactly once (only on Page 5's final paragraph)", () => {
    const story = resolveStory6(
      story6SessionWith({ toggles: { transitionFrame: "road-ahead" } }),
    );
    // "the road ahead" appears in exactly one paragraph across the whole book.
    const matches = story
      .flatMap((p) => p.body)
      .filter((line) => line.includes("the road ahead"));
    expect(matches).toHaveLength(1);
    expect(pageById(story, "tribute-page-5").body.slice(-1)[0]).toBe(matches[0]);
  });

  it("'still-here' never references the future on any page", () => {
    const story = resolveStory6(biscuitSession6());
    const all = story.flatMap((p) => p.body).join(" ");
    expect(all).not.toContain("the road ahead");
    expect(all).not.toContain("shorter than the one behind");
  });

  it("the frame touches ONLY Page 5's final paragraph (everything else identical)", () => {
    const stillHere = resolveStory6(biscuitSession6());
    const roadAhead = resolveStory6(
      story6SessionWith({ toggles: { transitionFrame: "road-ahead" } }),
    );
    for (const page of stillHere) {
      const other = pageById(roadAhead, page.id as Story6PageId);
      if (page.id === "tribute-page-5") {
        // Page 5's lead + hero are unchanged; only the final paragraph differs.
        expect(other.body.slice(0, -1)).toEqual(page.body.slice(0, -1));
        expect(other.body.slice(-1)).not.toEqual(page.body.slice(-1));
      } else {
        expect(
          other.body,
          `${page.id} leaked a transitionFrame change`,
        ).toEqual(page.body);
      }
    }
  });

  it("'still-here' is the DEFAULT (the base fixture resolves identically)", () => {
    const fromDefault = resolveStory6(biscuitSession6());
    const fromExplicit = resolveStory6(
      story6SessionWith({ toggles: { transitionFrame: "still-here" } }),
    );
    expect(fromExplicit).toEqual(fromDefault);
  });
});

// ---------------------------------------------------------------------------
// ageOrStage band — very-senior (Page 2) / younger-diagnosed (Page 5 lead)
// ---------------------------------------------------------------------------

describe("ageOrStage band changes the right page", () => {
  it("very-senior (15+) appends ONLY the Page-2 'house before you' line", () => {
    const senior = resolveStory6(biscuitSession6());
    const verySenior = resolveStory6(
      story6SessionWith({ memories: { ageOrStage: AGE_BY_BAND["very-senior"] } }),
    );
    const page2 = pageById(verySenior, "tribute-page-2").body.join(" ");
    expect(page2).toContain(
      "Long enough that I can't quite remember the shape of the house before you.",
    );
    // The senior default Page 2 has no such line.
    expect(pageById(senior, "tribute-page-2").body.join(" ")).not.toContain(
      "the shape of the house before you",
    );
    // The very-senior band touches ONLY Page 2 — Page 5 keeps the senior-default
    // opener (the only difference is the {ageOrStage} value merged into it, NOT a
    // switch to the younger-diagnosed lead).
    expect(pageById(verySenior, "tribute-page-5").body[0]).toContain(
      "You're in the gentle part of a long life now.",
    );
    expect(pageById(verySenior, "tribute-page-5").body[0]).not.toContain(
      "You came to a hard turn",
    );
  });

  it("younger-diagnosed softens ONLY the Page-5 opener (gratitude register unchanged)", () => {
    const senior = resolveStory6(biscuitSession6());
    const diagnosed = resolveStory6(
      story6SessionWith({
        memories: { ageOrStage: AGE_BY_BAND["younger-diagnosed"] },
      }),
    );
    const lead = pageById(diagnosed, "tribute-page-5").body[0];
    expect(lead).toContain("You came to a hard turn earlier than either of us expected.");
    // The senior default opener must NOT appear.
    expect(lead).not.toContain("You're in the gentle part of a long life now.");
    // Page 5's hero + closer (the gratitude register) are unchanged from the default.
    const seniorPage5 = pageById(senior, "tribute-page-5").body;
    const diagnosedPage5 = pageById(diagnosed, "tribute-page-5").body;
    expect(diagnosedPage5.slice(1)).toEqual(seniorPage5.slice(1));
    // The younger-diagnosed band does NOT append the very-senior Page-2 line.
    expect(pageById(diagnosed, "tribute-page-2").body.join(" ")).not.toContain(
      "the shape of the house before you",
    );
  });

  it("the senior default appends nothing on Page 2 and keeps the gentle Page-5 opener", () => {
    const page2 = pageById(resolveStory6(biscuitSession6()), "tribute-page-2");
    expect(page2.body).toHaveLength(4);
    const page5lead = pageById(resolveStory6(biscuitSession6()), "tribute-page-5")
      .body[0];
    expect(page5lead).toContain("You're in the gentle part of a long life now.");
  });
});

// ---------------------------------------------------------------------------
// Species voice (Pages 2-4)
// ---------------------------------------------------------------------------

describe("species selects the voice on Pages 2-4", () => {
  it("the cat voice swaps the Page-2 'stillness' shape line", () => {
    const page2 = pageById(
      resolveStory6(story6SessionWith({ pet: { species: "cat" } })),
      "tribute-page-2",
    ).body.join(" ");
    expect(page2).toContain("the quiet that says you know I'm in the room");
    expect(page2).toContain("the weight that arrives on the bed at exactly the wrong hour");
  });

  it("a non-cat species keeps the default Page-2 'first sound in the morning' line", () => {
    const page2 = pageById(
      resolveStory6(story6SessionWith({ pet: { species: "dog" } })),
      "tribute-page-2",
    ).body.join(" ");
    expect(page2).toContain("the first sound in the morning");
    expect(page2).not.toContain("the quiet that says you know I'm in the room");
  });

  it("the rabbit voice adds the Page-3 binky line", () => {
    const page3 = pageById(
      resolveStory6(story6SessionWith({ pet: { species: "rabbit" } })),
      "tribute-page-3",
    ).body.join(" ");
    expect(page3).toContain("The binky across the floor that's a little lower to the ground");
  });

  it("the bird voice adds the Page-3 song line", () => {
    const page3 = pageById(
      resolveStory6(story6SessionWith({ pet: { species: "bird" } })),
      "tribute-page-3",
    ).body.join(" ");
    expect(page3).toContain("The song that starts when the light hits the cage");
  });

  it("'other' uses the species-neutral default voice (no cat/rabbit/bird-specific line)", () => {
    const story = resolveStory6(story6SessionWith({ pet: { species: "other" } }));
    const page2 = pageById(story, "tribute-page-2").body.join(" ");
    const page3 = pageById(story, "tribute-page-3").body.join(" ");
    // Default (dog) Page-2 wording, no cat stillness clause.
    expect(page2).toContain("the first sound in the morning");
    expect(page2).not.toContain("the quiet that says you know I'm in the room");
    // No rabbit/bird Page-3 species line.
    expect(page3).not.toContain("The binky across the floor");
    expect(page3).not.toContain("The song that starts when the light hits the cage");
  });

  it("dog (default) has no extra Page-3 species line", () => {
    const page3 = pageById(
      resolveStory6(story6SessionWith({ pet: { species: "dog" } })),
      "tribute-page-3",
    ).body.join(" ");
    expect(page3).not.toContain("The binky across the floor");
    expect(page3).not.toContain("The song that starts when the light hits the cage");
  });

  it("species touches land ONLY on Pages 2-4 (Pages 5/6 + covers unchanged)", () => {
    const dog = resolveStory6(story6SessionWith({ pet: { species: "dog" } }));
    const cat = resolveStory6(story6SessionWith({ pet: { species: "cat" } }));
    for (const id of [
      "tribute-cover",
      "tribute-page-1",
      "tribute-page-5",
      "tribute-page-6",
      "tribute-back-cover",
    ] as const) {
      expect(
        pageById(cat, id).body,
        `${id} leaked a species change`,
      ).toEqual(pageById(dog, id).body);
    }
    // And Page 2 DID change (the cat stillness line).
    expect(pageById(cat, "tribute-page-2").body).not.toEqual(
      pageById(dog, "tribute-page-2").body,
    );
  });
});

// ---------------------------------------------------------------------------
// otherPetsInHome — appends the Page-4 line only when "yes"
// ---------------------------------------------------------------------------

describe("otherPetsInHome appends the Page-4 line only", () => {
  it("'yes' appends the 'others in this house' line to Page 4", () => {
    const page4 = pageById(
      resolveStory6(story6SessionWith({ toggles: { otherPetsInHome: "yes" } })),
      "tribute-page-4",
    ).body.join(" ");
    expect(page4).toContain("The others in this house know you too.");
  });

  it("'no' (default) does NOT append the other-pets line", () => {
    const page4 = pageById(resolveStory6(biscuitSession6()), "tribute-page-4")
      .body.join(" ");
    expect(page4).not.toContain("The others in this house know you too.");
  });

  it("the other-pets line touches ONLY Page 4 (every other page identical)", () => {
    const without = resolveStory6(biscuitSession6());
    const withPets = resolveStory6(
      story6SessionWith({ toggles: { otherPetsInHome: "yes" } }),
    );
    for (const page of without) {
      const other = pageById(withPets, page.id as Story6PageId);
      if (page.id === "tribute-page-4") {
        expect(other.body).not.toEqual(page.body);
      } else {
        expect(other.body, `${page.id} leaked an other-pets change`).toEqual(
          page.body,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Sparse-input fallbacks (stillLoves on Page 3, quirks on Page 4)
// ---------------------------------------------------------------------------

describe("sparse {stillLoves} falls back to the Page-3 stock line", () => {
  const FALLBACK_MARKER =
    "The things you still love — the sun, the sound of the leash, the half-second before you realize it's me at the door.";

  it("blank stillLoves -> the stock fallback, no dangling separator", () => {
    const page3 = pageById(
      resolveStory6(story6SessionWith({ memories: { stillLoves: "" } })),
      "tribute-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_MARKER);
    // The required ritual/activity still render; no empty ". ." fragment left.
    expect(page3).toContain("the cup of coffee I drink with my hand on your back");
    expect(page3).not.toContain(". . ");
  });

  it("whitespace-only stillLoves -> treated as blank, stock fallback", () => {
    const page3 = pageById(
      resolveStory6(story6SessionWith({ memories: { stillLoves: "   " } })),
      "tribute-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_MARKER);
  });

  it("substantial stillLoves -> the customer's words, NOT the fallback", () => {
    const stillLoves = "still waits at the window every afternoon at four";
    const page3 = pageById(
      resolveStory6(story6SessionWith({ memories: { stillLoves } })),
      "tribute-page-3",
    ).body.join(" ");
    expect(page3).toContain(stillLoves);
    expect(page3).not.toContain(FALLBACK_MARKER);
  });
});

describe("sparse {quirks} falls back to the Page-4 stock line", () => {
  const FALLBACK_MARKER =
    "The sounds you make when you settle. The way you find the one warm spot in any room.";

  it("blank quirks -> the stock fallback line", () => {
    const page4 = pageById(
      resolveStory6(story6SessionWith({ memories: { quirks: "" } })),
      "tribute-page-4",
    ).body.join(" ");
    expect(page4).toContain(FALLBACK_MARKER);
  });

  it("whitespace-only quirks -> treated as blank, stock fallback", () => {
    const page4 = pageById(
      resolveStory6(story6SessionWith({ memories: { quirks: "  " } })),
      "tribute-page-4",
    ).body.join(" ");
    expect(page4).toContain(FALLBACK_MARKER);
  });

  it("substantial quirks -> the customer's words, NOT the fallback", () => {
    const quirks = "the way you sigh like a person when you lie down";
    const page4 = pageById(
      resolveStory6(story6SessionWith({ memories: { quirks } })),
      "tribute-page-4",
    ).body.join(" ");
    expect(page4).toContain(quirks);
    expect(page4).not.toContain(FALLBACK_MARKER);
  });
});
