import { describe, it, expect } from "vitest";

import {
  masterStory,
  PLACEHOLDER_PATTERN,
} from "@/lib/story/master-text";
import { mergeStory, MergeError } from "@/lib/story/merge";
// resolveStory (compose variants → merge) is the single public entry point and
// lives in variants.ts; aliased to `_resolveStory` here for brevity.
import { resolveStory as _resolveStory } from "@/lib/story/variants";
import type { PageLayout } from "@/lib/story/merge";
import type { PageId, Story1PageId } from "@/lib/story/master-text";
import type { Pronoun } from "@/lib/session/types";
import {
  otisSession,
  sessionWith,
  allStrings,
  pageById,
  pageStrings,
} from "@/lib/story/fixtures";

// The merge engine + entry point under test. These suites guard the master
// template's #1 production bugs — leftover placeholders, pronoun drift — and the
// hard product wording rules ("died", never the euphemisms).

// ---------------------------------------------------------------------------
// No literal placeholder survives
// ---------------------------------------------------------------------------

describe("no placeholder survives a complete merge", () => {
  it("leaves no {field} token in any resolved string", () => {
    const story = _resolveStory(otisSession());
    for (const text of allStrings(story)) {
      // PLACEHOLDER_PATTERN is /g; reset lastIndex before each test() use.
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(
        PLACEHOLDER_PATTERN.test(text),
        `unresolved {placeholder} in: ${text}`,
      ).toBe(false);
    }
  });

  it("leaves no [UPPER_SNAKE] merge-field token in any resolved string", () => {
    // Belt-and-braces: the master template's own notation is [PET_NAME]-style.
    // None of that bracket syntax may leak into output either.
    const story = _resolveStory(otisSession());
    const bracketField = /\[[A-Z_]+\]/;
    for (const text of allStrings(story)) {
      expect(bracketField.test(text), `bracket token in: ${text}`).toBe(false);
    }
  });

  it("substitutes the pet name and child name into the cover", () => {
    const cover = pageById(_resolveStory(otisSession()), "cover");
    expect(cover.title).toBe("Saying Goodbye to Otis");
    expect(cover.subtitle).toBe("A story for Emma");
  });
});

// ---------------------------------------------------------------------------
// Resolved page layout tag (feature 14 — the renderer dispatches on this)
// ---------------------------------------------------------------------------

describe("every resolved page carries its render layout", () => {
  // The expected id → layout mapping the multi-story refactor established. The
  // renderer (lib/pdf/pages.tsx) dispatches on `layout` instead of literal ids;
  // for Story 1 this must mirror the old per-id dispatch exactly so output is
  // byte-identical. Cover/dedication/truth(7)/love(10)/closing(12)/back-cover get
  // bespoke treatments; every other numbered page is "narrative".
  const expectedLayout: Record<Story1PageId, PageLayout> = {
    cover: "cover",
    "page-1": "dedication",
    "page-2": "narrative",
    "page-3": "narrative",
    "page-4": "narrative",
    "page-5": "narrative",
    "page-6": "narrative",
    "page-7": "truth",
    "page-8": "narrative",
    "page-9": "narrative",
    "page-10": "love",
    "page-11": "narrative",
    "page-12": "closing",
    "back-cover": "back-cover",
  };

  it("resolves all 14 pages, each with the correct layout", () => {
    const story = _resolveStory(otisSession());
    expect(story).toHaveLength(14);
    for (const page of story) {
      // The Otis story is all Story-1 pages, so each id keys the map.
      const id = page.id as Story1PageId;
      expect(
        page.layout,
        `page ${page.id} should have layout "${expectedLayout[id]}"`,
      ).toBe(expectedLayout[id]);
    }
  });

  it("tags exactly the bespoke pages (cover, dedication, truth, love, closing, back-cover)", () => {
    const story = _resolveStory(otisSession());
    expect(pageById(story, "cover").layout).toBe("cover");
    expect(pageById(story, "page-1").layout).toBe("dedication");
    expect(pageById(story, "page-7").layout).toBe("truth");
    expect(pageById(story, "page-10").layout).toBe("love");
    expect(pageById(story, "page-12").layout).toBe("closing");
    expect(pageById(story, "back-cover").layout).toBe("back-cover");
  });

  it('tags the remaining numbered pages (2-6, 8, 9, 11) as "narrative"', () => {
    const story = _resolveStory(otisSession());
    const narrativeIds: PageId[] = [
      "page-2",
      "page-3",
      "page-4",
      "page-5",
      "page-6",
      "page-8",
      "page-9",
      "page-11",
    ];
    for (const id of narrativeIds) {
      expect(pageById(story, id).layout, `page ${id}`).toBe("narrative");
    }
  });

  it("keeps page ids stable (cache/manifest/regenerate keys unaffected)", () => {
    // The refactor adds `layout` but must NOT rename ids — the image manifest,
    // cache, and regenerate paths key on these.
    const ids = _resolveStory(otisSession()).map((p) => p.id);
    expect(ids).toEqual(Object.keys(expectedLayout));
  });
});

