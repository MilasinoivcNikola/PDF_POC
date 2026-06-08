import { describe, it, expect } from "vitest";

import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import {
  ILLUSTRATION_SLOTS,
  illustrationLabel,
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
});
