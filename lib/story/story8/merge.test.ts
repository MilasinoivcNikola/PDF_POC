import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story8PageId } from "@/lib/story/master-text";
import { resolveStory8 } from "@/lib/story/story8/variants";
import {
  biscuitSession8,
  story8SessionWith,
} from "@/lib/story/story8/fixtures";
import type {
  AdventureTheme,
  AgeBracket,
  HeroCount,
  Species,
} from "@/lib/session/types";

// The Story-8 merge + entry point (`resolveStory8`) under test. These suites guard
// the master template's hard product rules for "The Amazing Adventures of
// [PET_NAME]" — the catalog's FIRST joyful kids' adventure: no leftover placeholder/
// merge-field token in any variant combination, the optional sidekick/child/nickname
// fields omit cleanly, the {superpower} fallback chain always resolves, a missing
// required field is REPORTED (MergeError), the CONDITIONAL childName throws only in
// pet-plus, and — Story 8's distinctive bar — the adventure-tone guard (no grief, no
// banned filler, no emoji in body, a mild safe wobble). The wording asserted is
// pinned to context/masterstories/story-8-master-template.md, not imported from the
// source.

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

/** Every resolved string across the whole book, flattened. */
function allStrings(story: ResolvedStory): string[] {
  return story.flatMap(pageStrings);
}

/**
 * Every BODY string across the whole book (titles + subtitles, but NOT the
 * illustration briefs). The "the child" stand-in is intentionally registered for
 * the pet-solo briefs (cover + Page 1 name the child as a soft scene presence), so
 * the body-only view is what proves it never leaks into the read-aloud text.
 */
