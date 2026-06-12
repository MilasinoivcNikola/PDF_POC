import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story4PageId } from "@/lib/story/master-text";
import { resolveStory4 } from "@/lib/story/story4/variants";
import {
  biscuitSession,
  story4SessionWith,
} from "@/lib/story/story4/fixtures";
import type {
  GiftFor,
  LetterBeliefFrame,
  LetterDeathType,
  LivingOrMemorial,
  Relationship,
  Species,
} from "@/lib/session/types";

// The Story-4 merge + entry point (`resolveStory4`) under test. These suites guard
// the master template's hard product rules for "If [PET_NAME] Could Talk": no
// leftover placeholder/merge-field token in EITHER tense path, the quality-bar
// banned phrases never appear in ANY variant combination, optional dates/nicknames
// omit cleanly, and a missing required field is REPORTED (MergeError), never
// rendered. The wording asserted is pinned to the master template, not imported
// from the source (so the assertion tests the text, not itself).

// ---------------------------------------------------------------------------
// Local helpers (mirror story2/merge.test.ts)
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

/** Find a resolved page by its stable id. */
function pageById(story: ResolvedStory, id: Story4PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-4 letter`);
  }
  return page;
}

// The full cross-product of every variant dimension. The two-tense toggle is the
// outermost loop — death-type/belief-frame only vary the MEMORIAL path's Page 5,
// but they are iterated under BOTH tenses to prove the living path stays inert.
// Session `Species` is dog/cat/rabbit/bird/other (no horse slot — folds to other).
const TENSES: LivingOrMemorial[] = ["living", "memorial"];
const DEATH_TYPES: LetterDeathType[] = [
  "peaceful",
  "illness",
  "sudden",
  "euthanasia",
];
const BELIEF_FRAMES: LetterBeliefFrame[] = ["rainbow-bridge", "heaven", "secular"];
const RELATIONSHIPS: Relationship[] = ["single", "couple"];
const SPECIES: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const GIFT_FORS: GiftFor[] = ["self", "friend"];

interface Combo {
  livingOrMemorial: LivingOrMemorial;
  deathType: LetterDeathType;
  beliefFrame: LetterBeliefFrame;
  relationship: Relationship;
  species: Species;
  giftFor: GiftFor;
}

/** Run `fn` for every combination in the full variant matrix (1440 sessions). */
function forEachCombination(
  fn: (story: ResolvedStory, combo: Combo) => void,
): void {
  for (const livingOrMemorial of TENSES) {
    for (const deathType of DEATH_TYPES) {
      for (const beliefFrame of BELIEF_FRAMES) {
        for (const relationship of RELATIONSHIPS) {
          for (const species of SPECIES) {
            for (const giftFor of GIFT_FORS) {
              const story = resolveStory4(
                story4SessionWith({
                  pet: { species },
                  owner: { relationship },
                  toggles: {
                    livingOrMemorial,
                    deathType,
                    beliefFrame,
                    giftFor,
                  },
                }),
              );
              fn(story, {
                livingOrMemorial,
                deathType,
                beliefFrame,
                relationship,
                species,
                giftFor,
              });
            }
          }
        }
      }
    }
  }
}

function comboLabel(c: Combo): string {
  return `${c.livingOrMemorial}/${c.deathType}/${c.beliefFrame}/${c.relationship}/${c.species}/${c.giftFor}`;
}

// ---------------------------------------------------------------------------
// No literal placeholder / merge-field token survives — full variant matrix
// ---------------------------------------------------------------------------

describe("no placeholder survives merge across the full matrix (both tenses)", () => {
  it("leaves no {field} token in any resolved string (1440 combos)", () => {
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

  it("substitutes pet name and owner names into the cover", () => {
    const cover = pageById(resolveStory4(biscuitSession()), "talk-cover");
    expect(cover.title).toBe("If Biscuit Could Talk");
    expect(cover.subtitle).toBe("to Sarah");
  });

  it("substitutes the per-page merge fields into the body (living)", () => {
    const story = resolveStory4(biscuitSession());
    const page3 = pageById(story, "talk-page-3").body.join(" ");
    expect(page3).toContain("our walk before coffee, every single morning"); // favoriteRitual
    expect(page3).toContain("the way I lose my mind when you pick up the leash"); // quirks
    const page4 = pageById(story, "talk-page-4").body.join(" ");
    expect(page4).toContain("stealing one sock and running a victory lap"); // favoriteActivity
    expect(page4).toContain("the spot by the back door where the sun lands at 4pm"); // favoriteSpots
  });
});

// ---------------------------------------------------------------------------
// Quality-bar banned phrases never appear — full variant matrix
// ---------------------------------------------------------------------------

describe("quality-bar bans hold across every variant combination (both tenses)", () => {
  // From the master template's "Quality bar / what to avoid" list, plus the
  // memorial-euphemism bans (the memorial path must use "died", never these).
  const BANNED = [
    "fur baby",
    "crossed the rainbow bridge",
    "ran free in heaven",
    "now an angel watching over you",
    "watching over you",
    "watch over you",
    "passed away",
    "went to sleep",
  ];

  it("contains none of the banned clichés in any combination", () => {
    forEachCombination((story, combo) => {
      const all = allStrings(story).join(" ").toLowerCase();
      for (const phrase of BANNED) {
        expect(
          all,
          `banned phrase "${phrase}" (${comboLabel(combo)})`,
        ).not.toContain(phrase);
      }
    });
  });

  it("the pet never claims to watch over the owner (no 'watch'/'watching over')", () => {
    const overOwner = /watch(?:ing|es)?\s+over\b/i;
    forEachCombination((story, combo) => {
      const all = allStrings(story).join(" ");
      expect(
        overOwner.test(all),
        `"watch(ing) over" appeared (${comboLabel(combo)})`,
      ).toBe(false);
    });
  });

  it("never uses the 'lost' euphemism for death in the memorial path", () => {
    // "lost" as a death euphemism ("we lost him") is banned; check the memorial
    // prose for the standalone word. (The living path never names death at all.)
    for (const deathType of DEATH_TYPES) {
      const story = resolveStory4(
        story4SessionWith({
          toggles: { livingOrMemorial: "memorial", deathType },
        }),
      );
      const prose = story.flatMap(proseStrings).join(" ");
      expect(
        /\blost\b/i.test(prose),
        `"lost" euphemism in memorial prose (${deathType})`,
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Optional fields (nicknames, dates) omit cleanly — tense-dependent date line
// ---------------------------------------------------------------------------

describe("optional fields omit cleanly when absent", () => {
  // A "date artifact" is a body LINE built from the optional date template — a
  // dangling em-dash or a stray leading/trailing em-dash on a line of its own.
  // (A bare " — " mid-prose is legitimate, so we check whole trimmed lines.)
  function hasDateArtifact(story: ResolvedStory): boolean {
    return story.some((page) =>
      page.body.some((line) => {
        const trimmed = line.trim();
        return /^—\s|^\s*—\s*$|\s—$/.test(trimmed) || trimmed === "—";
      }),
    );
  }

  it("base Biscuit living (all optionals present): cover shows 'together since', no two-date line", () => {
    const story = resolveStory4(biscuitSession());
    const cover = pageById(story, "talk-cover");
    const page6 = pageById(story, "talk-page-6");
    // Living date line is the "together since {dateAdopted}" form — adopted only.
    expect(cover.body).toContain("together since March 2023");
    // The two-date memorial form must NOT appear in the living path.
    expect(allStrings(story).join("\n")).not.toContain("March 2023 — October 2025");
    // Nickname line appears after the signature on page 6.
    expect(page6.body).toContain("Biscy, the gremlin, sir");
    expect(page6.body).toContain("together since March 2023");
  });

  it("base Biscuit memorial (both dates present): the two-date line appears, not 'together since'", () => {
    const story = resolveStory4(
      story4SessionWith({ toggles: { livingOrMemorial: "memorial" } }),
    );
    const cover = pageById(story, "talk-cover");
    expect(cover.body).toContain("March 2023 — October 2025");
    expect(allStrings(story).join("\n")).not.toContain("together since");
    expect(hasDateArtifact(story)).toBe(false);
  });

  it("no dates, no nicknames (living): no date artifact, no empty line", () => {
    const story = resolveStory4(
      story4SessionWith({
        memories: {
          nicknames: undefined,
          dateAdopted: undefined,
          datePassed: undefined,
        },
      }),
    );
    expect(hasDateArtifact(story)).toBe(false);
    const all = allStrings(story).join("\n");
    expect(all).not.toContain("March 2023");
    expect(all).not.toContain("October 2025");
    expect(all).not.toContain("together since");
    // Cover body has no extra date line.
    expect(pageById(story, "talk-cover").body).toEqual([]);
    // Page 6 ends on the signature with no trailing nickname/date line.
    const page6 = pageById(story, "talk-page-6");
    expect(page6.body[page6.body.length - 1]).toBe("Biscuit");
    expect(page6.body.every((p) => p.trim().length > 0)).toBe(true);
  });

  it("blank-string optionals are treated as absent (no artifact)", () => {
    const story = resolveStory4(
      story4SessionWith({
        memories: { nicknames: "   ", dateAdopted: "", datePassed: "  " },
      }),
    );
    const page6 = pageById(story, "talk-page-6");
    expect(page6.body[page6.body.length - 1]).toBe("Biscuit");
    expect(hasDateArtifact(story)).toBe(false);
    expect(allStrings(story).join("\n")).not.toContain("together since");
  });

  it("living: ONLY adopted present -> 'together since' line; only passed -> NO line", () => {
    const adoptedOnly = resolveStory4(
      story4SessionWith({
        memories: { dateAdopted: "March 2023", datePassed: undefined },
      }),
    );
    expect(pageById(adoptedOnly, "talk-cover").body).toContain(
      "together since March 2023",
    );
    expect(hasDateArtifact(adoptedOnly)).toBe(false);

    const passedOnly = resolveStory4(
      story4SessionWith({
        memories: { dateAdopted: undefined, datePassed: "October 2025" },
      }),
    );
    // Living date line needs only the adopted date; with only `passed`, no line.
    expect(allStrings(passedOnly).join("\n")).not.toContain("October 2025");
    expect(allStrings(passedOnly).join("\n")).not.toContain("together since");
    expect(hasDateArtifact(passedOnly)).toBe(false);
  });

  it("memorial: only ONE date present -> NO date line at all (both required)", () => {
    const adoptedOnly = resolveStory4(
      story4SessionWith({
        memories: { dateAdopted: "March 2023", datePassed: undefined },
        toggles: { livingOrMemorial: "memorial" },
      }),
    );
    expect(allStrings(adoptedOnly).join("\n")).not.toContain("March 2023 —");
    expect(allStrings(adoptedOnly).join("\n")).not.toContain("March 2023");
    expect(hasDateArtifact(adoptedOnly)).toBe(false);

    const passedOnly = resolveStory4(
      story4SessionWith({
        memories: { dateAdopted: undefined, datePassed: "October 2025" },
        toggles: { livingOrMemorial: "memorial" },
      }),
    );
    expect(allStrings(passedOnly).join("\n")).not.toContain("October 2025");
    expect(hasDateArtifact(passedOnly)).toBe(false);
  });

  it("nicknames present but no dates: the nickname line appears, no date line", () => {
    const story = resolveStory4(
      story4SessionWith({
        memories: {
          nicknames: "Biscy",
          dateAdopted: undefined,
          datePassed: undefined,
        },
      }),
    );
    const page6 = pageById(story, "talk-page-6");
    // Nickname is the final line (no date follows it).
    expect(page6.body[page6.body.length - 1]).toBe("Biscy");
    expect(hasDateArtifact(story)).toBe(false);
  });

  it("does not throw when all optionals are blank/absent", () => {
    expect(() =>
      resolveStory4(
        story4SessionWith({
          memories: {
            nicknames: undefined,
            dateAdopted: undefined,
            datePassed: undefined,
          },
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
      resolveStory4(story4SessionWith({ pet: { name: "" } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("petName");
    }
  });

  it("throws MergeError when ownerNames is whitespace-only", () => {
    try {
      resolveStory4(story4SessionWith({ owner: { names: "   " } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("ownerNames");
    }
  });

  it("throws MergeError when favoriteRitual is empty", () => {
    expect(() =>
      resolveStory4(story4SessionWith({ memories: { favoriteRitual: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteActivity is empty (Story-4-only field)", () => {
    // favoriteActivity backs the Page-4 "daily joy" line — required regardless of tense.
    expect(() =>
      resolveStory4(story4SessionWith({ memories: { favoriteActivity: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteSpots is empty", () => {
    expect(() =>
      resolveStory4(story4SessionWith({ memories: { favoriteSpots: "" } })),
    ).toThrow(MergeError);
  });

  it("collects every missing required key at once, sorted and deduped", () => {
    try {
      resolveStory4(
        story4SessionWith({
          pet: { name: "  " },
          owner: { names: "" },
          memories: { favoriteRitual: "   ", favoriteActivity: "" },
        }),
      );
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      const keys = (err as MergeError).missingKeys;
      expect(keys).toEqual([
        "favoriteActivity",
        "favoriteRitual",
        "ownerNames",
        "petName",
      ]);
      // Sorted + deduped.
      expect([...keys].sort()).toEqual(keys);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("a substantial-but-required field missing in the MEMORIAL path also throws", () => {
    expect(() =>
      resolveStory4(
        story4SessionWith({
          pet: { name: "" },
          toggles: { livingOrMemorial: "memorial" },
        }),
      ),
    ).toThrow(MergeError);
  });

  it("optional fields blank do NOT throw", () => {
    expect(() =>
      resolveStory4(
        story4SessionWith({
          memories: { nicknames: "", dateAdopted: "", datePassed: "" },
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
    const story = resolveStory4(
      story4SessionWith({
        memories: {
          quirks: "the way you say my {petName} every {ownerNames}",
          favoriteRitual: "our {walk} before coffee",
          favoriteSpots: "the {sunny} spot by the door",
          favoriteActivity: "a {victory} lap with one {sock}",
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
    expect(all).toContain("the way you say my petName every ownerNames");
    expect(all).toContain("a victory lap with one sock");
  });

  it("a {token} injected into ownerNames does not survive into the salutation", () => {
    const story = resolveStory4(
      story4SessionWith({ owner: { names: "Sarah {datePassed}" } }),
    );
    const page2 = pageById(story, "talk-page-2").body[0];
    expect(page2).toBe("Dear Sarah datePassed,");
    expect(page2).not.toMatch(/[{}]/);
  });
});

// ---------------------------------------------------------------------------
// 6 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved letter has exactly 6 pages with the correct ids and layout", () => {
  // Authored independently from STORY_4_LAYOUT in merge.ts so a future drift is
  // caught (mirrors how Story-1/Story-2's merge.test.ts double-lock their maps).
  const expectedLayout: Record<Story4PageId, PageLayout> = {
    "talk-cover": "letter-cover",
    "talk-page-2": "letter",
    "talk-page-3": "letter",
    "talk-page-4": "letter",
    "talk-page-5": "letter",
    "talk-page-6": "letter",
  };
  const expectedOrder: Story4PageId[] = [
    "talk-cover",
    "talk-page-2",
    "talk-page-3",
    "talk-page-4",
    "talk-page-5",
    "talk-page-6",
  ];

  it("resolves exactly 6 pages in the expected order", () => {
    const story = resolveStory4(biscuitSession());
    expect(story).toHaveLength(6);
    expect(story.map((p) => p.id)).toEqual(expectedOrder);
  });

  it("tags every page with the correct layout (letter-cover + 5 letter)", () => {
    const story = resolveStory4(biscuitSession());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story4PageId]}"`,
      ).toBe(expectedLayout[page.id as Story4PageId]);
    }
  });

  it("the letter prints no page numbers (typography guide: none)", () => {
    const story = resolveStory4(biscuitSession());
    for (const page of story) {
      expect(page.pageNumber, `page ${page.id}`).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolveStory4 calls (optional lines must not pile up)
// ---------------------------------------------------------------------------

describe("resolveStory4 does not accumulate optional lines across calls", () => {
  it("two consecutive calls produce identical bodies (no appended duplicates)", () => {
    const first = resolveStory4(biscuitSession());
    const second = resolveStory4(biscuitSession());
    expect(second).toEqual(first);
    // The cover date line appears exactly once (not doubled by a re-run).
    const cover = pageById(second, "talk-cover");
    const dateCount = cover.body.filter((p) => p === "together since March 2023").length;
    expect(dateCount).toBe(1);
  });

  it("a memorial call after a living call does not leak its tense/seam lines back", () => {
    resolveStory4(story4SessionWith({ toggles: { livingOrMemorial: "memorial" } }));
    const living = resolveStory4(biscuitSession());
    const all = living.flatMap((p) => p.body).join(" ");
    expect(all).not.toContain("needs forgiving");
    expect(all).not.toContain("Wherever I am now");
  });

  it("proseStrings excludes the illustration brief", () => {
    const page = pageById(resolveStory4(biscuitSession()), "talk-page-2");
    expect(proseStrings(page)).not.toContain(page.illustrationBrief);
  });
});
