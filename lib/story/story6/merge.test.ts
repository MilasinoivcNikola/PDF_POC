import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story6PageId } from "@/lib/story/master-text";
import { resolveStory6 } from "@/lib/story/story6/variants";
import {
  biscuitSession6,
  story6SessionWith,
} from "@/lib/story/story6/fixtures";
import type {
  OtherPetsInHome,
  Species,
  TransitionFrame,
} from "@/lib/session/types";

// The Story-6 merge + entry point (`resolveStory6`) under test. These suites guard
// the master template's hard product rules for "While You're Still Here, [PET_NAME]"
// — the owner's present-tense living tribute to a pet who is STILL ALIVE: no
// leftover placeholder/merge-field token in any variant combination, the optional
// owner-message / nickname / date fields omit cleanly (no dangling em dash), the
// dedication block surfaces only when supplied, and a missing required field is
// REPORTED (MergeError), never rendered. The wording asserted is pinned to
// context/masterstories/story-6-master-template.md, not imported from the source.

// ---------------------------------------------------------------------------
// Local helpers (mirror story4/story5 merge.test.ts)
// ---------------------------------------------------------------------------

/** Every printed string on one resolved page (title + subtitle + body + brief). */
function pageStrings(page: ResolvedPage): string[] {
  return [
    ...(page.title !== undefined ? [page.title] : []),
    ...(page.subtitle !== undefined ? [page.subtitle] : []),
    ...page.body,
    ...(page.dedication !== undefined ? [page.dedication] : []),
    page.illustrationBrief,
  ];
}