// ---------------------------------------------------------------------------
// Page 2 — opening reads naturally for any breedColor
// ---------------------------------------------------------------------------

describe("Page 2 opening composes cleanly with the customer's breedColor", () => {
  function page2Body(breedColor: string): string {
    const story = _resolveStory(sessionWith({ pet: { breedColor } }));
    return pageById(story, "page-2").body.join("\n");
  }

  it("does not double 'eyes' when the description already mentions eyes", () => {
    // Regression: the old Page 2 hard-coded "…, with eyes that always knew",
    // which collided with any breedColor ending in "eyes" ("brown eyes, with eyes").
    const body = page2Body("black tabby with bright green eyes");
    expect(body).not.toMatch(/eyes,?\s+with eyes/);
    expect(body).toContain("And he always knew, somehow, when you needed a friend.");
  });

  it("reads naturally for a compact breedColor that doesn't mention eyes", () => {
    const body = page2Body("golden retriever with one floppy ear");
    expect(body).toContain("Otis was a golden retriever with one floppy ear.");
    expect(body).toContain("And he always knew, somehow, when you needed a friend.");
  });
});

// ---------------------------------------------------------------------------
// species: "other" renders the graceful "friend" noun in printed prose
// ---------------------------------------------------------------------------

describe('species "other" renders "friend" in printed prose (never "a other")', () => {
  // The raw species word reads naturally for dog/cat/rabbit/bird, but "other"
  // (a real wizard option) yields ungrammatical copy ("a other named …", "Emma's
  // other"). speciesNoun maps "other" → "friend"; dog/cat/rabbit/bird keep their
  // literal word (byte-identical). Scope assertions to the BODY prose — the cover
  // illustration brief deliberately keeps the raw "{species}" token (out of scope),
  // so it legitimately still contains "other".
  it('Page 2 opening reads "a friend named …" (not "a other named …")', () => {
    const body = pageById(
      _resolveStory(sessionWith({ pet: { species: "other" } })),
      "page-2",
    ).body.join("\n");
    expect(body).toContain("there lived a friend named Otis.");
    expect(body).not.toContain("a other");
  });

  it('Page 12 closing reads "Emma\'s friend." (not "Emma\'s other.")', () => {
    const body = pageById(
      _resolveStory(sessionWith({ pet: { species: "other" } })),
      "page-12",
    ).body.join("\n");
    expect(body).toContain("Otis was Emma's friend.");
    expect(body).not.toContain("the other");
  });

  it("dog (non-other) keeps the literal species word — the swap is a no-op", () => {
    const story = _resolveStory(otisSession()); // dog
    expect(pageById(story, "page-2").body.join("\n")).toContain(
      "there lived a dog named Otis.",
    );
    expect(pageById(story, "page-12").body.join("\n")).toContain(
      "Otis was Emma's dog.",
    );
  });
});

// ---------------------------------------------------------------------------
// Pronoun consistency across every page
// ---------------------------------------------------------------------------

describe("pronoun consistency across all pages", () => {
  // Pronoun consistency is asserted against the *body prose* the child reads
  // (title + subtitle + body) — NOT the illustration briefs, which are internal
  // scene notes for the AI pipeline and legitimately contain generic English
  // like "them"/"themselves"/"their happiest scene".
  //
  // We forbid the *gendered* pronoun forms of the other gender. "them/their/
  // they" are intentionally NOT in any forbidden list: they are correct copy in
  // the euthanasia body ("a doctor helps them stop hurting"), the heaven body
  // ("their bodies"), and the other-pets line ("they probably miss …"), so a
  // blanket ban would flag valid text. The pet's own pronoun is exercised by
  // the explicit Page 5/7 checks below.
  const wrongGenderForms: Record<Pronoun, string[]> = {
    he: ["her", "she"], // a "he" pet must never read as "her"/"she"
    she: ["him", "his"], // a "she" pet must never read as "him"/"his"
    they: ["him", "his", "her", "she"], // a "they" pet uses neither gender's forms
  };

  // Match whole words only so "her" doesn't match inside "there" / "where".
  const whole = (word: string) => new RegExp(`\\b${word}\\b`, "i");

  // Only the published prose — exclude illustrationBrief.
  const proseStrings = (page: { title?: string; subtitle?: string; body: string[] }) => [
    ...(page.title !== undefined ? [page.title] : []),
    ...(page.subtitle !== undefined ? [page.subtitle] : []),
    ...page.body,
  ];

  for (const pronoun of ["he", "she", "they"] as Pronoun[]) {
    const wrong = wrongGenderForms[pronoun];

    it(`uses no wrong-gender pronoun in body prose for "${pronoun}"`, () => {
      // Use a gender-neutral favoriteMemory so the scan exercises the template's
      // own pronoun substitution, not the customer's free-text (which may name
      // the child as "her" regardless of the pet's pronoun — valid copy).
      const story = _resolveStory(
        sessionWith({
          pet: { pronoun },
          memories: {
            favoriteMemory:
              "The day at the lake, when everyone came home soaking wet and laughing the whole way.",
          },
        }),
      );
      for (const page of story) {
        for (const text of proseStrings(page)) {
          for (const bad of wrong) {
            expect(
              whole(bad).test(text),
              `pronoun "${bad}" leaked for subject "${pronoun}" in: ${text}`,
            ).toBe(false);
          }
        }
      }
    });
  }

  it('derives "she" forms on Page 7 (possessive) correctly', () => {
    const page7 = pageById(_resolveStory(sessionWith({ pet: { pronoun: "she" } })), "page-7");
    expect(page7.body.join(" ")).toContain("her body stopped working");
  });

  it('derives "they" forms on Page 5 (subject) and Page 7 (possessive)', () => {
    const story = _resolveStory(sessionWith({ pet: { pronoun: "they" } }));
    expect(pageById(story, "page-5").body.join(" ")).toContain("they would curl up");
    expect(pageById(story, "page-7").body.join(" ")).toContain("their body stopped working");
  });
});

