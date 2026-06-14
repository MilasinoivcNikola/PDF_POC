import { describe, it, expect } from "vitest";

import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import { getStory } from "@/lib/story/registry";
import {
  ILLUSTRATION_SLOTS,
  LETTER_ILLUSTRATION_SLOTS,
  TALK_ILLUSTRATION_SLOTS,
  NOTE_ILLUSTRATION_SLOTS,
  TRIBUTE_ILLUSTRATION_SLOTS,
  WELCOME_ILLUSTRATION_SLOTS,
  ADVENTURE_ILLUSTRATION_SLOTS,
  illustrationLabel,
  illustrationSlotsFor,
} from "./illustrationLabels";

// illustrationLabels.ts is pure (no IO, no React) — direct unit tests, no mocks.
// The contract that matters: the checklist count is DERIVED from SCENE_PAGE_IDS
// (so the UI never drifts from what the pipeline actually produces), and every
// label resolves to a non-empty string with the pet name woven in where the slot
// calls for it — with a graceful fallback for any slot that has no hand-written
// label (e.g. an unmapped/back-cover slot), never crashing or leaking `undefined`.

// ---------------------------------------------------------------------------
// ILLUSTRATION_SLOTS — derived, reference-first, 14 entries
// ---------------------------------------------------------------------------

describe("ILLUSTRATION_SLOTS", () => {
  it("is exactly `reference` + the 13 SCENE_PAGE_IDS (14 total)", () => {
    // SCENE_PAGE_IDS is cover + page-1…page-12 = 13; +reference = 14.
    expect(SCENE_PAGE_IDS).toHaveLength(13);
    expect(ILLUSTRATION_SLOTS).toHaveLength(14);
  });

  it("puts `reference` first, then the scene pages in SCENE_PAGE_IDS order", () => {
    expect(ILLUSTRATION_SLOTS[0]).toBe("reference");
    expect(ILLUSTRATION_SLOTS.slice(1)).toEqual([...SCENE_PAGE_IDS]);
  });

  it("is driven from SCENE_PAGE_IDS, not a hardcoded list", () => {
    // Reconstruct the expected array straight from the source-of-truth constant;
    // if someone replaced the spread with a literal that drifts, this fails.
    expect([...ILLUSTRATION_SLOTS]).toEqual(["reference", ...SCENE_PAGE_IDS]);
  });

  it("contains no duplicate slots", () => {
    expect(new Set(ILLUSTRATION_SLOTS).size).toBe(ILLUSTRATION_SLOTS.length);
  });
});

// ---------------------------------------------------------------------------
// LETTER_ILLUSTRATION_SLOTS — Story 2's two letter slots, registry-locked
// ---------------------------------------------------------------------------

describe("LETTER_ILLUSTRATION_SLOTS", () => {
  it("is exactly the two Premium letter slots (no `reference` anchor)", () => {
    expect([...LETTER_ILLUSTRATION_SLOTS]).toEqual([
      "letter-cover",
      "letter-page-5",
    ]);
  });

  it("equals the registry's Story-2 illustrationSlots (drift guard)", () => {
    // The checklist the grieving owner watches must match what the pipeline
    // actually generates. The slots are declared in illustrationLabels.ts (to keep
    // it client-safe) but MUST stay in lockstep with the registry's source of
    // truth — if someone edits one list and not the other, this fails.
    expect([...LETTER_ILLUSTRATION_SLOTS]).toEqual([
      ...getStory("story-2").illustrationSlots,
    ]);
  });
});

// ---------------------------------------------------------------------------
// TALK_ILLUSTRATION_SLOTS — Story 4's two talk slots, registry-locked
// ---------------------------------------------------------------------------

describe("TALK_ILLUSTRATION_SLOTS", () => {
  it("is exactly the two Premium talk slots (no `reference` anchor)", () => {
    expect([...TALK_ILLUSTRATION_SLOTS]).toEqual([
      "talk-cover",
      "talk-page-4",
    ]);
  });

  it("equals the registry's Story-4 illustrationSlots (drift guard)", () => {
    // The checklist the parent watches must match what the pipeline actually
    // generates. The slots are declared in illustrationLabels.ts (to keep it
    // client-safe) but MUST stay in lockstep with the registry's source of truth —
    // if someone edits one list and not the other, this fails. Mirrors the
    // Story-2 LETTER_ILLUSTRATION_SLOTS guard.
    expect([...TALK_ILLUSTRATION_SLOTS]).toEqual([
      ...getStory("story-4").illustrationSlots,
    ]);
  });
});