function bodyStrings(story: ResolvedStory): string[] {
  return story.flatMap((page) => [
    ...(page.title !== undefined ? [page.title] : []),
    ...(page.subtitle !== undefined ? [page.subtitle] : []),
    ...page.body,
  ]);
}

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story8PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-8 book`);
  }
  return page;
}

// The full cross-product of every variant dimension: theme × hero-count × age ×
// species × sidekick-present. In pet-solo, childName is intentionally absent (the
// conditional-required field is optional there); in pet-plus it is always present.
const THEMES: AdventureTheme[] = [
  "backyard-mystery",
  "sea-voyage",
  "space-rescue",
  "enchanted-forest",
];
const HERO_COUNTS: HeroCount[] = ["pet-plus", "pet-solo"];
const AGES: AgeBracket[] = ["3-5", "6-8", "9-12"];
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const SIDEKICK = [true, false] as const;

interface Combo {
  theme: AdventureTheme;
  heroCount: HeroCount;
  age: AgeBracket;
  species: Species;
  hasSidekick: boolean;
}

/** Run `fn` for every combination in the full variant matrix. */
function forEachCombination(
  fn: (story: ResolvedStory, combo: Combo) => void,
): void {
  for (const theme of THEMES) {
    for (const heroCount of HERO_COUNTS) {
      for (const age of AGES) {
        for (const species of SPECIES) {
          for (const hasSidekick of SIDEKICK) {
            const story = resolveStory8(
              story8SessionWith({
                pet: { species },
                adventure: {
                  childName: heroCount === "pet-plus" ? "Emma" : undefined,
                  sidekickName: hasSidekick ? "Leo" : undefined,
                },
                toggles: {
                  adventureTheme: theme,
                  heroCount,
                  childAgeBracket: age,
                },
              }),
            );
            fn(story, { theme, heroCount, age, species, hasSidekick });
          }
        }
      }
    }
  }
}

function comboLabel(c: Combo): string {
  return `${c.theme}/${c.heroCount}/${c.age}/${c.species}/sidekick=${c.hasSidekick}`;
}

// ---------------------------------------------------------------------------
// No literal placeholder / merge-field token survives — full variant matrix
// ---------------------------------------------------------------------------

describe("no placeholder survives merge across the full matrix", () => {
  it("resolves all 13 pages for every combination", () => {
    forEachCombination((story, combo) => {
      expect(story, comboLabel(combo)).toHaveLength(13);
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

  it("substitutes pet name into the cover title and the subtitle", () => {
    const story = resolveStory8(biscuitSession8());
    const cover = pageById(story, "adventure-cover");
    expect(cover.title).toBe("The Amazing Adventures of Biscuit");
    expect(cover.subtitle).toBe(
      "The Backyard Mystery — starring Emma and Biscuit",
    );
  });

  it("substitutes the superpower into Pages 2 and 4", () => {
    const story = resolveStory8(biscuitSession8());
    expect(pageById(story, "adventure-special").body.join(" ")).toContain(
      "the World's Greatest Nose",
    );
    expect(pageById(story, "adventure-clue").body.join(" ")).toContain(
      "the World's Greatest Nose",
    );
  });

  it("substitutes the speciesDescriptor into the Page-9 'wasn't just a …' beat", () => {
    const story = resolveStory8(biscuitSession8()); // dog + he
    expect(pageById(story, "adventure-celebration").body.join(" ")).toContain(
      "wasn't just a boy",
    );
  });
});

// ---------------------------------------------------------------------------
// The [SUPERPOWER] fallback chain (the soul of the book)
// ---------------------------------------------------------------------------

describe("the superpower fallback chain", () => {
  it("preserves a real customer superpower verbatim (never overridden)", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: {
          superpower: "Super-Sniffing",
          favoriteActivity: "digging holes",
          quirks: "barks at the vacuum",
        },
      }),
    );
    const page2 = pageById(story, "adventure-special").body.join(" ");
    expect(page2).toContain("Super-Sniffing");
    expect(page2).not.toContain("the very best in the world at");
  });

  it("derives from favoriteActivity when superpower is blank", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: {
          superpower: "",
          favoriteActivity: "finding every tennis ball in the yard",
          quirks: "barks at the vacuum",
        },
      }),
    );
    expect(pageById(story, "adventure-special").body.join(" ")).toContain(
      "the very best in the world at finding every tennis ball in the yard",
    );
  });

  it("derives from quirks when both superpower and favoriteActivity are blank", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: {
          superpower: "",
          favoriteActivity: "",
          quirks: "sniffing out a hidden treat from three rooms away",
        },
      }),
    );
    expect(pageById(story, "adventure-special").body.join(" ")).toContain(
      "the amazing power of sniffing out a hidden treat from three rooms away",
    );
  });

  it("falls back to the species stock superpower when all inputs are blank", () => {
    const stock: Record<Species, string> = {
      dog: "the Best Nose in the World",
      cat: "the Quietest Paws",
      rabbit: "the Fastest Hop",
      bird: "the Sharpest Eyes",
      other: "the Greatest Heart in the Whole Backyard",
    };
    for (const species of Object.keys(stock) as Species[]) {
      const story = resolveStory8(
        story8SessionWith({
          pet: { species },
          adventure: { superpower: "", favoriteActivity: "", quirks: "" },
        }),
      );
      expect(
        pageById(story, "adventure-special").body.join(" "),
        species,
      ).toContain(stock[species]);
    }
  });
});

// ---------------------------------------------------------------------------
// Conditional-required childName (MergeError in pet-plus, optional in pet-solo)
// ---------------------------------------------------------------------------

describe("conditional-required childName", () => {
  it("throws MergeError when childName is blank under pet-plus", () => {
    try {
      resolveStory8(
        story8SessionWith({
          adventure: { childName: "" },
          toggles: {
            adventureTheme: "backyard-mystery",
            heroCount: "pet-plus",
            childAgeBracket: "6-8",
          },
        }),
      );
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("childName");
    }
  });

  it("throws MergeError when childName is undefined under pet-plus", () => {
    expect(() =>
      resolveStory8(
        story8SessionWith({
          adventure: { childName: undefined },
          toggles: {
            adventureTheme: "backyard-mystery",
            heroCount: "pet-plus",
            childAgeBracket: "6-8",
          },
        }),
      ),
    ).toThrow(MergeError);
  });

  it("does NOT throw when childName is blank under pet-solo", () => {
    expect(() =>
      resolveStory8(
        story8SessionWith({
          adventure: { childName: "", sidekickName: undefined },
          toggles: {
            adventureTheme: "backyard-mystery",
            heroCount: "pet-solo",
            childAgeBracket: "6-8",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("leaves no surviving placeholder in a pet-solo book with no child name", () => {
    const story = resolveStory8(
      story8SessionWith({
        adventure: { childName: undefined, sidekickName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    for (const text of allStrings(story)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(PLACEHOLDER_PATTERN.test(text), text).toBe(false);
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }
    // The pet-solo bodies never name the child.
    expect(pageById(story, "adventure-ordinary").body.join(" ")).not.toContain(
      "'s very best friend",
    );
    // CRITICAL: the "the child" stand-in is registered only for the pet-solo
    // illustration briefs — it must NEVER survive into any read-aloud body/title
    // on ANY page. A missed per-page rewrite (e.g. an un-rewritten {childName}
    // resolving to "the child") is caught here, on every page, not just by the
    // {placeholder}-token check above (the stand-in RESOLVES the token, so the
    // token check alone masks the leak). Page 4 (adventure-clue) was the leak.
    for (const text of bodyStrings(story)) {
      expect(text, `"the child" stand-in leaked into body: ${text}`).not.toMatch(
        /\bthe child\b/,
      );
    }
  });

  it("a pet-solo book never leaks a SUPPLIED childName into the body either", () => {
    // A pet-solo customer may still type a child name (the form doesn't forbid it).
    // Every body page must be rewritten child-free regardless, so the supplied name
    // appears in NO body/title — only (optionally) in the illustration briefs.
    const story = resolveStory8(
      story8SessionWith({
        adventure: { childName: "Zara", sidekickName: undefined },
        toggles: {
          adventureTheme: "backyard-mystery",
          heroCount: "pet-solo",
          childAgeBracket: "6-8",
        },
      }),
    );
    for (const text of bodyStrings(story)) {
      expect(text, `supplied childName leaked into body: ${text}`).not.toContain(
        "Zara",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Other required fields -> MergeError
// ---------------------------------------------------------------------------

describe("missing required field is reported via MergeError", () => {
  it("throws MergeError when petName is empty, carrying the key", () => {
    try {
      resolveStory8(story8SessionWith({ pet: { name: "" } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("petName");
    }
  });

  it("throws MergeError when breedColor is whitespace-only", () => {
    expect(() =>
      resolveStory8(story8SessionWith({ pet: { breedColor: "   " } })),
    ).toThrow(MergeError);
  });

  it("a blank superpower does NOT throw (the fallback chain resolves it)", () => {
    expect(() =>
      resolveStory8(
        story8SessionWith({
          adventure: { superpower: "", favoriteActivity: "", quirks: "" },
        }),
      ),
    ).not.toThrow();
  });

  it("the optional sidekick / nickname fields blank do NOT throw", () => {
    expect(() =>
      resolveStory8(
        story8SessionWith({
          adventure: { sidekickName: "", nicknames: "" },
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
    const story = resolveStory8(
      story8SessionWith({
        adventure: {
          superpower: "the power of {petName} {sniffing}",
          favoriteActivity: "digging {giant} holes",
          quirks: "barks at the {vacuum}",
          childName: "Emma {dog}",
          sidekickName: "Leo {cat}",
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
    expect(all).toContain("the power of petName sniffing");
  });
});

// ---------------------------------------------------------------------------
// The adventure-tone guard (Story 8's distinctive bar)
// ---------------------------------------------------------------------------

describe("the adventure-tone guard", () => {
  // Banned grief/euphemism + filler from the master template's "what to avoid" bar.
  const BANNED_GRIEF = [
    "rainbow bridge",
    "passed away",
    "passed on",
    "fur baby",
    "watching over",
    "crossed over",
    "gone too soon",
    "in heaven",
  ];
  const BANNED_FILLER = ["little did they know", "happily ever after"];

  it("contains no grief/euphemism anywhere in the full matrix", () => {
    forEachCombination((story, combo) => {
      const haystack = allStrings(story).join(" \n ").toLowerCase();
      for (const phrase of BANNED_GRIEF) {
        expect(
          haystack.includes(phrase),
          `grief phrase "${phrase}" leaked (${comboLabel(combo)})`,
        ).toBe(false);
      }
    });
  });

  it("contains no banned filler anywhere in the full matrix", () => {
    forEachCombination((story, combo) => {
      const haystack = allStrings(story).join(" \n ").toLowerCase();
      for (const phrase of BANNED_FILLER) {
        expect(
          haystack.includes(phrase),
          `filler phrase "${phrase}" leaked (${comboLabel(combo)})`,
        ).toBe(false);
      }
    });
  });

  it("has no emoji/icon in any BODY text except the back-cover star rating", () => {
    // The back cover's ⭐ rating line is the one allowed decoration. Every other body
    // paragraph (and every title/subtitle) must be emoji-free across the matrix.
    const emoji = /\p{Extended_Pictographic}/u;
    forEachCombination((story, combo) => {
      for (const page of story) {
        const nonBody = [
          ...(page.title !== undefined ? [page.title] : []),
          ...(page.subtitle !== undefined ? [page.subtitle] : []),
        ];
        for (const text of nonBody) {
          expect(
            emoji.test(text),
            `emoji in heading (${comboLabel(combo)}): ${text}`,
          ).toBe(false);
        }
        for (const para of page.body) {
          if (page.id === "adventure-back-cover" && para.includes("Hero rating")) {
            continue; // the one allowed decoration
          }
          expect(
            emoji.test(para),
            `emoji in body (${comboLabel(combo)} / ${page.id}): ${para}`,
          ).toBe(false);
        }
      }
    });
  });

  it("keeps the wobble mild and ALWAYS resolves it safely on the climax beat", () => {
    forEachCombination((story, combo) => {
      const wobble = pageById(story, "adventure-wobble").body.join(" ").toLowerCase();
      // Mild jeopardy only — no genuinely frightening/violent language.
      for (const scary of ["died", "blood", "terrifying", "screamed", "drowned"]) {
        expect(
          wobble.includes(scary),
          `wobble too scary (${comboLabel(combo)}): ${scary}`,
        ).toBe(false);
      }
      // The very next beat (the climax) resolves it: the bird ends up safe.
      const climax = pageById(story, "adventure-climax").body.join(" ").toLowerCase();
      expect(
        climax.includes("safe") || climax.includes("back to its branch"),
        `climax must resolve the wobble safely (${comboLabel(combo)})`,
      ).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 13 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved book has exactly 13 pages with the correct ids and layout", () => {
  // Authored independently from STORY_8_LAYOUT in merge.ts so a future drift is
  // caught. Story 8 reuses Story 1's NARRATIVE layouts MINUS dedication/love/truth.
  const expectedLayout: Record<Story8PageId, PageLayout> = {
    "adventure-cover": "cover",
    "adventure-ordinary": "narrative",
    "adventure-special": "narrative",
    "adventure-call": "narrative",
    "adventure-clue": "narrative",
    "adventure-deeper": "narrative",
    "adventure-discovery": "narrative",
    "adventure-wobble": "narrative",
    "adventure-climax": "narrative",
    "adventure-celebration": "narrative",
    "adventure-home": "narrative",
    "adventure-closing": "closing",
    "adventure-back-cover": "back-cover",
  };
  const expectedOrder: Story8PageId[] = [
    "adventure-cover",
    "adventure-ordinary",
    "adventure-special",
    "adventure-call",
    "adventure-clue",
    "adventure-deeper",
    "adventure-discovery",
    "adventure-wobble",
    "adventure-climax",
    "adventure-celebration",
    "adventure-home",
    "adventure-closing",
    "adventure-back-cover",
  ];

  it("resolves exactly 13 pages in the expected order", () => {
    const story = resolveStory8(biscuitSession8());
    expect(story).toHaveLength(13);
    expect(story.map((p) => p.id)).toEqual(expectedOrder);
  });

  it("tags every page with a Story-1 narrative layout (never dedication/love/truth)", () => {
    const story = resolveStory8(biscuitSession8());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story8PageId]}"`,
      ).toBe(expectedLayout[page.id as Story8PageId]);
      for (const forbidden of ["dedication", "love", "truth"] as const) {
        expect(page.layout, `${page.id} must not be ${forbidden}`).not.toBe(
          forbidden,
        );
      }
    }
  });

  it("numbers pages 1-11 and leaves the covers null (the Story-1 narrative shape)", () => {
    const story = resolveStory8(biscuitSession8());
    expect(pageById(story, "adventure-cover").pageNumber).toBeNull();
    expect(pageById(story, "adventure-back-cover").pageNumber).toBeNull();
    expect(pageById(story, "adventure-ordinary").pageNumber).toBe(1);
    expect(pageById(story, "adventure-closing").pageNumber).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolveStory8 calls
// ---------------------------------------------------------------------------

describe("resolveStory8 does not leak state across calls", () => {
  it("two consecutive calls produce identical output (fresh master copy each call)", () => {
    const first = resolveStory8(biscuitSession8());
    const second = resolveStory8(biscuitSession8());
    expect(second).toEqual(first);
  });

  it("a pet-solo / 3-5 / blank-superpower resolve does not contaminate a later default resolve", () => {
    resolveStory8(
      story8SessionWith({
        pet: { species: "cat" },
        adventure: { superpower: "", favoriteActivity: "", quirks: "", childName: undefined },
        toggles: {
          adventureTheme: "space-rescue",
          heroCount: "pet-solo",
          childAgeBracket: "3-5",
        },
      }),
    );
    const fresh = resolveStory8(biscuitSession8());
    const reference = resolveStory8(biscuitSession8());
    expect(fresh).toEqual(reference);
    // Spot-check the dimensions that just ran differently are back to default.
    expect(pageById(fresh, "adventure-cover").subtitle).toBe(
      "The Backyard Mystery — starring Emma and Biscuit",
    );
    expect(pageById(fresh, "adventure-special").body.join(" ")).toContain(
      "the World's Greatest Nose",
    );
  });
});
