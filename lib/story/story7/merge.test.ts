import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story7PageId } from "@/lib/story/master-text";
import { resolveStory7 } from "@/lib/story/story7/variants";
import {
  biscuitSession7,
  story7SessionWith,
} from "@/lib/story/story7/fixtures";
import type {
  AdoptionSource,
  LifeStage,
  Occasion,
  Species,
} from "@/lib/session/types";

// The Story-7 merge + entry point (`resolveStory7`) under test. These suites guard
// the master template's hard product rules for "Welcome Home — [PET_NAME]'s Gotcha
// Day" — the catalog's FIRST joyful, non-memorial book: no leftover placeholder/
// merge-field token in any variant combination, the optional child/family/nickname/
// date fields omit cleanly, the optional-with-fallback homecoming memory + quirks
// always resolve, a missing required field is REPORTED (MergeError), and — Story
// 7's distinctive bar — NO grief/memorial language ever leaks in. The wording
// asserted is pinned to context/masterstories/story-7-master-template.md, not
// imported from the source.

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

/** Every resolved string across the whole book, flattened. */
function allStrings(story: ResolvedStory): string[] {
  return story.flatMap(pageStrings);
}

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story7PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-7 book`);
  }
  return page;
}

// The full cross-product of every variant dimension: occasion × adoption-source ×
// life-stage × species × child-present × family-present.
const OCCASIONS: Occasion[] = ["new-arrival", "gotcha-day-anniversary"];
const SOURCES: AdoptionSource[] = [
  "shelter",
  "rescue",
  "breeder",
  "found-as-stray",
  "other",
];
const LIFE_STAGES: LifeStage[] = ["puppy-kitten", "adult", "senior-adoption"];
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const CHILD = [true, false] as const;
const FAMILY = [true, false] as const;

interface Combo {
  occasion: Occasion;
  source: AdoptionSource;
  stage: LifeStage;
  species: Species;
  hasChild: boolean;
  hasFamily: boolean;
}

/** Run `fn` for every combination in the full variant matrix. */
function forEachCombination(
  fn: (story: ResolvedStory, combo: Combo) => void,
): void {
  for (const occasion of OCCASIONS) {
    for (const source of SOURCES) {
      for (const stage of LIFE_STAGES) {
        for (const species of SPECIES) {
          for (const hasChild of CHILD) {
            for (const hasFamily of FAMILY) {
              const story = resolveStory7(
                story7SessionWith({
                  pet: { species },
                  memories: {
                    childName: hasChild ? "Leo" : undefined,
                    familyMembers: hasFamily
                      ? "Maria, James, and the cat Pepper"
                      : undefined,
                  },
                  toggles: {
                    occasion,
                    adoptionSource: source,
                    lifeStage: stage,
                    yearsHome:
                      occasion === "gotcha-day-anniversary" ? "3" : undefined,
                  },
                }),
              );
              fn(story, {
                occasion,
                source,
                stage,
                species,
                hasChild,
                hasFamily,
              });
            }
          }
        }
      }
    }
  }
}

function comboLabel(c: Combo): string {
  return `${c.occasion}/${c.source}/${c.stage}/${c.species}/child=${c.hasChild}/family=${c.hasFamily}`;
}

// ---------------------------------------------------------------------------
// No literal placeholder / merge-field token survives — full variant matrix
// ---------------------------------------------------------------------------

describe("no placeholder survives merge across the full matrix", () => {
  it("resolves all 11 pages for every combination", () => {
    forEachCombination((story, combo) => {
      expect(story, comboLabel(combo)).toHaveLength(11);
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

  it("substitutes pet name into the cover title and the dedication", () => {
    const story = resolveStory7(biscuitSession7());
    const cover = pageById(story, "welcome-cover");
    expect(cover.title).toBe("Welcome Home, Biscuit");
    expect(cover.subtitle).toBe("The story of the day you became ours");
    const dedication = pageById(story, "welcome-dedication");
    expect(dedication.title).toBe(
      "For Biscuit, who found his way to us — and made the house a home.",
    );
    expect(dedication.body).toContain("— Maria");
  });

  it("substitutes the per-page merge fields into the body", () => {
    const story = resolveStory7(biscuitSession7());
    const page7 = pageById(story, "welcome-now-ours").body.join(" ");
    expect(page7).toContain(
      "stealing socks and parading them around the kitchen",
    ); // favoriteActivity
    expect(page7).toContain("in the crook of the couch by the window"); // sleepingSpot
    const page4 = pageById(story, "welcome-drive-home").body.join(" ");
    expect(page4).toContain(
      "He shook the whole car ride and then fell asleep on Leo's lap",
    ); // homecomingMemory
  });
});

// ---------------------------------------------------------------------------
// The happy-book tone guard (Story 7's distinctive bar)
// ---------------------------------------------------------------------------

describe("the happy-book tone guard — no grief/memorial language leaks in", () => {
  // The banned phrases from the master template's "what to avoid" bar. Checked
  // case-insensitively across EVERY page in EVERY variant combination. (No "died"
  // rule here — this is the opposite book.)
  const BANNED = [
    "rainbow bridge",
    "watching over",
    "gone too soon",
    "passed away",
    "fur baby",
    "forever home",
    "purrfect",
    "pawsome",
    "meant to be",
    "a match made in heaven",
  ];

  it("contains none of the banned phrases anywhere in the full matrix", () => {
    forEachCombination((story, combo) => {
      const haystack = allStrings(story).join(" \n ").toLowerCase();
      for (const phrase of BANNED) {
        expect(
          haystack.includes(phrase),
          `banned phrase "${phrase}" leaked (${comboLabel(combo)})`,
        ).toBe(false);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Optional-with-fallback fields (homecomingMemory, quirks) always resolve
// ---------------------------------------------------------------------------

describe("optional-with-fallback fields swap to the stock line when blank/sparse", () => {
  it("uses the Page-4 homecoming fallback when the memory is blank", () => {
    const page4 = pageById(
      resolveStory7(story7SessionWith({ memories: { homecomingMemory: "" } })),
      "welcome-drive-home",
    );
    expect(page4.body.join(" ")).toContain(
      "You were so small in such a big new world.",
    );
  });

  it("uses the Page-4 homecoming fallback when the memory is sparse (≤ ~4 words)", () => {
    const page4 = pageById(
      resolveStory7(
        story7SessionWith({ memories: { homecomingMemory: "he was small" } }),
      ),
      "welcome-drive-home",
    );
    expect(page4.body.join(" ")).toContain(
      "You were so small in such a big new world.",
    );
    expect(page4.body.join(" ")).not.toContain("he was small");
  });

  it("keeps a substantial homecoming memory (> 4 words) verbatim", () => {
    const memory =
      "He trembled the whole way and then slept on my lap before we got home.";
    const page4 = pageById(
      resolveStory7(
        story7SessionWith({ memories: { homecomingMemory: memory } }),
      ),
      "welcome-drive-home",
    );
    expect(page4.body.join(" ")).toContain(memory);
  });

  it("uses the Page-6 quirks fallback when quirks is blank", () => {
    const page6 = pageById(
      resolveStory7(story7SessionWith({ memories: { quirks: "" } })),
      "welcome-learning",
    );
    expect(page6.body.join(" ")).toContain(
      "We learned the way you tilt your head when you're thinking.",
    );
  });
});

// ---------------------------------------------------------------------------
// Optional-omit fields (childName, familyMembers, nicknames, dateAdopted)
// ---------------------------------------------------------------------------

describe("optional-omit fields leave no artifact when absent", () => {
  it("does not throw and leaves no leftover token when all omit-fields are absent", () => {
    const story = resolveStory7(
      story7SessionWith({
        memories: {
          childName: undefined,
          familyMembers: undefined,
          nicknames: undefined,
          dateAdopted: undefined,
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

  it("treats blank-string omit-fields as absent (no empty fragment, no stray brace)", () => {
    const story = resolveStory7(
      story7SessionWith({
        memories: {
          childName: "  ",
          familyMembers: "",
          nicknames: "   ",
          dateAdopted: "",
        },
      }),
    );
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(PLACEHOLDER_PATTERN.test(text), text).toBe(false);
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }
    // The child/family beats are dropped, not rendered blank.
    const page8 = pageById(story, "welcome-belong").body.join(" ");
    expect(page8).not.toContain("most of all, some days, to");
    const page7 = pageById(story, "welcome-now-ours").body.join(" ");
    expect(page7).toContain("Your people are Maria."); // owner names, not familyMembers
  });

  it("omits the dedication dated line when dateAdopted is absent", () => {
    const dedication = pageById(
      resolveStory7(story7SessionWith({ memories: { dateAdopted: undefined } })),
      "welcome-dedication",
    );
    expect(dedication.body.join(" ")).not.toContain("Home since");
    expect(dedication.body.every((p) => p.trim().length > 0)).toBe(true);
  });

  it("prints the dedication dated line when dateAdopted is present", () => {
    const dedication = pageById(resolveStory7(biscuitSession7()), "welcome-dedication");
    expect(dedication.body).toContain("Home since March 2026.");
  });
});

// ---------------------------------------------------------------------------
// Anniversary occasion with NO yearsHome -> new-arrival fallback, never a token
// ---------------------------------------------------------------------------

describe("anniversary occasion with no yearsHome never leaks a {yearsHome} token", () => {
  // Deviation locked in PR-A: occasion="gotcha-day-anniversary" requires yearsHome.
  // When it is absent the variant layer falls back to the new-arrival wording so
  // that NO {yearsHome} placeholder is ever handed to merge. The full-matrix sweep
  // above always pairs anniversary with yearsHome="3", so this is the dedicated
  // guard for the missing-yearsHome combination across EVERY page.
  it("leaves no surviving placeholder anywhere when anniversary lacks yearsHome", () => {
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
    expect(story).toHaveLength(11);
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(
        PLACEHOLDER_PATTERN.test(text),
        `surviving {placeholder} in: ${text}`,
      ).toBe(false);
      expect(/\[[A-Z_]+\]/.test(text), `bracket token in: ${text}`).toBe(false);
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }
    // The body falls back to sensible new-arrival copy (no half-built "years on").
    expect(pageById(story, "welcome-now-ours").body.join(" ")).toContain(
      "Now you're just part of it.",
    );
    expect(pageById(story, "welcome-closing").body.join(" ")).toContain(
      "So welcome home, Biscuit.",
    );
  });

  it("still leaves no token when anniversary lacks BOTH yearsHome and dateAdopted", () => {
    const story = resolveStory7(
      story7SessionWith({
        memories: { dateAdopted: undefined },
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "shelter",
          lifeStage: "adult",
          yearsHome: undefined,
        },
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
      resolveStory7(story7SessionWith({ pet: { name: "" } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("petName");
    }
  });

  it("throws MergeError when breedColor is whitespace-only", () => {
    expect(() =>
      resolveStory7(story7SessionWith({ pet: { breedColor: "   " } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when ownerNames is empty", () => {
    expect(() =>
      resolveStory7(story7SessionWith({ owner: { names: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteActivity is empty", () => {
    expect(() =>
      resolveStory7(story7SessionWith({ memories: { favoriteActivity: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when sleepingSpot is empty", () => {
    expect(() =>
      resolveStory7(story7SessionWith({ memories: { sleepingSpot: "" } })),
    ).toThrow(MergeError);
  });

  it("collects every missing required key at once, sorted and deduped", () => {
    try {
      resolveStory7(
        story7SessionWith({
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

  it("optional fields blank do NOT throw (homecomingMemory/quirks/child/family/nicknames/date)", () => {
    expect(() =>
      resolveStory7(
        story7SessionWith({
          memories: {
            homecomingMemory: "",
            quirks: "",
            childName: "",
            familyMembers: "",
            nicknames: "",
            dateAdopted: "",
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
    const story = resolveStory7(
      story7SessionWith({
        memories: {
          favoriteActivity: "stealing {petName} socks and a {victory} lap",
          sleepingSpot: "the {warm} square of {sun}",
          homecomingMemory:
            "He trembled the whole {drive} and slept on {childName} lap before home.",
          quirks: "the {head-tilt} when you say walk",
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
    const all = allStrings(story).join(" ");
    expect(all).toContain("stealing petName socks and a victory lap");
  });

  it("a {token} injected into ownerNames does not survive into the dedication", () => {
    const dedication = pageById(
      resolveStory7(story7SessionWith({ owner: { names: "Maria {dateAdopted}" } })),
      "welcome-dedication",
    );
    expect(dedication.body).toContain("— Maria dateAdopted");
    expect(dedication.body.join(" ")).not.toMatch(/[{}]/);
  });
});

// ---------------------------------------------------------------------------
// 11 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved book has exactly 11 pages with the correct ids and layout", () => {
  // Authored independently from STORY_7_LAYOUT in merge.ts so a future drift is
  // caught (mirrors story6's merge.test.ts). Story 7 reuses Story 1's NARRATIVE
  // layouts MINUS `truth` — never `truth`.
  const expectedLayout: Record<Story7PageId, PageLayout> = {
    "welcome-cover": "cover",
    "welcome-dedication": "dedication",
    "welcome-before": "narrative",
    "welcome-choosing": "narrative",
    "welcome-drive-home": "narrative",
    "welcome-first-night": "narrative",
    "welcome-learning": "narrative",
    "welcome-now-ours": "narrative",
    "welcome-belong": "narrative",
    "welcome-closing": "closing",
    "welcome-back-cover": "back-cover",
  };
  const expectedOrder: Story7PageId[] = [
    "welcome-cover",
    "welcome-dedication",
    "welcome-before",
    "welcome-choosing",
    "welcome-drive-home",
    "welcome-first-night",
    "welcome-learning",
    "welcome-now-ours",
    "welcome-belong",
    "welcome-closing",
    "welcome-back-cover",
  ];

  it("resolves exactly 11 pages in the expected order", () => {
    const story = resolveStory7(biscuitSession7());
    expect(story).toHaveLength(11);
    expect(story.map((p) => p.id)).toEqual(expectedOrder);
  });

  it("tags every page with the correct narrative layout (never `truth`)", () => {
    const story = resolveStory7(biscuitSession7());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story7PageId]}"`,
      ).toBe(expectedLayout[page.id as Story7PageId]);
      expect(page.layout, `${page.id} must not be the death layout`).not.toBe(
        "truth",
      );
    }
  });

  it("numbers pages 1-9 and leaves the covers null (the Story-1 narrative shape)", () => {
    const story = resolveStory7(biscuitSession7());
    expect(pageById(story, "welcome-cover").pageNumber).toBeNull();
    expect(pageById(story, "welcome-back-cover").pageNumber).toBeNull();
    expect(pageById(story, "welcome-dedication").pageNumber).toBe(1);
    expect(pageById(story, "welcome-closing").pageNumber).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolveStory7 calls
// ---------------------------------------------------------------------------

describe("resolveStory7 does not leak state across calls", () => {
  it("two consecutive calls produce identical output (fresh master copy each call)", () => {
    const first = resolveStory7(biscuitSession7());
    const second = resolveStory7(biscuitSession7());
    expect(second).toEqual(first);
  });

  it("an anniversary / cat / stray resolve does not contaminate a later default resolve", () => {
    resolveStory7(
      story7SessionWith({
        pet: { species: "cat" },
        toggles: {
          occasion: "gotcha-day-anniversary",
          adoptionSource: "found-as-stray",
          lifeStage: "senior-adoption",
          yearsHome: "5",
        },
      }),
    );
    const fresh = resolveStory7(biscuitSession7());
    const reference = resolveStory7(biscuitSession7());
    expect(fresh).toEqual(reference);
    // Spot-check the dimensions that just ran differently are back to default.
    const cover = pageById(fresh, "welcome-cover");
    expect(cover.subtitle).toBe("The story of the day you became ours"); // not anniversary
    const page2 = pageById(fresh, "welcome-before").body.join(" ");
    expect(page2).toContain("A walk that nobody asked for"); // dog default, not cat
    expect(page2).not.toContain("you were waiting too"); // not senior
    const page3 = pageById(fresh, "welcome-choosing").body.join(" ");
    expect(page3).toContain("We went to the shelter"); // shelter default, not stray
  });
});
