import { describe, it, expect } from "vitest";

import { PLACEHOLDER_PATTERN } from "@/lib/story/master-text";
import type { PageLayout, ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { MergeError } from "@/lib/story/merge";
import type { Story2PageId } from "@/lib/story/master-text";
import { resolveStory2 } from "@/lib/story/story2/variants";
import {
  murphySession,
  story2SessionWith,
} from "@/lib/story/story2/fixtures";
import type {
  GiftFor,
  LetterBeliefFrame,
  LetterDeathType,
  NewPet,
  Relationship,
  Species,
} from "@/lib/session/types";

// The Story-2 merge + entry point (`resolveStory2`) under test. These suites
// guard the master template's hard product rules for "A Letter from [PET_NAME]":
// no leftover placeholder/merge-field token, the quality-bar banned phrases never
// appear in ANY variant combination, optional dates/nicknames omit cleanly, and a
// missing required field is REPORTED (MergeError), never rendered. The wording
// asserted here is pinned to context/masterstories/story-2-master-template.md, not
// imported from the source (so the assertion tests the text, not itself).

// ---------------------------------------------------------------------------
// Local helpers (Story-2 analogs of the Story-1 fixtures' allStrings/pageById)
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
function pageById(story: ResolvedStory, id: Story2PageId): ResolvedPage {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    throw new Error(`page ${id} not found in resolved Story-2 letter`);
  }
  return page;
}

// The full cross-product of every variant dimension. Iterated programmatically
// (480 sessions) rather than hand-written, the way the Story-1 variant smoke does.
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
const NEW_PETS: NewPet[] = ["yes", "no"];

