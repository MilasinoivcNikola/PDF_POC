import { describe, it, expect } from "vitest";

import {
  getProduct,
  getProducts,
  getProductsByAudience,
  productDisplayTitle,
} from "@/lib/catalog/products";
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
  "story-7",
  "story-8",
  "story-9",
];

// The product catalog (PR-02) under test: a pure, client-safe data module that
// turns each registered `storyType` into a sellable `Product`. The load-bearing
// assertion is the no-drift guard — `illustrationCount` is derived from the
// registry's `illustrationSlots`, never hardcoded, so it can't fall out of sync
// with the engine. The rest assert the catalog lists the live books with valid
// prices and that lookups behave.

describe("getProducts", () => {
  it("lists exactly the live books (story-1 + story-2 + story-4 + story-5 + story-6 + story-7 + story-8 + story-9)", () => {
    const products = getProducts();
    expect(products.map((p) => p.productId)).toEqual([
      "story-1-book",
      "story-2-letter",
      "story-4-talk",
      "story-5-letter-to",
      "story-6-tribute",
      "story-7-welcome",
      "story-8-adventure",
      "story-9-newbaby",
    ]);
    expect(products.map((p) => p.storyType)).toEqual([
      "story-1",
      "story-2",
      "story-4",
      "story-5",
      "story-6",
      "story-7",
      "story-8",
      "story-9",
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

// ---------------------------------------------------------------------------
// story-1-book — the HIGH-tier sample preview (Story 1 sample-preview follow-up)
// ---------------------------------------------------------------------------
//
// Story 1 is the first (and currently only) product with a published full-book
// sample: 13 web-optimized JPGs (cover + page-1..page-12) plus a `previewPdf` for
// the "see the full book" affordance on the detail page. These assertions pin the
// expanded sample set and the optional previewPdf contract.

describe("story-1-book sample preview", () => {
  it("lists all 13 sample images (cover + page-1..page-12) under the product path", () => {
    const product = getProduct("story-1-book")!;
    expect(product.sampleImages).toEqual([
      "/samples/story-1-book/cover.jpg",
      "/samples/story-1-book/page-1.jpg",
      "/samples/story-1-book/page-2.jpg",
      "/samples/story-1-book/page-3.jpg",
      "/samples/story-1-book/page-4.jpg",
      "/samples/story-1-book/page-5.jpg",
      "/samples/story-1-book/page-6.jpg",
      "/samples/story-1-book/page-7.jpg",
      "/samples/story-1-book/page-8.jpg",
      "/samples/story-1-book/page-9.jpg",
      "/samples/story-1-book/page-10.jpg",
      "/samples/story-1-book/page-11.jpg",
      "/samples/story-1-book/page-12.jpg",
    ]);
    expect(product.sampleImages).toHaveLength(13);
  });

  it("sets previewPdf to the published full-book sample PDF", () => {
    expect(getProduct("story-1-book")!.previewPdf).toBe(
      "/samples/story-1-book/preview.pdf",
    );
  });

  it("sets the published previewPdf on the products shipped so far and omits it elsewhere", () => {
    // Per-product previews now land as each title's sample set ships (the series
    // is backfilling them, no longer Story-1-only). Assert the SET of products
    // that should carry one — not a hardcoded count — so the next sample PR adds
    // its id here rather than fighting an "exactly one" invariant.
    const WITH_PREVIEW = new Map<string, string>([
      ["story-1-book", "/samples/story-1-book/preview.pdf"],
      ["story-2-letter", "/samples/story-2-letter/preview.pdf"],
      ["story-4-talk", "/samples/story-4-talk/preview.pdf"],
      ["story-5-letter-to", "/samples/story-5-letter-to/preview.pdf"],
      ["story-6-tribute", "/samples/story-6-tribute/preview.pdf"],
      ["story-7-welcome", "/samples/story-7-welcome/preview.pdf"],
    ]);
    for (const product of getProducts()) {
      const expected = WITH_PREVIEW.get(product.productId);
      if (expected !== undefined) {
        expect(product.previewPdf).toBe(expected);
      } else {
        expect(product.previewPdf).toBeUndefined();
      }
    }
  });

  it("sets story-2-letter previewPdf to its published full-book sample PDF", () => {
    expect(getProduct("story-2-letter")!.previewPdf).toBe(
      "/samples/story-2-letter/preview.pdf",
    );
  });

  it("sets story-4-talk previewPdf to its published full-book sample PDF", () => {
    expect(getProduct("story-4-talk")!.previewPdf).toBe(
      "/samples/story-4-talk/preview.pdf",
    );
  });

  it("sets story-5-letter-to previewPdf to its published full-book sample PDF", () => {
    expect(getProduct("story-5-letter-to")!.previewPdf).toBe(
      "/samples/story-5-letter-to/preview.pdf",
    );
  });

  it("sets story-6-tribute previewPdf to its published full-book sample PDF", () => {
    expect(getProduct("story-6-tribute")!.previewPdf).toBe(
      "/samples/story-6-tribute/preview.pdf",
    );
  });

  it("keeps previewPdf an optional string when set (shape still valid)", () => {
    for (const product of getProducts()) {
      // Either omitted (undefined) or a non-empty string path — never any other type.
      if (product.previewPdf !== undefined) {
        expect(typeof product.previewPdf).toBe("string");
        expect(product.previewPdf.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Audience split — the living/loss classification (public-refresh PR-1)
// ---------------------------------------------------------------------------
//
// The catalog carries `audience: "living" | "loss"` so the storefront can render
// its two-world split ("celebrate them" vs "remember them") from data. The
// load-bearing assertion is the EXACT PARTITION: it pins the deliberate Story-6
// reclassification (a tribute to a still-alive pet is `living`, not `loss`) and
// catches a future title added without a deliberate classification. The split is
// 5 living / 3 loss (not 4/4) — which is why counts are derived, never hardcoded.

const LIVING_IDS = [
  "story-4-talk",
  "story-6-tribute",
  "story-7-welcome",
  "story-8-adventure",
  "story-9-newbaby",
];
const LOSS_IDS = ["story-1-book", "story-2-letter", "story-5-letter-to"];

describe("audience classification", () => {
  it("gives every product a valid audience ('living' | 'loss')", () => {
    for (const product of getProducts()) {
      expect(["living", "loss"]).toContain(product.audience);
    }
  });

  it("partitions the catalog exactly per the mapping (5 living / 3 loss)", () => {
    const living = getProducts()
      .filter((p) => p.audience === "living")
      .map((p) => p.productId);
    const loss = getProducts()
      .filter((p) => p.audience === "loss")
      .map((p) => p.productId);
    // Assert the SETS so a future title added without a deliberate classification
    // (or the Story-6 reclassification silently regressing) fails here.
    expect(new Set(living)).toEqual(new Set(LIVING_IDS));
    expect(new Set(loss)).toEqual(new Set(LOSS_IDS));
    expect(living).toHaveLength(5);
    expect(loss).toHaveLength(3);
  });
});

describe("getProductsByAudience", () => {
  it("returns the living members in catalog order", () => {
    const ids = getProductsByAudience("living").map((p) => p.productId);
    expect(ids).toEqual(
      getProducts()
        .filter((p) => LIVING_IDS.includes(p.productId))
        .map((p) => p.productId),
    );
    expect(new Set(ids)).toEqual(new Set(LIVING_IDS));
  });

  it("returns the loss members in catalog order", () => {
    const ids = getProductsByAudience("loss").map((p) => p.productId);
    expect(ids).toEqual(
      getProducts()
        .filter((p) => LOSS_IDS.includes(p.productId))
        .map((p) => p.productId),
    );
    expect(new Set(ids)).toEqual(new Set(LOSS_IDS));
  });

  it("partitions getProducts() with no overlap and no omission", () => {
    const living = getProductsByAudience("living");
    const loss = getProductsByAudience("loss");
    const all = getProducts();
    // Sizes sum to the whole catalog...
    expect(living.length + loss.length).toBe(all.length);
    // ...no product appears in both worlds...
    const livingIds = new Set(living.map((p) => p.productId));
    for (const p of loss) {
      expect(livingIds.has(p.productId)).toBe(false);
    }
    // ...and together they cover every product exactly once.
    const union = new Set([...living, ...loss].map((p) => p.productId));
    expect(union).toEqual(new Set(all.map((p) => p.productId)));
  });
});

describe("productDisplayTitle", () => {
  it("returns the override for story-9-newbaby", () => {
    const product = getProduct("story-9-newbaby")!;
    expect(productDisplayTitle(product)).toBe("Your Pet and the New Baby");
  });

  it("falls back to title for every other product (the only override is Story 9)", () => {
    for (const product of getProducts()) {
      if (product.productId === "story-9-newbaby") continue;
      expect(product.displayTitle).toBeUndefined();
      expect(productDisplayTitle(product)).toBe(product.title);
    }
  });

  it("never resolves to an empty display title", () => {
    for (const product of getProducts()) {
      expect(productDisplayTitle(product).trim().length).toBeGreaterThan(0);
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

  it("lists all 7 sample images (cover + page-1..page-6) under the product path", () => {
    const product = getProduct("story-6-tribute")!;
    expect(product.sampleImages).toEqual([
      "/samples/story-6-tribute/tribute-cover.jpg",
      "/samples/story-6-tribute/tribute-page-1.jpg",
      "/samples/story-6-tribute/tribute-page-2.jpg",
      "/samples/story-6-tribute/tribute-page-3.jpg",
      "/samples/story-6-tribute/tribute-page-4.jpg",
      "/samples/story-6-tribute/tribute-page-5.jpg",
      "/samples/story-6-tribute/tribute-page-6.jpg",
    ]);
    expect(product.sampleImages).toHaveLength(7);
  });

  it("has a unique id/storyType not shared with the other books", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-6-tribute")).toHaveLength(1);
    expect(types.filter((t) => t === "story-6")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// story-7-welcome — the joyful homecoming book (feature 29 / PR-B)
// ---------------------------------------------------------------------------
//
// Story 7 is the catalog's FIRST joyful, non-memorial book — a gotcha-day storybook.
// It carries 8 illustration slots (cover + 7 scenes) and is priced at $29 (the
// locked launch price). Beyond the generic list/no-drift guards above, assert the
// entry exists with the right storyType, its illustrationCount is the registry's 8
// (derived, not a literal), the placeholder price is in place, marketing copy +
// sampleImages are non-empty, and its id/storyType are unique.

describe("story-7-welcome catalog entry", () => {
  it("is present in the catalog with storyType 'story-7'", () => {
    const product = getProduct("story-7-welcome");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-7-welcome");
    expect(product?.storyType).toBe("story-7");
  });

  it("derives illustrationCount from the registry (= 8 welcome slots), not a literal", () => {
    const product = getProduct("story-7-welcome")!;
    // The registry's Story-7 slot list is the cover + 7 scenes = 8.
    const slots = getStory("story-7").illustrationSlots;
    expect(product.illustrationCount).toBe(slots.length);
    expect(slots.length).toBe(8);
    expect(product.illustrationCount).toBe(8);
  });

  it("uses the $29 launch placeholder display price (2900 cents)", () => {
    expect(getProduct("story-7-welcome")!.priceUsd).toBe(2900);
  });

  it("has non-empty marketing copy (title, tagline, description)", () => {
    const product = getProduct("story-7-welcome")!;
    expect(product.title.trim().length).toBeGreaterThan(0);
    expect(product.tagline.trim().length).toBeGreaterThan(0);
    expect(product.description.trim().length).toBeGreaterThan(0);
  });

  it("pins the full 8-illustration bird sample set (real slot ids, book order)", () => {
    const product = getProduct("story-7-welcome")!;
    expect(product.sampleImages).toEqual([
      "/samples/story-7-welcome/welcome-cover.jpg",
      "/samples/story-7-welcome/welcome-before.jpg",
      "/samples/story-7-welcome/welcome-choosing.jpg",
      "/samples/story-7-welcome/welcome-drive-home.jpg",
      "/samples/story-7-welcome/welcome-first-night.jpg",
      "/samples/story-7-welcome/welcome-learning.jpg",
      "/samples/story-7-welcome/welcome-now-ours.jpg",
      "/samples/story-7-welcome/welcome-belong.jpg",
    ]);
    expect(product.sampleImages).toHaveLength(8);
  });

  it("sets previewPdf to the published full-book sample PDF", () => {
    expect(getProduct("story-7-welcome")!.previewPdf).toBe(
      "/samples/story-7-welcome/preview.pdf",
    );
  });

  it("has a unique id/storyType not shared with the other books", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-7-welcome")).toHaveLength(1);
    expect(types.filter((t) => t === "story-7")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// story-8-adventure — the kids' adventure book (feature 32 / PR-B)
// ---------------------------------------------------------------------------
//
// Story 8 is the catalog's most PLAYFUL book — a personalized kids' adventure with
// the pet as the hero. It carries 10 illustration slots (cover + 9 scenes) and is
// priced at $34 (the locked launch price, the top of the catalog). Beyond the
// generic list/no-drift guards above, assert the entry exists with the right
// storyType, its illustrationCount is the registry's 10 (DERIVED, not a literal),
// the placeholder price is 3400, marketing copy is non-empty (sampleImages is still
// [] pending the samples follow-up — the card degrades to a placeholder), and its
// id/storyType are unique.

describe("story-8-adventure catalog entry", () => {
  it("is present in the catalog with storyType 'story-8'", () => {
    const product = getProduct("story-8-adventure");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-8-adventure");
    expect(product?.storyType).toBe("story-8");
  });

  it("derives illustrationCount from the registry (= 10 adventure slots), not a literal", () => {
    const product = getProduct("story-8-adventure")!;
    // The registry's Story-8 slot list is the cover + 9 scenes = 10.
    const slots = getStory("story-8").illustrationSlots;
    expect(product.illustrationCount).toBe(slots.length);
    expect(slots.length).toBe(10);
    expect(product.illustrationCount).toBe(10);
  });

  it("uses the $34 launch placeholder display price (3400 cents)", () => {
    expect(getProduct("story-8-adventure")!.priceUsd).toBe(3400);
  });

  it("has non-empty marketing copy (title, tagline, description)", () => {
    const product = getProduct("story-8-adventure")!;
    expect(product.title.trim().length).toBeGreaterThan(0);
    expect(product.tagline.trim().length).toBeGreaterThan(0);
    expect(product.description.trim().length).toBeGreaterThan(0);
  });

  it("has no sample images yet (storefront card degrades to placeholder until the samples follow-up)", () => {
    // Story 8's web-optimized samples haven't been generated yet — public/samples/
    // story-8-adventure/ is empty. sampleImages is intentionally [] so the /books
    // card renders the placeholder art block instead of a broken <img>. The samples
    // follow-up flips this back to non-empty.
    expect(getProduct("story-8-adventure")!.sampleImages).toEqual([]);
  });

  it("leaves lsVariantId unset (resolved server-side at checkout)", () => {
    expect(getProduct("story-8-adventure")!.lsVariantId).toBeUndefined();
  });

  it("has a unique id/storyType not shared with the other books", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-8-adventure")).toHaveLength(1);
    expect(types.filter((t) => t === "story-8")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// story-9-newbaby — the family-transition keepsake (feature 33 / PR-B)
// ---------------------------------------------------------------------------
//
// Story 9 is the catalog's #7 niche-test title — "[PET_NAME] and the New Baby". It
// reuses Story 1's narrative layouts and carries 7 illustration slots (cover + 6
// scenes), priced at $27 (the lowest in the catalog, reflecting its unproven,
// no-named-competitor status). Beyond the generic list/no-drift guards above, assert
// the entry exists with the right storyType, its illustrationCount is the registry's
// 7 (DERIVED, not a literal), the placeholder price is 2700, marketing copy is
// non-empty (sampleImages is still [] pending the samples follow-up — the card
// degrades to a placeholder), and its id/storyType are unique.

describe("story-9-newbaby catalog entry", () => {
  it("is present in the catalog with storyType 'story-9'", () => {
    const product = getProduct("story-9-newbaby");
    expect(product).not.toBeNull();
    expect(product?.productId).toBe("story-9-newbaby");
    expect(product?.storyType).toBe("story-9");
  });

  it("derives illustrationCount from the registry (= 7 keepsake slots), not a literal", () => {
    const product = getProduct("story-9-newbaby")!;
    // The registry's Story-9 slot list is the cover + 6 scenes = 7.
    const slots = getStory("story-9").illustrationSlots;
    expect(product.illustrationCount).toBe(slots.length);
    expect(slots.length).toBe(7);
    expect(product.illustrationCount).toBe(7);
  });

  it("uses the $27 launch placeholder display price (2700 cents)", () => {
    expect(getProduct("story-9-newbaby")!.priceUsd).toBe(2700);
  });

  it("has non-empty marketing copy (title, tagline, description)", () => {
    const product = getProduct("story-9-newbaby")!;
    expect(product.title.trim().length).toBeGreaterThan(0);
    expect(product.tagline.trim().length).toBeGreaterThan(0);
    expect(product.description.trim().length).toBeGreaterThan(0);
  });

  it("has no sample images yet (storefront card degrades to placeholder until the samples follow-up)", () => {
    // Story 9's web-optimized samples haven't been generated yet — public/samples/
    // story-9-newbaby/ is empty. sampleImages is intentionally [] so the /books card
    // renders the placeholder art block instead of a broken <img>. The samples
    // follow-up flips this back to non-empty.
    expect(getProduct("story-9-newbaby")!.sampleImages).toEqual([]);
  });

  it("leaves lsVariantId unset (resolved server-side at checkout)", () => {
    expect(getProduct("story-9-newbaby")!.lsVariantId).toBeUndefined();
  });

  it("has a unique id/storyType not shared with the other books", () => {
    const ids = getProducts().map((p) => p.productId);
    const types = getProducts().map((p) => p.storyType);
    expect(ids.filter((id) => id === "story-9-newbaby")).toHaveLength(1);
    expect(types.filter((t) => t === "story-9")).toHaveLength(1);
  });
});
