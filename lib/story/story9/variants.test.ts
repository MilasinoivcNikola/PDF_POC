import { describe, it, expect } from "vitest";

import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import type { Story9PageId } from "@/lib/story/master-text";
import { composeVariants9, resolveStory9 } from "@/lib/story/story9/variants";
import {
  biscuitSession9,
  story9SessionWith,
} from "@/lib/story/story9/fixtures";
import type {
  BabyStatus,
  OtherPetsInHome,
  Species,
} from "@/lib/session/types";

// Variant composition + the single-toggle engine for Story 9 ("[PET_NAME] and the
// New Baby") under test. The primary toggle (`babyStatus`) rewrites the cover
// subtitle, the Page-1 dedication, Page 4 (something is changing → arrived), and Page
// 6 (the bond, anticipatory → present). The #1 risk this suite guards is the headline
// product rule: the baby NEVER replaces/displaces the pet (love multiplies), no "fur
// baby", no memorial/death language at all, and the pet's security is established
// before the baby is mentioned. Each dimension must change exactly the right page.
// The wording asserted is pinned to the master template (story-9-master-template.md)
// and authored here, not imported from the source, so the assertion tests the text.

// ---------------------------------------------------------------------------
// Local helpers (mirror story6/variants.test.ts)
// ---------------------------------------------------------------------------

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story9PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-9 keepsake`);
  }
  return page;
}

const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const BABY_STATUSES: BabyStatus[] = ["expecting", "arrived"];
const OTHER_PETS: OtherPetsInHome[] = ["yes", "no"];

// ---------------------------------------------------------------------------
// composeVariants9 returns unresolved (placeholder-carrying) text
// ---------------------------------------------------------------------------

describe("composeVariants9", () => {
  it("returns text that still carries {placeholders} (merge has not run yet)", () => {
    const composed = composeVariants9(biscuitSession9());
    const cover = composed.find((p) => p.id === "baby-cover")!;
    expect(cover.title).toContain("{petName}");
    const page5 = composed.find((p) => p.id === "baby-page-5")!;
    expect(page5.body.join(" ")).toContain("{speciesDescriptor}");
  });

  it("does not bleed state across calls (each starts from a fresh master copy)", () => {
    composeVariants9(
      story9SessionWith({
        toggles: { babyStatus: "arrived", otherPetsInHome: "yes" },
        pet: { species: "cat" },
      }),
    );
    const expecting = composeVariants9(biscuitSession9());
    const page4 = expecting.find((p) => p.id === "baby-page-4")!;
    // Expecting default Page 4 (anticipatory), no arrived rewrite, no other-pets line.
    expect(page4.body.join(" ")).toContain(
      "a new baby is coming to join the family",
    );
    expect(page4.body.join(" ")).not.toContain("the new baby arrived");
    expect(page4.body.join(" ")).not.toContain("The other pets have noticed too.");
  });
});

// ---------------------------------------------------------------------------
// Quality bar: never replace/displace the pet, never "fur baby", no memorial
// ---------------------------------------------------------------------------

describe("the headline quality bar holds across every combination", () => {
  function forEachCombination(
    fn: (story: ResolvedStory, label: string) => void,
  ): void {
    for (const babyStatus of BABY_STATUSES) {
      for (const species of SPECIES) {
        for (const otherPetsInHome of OTHER_PETS) {
          for (const babyName of ["Noah", ""]) {
            const story = resolveStory9(
              story9SessionWith({
                pet: { species },
                toggles: { babyStatus, otherPetsInHome },
                babyName,
              }),
            );
            fn(
              story,
              `${babyStatus}/${species}/${otherPetsInHome}/name="${babyName}"`,
            );
          }
        }
      }
    }
  }

  function allProse(story: ResolvedStory): string {
    return story
      .flatMap((p) => [
        ...(p.title !== undefined ? [p.title] : []),
        ...(p.subtitle !== undefined ? [p.subtitle] : []),
        ...p.body,
      ])
      .join("\n");
  }

  // Phrases that would frame the baby as replacing/displacing the pet, or collapse
  // the pet-is-the-first-family-member distinction. All template-authored prose must
  // avoid them in every combination.
  const BANNED_PHRASES = [
    "fur baby",
    "you'll have to share",
    "you will have to share",
    "the baby comes first",
    "less attention",
    "get used to less",
    "replaced",
  ];

  // Memorial / death language — never present in a joyful, living book.
  const MEMORIAL_MARKERS = [
    /\brainbow bridge\b/i,
    /\bwatching over\b/i,
    /\bwatch over\b/i,
    /\bgoodbye\b/i,
    /\b(die|died|dies|dying|death|dead)\b/i,
    /\bpassed away\b/i,
  ];

  it("never frames the baby as replacing/displacing the pet, never says 'fur baby'", () => {
    forEachCombination((story, label) => {
      const prose = allProse(story).toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        // "replaced" appears ONLY in "You are not being replaced" (the reassurance) —
        // assert it never appears as a bare threat, by requiring the negation context.
        if (phrase === "replaced") {
          const idx = prose.indexOf("replaced");
          if (idx !== -1) {
            expect(
              prose.includes("not being replaced"),
              `"replaced" without the reassurance context (${label})`,
            ).toBe(true);
          }
          continue;
        }
        expect(prose.includes(phrase), `banned phrase "${phrase}" (${label})`).toBe(
          false,
        );
      }
    });
  });

  it("never uses memorial / death language in any combination", () => {
    forEachCombination((story, label) => {
      const prose = allProse(story);
      for (const marker of MEMORIAL_MARKERS) {
        expect(
          marker.test(prose),
          `memorial/death marker ${marker} leaked (${label})`,
        ).toBe(false);
      }
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

  it("establishes the pet's security (Pages 2-3) before the baby is mentioned (Page 4)", () => {
    // In the expecting default, "baby" must not appear in the Page-2/3 prose; the
    // first mention is Page 4 ("a new baby is coming"). (Page 2's opening line "Before
    // the new baby, there was you" references it only to assert the pet came first —
    // it is the establishing beat, allowed.)
    const story = resolveStory9(biscuitSession9());
    const page3 = pageById(story, "baby-page-3").body.join(" ").toLowerCase();
    expect(page3).not.toContain("baby");
    const page4 = pageById(story, "baby-page-4").body.join(" ").toLowerCase();
    expect(page4).toContain("baby");
  });

  it("always lands the 'Love does not divide. It multiplies.' hero line", () => {
    forEachCombination((story, label) => {
      const page7 = pageById(story, "baby-page-7");
      expect(page7.body, label).toContain("Love does not divide. It multiplies.");
      expect(page7.layout).toBe("love");
    });
  });
});

// ---------------------------------------------------------------------------
// babyStatus — the primary toggle (cover, dedication, Pages 4 & 6)
// ---------------------------------------------------------------------------

describe("babyStatus rewrites the cover, dedication, Page 4 and Page 6", () => {
  const expecting = (): ResolvedStory => resolveStory9(biscuitSession9());
  const arrived = (): ResolvedStory =>
    resolveStory9(
      story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "Noah" }),
    );

  it("expecting (default): Page 4 is anticipatory ('a new baby is coming')", () => {
    const page4 = pageById(expecting(), "baby-page-4").body.join(" ");
    expect(page4).toContain("Lately, something in the house has been changing.");
    expect(page4).toContain("a new baby is coming to join the family");
    expect(page4).not.toContain("the new baby arrived");
  });

  it("arrived: Page 4 is present ('the new baby arrived', the baby named)", () => {
    const page4 = pageById(arrived(), "baby-page-4").body.join(" ");
    expect(page4).toContain("the new baby arrived");
    expect(page4).toContain("Noah came home to the family");
    expect(page4).not.toContain("a new baby is coming to join the family");
  });

  it("expecting: Page 6 is anticipatory ('Soon there will be', baby abstract)", () => {
    const page6 = pageById(expecting(), "baby-page-6").body.join(" ");
    expect(page6).toContain("Soon there will be a small new person");
    expect(page6).toContain(
      "Some of the very first happy things the baby ever knows will be Biscuit.",
    );
    expect(page6).not.toContain("Now there is");
  });

  it("arrived: Page 6 is present ('Now there is', the baby named)", () => {
    const page6 = pageById(arrived(), "baby-page-6").body.join(" ");
    expect(page6).toContain("Now there is a small new person");
    expect(page6).toContain("Noah reaches for Biscuit's soft fur");
    expect(page6).not.toContain("Soon there will be a small new person");
  });

  it("arrived: the dedication names both the pet and the baby", () => {
    const ded = pageById(arrived(), "baby-page-1").title;
    expect(ded).toContain("For Biscuit and Noah");
    expect(ded).toContain("the big boy and the little one");
  });

  it("expecting: the dedication is the 'here first' default (baby un-named)", () => {
    const ded = pageById(expecting(), "baby-page-1").title;
    expect(ded).toContain("who was here first");
    expect(ded).not.toContain("Noah");
  });

  it("Page 5 reframes the change as a promotion in BOTH paths", () => {
    for (const story of [expecting(), arrived()]) {
      const page5 = pageById(story, "baby-page-5").body.join(" ");
      expect(page5).toContain("You are being promoted.");
      expect(page5).toContain("the best big boy");
    }
  });

  it("arrived: Page 5's bond line says the baby is already learning to love them", () => {
    const page5 = pageById(arrived(), "baby-page-5").body.join(" ");
    expect(page5).toContain("Noah is already learning to love right back");
  });

  it("babyArrival appends to the expecting Page-4 last line only when supplied", () => {
    const withArrival = pageById(
      resolveStory9(story9SessionWith({ babyArrival: "this spring" })),
      "baby-page-4",
    ).body.join(" ");
    expect(withArrival).toContain(
      "a new baby is coming to join the family, this spring.",
    );
    const without = pageById(
      resolveStory9(story9SessionWith({ babyArrival: "" })),
      "baby-page-4",
    ).body.join(" ");
    expect(without).toContain("a new baby is coming to join the family.");
    expect(without).not.toContain(", this spring");
  });
});

// ---------------------------------------------------------------------------
// Page 8 — the distinct Closing page (`closing` layout, babyStatus only)
// ---------------------------------------------------------------------------

describe("Page 8 is a distinct Closing page (`closing` layout, room-for-everyone echo)", () => {
  it("exists as baby-page-8 with the `closing` layout, numbered 8", () => {
    const page8 = pageById(resolveStory9(biscuitSession9()), "baby-page-8");
    expect(page8.layout).toBe("closing");
    expect(page8.pageNumber).toBe(8);
  });

  it("closes on the room-for-everyone echo in both babyStatus paths", () => {
    for (const story of [
      resolveStory9(biscuitSession9()),
      resolveStory9(
        story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "Noah" }),
      ),
    ]) {
      const page8 = pageById(story, "baby-page-8").body.join(" ");
      expect(page8).toContain("So don't worry, Biscuit.");
      expect(page8).toContain("There's room for everyone, Biscuit.");
      expect(page8).toContain("There always was.");
    }
  });

  it("expecting: keeps the 'grown and gone and grey' line, baby abstract", () => {
    const page8 = pageById(resolveStory9(biscuitSession9()), "baby-page-8")
      .body.join(" ");
    expect(page8).toContain(
      "you will be loved when the baby is grown and gone and grey",
    );
    expect(page8).not.toContain("you and");
  });

  it("arrived: names the baby ('you and {babyName} both'), not the abstract line", () => {
    const page8 = pageById(
      resolveStory9(
        story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "Noah" }),
      ),
      "baby-page-8",
    ).body.join(" ");
    expect(page8).toContain("you and Noah both");
    expect(page8).toContain("you will be loved for every day that comes after");
    expect(page8).not.toContain("grown and gone and grey");
  });
});

// ---------------------------------------------------------------------------
// Page 7 — the pure `love` beat, no folded closing
// ---------------------------------------------------------------------------

describe("Page 7 (Love Grows) is the pure `love` beat, no folded Page-8 closer", () => {
  it("is a 2-element [lead, hero] body — the folded closer was removed", () => {
    const page7 = pageById(resolveStory9(biscuitSession9()), "baby-page-7");
    expect(page7.body).toHaveLength(2);
    expect(page7.body[1]).toBe("Love does not divide. It multiplies.");
    // The Page-8 closing text must NOT live on Page 7 anymore.
    expect(page7.body.join(" ")).not.toContain("So don't worry");
    expect(page7.body.join(" ")).not.toContain("There's room for everyone");
  });

  it("the other-pets append still folds into the love lead (Page 7 stays [lead, hero])", () => {
    const page7 = pageById(
      resolveStory9(story9SessionWith({ toggles: { otherPetsInHome: "yes" } })),
      "baby-page-7",
    );
    expect(page7.body).toHaveLength(2);
    expect(page7.body[0]).toContain(
      "Enough for every furred and feathered one under this roof.",
    );
    expect(page7.body[1]).toBe("Love does not divide. It multiplies.");
  });
});

// ---------------------------------------------------------------------------
// Page 2 — cat species variant
// ---------------------------------------------------------------------------

describe("Page 2 voices the cat species variant", () => {
  it("cat: uses the 'claim the warm spot / which lap / own quiet terms' line", () => {
    const page2 = pageById(
      resolveStory9(story9SessionWith({ pet: { species: "cat" } })),
      "baby-page-2",
    ).body.join(" ");
    expect(page2).toContain("the first to claim the warm spot by the window");
    expect(page2).toContain("the first to decide which lap was best");
    expect(page2).toContain("on his own quiet terms");
  });

  it("cat: drops the 'warm spot by the window' fragment from line 3 (no verbatim echo)", () => {
    const page2 = pageById(
      resolveStory9(story9SessionWith({ pet: { species: "cat" } })),
      "baby-page-2",
    );
    // "The warm spot by the window." appears once (in line 2's "claim the warm spot
    // by the window"), never as the standalone line-3 fragment.
    expect(page2.body).toContain(
      "Biscuit knew every corner. The sound of the right car in the driveway. The exact moment someone needed a friend.",
    );
    expect(page2.body).not.toContain(
      "Biscuit knew every corner. The warm spot by the window. The sound of the right car in the driveway. The exact moment someone needed a friend.",
    );
  });

  it("non-cat: keeps the master default Page-2 wording", () => {
    for (const species of ["dog", "rabbit", "bird", "other"] as const) {
      const page2 = pageById(
        resolveStory9(story9SessionWith({ pet: { species } })),
        "baby-page-2",
      ).body.join(" ");
      expect(page2).toContain("the first to be waited for, the first to be welcomed");
      expect(page2).not.toContain("the first to claim the warm spot by the window");
    }
  });
});

// ---------------------------------------------------------------------------
// Species voice (Pages 3 & 6)
// ---------------------------------------------------------------------------

describe("species selects the voice on Pages 3 & 6", () => {
  it("Page 6 reads 'a friend who loves' for species=other (grammar fix)", () => {
    const page6 = pageById(
      resolveStory9(story9SessionWith({ pet: { species: "other" } })),
      "baby-page-6",
    ).body.join(" ");
    expect(page6).toContain("a friend who loves");
    expect(page6).not.toContain("a other who loves");
  });

  it("Page 6 uses the species word for non-other species ('a dog who loves')", () => {
    const page6 = pageById(
      resolveStory9(story9SessionWith({ pet: { species: "dog" } })),
      "baby-page-6",
    ).body.join(" ");
    expect(page6).toContain("a dog who loves");
  });


  it("bird/rabbit use 'settles in' rather than 'curls up' on Page 3", () => {
    for (const species of ["bird", "rabbit"] as const) {
      const page3 = pageById(
        resolveStory9(story9SessionWith({ pet: { species } })),
        "baby-page-3",
      ).body.join(" ");
      expect(page3).toContain("Biscuit settles in at the foot of the bed");
      expect(page3).not.toContain("Biscuit curls up");
    }
  });

  it("dog/cat/other keep 'curls up' on Page 3", () => {
    for (const species of ["dog", "cat", "other"] as const) {
      const page3 = pageById(
        resolveStory9(story9SessionWith({ pet: { species } })),
        "baby-page-3",
      ).body.join(" ");
      expect(page3).toContain("Biscuit curls up at the foot of the bed");
    }
  });

  it("cat adds the 'supervises, doesn't crowd' line on Page 6 (expecting)", () => {
    const page6 = pageById(
      resolveStory9(story9SessionWith({ pet: { species: "cat" } })),
      "baby-page-6",
    ).body.join(" ");
    expect(page6).toContain(
      "A warm, watchful presence at the edge of the room",
    );
  });

  it("cat adds the supervise line on Page 6 (arrived) too", () => {
    const page6 = pageById(
      resolveStory9(
        story9SessionWith({
          pet: { species: "cat" },
          toggles: { babyStatus: "arrived" },
          babyName: "Noah",
        }),
      ),
      "baby-page-6",
    ).body.join(" ");
    expect(page6).toContain(
      "A warm, watchful presence at the edge of the room",
    );
  });

  it("a non-cat species does NOT add the supervise line on Page 6", () => {
    const page6 = pageById(
      resolveStory9(story9SessionWith({ pet: { species: "dog" } })),
      "baby-page-6",
    ).body.join(" ");
    expect(page6).not.toContain("A warm, watchful presence at the edge of the room");
  });
});

// ---------------------------------------------------------------------------
// otherPetsInHome — the "the more, the merrier" lines on Pages 2, 4, 5, 7
// ---------------------------------------------------------------------------

describe("otherPetsInHome appends the acknowledging lines (Pages 2, 4, 5, 7)", () => {
  const withPets = (): ResolvedStory =>
    resolveStory9(story9SessionWith({ toggles: { otherPetsInHome: "yes" } }));

  it("'yes' appends the Page-2 line", () => {
    expect(pageById(withPets(), "baby-page-2").body.join(" ")).toContain(
      "whatever other small ones share this home",
    );
  });

  it("'yes' appends the Page-4 line", () => {
    expect(pageById(withPets(), "baby-page-4").body.join(" ")).toContain(
      "The other pets have noticed too.",
    );
  });

  it("'yes' appends the Page-5 'the more, the merrier' line", () => {
    expect(pageById(withPets(), "baby-page-5").body.join(" ")).toContain(
      "Every one of the home's animals gets to be a big sibling too. The more, the merrier.",
    );
  });

  it("'yes' folds the Page-7 'enough for everyone' line into the love lead", () => {
    const page7 = pageById(withPets(), "baby-page-7");
    expect(page7.body[0]).toContain(
      "Enough for every furred and feathered one under this roof.",
    );
    // The hero line stays the fixed, quotable thesis (not polluted by the append).
    expect(page7.body).toContain("Love does not divide. It multiplies.");
  });

  it("'no' (default) adds none of the other-pets lines", () => {
    const story = resolveStory9(biscuitSession9());
    expect(pageById(story, "baby-page-2").body.join(" ")).not.toContain(
      "whatever other small ones share this home",
    );
    expect(pageById(story, "baby-page-4").body.join(" ")).not.toContain(
      "The other pets have noticed too.",
    );
    expect(pageById(story, "baby-page-5").body.join(" ")).not.toContain(
      "The more, the merrier.",
    );
    expect(pageById(story, "baby-page-7").body[0]).not.toContain(
      "Enough for every furred and feathered one",
    );
  });

  it("the other-pets lines touch ONLY Pages 2, 4, 5, 7", () => {
    const without = resolveStory9(biscuitSession9());
    const withP = withPets();
    for (const id of [
      "baby-cover",
      "baby-page-1",
      "baby-page-3",
      "baby-page-6",
      "baby-page-8",
      "baby-back-cover",
    ] as const) {
      expect(
        pageById(withP, id).body,
        `${id} leaked an other-pets change`,
      ).toEqual(pageById(without, id).body);
    }
  });
});

// ---------------------------------------------------------------------------
// Sparse-input fallback (quirks on Page 3)
// ---------------------------------------------------------------------------

describe("sparse {quirks} falls back to the Page-3 stock clause", () => {
  const FALLBACK_MARKER = "even the funny little habits that are Biscuit's alone";

  it("blank quirks -> the stock fallback clause, no dangling separator", () => {
    const page3 = pageById(
      resolveStory9(story9SessionWith({ memories: { quirks: "" } })),
      "baby-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_MARKER);
    expect(page3).not.toContain(". . ");
  });

  it("whitespace-only quirks -> treated as blank, stock fallback", () => {
    const page3 = pageById(
      resolveStory9(story9SessionWith({ memories: { quirks: "  " } })),
      "baby-page-3",
    ).body.join(" ");
    expect(page3).toContain(FALLBACK_MARKER);
  });

  it("substantial quirks -> the customer's words, NOT the fallback", () => {
    const quirks = "the way you tilt your head when the doorbell rings";
    const page3 = pageById(
      resolveStory9(story9SessionWith({ memories: { quirks } })),
      "baby-page-3",
    ).body.join(" ");
    expect(page3).toContain(quirks);
    expect(page3).not.toContain(FALLBACK_MARKER);
  });
});