/** Every resolved string across the whole tribute, flattened. */
function allStrings(story: ResolvedStory): string[] {
  return story.flatMap(pageStrings);
}

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story6PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-6 tribute`);
  }
  return page;
}

// The full cross-product of every variant dimension. Iterated programmatically
// (the way the Story-4/Story-5 matrices do): transitionFrame × age band × species
// × otherPetsInHome. Age bands are driven via representative free-text strings.
const TRANSITION_FRAMES: TransitionFrame[] = ["still-here", "road-ahead"];
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const OTHER_PETS: OtherPetsInHome[] = ["yes", "no"];
const AGE_BY_BAND = {
  senior: "13 years young",
  "very-senior": "almost fifteen, a grand old senior",
  "younger-diagnosed": "two, and facing something hard — the vet said not long",
} as const;
type AgeBandKey = keyof typeof AGE_BY_BAND;
const AGE_BANDS: AgeBandKey[] = ["senior", "very-senior", "younger-diagnosed"];

interface Combo {
  transitionFrame: TransitionFrame;
  band: AgeBandKey;
  species: Species;
  otherPetsInHome: OtherPetsInHome;
}

/** Run `fn` for every combination in the full variant matrix. */
function forEachCombination(
  fn: (story: ResolvedStory, combo: Combo) => void,
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
          fn(story, { transitionFrame, band, species, otherPetsInHome });
        }
      }
    }
  }
}

function comboLabel(c: Combo): string {
  return `${c.transitionFrame}/${c.band}/${c.species}/${c.otherPetsInHome}`;
}

// ---------------------------------------------------------------------------
// No literal placeholder / merge-field token survives — full variant matrix
// ---------------------------------------------------------------------------

describe("no placeholder survives merge across the full matrix", () => {
  it("resolves all 8 pages for every combination", () => {
    forEachCombination((story, combo) => {
      expect(story, comboLabel(combo)).toHaveLength(8);
    });
  });

  it("leaves no {field} token in any resolved string", () => {
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        PLACEHOLDER_PATTERN.lastIndex = 0;
        expect(
          PLACEHOLDER_PATTERN.test(text),
          `unresolved {placeholder} (${comboLabel(combo)}): ${text}`,
        ).toBe(false);
      }
    });
  });

  it("leaves no [UPPER_SNAKE] merge-field token in any resolved string", () => {
    // The master template's own notation is [PET_NAME]-style; none may leak.
    const bracketField = /\[[A-Z_]+\]/;
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        expect(
          bracketField.test(text),
          `bracket token (${comboLabel(combo)}): ${text}`,
        ).toBe(false);
      }
    });
  });

  it("substitutes pet name into the cover title and page-1 dedication", () => {
    const story = resolveStory6(biscuitSession6());
    const cover = pageById(story, "tribute-cover");
    expect(cover.title).toBe("While You're Still Here, Biscuit");
    expect(cover.subtitle).toBe("A book for the time we have");
    const page1 = pageById(story, "tribute-page-1");
    expect(page1.title).toBe("For Biscuit, who is here.");
    expect(page1.body).toContain("— Sarah");
  });

  it("substitutes the per-page merge fields into the body", () => {
    const story = resolveStory6(biscuitSession6());
    const page2 = pageById(story, "tribute-page-2").body.join(" ");
    expect(page2).toContain("This is Biscuit."); // petName
    expect(page2).toContain("Jack Russell gone soft and silver at the muzzle"); // breedColor
    expect(page2).toContain("he is 13 years young"); // pronounSubject + ageOrStage
    const page3 = pageById(story, "tribute-page-3").body.join(" ");
    expect(page3).toContain("the cup of coffee I drink with my hand on your back"); // favoriteRitual
    expect(page3).toContain("the slow morning walk we still take, just shorter now"); // favoriteActivity
  });

  it("capitalizes the sentence-initial subject pronoun ({pronounSubjectCap})", () => {
    const page2 = pageById(resolveStory6(biscuitSession6()), "tribute-page-2")
      .body.join(" ");
    expect(page2).toContain("He is not a thing that happened to me.");
    expect(page2).not.toContain("he is not a thing that happened to me.");
  });
});

// ---------------------------------------------------------------------------
// Optional owner message -> the dedication block (dropped, with the em dash, blank)
// ---------------------------------------------------------------------------

describe("optional ownerMessage surfaces as the Page-1 dedication block", () => {
  it("renders the dedication block when ownerMessage is provided", () => {
    const page1 = pageById(resolveStory6(biscuitSession6()), "tribute-page-1");
    expect(page1.dedication).toBe("Thank you for every ordinary afternoon.");
  });

  it("drops the dedication block entirely when ownerMessage is blank", () => {
    const page1 = pageById(
      resolveStory6(story6SessionWith({ memories: { ownerMessage: "" } })),
      "tribute-page-1",
    );
    expect(page1.dedication).toBeUndefined();
    // No empty/dangling dedication fragment or stray em dash from a blank message.
    expect(page1.body).toContain("— Sarah");
    expect(page1.body.every((p) => p.trim().length > 0)).toBe(true);
  });

  it("drops the dedication block when ownerMessage is whitespace-only", () => {
    const page1 = pageById(
      resolveStory6(story6SessionWith({ memories: { ownerMessage: "   " } })),
      "tribute-page-1",
    );
    expect(page1.dedication).toBeUndefined();
  });

  it("drops the dedication block when ownerMessage is undefined", () => {
    const page1 = pageById(
      resolveStory6(story6SessionWith({ memories: { ownerMessage: undefined } })),
      "tribute-page-1",
    );
    expect(page1.dedication).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Optional omit fields (nicknames, dateAdopted, favoriteSpots, sleepingSpot)
// ---------------------------------------------------------------------------

describe("optional-omit fields leave no artifact when absent", () => {
  it("does not throw and leaves no leftover token when all omit-fields are absent", () => {
    const story = resolveStory6(
      story6SessionWith({
        memories: {
          nicknames: undefined,
          dateAdopted: undefined,
          favoriteSpots: undefined,
          sleepingSpot: undefined,
        },
      }),
    );
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(
        PLACEHOLDER_PATTERN.test(text),
        `surviving {placeholder} in: ${text}`,
      ).toBe(false);
    }
  });

  it("treats blank-string omit-fields as absent (no empty fragment)", () => {
    const story = resolveStory6(
      story6SessionWith({
        memories: {
          nicknames: "  ",
          dateAdopted: "",
          favoriteSpots: "   ",
          sleepingSpot: "",
          // stillLoves blank -> uses the Page-3 fallback (which does not reference
          // the now-absent favoriteSpots), so the page still resolves cleanly.
          stillLoves: "",
        },
      }),
    );
    expect(() => story).not.toThrow();
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(PLACEHOLDER_PATTERN.test(text), text).toBe(false);
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }
  });

  it("does not throw when the optional nickname/date are blank", () => {
    expect(() =>
      resolveStory6(
        story6SessionWith({
          memories: { nicknames: "", dateAdopted: "" },
        }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Missing required field -> MergeError (never a rendered token)
// ---------------------------------------------------------------------------

describe("missing required field is reported via MergeError", () => {
  it("throws MergeError when petName is empty, carrying the key", () => {
    try {
      resolveStory6(story6SessionWith({ pet: { name: "" } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("petName");
    }
  });

  it("throws MergeError when breedColor is whitespace-only", () => {
    try {
      resolveStory6(story6SessionWith({ pet: { breedColor: "   " } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("breedColor");
    }
  });

  it("throws MergeError when ageOrStage is empty", () => {
    expect(() =>
      resolveStory6(story6SessionWith({ memories: { ageOrStage: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when ownerNames is empty", () => {
    expect(() =>
      resolveStory6(story6SessionWith({ owner: { names: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteRitual is empty", () => {
    expect(() =>
      resolveStory6(story6SessionWith({ memories: { favoriteRitual: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteActivity is empty", () => {
    expect(() =>
      resolveStory6(story6SessionWith({ memories: { favoriteActivity: "" } })),
    ).toThrow(MergeError);
  });

  it("collects every missing required key at once, sorted and deduped", () => {
    try {
      resolveStory6(
        story6SessionWith({
          pet: { name: "  ", breedColor: "" },
          owner: { names: "   " },
          memories: { ageOrStage: "", favoriteRitual: " ", favoriteActivity: "" },
        }),
      );
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      const keys = (err as MergeError).missingKeys;
      expect(keys).toEqual([
        "ageOrStage",
        "breedColor",
        "favoriteActivity",
        "favoriteRitual",
        "ownerNames",
        "petName",
      ]);
      // Sorted + deduped (each key appears on multiple pages but is reported once).
      expect([...keys].sort()).toEqual(keys);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("optional fields blank do NOT throw (ownerMessage/stillLoves/quirks/nicknames/dates)", () => {
    expect(() =>
      resolveStory6(
        story6SessionWith({
          memories: {
            ownerMessage: "",
            stillLoves: "",
            quirks: "",
            nicknames: "",
            dateAdopted: "",
            favoriteSpots: "",
            sleepingSpot: "",
          },
        }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Free-text with braces cannot inject a surviving placeholder
// ---------------------------------------------------------------------------

describe("customer free-text with { or } cannot leak a literal placeholder", () => {
  it("strips braces from the free-text fields and survives merge", () => {
    const story = resolveStory6(
      story6SessionWith({
        memories: {
          favoriteRitual: "the coffee I drink with {petName} every {ownerNames}",
          favoriteActivity: "our {slow} morning {walk}",
          stillLoves: "still waits at the {window}",
          quirks: "the {sigh} when you lie down",
          ownerMessage: "Thank you, {petName}.",
        },
      }),
    );
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(
        PLACEHOLDER_PATTERN.test(text),
        `surviving {placeholder} in: ${text}`,
      ).toBe(false);
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }
    // The words still render (brace-stripped, not deleted wholesale).
    const all = allStrings(story).join(" ");
    expect(all).toContain("the coffee I drink with petName every ownerNames");
    expect(all).toContain("our slow morning walk");
  });

  it("a {token} injected into ownerNames does not survive into the dedication", () => {
    const page1 = pageById(
      resolveStory6(story6SessionWith({ owner: { names: "Sarah {dateAdopted}" } })),
      "tribute-page-1",
    );
    expect(page1.body).toContain("— Sarah dateAdopted");
    expect(page1.body.join(" ")).not.toMatch(/[{}]/);
  });
});

// ---------------------------------------------------------------------------
// 8 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved tribute has exactly 8 pages with the correct ids and layout", () => {
  // Authored independently from STORY_6_LAYOUT in merge.ts so a future drift is
  // caught (mirrors how Story-4/Story-5's merge.test.ts double-lock their maps).
  // Story 6 reuses Story 1's NARRATIVE layouts wholesale — never `truth`.
  const expectedLayout: Record<Story6PageId, PageLayout> = {
    "tribute-cover": "cover",
    "tribute-page-1": "dedication",
    "tribute-page-2": "narrative",
    "tribute-page-3": "narrative",
    "tribute-page-4": "narrative",
    "tribute-page-5": "love",
    "tribute-page-6": "love",
    "tribute-back-cover": "back-cover",
  };
  const expectedOrder: Story6PageId[] = [
    "tribute-cover",
    "tribute-page-1",
    "tribute-page-2",
    "tribute-page-3",
    "tribute-page-4",
    "tribute-page-5",
    "tribute-page-6",
    "tribute-back-cover",
  ];

  it("resolves exactly 8 pages in the expected order", () => {
    const story = resolveStory6(biscuitSession6());
    expect(story).toHaveLength(8);
    expect(story.map((p) => p.id)).toEqual(expectedOrder);
  });

  it("tags every page with the correct narrative layout (never `truth`)", () => {
    const story = resolveStory6(biscuitSession6());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story6PageId]}"`,
      ).toBe(expectedLayout[page.id as Story6PageId]);
      expect(page.layout, `${page.id} must not be the death layout`).not.toBe(
        "truth",
      );
    }
  });

  it("numbers pages 1-6 and leaves the covers null (the Story-1 narrative shape)", () => {
    const story = resolveStory6(biscuitSession6());
    expect(pageById(story, "tribute-cover").pageNumber).toBeNull();
    expect(pageById(story, "tribute-back-cover").pageNumber).toBeNull();
    expect(pageById(story, "tribute-page-1").pageNumber).toBe(1);
    expect(pageById(story, "tribute-page-6").pageNumber).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolveStory6 calls
// ---------------------------------------------------------------------------

describe("resolveStory6 does not leak state across calls", () => {
  it("two consecutive calls produce identical output (fresh master copy each call)", () => {
    const first = resolveStory6(biscuitSession6());
    const second = resolveStory6(biscuitSession6());
    expect(second).toEqual(first);
  });

  it("a road-ahead / very-senior resolve does not contaminate a later default resolve", () => {
    // Resolve a maximally-different session first…
    resolveStory6(
      story6SessionWith({
        toggles: { transitionFrame: "road-ahead", otherPetsInHome: "yes" },
        memories: { ageOrStage: AGE_BY_BAND["very-senior"] },
        pet: { species: "cat" },
      }),
    );
    // …then the default: it must be exactly the canonical Biscuit resolution.
    const fresh = resolveStory6(biscuitSession6());
    const reference = resolveStory6(biscuitSession6());
    expect(fresh).toEqual(reference);
    // Spot-check the dimensions that just ran differently are back to the default.
    const page2 = pageById(fresh, "tribute-page-2").body.join(" ");
    expect(page2).toContain("the first sound in the morning"); // dog default, not cat
    expect(page2).not.toContain("the shape of the house before you"); // not very-senior
    const page4 = pageById(fresh, "tribute-page-4").body.join(" ");
    expect(page4).not.toContain("The others in this house know you too."); // not other-pets
    const page5closer = pageById(fresh, "tribute-page-5").body.slice(-1)[0];
    expect(page5closer).not.toContain("the road ahead"); // still-here, not road-ahead
  });
});
