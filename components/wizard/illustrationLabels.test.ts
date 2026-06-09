import { describe, it, expect } from "vitest";

import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import { getStory } from "@/lib/story/registry";
import {
  ILLUSTRATION_SLOTS,
  LETTER_ILLUSTRATION_SLOTS,
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
});