// ---------------------------------------------------------------------------
// NOTE_ILLUSTRATION_SLOTS — Story 5's two note slots, registry-locked
// ---------------------------------------------------------------------------

describe("NOTE_ILLUSTRATION_SLOTS", () => {
  it("is exactly the two Premium note slots (no `reference` anchor)", () => {
    expect([...NOTE_ILLUSTRATION_SLOTS]).toEqual([
      "note-cover",
      "note-page-5",
    ]);
  });

  it("equals the registry's Story-5 illustrationSlots (drift guard)", () => {
    // The checklist the owner watches must match what the pipeline actually
    // generates. The slots are declared in illustrationLabels.ts (to keep it
    // client-safe) but MUST stay in lockstep with the registry's source of truth —
    // if someone edits one list and not the other, this fails. Mirrors the
    // Story-2 / Story-4 drift guards.
    expect([...NOTE_ILLUSTRATION_SLOTS]).toEqual([
      ...getStory("story-5").illustrationSlots,
    ]);
  });
});

// ---------------------------------------------------------------------------
// TRIBUTE_ILLUSTRATION_SLOTS — Story 6's reference + 7 tribute slots
// ---------------------------------------------------------------------------
//
// Story 6 is a NARRATIVE book like Story 1: a `reference` portrait anchor (NOT a
// registry slot) followed by the seven `tribute-*` page slots = EIGHT images. So
// the drift guard strips the leading `reference` (exactly as Story 1 does) and
// compares the page slots to the registry's `illustrationSlots` (the 7 page ids).

describe("TRIBUTE_ILLUSTRATION_SLOTS", () => {
  it("is exactly `reference` + the 7 tribute page slots (8 total)", () => {
    expect([...TRIBUTE_ILLUSTRATION_SLOTS]).toEqual([
      "reference",
      "tribute-cover",
      "tribute-page-1",
      "tribute-page-2",
      "tribute-page-3",
      "tribute-page-4",
      "tribute-page-5",
      "tribute-page-6",
    ]);
    expect(TRIBUTE_ILLUSTRATION_SLOTS).toHaveLength(8);
  });

  it("puts `reference` first, then the page slots in registry order", () => {
    expect(TRIBUTE_ILLUSTRATION_SLOTS[0]).toBe("reference");
  });

  it("equals the registry's Story-6 illustrationSlots once the reference anchor is dropped (drift guard)", () => {
    // The `reference` portrait is generated first but is NOT a registry slot (same
    // as Story 1). Strip it, and the remaining page slots MUST match the registry's
    // source of truth — if someone edits one list and not the other, this fails.
    const slots = getStory("story-6").illustrationSlots;
    expect(slots).toHaveLength(7);
    expect(TRIBUTE_ILLUSTRATION_SLOTS.slice(1)).toEqual([...slots]);
  });

  it("contains no duplicate slots", () => {
    expect(new Set(TRIBUTE_ILLUSTRATION_SLOTS).size).toBe(
      TRIBUTE_ILLUSTRATION_SLOTS.length,
    );
  });
});

// ---------------------------------------------------------------------------
// WELCOME_ILLUSTRATION_SLOTS — Story 7's reference + 8 welcome slots
// ---------------------------------------------------------------------------
//
// Story 7 is a NARRATIVE book like Story 1/6: a `reference` portrait anchor (NOT a
// registry slot) followed by the eight `welcome-*` page slots = NINE images. The
// drift guard strips the leading `reference` and compares the page slots to the
// registry's `illustrationSlots` (the 8 page ids).

