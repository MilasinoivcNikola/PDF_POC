import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story9PageId } from "@/lib/story/master-text";
import { resolveStory9 } from "@/lib/story/story9/variants";
import { NEW_BABY_FALLBACK, resolveBabyName } from "@/lib/story/story9/merge";
import {
  biscuitSession9,
  story9SessionWith,
} from "@/lib/story/story9/fixtures";
import type {
  BabyStatus,
  OtherPetsInHome,
  Species,
} from "@/lib/session/types";

// The Story-9 merge + entry point (`resolveStory9`) under test. These suites guard
// the master template's hard product rules for "[PET_NAME] and the New Baby" — the
// family-transition keepsake: no leftover placeholder/merge-field token in any
// variant combination, the `{babyName}` degradation to "the new baby" when
// expecting/blank (NEVER a literal token, NEVER a doubled article), and a missing
// required field is REPORTED (MergeError), never rendered. The wording asserted is
// pinned to context/masterstories/story-9-master-template.md, not imported from the
// source.

// ---------------------------------------------------------------------------
// Local helpers (mirror story6 merge.test.ts)
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

/** Every resolved string across the whole keepsake, flattened. */
function allStrings(story: ResolvedStory): string[] {
  return story.flatMap(pageStrings);
}

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story9PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-9 keepsake`);
  }
  return page;
}

// The full cross-product of every variant dimension: babyStatus × species ×
// otherPetsInHome (iterated programmatically, the way Story 6's matrix does). Each
// run is exercised with a baby name present AND blank by separate suites below.
const BABY_STATUSES: BabyStatus[] = ["expecting", "arrived"];
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const OTHER_PETS: OtherPetsInHome[] = ["yes", "no"];

interface Combo {
  babyStatus: BabyStatus;
  species: Species;
  otherPetsInHome: OtherPetsInHome;
  babyName: string;
}

/** Run `fn` for every combination in the full variant matrix (name present + blank). */
function forEachCombination(
  fn: (story: ResolvedStory, combo: Combo) => void,
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
          fn(story, { babyStatus, species, otherPetsInHome, babyName });
        }
      }
    }
  }
}

function comboLabel(c: Combo): string {
  return `${c.babyStatus}/${c.species}/${c.otherPetsInHome}/name="${c.babyName}"`;
}

// ---------------------------------------------------------------------------
// No literal placeholder / merge-field token survives — full variant matrix
// ---------------------------------------------------------------------------

describe("no placeholder survives merge across the full matrix", () => {
  it("resolves all 10 pages for every combination", () => {
    forEachCombination((story, combo) => {
      expect(story, comboLabel(combo)).toHaveLength(10);
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

  it("never emits an article+species grammar break ('a other'/'an dog') across the species matrix", () => {
    // The species merge field is dropped into "a {species} who loves..." on Page 6;
    // "a other" is the break this guards (FIX 2 inlines "friend" for species=other).
    // "a dog/cat/rabbit/bird" are all correct; the wrong cases are "a other" (needs
    // "a friend") and the inverse "an"+consonant ("an dog").
    const articleBreak = /\ba other\b|\ban (dog|cat|rabbit|bird|friend)\b/i;
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        expect(
          articleBreak.test(text),
          `article+species grammar break (${comboLabel(combo)}): ${text}`,
        ).toBe(false);
      }
    });
  });

  it("substitutes pet name into the cover title + family into the subtitle", () => {
    const story = resolveStory9(biscuitSession9());
    const cover = pageById(story, "baby-cover");
    expect(cover.title).toBe("Biscuit and the New Baby");
    expect(cover.subtitle).toBe("A story for the Garcia family");
  });

  it("substitutes the per-page merge fields into the body", () => {
    const story = resolveStory9(biscuitSession9());
    const page2 = pageById(story, "baby-page-2").body.join(" ");
    expect(page2).toContain("Before the new baby, there was you.");
    expect(page2).toContain("This was your home first, Biscuit.");
    const page3 = pageById(story, "baby-page-3").body.join(" ");
    expect(page3).toContain("chasing tennis balls in the backyard"); // favoriteActivity
    expect(page3).toContain("at the foot of the bed"); // sleepingSpot
    expect(page3).toContain("the way you tilt your head when the doorbell rings"); // quirks
  });

  it("uses the species descriptor in the 'big [descriptor]' phrasing on Page 5", () => {
    // dog + he → "boy" (Story 1's mapper, reused). "the best big boy".
    const page5 = pageById(resolveStory9(biscuitSession9()), "baby-page-5")
      .body.join(" ");
    expect(page5).toContain("the best big boy");
  });
});

// ---------------------------------------------------------------------------
// {babyName} degradation — never a literal token, never a doubled article
// ---------------------------------------------------------------------------

describe("resolveBabyName degrades correctly", () => {
  it("uses the name only when arrived AND a name is supplied", () => {
    expect(
      resolveBabyName(
        story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "Noah" }),
      ),
    ).toBe("Noah");
  });

  it("degrades to 'the new baby' when expecting (even with a name)", () => {
    expect(
      resolveBabyName(
        story9SessionWith({ toggles: { babyStatus: "expecting" }, babyName: "Noah" }),
      ),
    ).toBe(NEW_BABY_FALLBACK);
  });

  it("degrades to 'the new baby' when arrived but the name is blank/whitespace", () => {
    expect(
      resolveBabyName(
        story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "" }),
      ),
    ).toBe(NEW_BABY_FALLBACK);
    expect(
      resolveBabyName(
        story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "   " }),
      ),
    ).toBe(NEW_BABY_FALLBACK);
  });

  it("degrades when babyName is undefined", () => {
    expect(
      resolveBabyName(
        story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: undefined }),
      ),
    ).toBe(NEW_BABY_FALLBACK);
  });
});

describe("no literal [BABY_NAME] / doubled article survives across the matrix", () => {
  it("never leaves a literal {babyName} or [BABY_NAME] token", () => {
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        expect(text, `babyName token (${comboLabel(combo)}): ${text}`).not.toMatch(
          /\{babyName\}|\[BABY_NAME\]/,
        );
      }
    });
  });

  it("never produces a doubled article ('a a', 'the the') in any combination", () => {
    const doubled = /\b(a a|an an|the the|a the|the a|an the|the an)\b/i;
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        expect(doubled.test(text), `doubled article (${comboLabel(combo)}): ${text}`).toBe(
          false,
        );
      }
    });
  });

  it("never prepends an article to the degraded 'the new baby'", () => {
    // The degraded phrase carries its own "the"; no sentence should say "a the new
    // baby" or "the the new baby".
    forEachCombination((story, combo) => {
      const prose = allStrings(story).join(" ").toLowerCase();
      expect(prose, comboLabel(combo)).not.toContain("a the new baby");
      expect(prose, comboLabel(combo)).not.toContain("the the new baby");
    });
  });

  it("expecting keeps the baby abstract ('the new baby', never named) on the cover/dedication", () => {
    const story = resolveStory9(
      story9SessionWith({ toggles: { babyStatus: "expecting" }, babyName: "Noah" }),
    );
    const cover = pageById(story, "baby-cover");
    expect(cover.subtitle).toBe("A story for the Garcia family");
    // The name does not leak into the expecting book at all.
    expect(allStrings(story).join(" ")).not.toContain("Noah");
  });

  it("arrived names the baby on the cover subtitle + dedication when a name is supplied", () => {
    const story = resolveStory9(
      story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "Noah" }),
    );
    expect(pageById(story, "baby-cover").subtitle).toBe(
      "A story for Noah and Biscuit",
    );
    expect(pageById(story, "baby-page-1").title).toContain("For Biscuit and Noah");
  });

  it("arrived with a blank name still reads cleanly with 'the new baby'", () => {
    const story = resolveStory9(
      story9SessionWith({ toggles: { babyStatus: "arrived" }, babyName: "" }),
    );
    expect(pageById(story, "baby-cover").subtitle).toBe(
      "A story for the new baby and Biscuit",
    );
    // No leftover token, no doubled article.
    for (const text of allStrings(story)) {
      expect(text).not.toMatch(/\{babyName\}/);
    }
  });
});

// ---------------------------------------------------------------------------
// Optional fields leave no artifact when absent
// ---------------------------------------------------------------------------

describe("optional fields leave no artifact when absent", () => {
  it("does not throw and leaves no leftover token when quirks/nicknames/babyArrival absent", () => {
    const story = resolveStory9(
      story9SessionWith({
        memories: { quirks: undefined, nicknames: undefined },
        babyArrival: undefined,
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
  });

  it("treats blank-string optional fields as absent (no empty fragment)", () => {
    const story = resolveStory9(
      story9SessionWith({
        memories: { quirks: "", nicknames: "  " },
        babyArrival: "",
      }),
    );
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(PLACEHOLDER_PATTERN.test(text), text).toBe(false);
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }
  });
});

// ---------------------------------------------------------------------------
// Missing required field -> MergeError (never a rendered token)
// ---------------------------------------------------------------------------

describe("missing required field is reported via MergeError", () => {
  it("throws MergeError when petName is empty, carrying the key", () => {
    try {
      resolveStory9(story9SessionWith({ pet: { name: "" } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("petName");
    }
  });

  it("throws MergeError when breedColor is whitespace-only", () => {
    expect(() =>
      resolveStory9(story9SessionWith({ pet: { breedColor: "   " } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when ownerNames is empty", () => {
    expect(() =>
      resolveStory9(story9SessionWith({ owner: { names: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteActivity is empty", () => {
    expect(() =>
      resolveStory9(story9SessionWith({ memories: { favoriteActivity: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when sleepingSpot is empty", () => {
    expect(() =>
      resolveStory9(story9SessionWith({ memories: { sleepingSpot: "" } })),
    ).toThrow(MergeError);
  });

  it("collects every missing required key at once, sorted and deduped", () => {
    try {
      resolveStory9(
        story9SessionWith({
          pet: { name: "  ", breedColor: "" },
          owner: { names: "   " },
          memories: { favoriteActivity: "", sleepingSpot: " " },
        }),
      );
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      const keys = (err as MergeError).missingKeys;
      expect(keys).toEqual([
        "breedColor",
        "favoriteActivity",
        "ownerNames",
        "petName",
        "sleepingSpot",
      ]);
      expect([...keys].sort()).toEqual(keys);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("optional fields blank do NOT throw (quirks/nicknames/babyName/babyArrival)", () => {
    expect(() =>
      resolveStory9(
        story9SessionWith({
          memories: { quirks: "", nicknames: "" },
          babyName: "",
          babyArrival: "",
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
    const story = resolveStory9(
      story9SessionWith({
        memories: {
          favoriteActivity: "chasing {petName}'s ball",
          sleepingSpot: "the {warm} spot",
          quirks: "the {head} tilt",
        },
        babyName: "Noah {ownerNames}",
        toggles: { babyStatus: "arrived" },
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
    const all = allStrings(story).join(" ");
    expect(all).toContain("chasing petName's ball");
    expect(all).toContain("Noah ownerNames"); // baby name brace-stripped, not deleted
  });
});

// ---------------------------------------------------------------------------
// 9 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved keepsake has exactly 10 pages with the correct ids and layout", () => {
  // Authored independently from STORY_9_LAYOUT in merge.ts so a future drift is
  // caught. Story 9 reuses Story 1's NARRATIVE layouts wholesale (incl. `closing`
  // for page-8) — never `truth`.
  const expectedLayout: Record<Story9PageId, PageLayout> = {
    "baby-cover": "cover",
    "baby-page-1": "dedication",
    "baby-page-2": "narrative",
    "baby-page-3": "narrative",
    "baby-page-4": "narrative",
    "baby-page-5": "narrative",
    "baby-page-6": "narrative",
    "baby-page-7": "love",
    "baby-page-8": "closing",
    "baby-back-cover": "back-cover",
  };
  const expectedOrder: Story9PageId[] = [
    "baby-cover",
    "baby-page-1",
    "baby-page-2",
    "baby-page-3",
    "baby-page-4",
    "baby-page-5",
    "baby-page-6",
    "baby-page-7",
    "baby-page-8",
    "baby-back-cover",
  ];

  it("resolves exactly 10 pages in the expected order", () => {
    const story = resolveStory9(biscuitSession9());
    expect(story).toHaveLength(10);
    expect(story.map((p) => p.id)).toEqual(expectedOrder);
  });

  it("tags every page with the correct narrative layout (never `truth`)", () => {
    const story = resolveStory9(biscuitSession9());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story9PageId]}"`,
      ).toBe(expectedLayout[page.id as Story9PageId]);
      expect(page.layout, `${page.id} must not be the death layout`).not.toBe(
        "truth",
      );
    }
  });

  it("numbers pages 1-8 and leaves the covers null (the Story-1 narrative shape)", () => {
    const story = resolveStory9(biscuitSession9());
    expect(pageById(story, "baby-cover").pageNumber).toBeNull();
    expect(pageById(story, "baby-back-cover").pageNumber).toBeNull();
    expect(pageById(story, "baby-page-1").pageNumber).toBe(1);
    expect(pageById(story, "baby-page-7").pageNumber).toBe(7);
    expect(pageById(story, "baby-page-8").pageNumber).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolveStory9 calls
// ---------------------------------------------------------------------------

describe("resolveStory9 does not leak state across calls", () => {
  it("two consecutive calls produce identical output (fresh master copy each call)", () => {
    const first = resolveStory9(biscuitSession9());
    const second = resolveStory9(biscuitSession9());
    expect(second).toEqual(first);
  });

  it("an arrived / other-pets / cat resolve does not contaminate a later default resolve", () => {
    resolveStory9(
      story9SessionWith({
        toggles: { babyStatus: "arrived", otherPetsInHome: "yes" },
        pet: { species: "cat" },
      }),
    );
    const fresh = resolveStory9(biscuitSession9());
    const reference = resolveStory9(biscuitSession9());
    expect(fresh).toEqual(reference);
    // Spot-check the dimensions that just ran differently are back to the default.
    const page4 = pageById(fresh, "baby-page-4").body.join(" ");
    expect(page4).toContain("a new baby is coming to join the family"); // expecting
    expect(page4).not.toContain("the new baby arrived"); // not arrived
    const page2 = pageById(fresh, "baby-page-2").body.join(" ");
    expect(page2).not.toContain("whatever other small ones share this home"); // not other-pets
  });
});
