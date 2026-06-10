// The product catalog: each sellable book title as a `Product` the storefront
// (PR-04) can list and checkout (PR-06) can charge for. Sibling of the PR-01 order
// model — this is commerce-layer DATA, not engine logic. One `Product` per live
// `storyType` registered in lib/story/registry.ts.
//
// CLIENT-SAFE by design: this module imports only the PURE parts of the registry
// (`getStory` → `illustrationSlots`), which PR-19 kept puppeteer-free by splitting
// the filename builders into lib/pdf/filename.ts. The public storefront imports
// this, so its module graph must never transitively pull in Puppeteer or any
// `node:`/fs engine module. No IO, no network — pure config + lookups.

import type { StoryType } from "@/lib/session/types";
import { getStory } from "@/lib/story/registry";

// ---------------------------------------------------------------------------
// Product — the storefront/checkout contract
// ---------------------------------------------------------------------------

/**
 * One sellable book title. `storyType` ties the product to a registered engine
 * product (lib/story/registry.ts); `lsVariantId` ties it to a Lemon Squeezy
 * variant once those products exist (filled in PR-06). Field naming is camelCase,
 * matching the `Order` contract style in lib/order/types.ts.
 */
export interface Product {
  /** Stable catalog id used in URLs, orders (`Order.productId`), and checkout. */
  productId: string;
  /** Which engine product this sells — drives the registry (`resolveStory*`). */
  storyType: StoryType;
  /** Display title for the storefront card / product page. */
  title: string;
  /** One-line marketing hook. */
  tagline: string;
  /** Longer marketing description (reuses the master template's product copy). */
  description: string;
  /**
   * Price in US cents (e.g. 2900 = $29.00). PLACEHOLDER — the deferred pricing
   * decision; final numbers are set with the PM before PR-06 (see PLACEHOLDER_*
   * constants below). Treated as config, not content. Always > 0.
   */
  priceUsd: number;
  /**
   * Lemon Squeezy variant id this product maps to. Left undefined until PR-06
   * creates the LS products; checkout fills it in then.
   */
  lsVariantId?: string;
  /**
   * Sample / reference art paths for the storefront. No sample art is committed
   * in this POC yet, so this is an empty array until the storefront (PR-04)
   * supplies real samples. (Placeholder choice — see module notes.)
   */
  sampleImages: string[];
  /**
   * How many illustrations the book generates. DERIVED from the registry's
   * `illustrationSlots` (never hardcoded) so it can't drift from the engine.
   */
  illustrationCount: number;
}

// ---------------------------------------------------------------------------
// Pricing placeholders (config, NOT content)
// ---------------------------------------------------------------------------
//
// DEFERRED PRICING DECISION: these are placeholder cent prices. Final numbers are
// set with the PM before PR-06 (the Lemon Squeezy product creation). Do not treat
// them as locked.
//
// - Story 1 (children's storybook) has no pricing table in its master template;
//   2900 ($29) is a sensible made-to-order placeholder (the plan's $20-40 range).
// - Story 2 (the letter) lists Basic $19 / Premium $29 in its master template. The
//   live product generates Premium imagery (cover portrait + belief wash), so the
//   Premium price (2900, $29) is used as the placeholder.

const PLACEHOLDER_STORY_1_PRICE_USD = 2900;
const PLACEHOLDER_STORY_2_PRICE_USD = 2900;

// ---------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------

/**
 * Build one `Product` for a story type, deriving `illustrationCount` from the
 * registry so it always matches the engine's actual illustration slot count.
 */
function buildProduct(
  productId: string,
  storyType: StoryType,
  meta: Pick<Product, "title" | "tagline" | "description"> & {
    priceUsd: number;
  },
): Product {
  return {
    productId,
    storyType,
    title: meta.title,
    tagline: meta.tagline,
    description: meta.description,
    priceUsd: meta.priceUsd,
    lsVariantId: undefined,
    sampleImages: [],
    illustrationCount: getStory(storyType).illustrationSlots.length,
  };
}

/**
 * The live catalog, one entry per registered `storyType`. Built lazily on first
 * `getProducts()` call (and cached) so the registry lookup happens at call time,
 * not module load.
 */
let catalogCache: Product[] | null = null;

function buildCatalog(): Product[] {
  return [
    buildProduct("story-1-book", "story-1", {
      title: "Saying Goodbye",
      tagline: "A gentle goodbye, made for your family.",
      description:
        "A 12-page personalized storybook to help your child understand and " +
        "grieve the loss of their pet. Created with input from children's grief " +
        "specialists. Customized with your pet's name, breed, your child's name, " +
        "and a favorite memory you share. Written gently, honestly, and with " +
        "love — because the best way to help a child through grief is to walk " +
        "them through it, not around it.",
      priceUsd: PLACEHOLDER_STORY_1_PRICE_USD,
    }),
    buildProduct("story-2-letter", "story-2", {
      title: "A Letter from Your Pet",
      tagline: "A letter, in their voice — to read once, then keep.",
      description:
        "A 6-page personalized letter written from your pet's perspective at the " +
        "Rainbow Bridge, addressed to you by name. Customized with your pet's " +
        "quirks, favorite spots, and the rituals that were only yours. Designed " +
        "to be printed on cardstock and framed. Many customers buy two — one for " +
        "themselves, one for someone who needs it. Written with care by people " +
        "who have been on the other side of this.",
      priceUsd: PLACEHOLDER_STORY_2_PRICE_USD,
    }),
  ];
}

/** All sellable book titles, one per live `storyType`. */
export function getProducts(): Product[] {
  if (!catalogCache) {
    catalogCache = buildCatalog();
  }
  return catalogCache;
}

/** Look up one product by its catalog id; `null` for an unknown id. */
export function getProduct(productId: string): Product | null {
  return getProducts().find((p) => p.productId === productId) ?? null;
}
