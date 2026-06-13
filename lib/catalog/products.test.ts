import { describe, it, expect } from "vitest";

import { getProduct, getProducts } from "@/lib/catalog/products";
import { getStory } from "@/lib/story/registry";
import type { StoryType } from "@/lib/session/types";

// Every story type the engine knows about. The catalog is meant to be one
// product per live `storyType` (see lib/catalog/products.ts module doc), so this
// list lets us assert the catalog covers every story the registry can resolve —
// adding a Story 3 to the registry without a catalog entry would then fail here.
const ALL_STORY_TYPES: StoryType[] = [
  "story-1",
  "story-2",
  "story-4",
  "story-5",
  "story-6",
];

// The product catalog (PR-02) under test: a pure, client-safe data module that
// turns each registered `storyType` into a sellable `Product`. The load-bearing
// assertion is the no-drift guard — `illustrationCount` is derived from the
// registry's `illustrationSlots`, never hardcoded, so it can't fall out of sync
// with the engine. The rest assert the catalog lists the live books with valid
// prices and that lookups behave.

describe("getProducts", () => {
  it("lists exactly the live books (story-1 + story-2 + story-4 + story-5 + story-6)", () => {
    const products = getProducts();
    expect(products.map((p) => p.productId)).toEqual([
      "story-1-book",
      "story-2-letter",
      "story-4-talk",
      "story-5-letter-to",
      "story-6-tribute",
    ]);
    expect(products.map((p) => p.storyType)).toEqual([
      "story-1",
      "story-2",
      "story-4",
      "story-5",
      "story-6",
    ]);
  });

  it("returns a stable reference (cached) across calls", () => {
    expect(getProducts()).toBe(getProducts());
  });

  it("maps every product to a real registry story", () => {
    for (const product of getProducts()) {
      // getStory throws for an unregistered storyType — calling it is the assertion.
      expect(() => getStory(product.storyType)).not.toThrow();
    }
  });

  it("derives illustrationCount from the registry (no-drift guard)", () => {
    for (const product of getProducts()) {
      const slots = getStory(product.storyType).illustrationSlots;
      expect(product.illustrationCount).toBe(slots.length);
      // Assert against the registry, not a literal, so a future slot change
      // updates both in lockstep and never drifts.
      expect(product.illustrationCount).toBeGreaterThan(0);
    }
  });

  it("has a positive price for every product", () => {
    for (const product of getProducts()) {
      expect(product.priceUsd).toBeGreaterThan(0);
    }
  });

  it("leaves lsVariantId unset until PR-06 and sampleImages an array", () => {
    for (const product of getProducts()) {
      expect(product.lsVariantId).toBeUndefined();
      expect(Array.isArray(product.sampleImages)).toBe(true);
    }
  });

  it("has a unique productId and storyType per product (no copy-paste dupes)", () => {
    const products = getProducts();
    const ids = products.map((p) => p.productId);
    const types = products.map((p) => p.storyType);
    // A future Story-3 entry that copy-pastes an existing id/storyType would
    // collide here, even though the exact-list test above (a literal pair) would
    // not generically catch it once the catalog grows.
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(types).size).toBe(types.length);
  });

  it("covers every registered storyType the engine knows about", () => {
    const covered = new Set(getProducts().map((p) => p.storyType));
    // The catalog is one product per live storyType — registering a new story in
    // the registry without adding a catalog entry should be caught here.
    for (const storyType of ALL_STORY_TYPES) {
      expect(covered.has(storyType)).toBe(true);
    }
    // ...and the catalog sells nothing beyond the known story types.
    expect(covered.size).toBe(ALL_STORY_TYPES.length);
  });

  it("has non-empty marketing copy for every product", () => {
    for (const product of getProducts()) {
      // Guards against a product shipped with blank title/tagline/description.
      expect(product.title.trim().length).toBeGreaterThan(0);
      expect(product.tagline.trim().length).toBeGreaterThan(0);
      expect(product.description.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("getProduct", () => {
  it("returns the matching product for a known id", () => {
    const product = getProduct("story-1-book");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-1-book");
    expect(product?.storyType).toBe("story-1");
  });

  it("returns the Story-2 product for its id", () => {
    expect(getProduct("story-2-letter")?.storyType).toBe("story-2");
  });

  it("returns the Story-4 product for its id", () => {
    expect(getProduct("story-4-talk")?.storyType).toBe("story-4");
  });

  it("returns null for an unknown id", () => {
    expect(getProduct("nope")).toBeNull();
  });

  it("returns the same cached object reference as getProducts()", () => {
    const fromList = getProducts().find((p) => p.productId === "story-1-book");
    // Lookup and list must hand back the same instance so a consumer that mutates
    // or identity-checks a product sees one canonical object, not a copy.
    expect(getProduct("story-1-book")).toBe(fromList);
  });
});

// ---------------------------------------------------------------------------
// Story 4 — the new "If [PET_NAME] Could Talk" listing (PR 22)
// ---------------------------------------------------------------------------
//
// The deeper Story-4 assertions the feature spec calls for, beyond the generic
// list/no-drift guards above: the entry exists with the right storyType, its
// illustrationCount is the registry's 2 (derived, not a literal), and the
// placeholder price is in place.

describe("story-4-talk catalog entry", () => {
  it("is present in the catalog with storyType 'story-4'", () => {
    const product = getProduct("story-4-talk");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-4-talk");
    expect(product?.storyType).toBe("story-4");
  });

  it("derives illustrationCount from the registry (= 2 Premium slots), not a literal", () => {
    const product = getProduct("story-4-talk")!;
    // The registry's Story-4 slot list is the cover portrait + the Page-4 scene.
    const slots = getStory("story-4").illustrationSlots;
    expect(product.illustrationCount).toBe(slots.length);
    expect(slots.length).toBe(2);
    expect(product.illustrationCount).toBe(2);
  });

  it("uses the $29 placeholder display price (2900 cents)", () => {
    expect(getProduct("story-4-talk")!.priceUsd).toBe(2900);
  });

  it("has a unique id/storyType not shared with Story 1 or Story 2", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-4-talk")).toHaveLength(1);
    expect(types.filter((t) => t === "story-4")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Story 5 — the new "A Letter to [PET_NAME]" listing (PR 24)
// ---------------------------------------------------------------------------
//
// The Story-2 companion ("one from them, one from you"). Same focused assertions
// the spec calls for, beyond the generic list/no-drift guards above: the entry
// exists with the right storyType, its illustrationCount is the registry's 2
// (derived, not a literal), the placeholder price is in place, and its
// id/storyType are unique. Story 5 sells at $29 like Story 2 — identical form,
// illustration count, and fulfillment effort.

describe("story-5-letter-to catalog entry", () => {
  it("is present in the catalog with storyType 'story-5'", () => {
    const product = getProduct("story-5-letter-to");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-5-letter-to");
    expect(product?.storyType).toBe("story-5");
  });

  it("derives illustrationCount from the registry (= 2 Premium slots), not a literal", () => {
    const product = getProduct("story-5-letter-to")!;
    // The registry's Story-5 slot list is the cover portrait + the figure-free
    // belief wash — the same imagery shape as Story 2.
    const slots = getStory("story-5").illustrationSlots;
    expect(product.illustrationCount).toBe(slots.length);
    expect(slots.length).toBe(2);
    expect(product.illustrationCount).toBe(2);
  });

  it("uses the $29 placeholder display price (2900 cents)", () => {
    expect(getProduct("story-5-letter-to")!.priceUsd).toBe(2900);
  });

  it("has non-empty marketing copy (title, tagline, description)", () => {
    const product = getProduct("story-5-letter-to")!;
    expect(product.title.trim().length).toBeGreaterThan(0);
    expect(product.tagline.trim().length).toBeGreaterThan(0);
    expect(product.description.trim().length).toBeGreaterThan(0);
  });

  it("has a unique id/storyType not shared with Stories 1, 2 or 4", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-5-letter-to")).toHaveLength(1);
    expect(types.filter((t) => t === "story-5")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Story 6 — "While You're Still Here, [PET_NAME]" (the living tribute)
// ---------------------------------------------------------------------------
//
// Story 6 is the catalog's first narrative-spread storefront book and its only
// LIVING keepsake (made before a pet dies). It carries the most illustration slots
// of the storefront books (7), priced at the top of band ($32). Beyond the generic
// list/no-drift guards above, assert the entry exists with the right storyType, its
// illustrationCount is the registry's 7 (derived, not a literal), the placeholder
// price is in place, marketing copy + sampleImages are non-empty, and its
// id/storyType are unique.

describe("story-6-tribute catalog entry", () => {
  it("is present in the catalog with storyType 'story-6'", () => {
    const product = getProduct("story-6-tribute");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-6-tribute");
    expect(product?.storyType).toBe("story-6");
  });

  it("derives illustrationCount from the registry (= 7 tribute slots), not a literal", () => {
    const product = getProduct("story-6-tribute")!;
    // The registry's Story-6 slot list is the cover + 6 narrative scenes — the
    // most of any storefront book.
    const slots = getStory("story-6").illustrationSlots;
    expect(product.illustrationCount).toBe(slots.length);
    expect(slots.length).toBe(7);
    expect(product.illustrationCount).toBe(7);
  });

  it("uses the $32 top-of-band placeholder display price (3200 cents)", () => {
    expect(getProduct("story-6-tribute")!.priceUsd).toBe(3200);
  });

  it("has non-empty marketing copy (title, tagline, description)", () => {
    const product = getProduct("story-6-tribute")!;
    expect(product.title.trim().length).toBeGreaterThan(0);
    expect(product.tagline.trim().length).toBeGreaterThan(0);
    expect(product.description.trim().length).toBeGreaterThan(0);
  });

  it("references non-empty sample images", () => {
    const product = getProduct("story-6-tribute")!;
    expect(product.sampleImages.length).toBeGreaterThan(0);
    for (const src of product.sampleImages) {
      expect(src.trim().length).toBeGreaterThan(0);
    }
  });

  it("has a unique id/storyType not shared with the other books", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-6-tribute")).toHaveLength(1);
    expect(types.filter((t) => t === "story-6")).toHaveLength(1);
  });
});