describe("WELCOME_ILLUSTRATION_SLOTS", () => {
  it("is exactly `reference` + the 8 welcome page slots (9 total)", () => {
    expect([...WELCOME_ILLUSTRATION_SLOTS]).toEqual([
      "reference",
      "welcome-cover",
      "welcome-before",
      "welcome-choosing",
      "welcome-drive-home",
      "welcome-first-night",
      "welcome-learning",
      "welcome-now-ours",
      "welcome-belong",
    ]);
    expect(WELCOME_ILLUSTRATION_SLOTS).toHaveLength(9);
  });

  it("puts `reference` first, then the page slots in registry order", () => {
    expect(WELCOME_ILLUSTRATION_SLOTS[0]).toBe("reference");
  });

  it("equals the registry's Story-7 illustrationSlots once the reference anchor is dropped (drift guard)", () => {
    const slots = getStory("story-7").illustrationSlots;
    expect(slots).toHaveLength(8);
    expect(WELCOME_ILLUSTRATION_SLOTS.slice(1)).toEqual([...slots]);
  });

  it("contains no duplicate slots", () => {
    expect(new Set(WELCOME_ILLUSTRATION_SLOTS).size).toBe(
      WELCOME_ILLUSTRATION_SLOTS.length,
    );
  });
});

// ---------------------------------------------------------------------------
// ADVENTURE_ILLUSTRATION_SLOTS — Story 8's reference + 10 adventure slots
// ---------------------------------------------------------------------------
//
// Story 8 is a NARRATIVE book like Story 1/6/7: a `reference` portrait anchor (NOT a
// registry slot) followed by the ten `adventure-*` page slots = ELEVEN images. The
// drift guard strips the leading `reference` and compares the page slots to the
// registry's `illustrationSlots` (the 10 page ids).

describe("ADVENTURE_ILLUSTRATION_SLOTS", () => {
  it("is exactly `reference` + the 10 adventure page slots (11 total)", () => {
    expect([...ADVENTURE_ILLUSTRATION_SLOTS]).toEqual([
      "reference",
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
    ]);
    expect(ADVENTURE_ILLUSTRATION_SLOTS).toHaveLength(11);
  });

  it("puts `reference` first, then the page slots in registry order", () => {
    expect(ADVENTURE_ILLUSTRATION_SLOTS[0]).toBe("reference");
  });

  it("equals the registry's Story-8 illustrationSlots once the reference anchor is dropped (drift guard)", () => {
    const slots = getStory("story-8").illustrationSlots;
    expect(slots).toHaveLength(10);
    expect(ADVENTURE_ILLUSTRATION_SLOTS.slice(1)).toEqual([...slots]);
  });

  it("contains no duplicate slots", () => {
    expect(new Set(ADVENTURE_ILLUSTRATION_SLOTS).size).toBe(
      ADVENTURE_ILLUSTRATION_SLOTS.length,
    );
  });
});

// ---------------------------------------------------------------------------
// illustrationSlotsFor — per-product checklist slot list
// ---------------------------------------------------------------------------

