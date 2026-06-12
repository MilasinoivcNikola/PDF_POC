import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story5PageId } from "@/lib/story/master-text";
import { resolveStory5 } from "@/lib/story/story5/variants";
import {
  murphySession5,
  story5SessionWith,
} from "@/lib/story/story5/fixtures";
import type {
  LetterBeliefFrame,
  LetterDeathType,
  Relationship,
  Species,
} from "@/lib/session/types";

// The Story-5 merge + entry point (`resolveStory5`) under test. These suites guard
// the master template's hard product rules for "A Letter to [PET_NAME]" — the
// owner's second-person voice writing TO the pet who died: no leftover
// placeholder/merge-field token, the quality-bar banned phrases never appear in ANY
// variant combination, the word "died" appears plainly (Page 2), no reunion promise
// on the secular frame, the Page-4 apology lifts blame (the absolution line in every
// death-type variant), optional dates/nicknames/fallbacks omit cleanly, and a
// missing required field is REPORTED (MergeError), never rendered. The wording
// asserted here is pinned to context/masterstories/story-5-master-template.md, not
// imported from the source (so the assertion tests the text, not itself).

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Every printed string on one resolved page (title + subtitle + body + brief). */
function pageStrings(page: ResolvedPage): string[] {
  return [
    ...(page.title !== undefined ? [page.title] : []),
    ...(page.subtitle !== undefined ? [page.subtitle] : []),
    ...page.body,
    page.illustrationBrief,
  ];
}

/** Every resolved string across the whole letter, flattened. */
function allStrings(story: ResolvedStory): string[] {
  return story.flatMap(pageStrings);
}

/** Only the published prose (excludes the illustration brief). */
function proseStrings(page: ResolvedPage): string[] {
  return [
    ...(page.title !== undefined ? [page.title] : []),
    ...(page.subtitle !== undefined ? [page.subtitle] : []),
    ...page.body,
  ];
}