// ---------------------------------------------------------------------------
// Name consistency — the pet's name recurs on every numbered page
// ---------------------------------------------------------------------------

describe("name consistency", () => {
  it("uses the pet name on every numbered story page (1-12)", () => {
    const story = _resolveStory(sessionWith({ pet: { name: "Biscuit" } }));
    for (const page of story) {
      if (page.pageNumber === null) continue; // cover / back cover
      const joined = pageStrings(page).join(" ");
      expect(joined, `pet name missing from page ${page.pageNumber}`).toContain("Biscuit");
    }
  });

  it("uses the custom child name consistently and never the default", () => {
    const story = _resolveStory(sessionWith({ child: { name: "Noah" } }));
    const all = allStrings(story).join(" ");
    expect(all).toContain("Noah");
    expect(all).not.toContain("Emma");
  });
});

// ---------------------------------------------------------------------------
// Hard product rule: the word "died", never the euphemisms
// ---------------------------------------------------------------------------

describe('hard rule: uses "died", never the forbidden euphemisms', () => {
  const forbidden = ["passed away", "went to sleep", "went away"];

  it('the word "died" appears in resolved output', () => {
    const all = allStrings(_resolveStory(otisSession())).join(" ");
    expect(all).toMatch(/\bdied\b/);
  });

  it("none of the forbidden euphemisms appear, across all variant combinations", () => {
    // Exercise every death-type / belief / age combination so a euphemism can't
    // hide in a variant body.
    const deathTypes = ["natural", "illness", "sudden", "euthanasia"] as const;
    const beliefs = ["rainbow-bridge", "heaven", "secular", "none"] as const;
    const ages = ["3-5", "6-8", "9-12"] as const;
    for (const deathType of deathTypes) {
      for (const beliefFrame of beliefs) {
        for (const ageBracket of ages) {
          const story = _resolveStory(
            sessionWith({
              child: { ageBracket },
              toggles: { deathType, beliefFrame, otherPetsInHome: "no" },
            }),
          );
          const all = allStrings(story).join(" ").toLowerCase();
          for (const phrase of forbidden) {
            expect(all, `"${phrase}" appeared (${deathType}/${beliefFrame}/${ageBracket})`).not.toContain(
              phrase,
            );
          }
          // "lost"/"went away" as standalone grief euphemisms must not appear.
          expect(all).not.toMatch(/\blost\b/);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// parentDedication — optional, no leftover token either way
// ---------------------------------------------------------------------------

describe("parentDedication is optional", () => {
  it("resolves with no error and no leftover token when absent", () => {
    const session = otisSession();
    expect(session.memories.parentDedication).toBeUndefined();
    const story = _resolveStory(session);
    const all = allStrings(story).join(" ");
    expect(all).not.toContain("parentDedication");
    expect(all).not.toContain("{parentDedication}");
    // The absent case must leave Page 1's optional `dedication` undefined.
    expect(pageById(story, "page-1").dedication).toBeUndefined();
  });

  it("does not throw when an empty/whitespace dedication is supplied", () => {
    // parentDedication is the one optional field; blank is allowed (it simply
    // does not render), and must not be reported as a missing required field.
    const session = sessionWith({ memories: { parentDedication: "   " } });
    expect(() => _resolveStory(session)).not.toThrow();
    // A whitespace-only dedication cleans to "" → not rendered.
    const page1 = pageById(_resolveStory(session), "page-1");
    expect(page1.dedication).toBeUndefined();
  });

  it("exposes the cleaned dedication on Page 1 when provided", () => {
    const session = sessionWith({
      memories: { parentDedication: "  Sleep well,   sweet boy.  " },
    });
    const story = _resolveStory(session);
    // Carried as its own Page-1 field (not spliced into body), and cleaned.
    expect(pageById(story, "page-1").dedication).toBe("Sleep well, sweet boy.");
    // No other page carries a dedication.
    for (const page of story) {
      if (page.id !== "page-1") {
        expect(page.dedication).toBeUndefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Free-text containing brace characters cannot inject a surviving placeholder
// ---------------------------------------------------------------------------

describe("customer free-text with { or } cannot leak a literal placeholder", () => {
  it("strips braces from a memory and survives merge with no token left", () => {
    // A parent's memory like "the {best} day" must render — not throw, and not
    // ship a literal {best}. `substitute` is single-pass, so the brace chars
    // are neutralized in `clean()` before substitution.
    const session = sessionWith({
      memories: {
        favoriteMemory: "The {best} day ever, at the {lake}.",
        favoriteActivity: "chasing {tennis} balls",
        sleepingSpot: "at the {foot} of your bed",
      },
      pet: { breedColor: "a {fluffy} good boy" },
    });

    // Resolves (does not throw) even though the free-text carried braces.
    const story = _resolveStory(session);

    // Scan every resolved string, including the optional Page-1 dedication.
    const page1 = pageById(story, "page-1");
    const texts = [
      ...allStrings(story),
      ...(page1.dedication !== undefined ? [page1.dedication] : []),
    ];
    for (const text of texts) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      expect(
        PLACEHOLDER_PATTERN.test(text),
        `surviving {placeholder} in: ${text}`,
      ).toBe(false);
      // No bare brace character of any kind survives from free-text injection.
      expect(text, `stray brace in: ${text}`).not.toMatch(/[{}]/);
    }

    // The memory's words still render (brace-stripped, not deleted wholesale).
    const all = allStrings(story).join(" ");
    expect(all).toContain("The best day ever, at the lake.");
  });

  it("strips braces from a parent dedication before exposing it on Page 1", () => {
    const session = sessionWith({
      memories: { parentDedication: "For our {sweetest} boy." },
    });
    const dedication = pageById(_resolveStory(session), "page-1").dedication;
    expect(dedication).toBe("For our sweetest boy.");
    expect(dedication).not.toMatch(/[{}]/);
  });
});

// ---------------------------------------------------------------------------
// Missing required field is reported, not rendered
// ---------------------------------------------------------------------------

describe("missing required field is reported via MergeError", () => {
  it("throws MergeError when a required field is an empty string", () => {
    const session = sessionWith({ pet: { name: "" } });
    expect(() => _resolveStory(session)).toThrow(MergeError);
  });

  it("treats a whitespace-only value as missing", () => {
    const session = sessionWith({ child: { name: "   " } });
    try {
      _resolveStory(session);
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      expect((err as MergeError).missingKeys).toContain("childName");
    }
  });

  it("collects every missing key at once, sorted", () => {
    const session = sessionWith({
      pet: { name: "  ", breedColor: "" },
      memories: { favoriteActivity: "" },
    });
    try {
      _resolveStory(session);
      throw new Error("expected MergeError");
    } catch (err) {
      expect(err).toBeInstanceOf(MergeError);
      const keys = (err as MergeError).missingKeys;
      expect(keys).toEqual(["breedColor", "favoriteActivity", "petName"]);
      // Sorted, de-duplicated even though petName appears on many pages.
      expect([...keys].sort()).toEqual(keys);
    }
  });

  it("does not render a bare placeholder when a field is missing", () => {
    // The contract is throw-not-render: if it ever returned, no {token} leaks.
    const session = sessionWith({ pet: { name: "" } });
    expect(() => _resolveStory(session)).toThrow(MergeError);
  });
});

// ---------------------------------------------------------------------------
// masterStory() returns a fresh mutable copy each call
// ---------------------------------------------------------------------------

describe("masterStory() freshness", () => {
  it("returns a distinct array each call", () => {
    expect(masterStory()).not.toBe(masterStory());
  });

  it("mutating one result does not affect the next (variant composition mutates)", () => {
    const a = masterStory();
    a[0].title = "MUTATED";
    a[7].body.push("INJECTED PARAGRAPH");
    const b = masterStory();
    expect(b[0].title).toBe("Saying Goodbye to {petName}");
    expect(b[7].body).not.toContain("INJECTED PARAGRAPH");
  });

  it("mergeStory does not mutate the master story it is given", () => {
    const story = masterStory();
    const before = JSON.stringify(story);
    mergeStory(story, otisSession());
    expect(JSON.stringify(story)).toBe(before);
  });
});