describe("illustrationSlotsFor", () => {
  it("returns the 14 Story-1 slots for story-1", () => {
    expect(illustrationSlotsFor("story-1")).toBe(ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-1")).toHaveLength(14);
  });

  it("returns the 2 letter slots for story-2", () => {
    expect(illustrationSlotsFor("story-2")).toBe(LETTER_ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-2")).toHaveLength(2);
  });

  it("returns the 2 talk slots for story-4", () => {
    expect(illustrationSlotsFor("story-4")).toBe(TALK_ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-4")).toHaveLength(2);
  });

  it("returns the 2 note slots for story-5", () => {
    expect(illustrationSlotsFor("story-5")).toBe(NOTE_ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-5")).toHaveLength(2);
  });

  it("returns the 8 tribute slots (reference + 7) for story-6", () => {
    expect(illustrationSlotsFor("story-6")).toBe(TRIBUTE_ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-6")).toHaveLength(8);
  });

  it("returns the 9 welcome slots (reference + 8) for story-7", () => {
    expect(illustrationSlotsFor("story-7")).toBe(WELCOME_ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-7")).toHaveLength(9);
  });

  it("returns the 11 adventure slots (reference + 10) for story-8", () => {
    expect(illustrationSlotsFor("story-8")).toBe(ADVENTURE_ILLUSTRATION_SLOTS);
    expect(illustrationSlotsFor("story-8")).toHaveLength(11);
  });
});

// ---------------------------------------------------------------------------
// illustrationLabel — name interpolation + fallback
// ---------------------------------------------------------------------------

describe("illustrationLabel", () => {
  it("weaves the pet name into the reference-portrait label", () => {
    expect(illustrationLabel("reference", "Otis")).toBe(
      "Reference portrait — Otis as they were",
    );
  });

  it("returns a fixed (name-free) label for the cover slot", () => {
    expect(illustrationLabel("cover", "Otis")).toBe("Cover illustration");
  });

  it("weaves the pet name into a per-page label", () => {
    expect(illustrationLabel("page-2", "Otis")).toBe("Otis at the front door");
  });

  it("interpolates a different pet name everywhere the slot uses it", () => {
    expect(illustrationLabel("page-4", "Biscuit")).toBe(
      "Biscuit doing what they loved",
    );
    expect(illustrationLabel("page-8", "Biscuit")).toBe(
      "Your child, holding Biscuit's collar",
    );
  });

  it("never leaks the literal pet-name token into a label", () => {
    // The label must contain the actual name, never a `${name}` / placeholder.
    const label = illustrationLabel("page-5", "Murphy");
    expect(label).toContain("Murphy");
    expect(label).not.toContain("${");
    expect(label).not.toContain("undefined");
  });

  it("falls back to a sensible label for an unmapped slot (back-cover)", () => {
    // back-cover is a writing page with no hand-written label — the function must
    // not crash and must not emit `undefined`.
    const label = illustrationLabel("back-cover", "Otis");
    expect(label).toBe("Illustration for back-cover");
    expect(label).not.toContain("undefined");
  });

  it("trims whitespace and substitutes a gentle default for a blank pet name", () => {
    expect(illustrationLabel("reference", "   ")).toBe(
      "Reference portrait — your pet as they were",
    );
    expect(illustrationLabel("page-2", "")).toBe("your pet at the front door");
  });

  it("trims surrounding whitespace from a real pet name", () => {
    expect(illustrationLabel("page-2", "  Otis  ")).toBe(
      "Otis at the front door",
    );
  });

  it("returns a non-empty string for every slot in ILLUSTRATION_SLOTS", () => {
    for (const slot of ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Otis");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  // Story 2 (the adult letter): the two letter slots, no child referenced.
  it("uses the Story-2 cover label (pet name woven in) for story-2", () => {
    expect(illustrationLabel("letter-cover", "Murphy", "story-2")).toBe(
      "Cover portrait — Murphy, looking back",
    );
  });

  it("uses the Story-2 belief-wash label (name-free) for story-2", () => {
    expect(illustrationLabel("letter-page-5", "Murphy", "story-2")).toBe(
      "A soft wash for where they are now",
    );
  });

  it("returns a non-empty string for every slot in LETTER_ILLUSTRATION_SLOTS", () => {
    for (const slot of LETTER_ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Murphy", "story-2");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  // Story 4 (the living/celebration letter): the two talk slots, pet name woven in.
  it("uses the Story-4 cover label (pet name woven in) for story-4", () => {
    expect(illustrationLabel("talk-cover", "Biscuit", "story-4")).toBe(
      "Cover portrait — Biscuit, looking right back at you",
    );
  });

  it("uses the Story-4 page-4 scene label (pet name woven in) for story-4", () => {
    expect(illustrationLabel("talk-page-4", "Biscuit", "story-4")).toBe(
      "Biscuit doing what they love",
    );
  });

  it("substitutes the gentle default for a blank pet name in story-4 labels", () => {
    expect(illustrationLabel("talk-page-4", "  ", "story-4")).toBe(
      "your pet doing what they love",
    );
  });

  it("returns a non-empty string for every slot in TALK_ILLUSTRATION_SLOTS", () => {
    for (const slot of TALK_ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Biscuit", "story-4");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  // Story 5 (the owner's letter TO the pet): the two note slots, owner-toned.
  it("uses the Story-5 cover label (pet name woven in) for story-5", () => {
    expect(illustrationLabel("note-cover", "Murphy", "story-5")).toBe(
      "Cover portrait — Murphy, as you remember them",
    );
  });

  it("uses the Story-5 belief-wash label (name-free) for story-5", () => {
    expect(illustrationLabel("note-page-5", "Murphy", "story-5")).toBe(
      "A soft wash for where you keep them",
    );
  });

  it("substitutes the gentle default for a blank pet name in story-5 labels", () => {
    expect(illustrationLabel("note-cover", "  ", "story-5")).toBe(
      "Cover portrait — your pet, as you remember them",
    );
  });

  it("returns a non-empty string for every slot in NOTE_ILLUSTRATION_SLOTS", () => {
    for (const slot of NOTE_ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Murphy", "story-5");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  // Story 6 (the living tribute): the reference anchor + the 7 tribute scenes,
  // present-tense, narrative voice.
  it("uses the Story-6 reference + cover + scene labels (pet name woven in) for story-6", () => {
    expect(illustrationLabel("reference", "Biscuit", "story-6")).toBe(
      "Reference portrait — Biscuit, as they are now",
    );
    expect(illustrationLabel("tribute-cover", "Biscuit", "story-6")).toBe(
      "Cover illustration",
    );
    expect(illustrationLabel("tribute-page-2", "Biscuit", "story-6")).toBe(
      "Biscuit at home, in the everyday light",
    );
  });

  it("substitutes the gentle default for a blank pet name in story-6 labels", () => {
    expect(illustrationLabel("reference", "  ", "story-6")).toBe(
      "Reference portrait — your pet, as they are now",
    );
  });

  it("returns a non-empty string for every slot in TRIBUTE_ILLUSTRATION_SLOTS", () => {
    for (const slot of TRIBUTE_ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Biscuit", "story-6");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  // Story 7 (the homecoming book): the reference anchor + the 8 welcome scenes,
  // present-tense, joyful voice.
  it("uses the Story-7 reference + cover + scene labels (pet name woven in) for story-7", () => {
    expect(illustrationLabel("reference", "Biscuit", "story-7")).toBe(
      "Reference portrait — Biscuit, exactly as they are",
    );
    expect(illustrationLabel("welcome-cover", "Biscuit", "story-7")).toBe(
      "Cover illustration",
    );
    expect(illustrationLabel("welcome-choosing", "Biscuit", "story-7")).toBe(
      "The day you found Biscuit",
    );
  });

  it("substitutes the gentle default for a blank pet name in story-7 labels", () => {
    expect(illustrationLabel("reference", "  ", "story-7")).toBe(
      "Reference portrait — your pet, exactly as they are",
    );
  });

  it("returns a non-empty string for every slot in WELCOME_ILLUSTRATION_SLOTS", () => {
    for (const slot of WELCOME_ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Biscuit", "story-7");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  // Story 8 (the kids' adventure): the reference anchor + the 10 adventure scenes,
  // playful, action voice.
  it("uses the Story-8 reference + cover + scene labels (pet name woven in) for story-8", () => {
    expect(illustrationLabel("reference", "Biscuit", "story-8")).toBe(
      "Reference portrait — Biscuit, the hero, locked in",
    );
    expect(illustrationLabel("adventure-cover", "Biscuit", "story-8")).toBe(
      "The hero's cover — Biscuit, ready for anything",
    );
    expect(illustrationLabel("adventure-climax", "Biscuit", "story-8")).toBe(
      "The big leap — Biscuit saves the day",
    );
  });

  it("substitutes the gentle default for a blank pet name in story-8 labels", () => {
    expect(illustrationLabel("reference", "  ", "story-8")).toBe(
      "Reference portrait — your pet, the hero, locked in",
    );
  });

  it("returns a non-empty string for every slot in ADVENTURE_ILLUSTRATION_SLOTS", () => {
    for (const slot of ADVENTURE_ILLUSTRATION_SLOTS) {
      const label = illustrationLabel(slot, "Biscuit", "story-8");
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("undefined");
    }
  });

  it("does not regress the Story-1 default for the existing 2-arg calls", () => {
    // The 2-arg signature (no storyType) still resolves to Story-1 labels — the
    // story-4 branch must not leak into the default.
    expect(illustrationLabel("page-2", "Otis")).toBe("Otis at the front door");
    expect(illustrationLabel("cover", "Otis")).toBe("Cover illustration");
  });
});