/** Every published prose string across the letter (excludes illustration briefs). */
function allProse(story: ResolvedStory): string[] {
  return story.flatMap(proseStrings);
}

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story5PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-5 letter`);
  }
  return page;
}

// The full cross-product of every variant dimension. Iterated programmatically
// (120 sessions) rather than hand-written, the way the Story-2 variant smoke does.
const DEATH_TYPES: LetterDeathType[] = [
  "peaceful",
  "illness",
  "sudden",
  "euthanasia",
];
const BELIEF_FRAMES: LetterBeliefFrame[] = ["rainbow-bridge", "heaven", "secular"];
const RELATIONSHIPS: Relationship[] = ["single", "couple"];
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];

/** Run `fn` for every combination in the full variant matrix. */
function forEachCombination(
  fn: (
    story: ResolvedStory,
    combo: {
      deathType: LetterDeathType;
      beliefFrame: LetterBeliefFrame;
      relationship: Relationship;
      species: Species;
    },
  ) => void,
): void {
  for (const deathType of DEATH_TYPES) {
    for (const beliefFrame of BELIEF_FRAMES) {
      for (const relationship of RELATIONSHIPS) {
        for (const species of SPECIES) {
          const story = resolveStory5(
            story5SessionWith({
              pet: { species },
              owner: { relationship },
              toggles: { deathType, beliefFrame },
            }),
          );
          fn(story, { deathType, beliefFrame, relationship, species });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Placeholder survival — the central invariant
// ---------------------------------------------------------------------------

describe("no placeholder or bracket merge-field survives", () => {
  it("leaves no {token} across the full variant matrix", () => {
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        expect(
          PLACEHOLDER_PATTERN.test(text),
          `surviving {placeholder} in ${JSON.stringify(combo)}: ${text}`,
        ).toBe(false);
        PLACEHOLDER_PATTERN.lastIndex = 0; // reset the global regex between tests
      }
    });
  });

  it("leaves no [BRACKET] merge-field token across the full matrix", () => {
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        expect(
          /\[[A-Z_]+\]/.test(text),
          `surviving [BRACKET] token in ${JSON.stringify(combo)}: ${text}`,
        ).toBe(false);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Quality bar — banned phrases, "died", no reunion on secular
// ---------------------------------------------------------------------------

const BANNED_PHRASES = [
  "passed away",
  "went to sleep",
  "went away",
  "crossed the rainbow bridge",
  "ran free in heaven",
  "watching over",
  "watch over",
  "fur baby",
  "now an angel",
];

describe("the quality bar holds across every variant combination", () => {
  it("never uses a banned euphemism (prose only)", () => {
    forEachCombination((story, combo) => {
      const prose = allProse(story).join("\n").toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(
          prose.includes(phrase),
          `banned phrase "${phrase}" in ${JSON.stringify(combo)}`,
        ).toBe(false);
      }
    });
  });

  it('uses the word "died" plainly on Page 2 in every combination', () => {
    forEachCombination((story, combo) => {
      const page2 = proseStrings(pageById(story, "note-page-2"))
        .join("\n")
        .toLowerCase();
      expect(
        page2.includes("you died"),
        `Page 2 should say "you died" in ${JSON.stringify(combo)}`,
      ).toBe(true);
    });
  });

  it("never promises reunion on the secular belief frame (Page 5)", () => {
    for (const relationship of RELATIONSHIPS) {
      for (const species of SPECIES) {
        const story = resolveStory5(
          story5SessionWith({
            pet: { species },
            owner: { relationship },
            toggles: { beliefFrame: "secular" },
          }),
        );
        const page5 = proseStrings(pageById(story, "note-page-5"))
          .join("\n")
          .toLowerCase();
        // The heaven frame's reunion clause ("a room there with you in it") must
        // not appear on the secular frame; nor any "see you again" promise.
        expect(page5.includes("a room there with you")).toBe(false);
        expect(page5.includes("see you again")).toBe(false);
        expect(page5.includes("when it is my time")).toBe(false);
        expect(page5.includes("when it is our time")).toBe(false);
      }
    }
  });

  it("makes the reunion promise on the heaven frame (Page 5)", () => {
    const single = resolveStory5(
      story5SessionWith({ toggles: { beliefFrame: "heaven" } }),
    );
    const couple = resolveStory5(
      story5SessionWith({
        owner: { relationship: "couple" },
        toggles: { beliefFrame: "heaven" },
      }),
    );
    expect(
      proseStrings(pageById(single, "note-page-5")).join("\n"),
    ).toContain("when it is my time, there is a room there with you in it");
    expect(
      proseStrings(pageById(couple, "note-page-5")).join("\n"),
    ).toContain("when it is our time, there is a room there with you in it");
  });
});

// ---------------------------------------------------------------------------
// Page 4 — the absolution must be present in every death-type variant
// ---------------------------------------------------------------------------

describe("Page 4 (the confession) lifts blame in every death-type variant", () => {
  it("carries the absolution line for every death type (single)", () => {
    for (const deathType of DEATH_TYPES) {
      const story = resolveStory5(story5SessionWith({ toggles: { deathType } }));
      const page4 = proseStrings(pageById(story, "note-page-4"))
        .join("\n")
        .toLowerCase();
      expect(
        page4.includes("it wasn't your fault, and it wasn't mine"),
        `single ${deathType} should absolve`,
      ).toBe(true);
    }
  });

  it("carries the shared absolution line for every death type (couple)", () => {
    for (const deathType of DEATH_TYPES) {
      const story = resolveStory5(
        story5SessionWith({ owner: { relationship: "couple" }, toggles: { deathType } }),
      );
      const page4 = proseStrings(pageById(story, "note-page-4"))
        .join("\n")
        .toLowerCase();
      expect(
        page4.includes("it wasn't your fault, and it wasn't ours"),
        `couple ${deathType} should absolve (shared)`,
      ).toBe(true);
    }
  });

  it("never assigns blame on Page 4 (no 'your fault' without the absolution clause)", () => {
    forEachCombination((story) => {
      const page4 = proseStrings(pageById(story, "note-page-4"))
        .join("\n")
        .toLowerCase();
      // The only "your fault" occurrence is inside "it wasn't your fault…".
      const faultCount = (page4.match(/your fault/g) ?? []).length;
      const absolvedCount = (page4.match(/wasn't your fault/g) ?? []).length;
      expect(faultCount).toBe(absolvedCount);
    });
  });
});

// ---------------------------------------------------------------------------
// Relationship — first person consistent ("I" single / "we" couple)
// ---------------------------------------------------------------------------

describe("relationship drives a consistent first person", () => {
  it("the couple variant reads as shared on Page 4 and signs the joined names", () => {
    const couple = resolveStory5(
      story5SessionWith({ owner: { relationship: "couple", names: "Sarah and David" } }),
    );
    const page4 = proseStrings(pageById(couple, "note-page-4")).join("\n");
    expect(page4).toContain("There is something we have to say");
    expect(page4).toContain("We're sorry"); // peaceful default
    // Page 6 closes with the couple voice + joined names + the canonical sign-off.
    const page6 = proseStrings(pageById(couple, "note-page-6"));
    expect(page6).toContain("We will carry you. We will carry you everywhere, for the rest of our lives, and it will not be a weight. It will be the opposite of a weight.");
    expect(page6).toContain("Thank you for being ours.");
    expect(page6).toContain("With all my love, always,");
    expect(page6).toContain("Sarah and David");
  });

  it("the single variant uses 'I' / 'mine' on Page 3 and Page 6", () => {
    const single = resolveStory5(murphySession5());
    const page3 = proseStrings(pageById(single, "note-page-3")).join("\n");
    expect(page3).toContain("You were a good dog. The best one. Mine.");
    const page6 = proseStrings(pageById(single, "note-page-6"));
    expect(page6).toContain("Thank you for being mine.");
    expect(page6).toContain("I will carry you. I will carry you everywhere, for the rest of my life, and it will not be a weight. It will be the opposite of a weight.");
  });
});

// ---------------------------------------------------------------------------
// Species — the Page-3 "happy sound" clause
// ---------------------------------------------------------------------------

describe("species drives the Page-3 'happy sound' clause", () => {
  it("uses the cat clause for a cat", () => {
    const story = resolveStory5(story5SessionWith({ pet: { species: "cat" } }));
    expect(proseStrings(pageById(story, "note-page-3")).join("\n")).toContain(
      "the sound you made that meant the world was, for now, acceptable",
    );
  });

  it("uses the bird clause for a bird", () => {
    const story = resolveStory5(story5SessionWith({ pet: { species: "bird" } }));
    expect(proseStrings(pageById(story, "note-page-3")).join("\n")).toContain(
      "the song you sang when nobody asked you to",
    );
  });

  it("uses the rabbit clause for a rabbit", () => {
    const story = resolveStory5(story5SessionWith({ pet: { species: "rabbit" } }));
    expect(proseStrings(pageById(story, "note-page-3")).join("\n")).toContain(
      "the way you went loose and easy when you finally trusted the room",
    );
  });

  it("uses the species-neutral (dog) clause for 'other'", () => {
    const story = resolveStory5(story5SessionWith({ pet: { species: "other" } }));
    expect(proseStrings(pageById(story, "note-page-3")).join("\n")).toContain(
      "the sound you made that meant you were happy",
    );
  });
});

// ---------------------------------------------------------------------------
// Optional fields & fallbacks (quirks, lastGoodDay, whatIKeep, dates, nicknames)
// ---------------------------------------------------------------------------

describe("optional fields omit / fall back cleanly", () => {
  it("uses the quirks fallback when {quirks} is blank (single)", () => {
    const story = resolveStory5(story5SessionWith({ memories: { quirks: "" } }));
    const page3 = proseStrings(pageById(story, "note-page-3")).join("\n");
    expect(page3).toContain(
      "Thank you for the way you found me without looking",
    );
    expect(page3).not.toContain("Thank you for .");
  });

  it("uses the last-good-day fallback when blank, with no dangling fragment", () => {
    const story = resolveStory5(
      story5SessionWith({ memories: { lastGoodDay: "" } }),
    );
    const page3 = proseStrings(pageById(story, "note-page-3")).join("\n");
    expect(page3).toContain(
      "And thank you for the last good ordinary day, the one I didn't know to memorize.",
    );
    expect(page3).not.toContain("And thank you for .");
  });

  it("uses the last-good-day value when provided", () => {
    const story = resolveStory5(murphySession5());
    const page3 = proseStrings(pageById(story, "note-page-3")).join("\n");
    expect(page3).toContain(
      "And thank you for the last good Saturday, when you stole half my toast and slept in the sun all afternoon.",
    );
  });

  it("drops the {whatIKeep} clause cleanly when blank (no empty 'keeping .' fragment)", () => {
    for (const beliefFrame of BELIEF_FRAMES) {
      const story = resolveStory5(
        story5SessionWith({ memories: { whatIKeep: "" }, toggles: { beliefFrame } }),
      );
      const page5 = proseStrings(pageById(story, "note-page-5")).join("\n");
      expect(page5).not.toContain("keeping .");
      expect(page5).not.toContain("I'm keeping ,");
      // The always-present ritual carries the page instead.
      expect(page5.toLowerCase()).toContain("our walk before coffee");
    }
  });

  it("renders the {whatIKeep} clause when provided", () => {
    const story = resolveStory5(murphySession5());
    const page5 = proseStrings(pageById(story, "note-page-5")).join("\n");
    expect(page5).toContain(
      "I'm keeping your collar on the hook, the dent you left in the couch.",
    );
  });

  it("prints the date line on the cover and Page 6 only when BOTH dates are present", () => {
    const both = resolveStory5(murphySession5());
    const coverBoth = pageStrings(pageById(both, "note-cover")).join("\n");
    const page6Both = proseStrings(pageById(both, "note-page-6")).join("\n");
    expect(coverBoth).toContain("March 2014 — October 2025");
    expect(page6Both).toContain("March 2014 — October 2025");

    // Only one date present → no date line anywhere.
    const onlyAdopted = resolveStory5(
      story5SessionWith({ memories: { datePassed: undefined } }),
    );
    const allOnly = allProse(onlyAdopted).join("\n");
    expect(allOnly).not.toContain("March 2014 —");
    expect(allOnly).not.toContain("— October 2025");
    expect(allOnly).not.toMatch(/—\s*$/m); // no dangling one-sided dash
  });

  it("prints the nickname line on Page 6 only when nicknames are provided", () => {
    const withNick = resolveStory5(murphySession5());
    expect(proseStrings(pageById(withNick, "note-page-6")).join("\n")).toContain(
      "for Murphy — Murph, Mr. Murph, the worst dog",
    );

    const without = resolveStory5(
      story5SessionWith({ memories: { nicknames: undefined } }),
    );
    expect(
      proseStrings(pageById(without, "note-page-6")).join("\n"),
    ).not.toContain("for Murphy —");
  });
});

// ---------------------------------------------------------------------------
// MergeError reporting & brace-injection
// ---------------------------------------------------------------------------

describe("a missing required field is reported, never rendered as a token", () => {
  it("throws MergeError with the missing keys (sorted, deduped)", () => {
    let thrown: unknown;
    try {
      resolveStory5(
        story5SessionWith({
          pet: { name: "" },
          memories: { favoriteRitual: "", favoriteSpots: "" },
        }),
      );
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(MergeError);
    const err = thrown as MergeError;
    // petName + favoriteRitual + favoriteSpots, sorted, deduped (each appears on
    // multiple pages but must be reported once).
    expect(err.missingKeys).toEqual([
      "favoriteRitual",
      "favoriteSpots",
      "petName",
    ]);
  });

  it("does NOT throw for a blank optional (lastGoodDay / whatIKeep / quirks)", () => {
    expect(() =>
      resolveStory5(
        story5SessionWith({
          memories: { quirks: "", lastGoodDay: "", whatIKeep: "" },
        }),
      ),
    ).not.toThrow();
  });

  it("strips braces from customer free-text so no injected {token} survives", () => {
    const story = resolveStory5(
      story5SessionWith({
        memories: { favoriteRitual: "our {sneaky} morning walk" },
      }),
    );
    const all = allStrings(story).join("\n");
    expect(all).toContain("our sneaky morning walk");
    expect(all).not.toContain("{sneaky}");
    // The injected token must not have been resolved or left literal.
    expect(all).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ---------------------------------------------------------------------------
// 6 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved letter has exactly 6 pages with the correct ids and layout", () => {
  // Authored independently from STORY_5_LAYOUT in merge.ts so a future drift is
  // caught by a failing test, not silently passed.
  const expectedLayout: Record<Story5PageId, PageLayout> = {
    "note-cover": "letter-cover",
    "note-page-2": "letter",
    "note-page-3": "letter",
    "note-page-4": "letter",
    "note-page-5": "letter",
    "note-page-6": "letter",
  };

  it("resolves exactly the 6 Story-5 pages in order", () => {
    const story = resolveStory5(murphySession5());
    expect(story.map((p) => p.id)).toEqual([
      "note-cover",
      "note-page-2",
      "note-page-3",
      "note-page-4",
      "note-page-5",
      "note-page-6",
    ]);
  });

  it("tags every page with the correct layout (letter-cover + 5 letter)", () => {
    const story = resolveStory5(murphySession5());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story5PageId]}"`,
      ).toBe(expectedLayout[page.id as Story5PageId]);
    }
  });

  it("carries no printed page numbers (a letter, not a manuscript)", () => {
    const story = resolveStory5(murphySession5());
    for (const page of story) {
      expect(page.pageNumber).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Cover / signature wiring
// ---------------------------------------------------------------------------

describe("the cover and signature read correctly", () => {
  it('titles the cover "A Letter to [PET_NAME]" / "from [OWNER_NAMES]"', () => {
    const cover = pageById(resolveStory5(murphySession5()), "note-cover");
    expect(cover.title).toBe("A Letter to Murphy");
    expect(cover.subtitle).toBe("from Sarah");
  });

  it("signs the Page-6 closing with the canonical sign-off sentinel + owner names", () => {
    const page6 = proseStrings(pageById(resolveStory5(murphySession5()), "note-page-6"));
    // The sign-off sentinel must be exactly the canonical string (LETTER_SIGNOFFS
    // matches by equality), with the owner-name signature right after it.
    const i = page6.indexOf("With all my love, always,");
    expect(i).toBeGreaterThan(-1);
    expect(page6[i + 1]).toBe("Sarah");
  });
});

// ---------------------------------------------------------------------------
// Per-dimension page isolation — a variant changes ONLY its own page, never
// bleeds into the others (the Story-2 "only Page N changes …" guard, applied to
// Story 5's variant dimensions). death-type drives Page 4 alone; belief-frame
// drives Page 5 alone. Resolved at the same fixture so every other field is
// constant — only the dimension under test moves, so any change on a sibling
// page is a leak, not a fixture artifact.
// ---------------------------------------------------------------------------

describe("each variant changes only its own page (no bleed)", () => {
  it("death-type changes ONLY Page 4 (every other page byte-identical)", () => {
    const base = resolveStory5(story5SessionWith({ toggles: { deathType: "peaceful" } }));
    for (const deathType of DEATH_TYPES) {
      if (deathType === "peaceful") continue;
      const other = resolveStory5(story5SessionWith({ toggles: { deathType } }));
      for (const page of base) {
        const counterpart = pageById(other, page.id as Story5PageId);
        if (page.id === "note-page-4") {
          // The confession page MUST differ for a different death type.
          expect(
            counterpart.body,
            `Page 4 should change for ${deathType}`,
          ).not.toEqual(page.body);
        } else {
          // No other page may move when only the death type changed.
          expect(
            counterpart.body,
            `${page.id} leaked a death-type change (${deathType})`,
          ).toEqual(page.body);
        }
      }
    }
  });

  it("belief-frame changes ONLY Page 5 (every other page byte-identical)", () => {
    const base = resolveStory5(
      story5SessionWith({ toggles: { beliefFrame: "rainbow-bridge" } }),
    );
    for (const beliefFrame of BELIEF_FRAMES) {
      if (beliefFrame === "rainbow-bridge") continue;
      const other = resolveStory5(story5SessionWith({ toggles: { beliefFrame } }));
      for (const page of base) {
        const counterpart = pageById(other, page.id as Story5PageId);
        if (page.id === "note-page-5") {
          // The "where you are" page MUST differ for a different belief frame.
          expect(
            counterpart.body,
            `Page 5 should change for ${beliefFrame}`,
          ).not.toEqual(page.body);
        } else {
          // No other page may move when only the belief frame changed.
          expect(
            counterpart.body,
            `${page.id} leaked a belief-frame change (${beliefFrame})`,
          ).toEqual(page.body);
        }
      }
    }
  });

  it("relationship leaves the cover (title/subtitle) untouched", () => {
    // Relationship rewrites the first person on every BODY page, but the cover is
    // title/subtitle only ("A Letter to {petName}" / "from {ownerNames}") with no
    // relationship branch — so the couple variant must not move it.
    const single = pageById(resolveStory5(murphySession5()), "note-cover");
    const couple = pageById(
      resolveStory5(story5SessionWith({ owner: { relationship: "couple" } })),
      "note-cover",
    );
    expect(couple.title).toEqual(single.title);
    expect(couple.subtitle).toEqual(single.subtitle);
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolve calls — each compose starts from a fresh
// master copy, so an earlier variant can never contaminate a later one (the
// `masterStory5()` "fresh mutable copy each call" contract, and `appendOptional
// Lines`'s in-place pushes not piling up across calls). The Story-2 "does not
// bleed state across calls" guard.
// ---------------------------------------------------------------------------

describe("resolveStory5 does not leak state across calls", () => {
  it("a euthanasia/couple resolve does not contaminate a later peaceful/single resolve", () => {
    // Resolve a maximally-different session first…
    resolveStory5(
      story5SessionWith({
        owner: { relationship: "couple" },
        toggles: { deathType: "euthanasia", beliefFrame: "heaven" },
      }),
    );
    // …then the default: it must be exactly the canonical Murphy resolution.
    const fresh = resolveStory5(murphySession5());
    const reference = resolveStory5(murphySession5());
    expect(fresh).toEqual(reference);
    // Spot-check the dimensions that just ran differently: Page 4 is the single
    // peaceful confession (not the euthanasia "kindest thing"), Page 5 is the
    // rainbow-bridge body (not heaven's "a room there with you").
    const page4 = proseStrings(pageById(fresh, "note-page-4")).join("\n");
    expect(page4).toContain("I'm sorry.");
    expect(page4).not.toContain("the kindest thing I have ever done");
    const page5 = proseStrings(pageById(fresh, "note-page-5")).join("\n");
    expect(page5).not.toContain("a room there with you");
  });

  it("the optional date/nickname lines do not pile up across repeated resolves", () => {
    // appendOptionalLines pushes the date line onto the cover/Page-6 body in
    // place; a fresh master copy each call means the count stays at one, never
    // accumulating.
    const first = resolveStory5(murphySession5());
    resolveStory5(murphySession5());
    resolveStory5(murphySession5());
    const fourth = resolveStory5(murphySession5());

    const coverDateLines = (story: ResolvedStory): number =>
      pageStrings(pageById(story, "note-cover")).filter(
        (s) => s === "March 2014 — October 2025",
      ).length;
    expect(coverDateLines(first)).toBe(1);
    expect(coverDateLines(fourth)).toBe(1);

    const page6 = pageById(fourth, "note-page-6");
    // One date line + one nickname line on Page 6, never doubled.
    expect(
      page6.body.filter((s) => s === "March 2014 — October 2025").length,
    ).toBe(1);
    expect(
      page6.body.filter((s) => s === "for Murphy — Murph, Mr. Murph, the worst dog").length,
    ).toBe(1);
  });
});