/** Run `fn` for every combination in the full variant matrix. */
function forEachCombination(
  fn: (
    story: ResolvedStory,
    combo: {
      deathType: LetterDeathType;
      beliefFrame: LetterBeliefFrame;
      relationship: Relationship;
      species: Species;
      giftFor: GiftFor;
      newPet: NewPet;
    },
  ) => void,
): void {
  for (const deathType of DEATH_TYPES) {
    for (const beliefFrame of BELIEF_FRAMES) {
      for (const relationship of RELATIONSHIPS) {
        for (const species of SPECIES) {
          for (const giftFor of GIFT_FORS) {
            for (const newPet of NEW_PETS) {
              const story = resolveStory2(
                story2SessionWith({
                  pet: { species },
                  owner: { relationship },
                  toggles: { deathType, beliefFrame, giftFor, newPet },
                }),
              );
              fn(story, {
                deathType,
                beliefFrame,
                relationship,
                species,
                giftFor,
                newPet,
              });
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// No literal placeholder / merge-field token survives — full variant matrix
// ---------------------------------------------------------------------------

describe("no placeholder survives merge across the full variant matrix", () => {
  it("leaves no {field} token in any resolved string (480 combos)", () => {
    forEachCombination((story, combo) => {
      for (const text of allStrings(story)) {
        // PLACEHOLDER_PATTERN is /g; reset lastIndex before each test() use.
        PLACEHOLDER_PATTERN.lastIndex = 0;
        expect(
          PLACEHOLDER_PATTERN.test(text),
          `unresolved {placeholder} (${combo.deathType}/${combo.beliefFrame}/${combo.relationship}/${combo.species}/${combo.giftFor}/${combo.newPet}): ${text}`,
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
          `bracket token (${combo.deathType}/${combo.beliefFrame}/${combo.relationship}/${combo.species}): ${text}`,
        ).toBe(false);
      }
    });
  });

  it("substitutes pet name and owner names into the cover", () => {
    const cover = pageById(resolveStory2(murphySession()), "letter-cover");
    expect(cover.title).toBe("A Letter from Murphy");
    expect(cover.subtitle).toBe("for Sarah");
  });
});

// ---------------------------------------------------------------------------
// Quality-bar banned phrases never appear — full variant matrix
// ---------------------------------------------------------------------------

describe("quality-bar bans hold across every variant combination", () => {
  // From the master template's "Quality bar / what to avoid" list. Asserted as
  // lowercase substrings against the joined prose of every combination.
  const BANNED = [
    "fur baby",
    "crossed the rainbow bridge",
    "ran free in heaven",
    "now an angel watching over you",
    "watching over you",
    "watch over you",
  ];

  it("contains none of the banned clichés in any combination", () => {
    forEachCombination((story, combo) => {
      const all = allStrings(story).join(" ").toLowerCase();
      for (const phrase of BANNED) {
        expect(
          all,
          `banned phrase "${phrase}" (${combo.deathType}/${combo.beliefFrame}/${combo.relationship}/${combo.species}/${combo.giftFor}/${combo.newPet})`,
        ).not.toContain(phrase);
      }
    });
  });

  it("the pet never claims to watch over the owner (no 'watch'/'watching over')", () => {
    // The template specifically warns against the pet "watching over" the owner.
    const overOwner = /watch(?:ing|es)?\s+over\b/i;
    forEachCombination((story, combo) => {
      const all = allStrings(story).join(" ");
      expect(
        overOwner.test(all),
        `"watch(ing) over" appeared (${combo.deathType}/${combo.beliefFrame}/${combo.species})`,
      ).toBe(false);
    });
  });

  it("Page 4 (the goodbye) carries no humor markers in any death type", () => {
    // Product rule: "Be funny on Page 4 (the goodbye page is always still)" is a
    // hard NEVER. Guard against the playful registers the rest of the letter uses.
    const humorMarkers = [
      "barks at nothing",
      "laugh at something stupid",
      "for no reason",
      "runs in circles",
      "loaf-shapes",
      "binkies",
      "the worst dog",
    ];
    for (const deathType of DEATH_TYPES) {
      const page4 = pageById(
        resolveStory2(story2SessionWith({ toggles: { deathType } })),
        "letter-page-4",
      );
      const body = page4.body.join(" ").toLowerCase();
      for (const marker of humorMarkers) {
        expect(
          body,
          `humor marker "${marker}" on Page 4 (deathType=${deathType})`,
        ).not.toContain(marker);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Page 6 scare-quote is published copy — NOT an external quotation
// ---------------------------------------------------------------------------

describe('Page 6 keeps the "just a {species}" scare-quote (pet rejecting the phrase)', () => {
  it("renders the verbatim self-referential scare-quote, not an external quote", () => {
    const page6 = pageById(resolveStory2(murphySession()), "letter-page-6");
    const body = page6.body.join(" ");
    // The pet voices what others might dismissively say — published template copy.
    expect(body).toContain('Don\'t let anyone tell you I was "just a dog."');
  });

  it("the species fills the scare-quote for each species", () => {
    for (const species of SPECIES) {
      const page6 = pageById(
        resolveStory2(story2SessionWith({ pet: { species } })),
        "letter-page-6",
      );
      expect(page6.body.join(" ")).toContain(`"just a ${species}."`);
    }
  });
});

// ---------------------------------------------------------------------------
// Owner / pet name consistency
// ---------------------------------------------------------------------------

describe("name consistency", () => {
  it("uses the custom owner names on the cover and the salutation", () => {
    const story = resolveStory2(story2SessionWith({ owner: { names: "Theo" } }));
    expect(pageById(story, "letter-cover").subtitle).toContain("Theo");
    expect(pageById(story, "letter-page-2").body[0]).toBe("Dear Theo,");
    const all = allStrings(story).join(" ");
    expect(all).not.toContain("Sarah");
  });

  it("uses the custom pet name in the title and the signature", () => {
    const story = resolveStory2(story2SessionWith({ pet: { name: "Biscuit" } }));
    expect(pageById(story, "letter-cover").title).toBe("A Letter from Biscuit");
    // The signature line is the pet's name on its own.
    const page6 = pageById(story, "letter-page-6");
    expect(page6.body).toContain("Biscuit");
    expect(allStrings(story).join(" ")).not.toContain("Murphy");
  });
});

// ---------------------------------------------------------------------------
// Optional fields (nicknames, dates) omit cleanly
// ---------------------------------------------------------------------------

describe("optional fields omit cleanly when absent", () => {
  it("base Murphy (all optionals present): the date line and nicknames appear", () => {
    const story = resolveStory2(murphySession());
    const cover = pageById(story, "letter-cover");
    const page6 = pageById(story, "letter-page-6");

    // Cover date line under the title.
    expect(cover.body).toContain("March 2014 — October 2025");
    // Page-6 nickname line and date line below the signature.
    expect(page6.body).toContain("Murph, Mr. Murph, the worst dog");
    expect(page6.body).toContain("March 2014 — October 2025");
    // The signature ("Murphy") still precedes the trailing nickname/date lines.
    const sig = page6.body.indexOf("Murphy");
    const nick = page6.body.indexOf("Murph, Mr. Murph, the worst dog");
    expect(sig).toBeGreaterThan(-1);
    expect(nick).toBeGreaterThan(sig);
  });

  // A "date artifact" is a body LINE built from the optional date template —
  // either a dangling em-dash (one operand missing) or a stray leading/trailing
  // em-dash on a line of its own. NOTE: a bare " — " is NOT an artifact: the
  // letter prose legitimately uses em-dashes ("Wherever I am now — and there is a
  // now"), so we check whole body lines, not a substring of joined prose.
  function hasDateArtifact(story: ResolvedStory): boolean {
    return story.some((page) =>
      page.body.some((line) => {
        const trimmed = line.trim();
        // The intact date line is "DATE — DATE"; an artifact is a date line with
        // a missing operand: "— DATE", "DATE —", or a lone "—".
        return /^—\s|^\s*—\s*$|\s—$/.test(trimmed) || trimmed === "—";
      }),
    );
  }

  it("no dates, no nicknames: no date artifact, no empty nickname/date line", () => {
    const story = resolveStory2(
      story2SessionWith({
        memories: {
          nicknames: undefined,
          dateAdopted: undefined,
          datePassed: undefined,
        },
      }),
    );
    // No dangling-em-dash date artifact on any line.
    expect(hasDateArtifact(story)).toBe(false);
    // Neither date string appears at all.
    const all = allStrings(story).join("\n");
    expect(all).not.toContain("March 2014");
    expect(all).not.toContain("October 2025");
    // Cover body has no extra date line.
    expect(pageById(story, "letter-cover").body).toEqual([]);
    // Page-6 ends on the signature with no trailing nickname/date line.
    const page6 = pageById(story, "letter-page-6");
    expect(page6.body[page6.body.length - 1]).toBe("Murphy");
    // No empty-string lines crept in.
    expect(page6.body.every((p) => p.trim().length > 0)).toBe(true);
  });

  it("blank-string optionals are treated as absent (no artifact)", () => {
    const story = resolveStory2(
      story2SessionWith({
        memories: { nicknames: "   ", dateAdopted: "", datePassed: "  " },
      }),
    );
    const page6 = pageById(story, "letter-page-6");
    expect(page6.body[page6.body.length - 1]).toBe("Murphy");
    expect(hasDateArtifact(story)).toBe(false);
  });

  it("only ONE date present: no date line at all (both must exist)", () => {
    // Template rule: print the date line only when BOTH dates exist — never a
    // half date the customer didn't fully provide.
    const adoptedOnly = resolveStory2(
      story2SessionWith({
        memories: { dateAdopted: "March 2014", datePassed: undefined },
      }),
    );
    expect(allStrings(adoptedOnly).join("\n")).not.toContain("March 2014");
    expect(hasDateArtifact(adoptedOnly)).toBe(false);

    const passedOnly = resolveStory2(
      story2SessionWith({
        memories: { dateAdopted: undefined, datePassed: "October 2025" },
      }),
    );
    expect(allStrings(passedOnly).join("\n")).not.toContain("October 2025");
    expect(hasDateArtifact(passedOnly)).toBe(false);
  });

  it("nicknames present but no dates: the nickname line appears, no date line", () => {
    const story = resolveStory2(
      story2SessionWith({
        memories: {
          nicknames: "Murph",
          dateAdopted: undefined,
          datePassed: undefined,
        },
      }),
    );
    const page6 = pageById(story, "letter-page-6");
    // Nickname is the final line (no date follows it).
    expect(page6.body[page6.body.length - 1]).toBe("Murph");
    expect(hasDateArtifact(story)).toBe(false);
  });

  it("does not throw when all optionals are blank/absent", () => {
    expect(() =>
      resolveStory2(
        story2SessionWith({
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
// Sparse-input fallback: blank/shallow quirks -> the stock lines
// ---------------------------------------------------------------------------

describe("sparse {quirks} falls back to the stock sentences (Page 3 still resolves)", () => {
  // The fallback's final sentence — pinned to the template, with the sentence-
  // initial capital it actually renders with ("...pretending to be mad. The way
  // your hand found my head without looking.").
  const FALLBACK_MARKER = "The way your hand found my head without looking.";

  it("blank quirks -> stock fallback, no leftover token", () => {
    const story = resolveStory2(story2SessionWith({ memories: { quirks: "" } }));
    const page3 = pageById(story, "letter-page-3").body.join(" ");
    expect(page3).toContain(FALLBACK_MARKER);
    expect(page3).toContain("the way you always saved a bite for me");
    PLACEHOLDER_PATTERN.lastIndex = 0;
    expect(PLACEHOLDER_PATTERN.test(page3)).toBe(false);
  });

  it("whitespace-only quirks -> stock fallback (treated as blank)", () => {
    const story = resolveStory2(story2SessionWith({ memories: { quirks: "   " } }));
    expect(pageById(story, "letter-page-3").body.join(" ")).toContain(
      FALLBACK_MARKER,
    );
  });

  it("substantial quirks -> the customer's words, NOT the fallback", () => {
    const quirks = "the way you tilted your head when I said your name";
    const story = resolveStory2(story2SessionWith({ memories: { quirks } }));
    const page3 = pageById(story, "letter-page-3").body.join(" ");
    expect(page3).toContain(quirks);
    expect(page3).not.toContain(FALLBACK_MARKER);
  });
});

// ---------------------------------------------------------------------------
// Missing required field -> MergeError (never a rendered token)
// ---------------------------------------------------------------------------

describe("missing required field is reported via MergeError", () => {
  it("throws MergeError when petName is empty, carrying the key", () => {
    try {
      resolveStory2(story2SessionWith({ pet: { name: "" } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("petName");
    }
  });

  it("throws MergeError when ownerNames is whitespace-only", () => {
    try {
      resolveStory2(story2SessionWith({ owner: { names: "   " } }));
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("ownerNames");
    }
  });

  it("throws MergeError when favoriteRitual is empty", () => {
    expect(() =>
      resolveStory2(story2SessionWith({ memories: { favoriteRitual: "" } })),
    ).toThrow(MergeError);
  });

  it("throws MergeError when favoriteSpots is empty", () => {
    // favoriteSpots is referenced on Page 5 (rainbow-bridge default) and Page 6
    // (new-pet line) — required regardless of those toggles.
    expect(() =>
      resolveStory2(story2SessionWith({ memories: { favoriteSpots: "" } })),
    ).toThrow(MergeError);
  });

  it("collects every missing required key at once, sorted", () => {
    try {
      resolveStory2(
        story2SessionWith({
          pet: { name: "  " },
          owner: { names: "" },
          memories: { favoriteRitual: "   " },
        }),
      );
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      const keys = (err as MergeError).missingKeys;
      expect(keys).toEqual(["favoriteRitual", "ownerNames", "petName"]);
      expect([...keys].sort()).toEqual(keys);
    }
  });

  it("optional fields blank do NOT throw", () => {
    expect(() =>
      resolveStory2(
        story2SessionWith({
          memories: {
            nicknames: "",
            dateAdopted: "",
            datePassed: "",
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
  it("strips braces from quirks/ritual/spots and survives merge", () => {
    const story = resolveStory2(
      story2SessionWith({
        memories: {
          quirks: "the way you said my {name} every {morning}",
          favoriteRitual: "our {walk} before coffee",
          favoriteSpots: "the {sunny} spot by the door",
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
    expect(all).toContain("the way you said my name every morning");
  });
});

// ---------------------------------------------------------------------------
// 6 pages, correct ids + layout tags (independently authored layout map)
// ---------------------------------------------------------------------------

describe("the resolved letter has exactly 6 pages with the correct ids and layout", () => {
  // Authored independently from STORY_2_LAYOUT in merge.ts so a future drift is
  // caught (mirrors how Story-1's merge.test.ts double-locks its layout map).
  const expectedLayout: Record<Story2PageId, PageLayout> = {
    "letter-cover": "letter-cover",
    "letter-page-2": "letter",
    "letter-page-3": "letter",
    "letter-page-4": "letter",
    "letter-page-5": "letter",
    "letter-page-6": "letter",
  };
  const expectedOrder: Story2PageId[] = [
    "letter-cover",
    "letter-page-2",
    "letter-page-3",
    "letter-page-4",
    "letter-page-5",
    "letter-page-6",
  ];

  it("resolves exactly 6 pages in the expected order", () => {
    const story = resolveStory2(murphySession());
    expect(story).toHaveLength(6);
    expect(story.map((p) => p.id)).toEqual(expectedOrder);
  });

  it("tags every page with the correct layout (letter-cover + 5 letter)", () => {
    const story = resolveStory2(murphySession());
    for (const page of story) {
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[page.id as Story2PageId]}"`,
      ).toBe(expectedLayout[page.id as Story2PageId]);
    }
  });

  it("the letter prints no page numbers (typography guide: none)", () => {
    const story = resolveStory2(murphySession());
    for (const page of story) {
      expect(page.pageNumber, `page ${page.id}`).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// No state leakage across resolveStory2 calls (optional lines must not pile up)
// ---------------------------------------------------------------------------

describe("resolveStory2 does not accumulate optional lines across calls", () => {
  it("two consecutive calls produce identical bodies (no appended duplicates)", () => {
    const first = resolveStory2(murphySession());
    const second = resolveStory2(murphySession());
    expect(second).toEqual(first);
    // The date line appears exactly once on Page 6 (not doubled by a re-run).
    const page6 = pageById(second, "letter-page-6");
    const dateCount = page6.body.filter(
      (p) => p === "March 2014 — October 2025",
    ).length;
    expect(dateCount).toBe(1);
  });

  // Use proseStrings so this doc-comment reference is not flagged as unused;
  // also a light parity guard that the brief is excluded from prose.
  it("proseStrings excludes the illustration brief", () => {
    const page = pageById(resolveStory2(murphySession()), "letter-page-2");
    expect(proseStrings(page)).not.toContain(page.illustrationBrief);
  });
});
