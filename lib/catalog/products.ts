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
   * Lemon Squeezy variant id this product maps to. Intentionally NOT stored here
   * (PR-06): the real variant ids come from a manual LS product setup that hasn't
   * happened yet, and this module is CLIENT-SAFE (the public storefront's static
   * build imports it), so it must not read `process.env` — a server-only value
   * baked into a client bundle would diverge between client and server. Instead the
   * variant id is a NON-SECRET public identifier resolved SERVER-SIDE at checkout
   * creation from a per-product env var (`LEMONSQUEEZY_VARIANT_<PRODUCT_ID>`, e.g.
   * `LEMONSQUEEZY_VARIANT_STORY_1_BOOK`) — see app/(public)/api/checkout/route.ts.
   * Kept as an optional field for the contract; always `undefined` in the catalog.
   */
  lsVariantId?: string;
  /**
   * Public web paths to sample/reference art for the storefront (served from
   * `public/samples/<productId>/`). A few real generated pages, web-optimized
   * (~800px JPEG) — see PR-04. Plain string paths only, so this module stays
   * pure and client-safe.
   */
  sampleImages: string[];
  /**
   * Optional public web path to a full-book sample PDF (served from
   * `public/samples/<productId>/preview.pdf`) — the storefront's "see the full
   * book" affordance. Plain string path only, so this module stays pure and
   * client-safe. Omitted on products without a generated sample PDF.
   */
  previewPdf?: string;
  /**
   * How many illustrations the book generates. DERIVED from the registry's
   * `illustrationSlots` (never hardcoded) so it can't drift from the engine.
   */
  illustrationCount: number;
  /**
   * Which world the title belongs to: `living` celebrates a pet who is still
   * here, `loss` remembers one who has died. Drives the storefront's two-world
   * split ("celebrate them" vs "remember them"). The customer-facing words are
   * set in the page copy, not here — this is the internal classification.
   */
  audience: "living" | "loss";
  /**
   * Optional card/landing title override for when the stored `title` reads
   * incomplete on a standalone card. Falls back to `title` when unset — use
   * `productDisplayTitle(p)` to resolve.
   */
  displayTitle?: string;
}

// ---------------------------------------------------------------------------
// Pricing placeholders (config, NOT content)
// ---------------------------------------------------------------------------
//
// DEFERRED PRICING DECISION: these are placeholder cent prices used as the
// storefront DISPLAY price. The amount actually charged is configured on the Lemon
// Squeezy variant during the manual product setup (PR-06) — these constants and the
// LS variant price must be kept in agreement (confirm the final number with the PM
// before going live). Do not treat them as locked.
//
// - Story 1 (children's storybook) has no pricing table in its master template;
//   2900 ($29) is a sensible made-to-order placeholder (the plan's $20-40 range).
// - Story 2 (the letter) lists Basic $19 / Premium $29 in its master template. The
//   live product generates Premium imagery (cover portrait + belief wash), so the
//   Premium price (2900, $29) is used as the placeholder.
// - Story 4 ("If [PET_NAME] Could Talk") lists $27-29 PDF in its master template,
//   with $29 the explicit recommendation (matching Story 2, undercutting the
//   printed incumbents) — 2900 ($29) is the placeholder.
// - Story 5 ("A Letter to [PET_NAME]") lists $29 PDF in its master template (same
//   as Story 2 — identical form, illustration count, and fulfillment effort) —
//   2900 ($29) is the placeholder. The Stories 2 + 5 companion BUNDLE is out of
//   scope (a separate, PM-gated multi-product commerce decision).
// - Story 6 ("While You're Still Here") is recommended at $32-35 PDF in its master
//   template — the TOP of the catalog's PDF band (highest emotional weight, a
//   differentiated almost-uncontested concept, the photo-likeness differentiator).
//   3200 ($32) is the placeholder (top-of-band); confirm the exact number with the
//   PM before configuring the LS variant.
// - Story 7 ("Welcome Home") lists $25-29 PDF in its master template, with $29 the
//   explicit launch recommendation (in line with the personalized-pet-book
//   incumbents; the recurring annual gotcha-day repurchase justifies the upper end).
//   2900 ($29) is the placeholder; confirm the exact number with the PM before
//   configuring the LS variant.
// - Story 8 ("The Amazing Adventures of [PET_NAME]") lists $32-35 PDF in its master
//   template, with $34 the explicit launch recommendation (at/just above Wonderbly's
//   $34.99, under Petventures' $44.99, justified by the real-photo likeness those
//   breed-picker incumbents can't offer). 3400 ($34) is the locked launch price;
//   confirm with the PM before configuring the LS variant.
// - Story 9 ("[PET_NAME] and the New Baby") lists $27 PDF in its master template —
//   the lowest in the catalog, deliberately: it is the #7 NICHE TEST title with no
//   named competitor, priced just under the I See Me! ($29.99) / category $29 anchor
//   to lower the bar on an unproven concept. 2700 ($27) is the locked launch price
//   (PM, 2026-06-14); revisit upward toward $29 only if demand proves out.

const PLACEHOLDER_STORY_1_PRICE_USD = 2900;
const PLACEHOLDER_STORY_2_PRICE_USD = 2900;
const PLACEHOLDER_STORY_4_PRICE_USD = 2900;
const PLACEHOLDER_STORY_5_PRICE_USD = 2900;
const PLACEHOLDER_STORY_6_PRICE_USD = 3200;
const PLACEHOLDER_STORY_7_PRICE_USD = 2900;
const PLACEHOLDER_STORY_8_PRICE_USD = 3400;
const PLACEHOLDER_STORY_9_PRICE_USD = 2700;

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
  meta: Pick<
    Product,
    | "title"
    | "tagline"
    | "description"
    | "sampleImages"
    | "previewPdf"
    | "audience"
    | "displayTitle"
  > & {
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
    sampleImages: meta.sampleImages,
    previewPdf: meta.previewPdf,
    illustrationCount: getStory(storyType).illustrationSlots.length,
    audience: meta.audience,
    displayTitle: meta.displayTitle,
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
      sampleImages: [
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
      ],
      // The full HIGH-tier sample book — the only product with a published sample
      // PDF; surfaced as the "see the full book" affordance on the detail page.
      previewPdf: "/samples/story-1-book/preview.pdf",
      audience: "loss",
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
      sampleImages: [
        "/samples/story-2-letter/letter-cover.jpg",
        "/samples/story-2-letter/letter-page-5.jpg",
      ],
      // The full mixed-tier sample book (the catalog's first non-dog sample, a cat);
      // surfaced as the "see the full book" affordance on the detail page.
      previewPdf: "/samples/story-2-letter/preview.pdf",
      audience: "loss",
    }),
    buildProduct("story-4-talk", "story-4", {
      title: "If Your Pet Could Talk",
      tagline: "A joyful letter, in their voice — for a good day.",
      description:
        "A 6-page personalized letter written in your pet's own voice — warm, " +
        "funny, and true — addressed to you by name. The things they'd say if " +
        "they had the words for one afternoon: what they love about you, the " +
        "ordinary days they live for, and how they really feel when you walk " +
        "back through the door. Illustrated with a watercolor portrait of your " +
        "actual pet, painted from a photo you upload — not a generic breed " +
        "picture. A gift for a birthday, a gotcha day, or no reason at all. Has " +
        "your pet died? There's a quiet option at checkout to have the letter " +
        "written in the past tense, as a keepsake of them.",
      priceUsd: PLACEHOLDER_STORY_4_PRICE_USD,
      sampleImages: [
        "/samples/story-4-talk/talk-cover.jpg",
        "/samples/story-4-talk/talk-page-4.jpg",
      ],
      // The full mixed-tier sample book (the catalog's first "other"-species
      // sample, a guinea pig); surfaced as the "see the full book" affordance.
      previewPdf: "/samples/story-4-talk/preview.pdf",
      audience: "living",
    }),
    buildProduct("story-5-letter-to", "story-5", {
      title: "A Letter to Your Pet",
      tagline: "A letter, in your voice — the things you didn't get to say.",
      description:
        "A 6-page personalized letter written, this time, by you. A gentle, " +
        "guided way to say the things you didn't get to say to your pet: the " +
        "thank-you, the apology that lifts the weight, the last good day, and " +
        "what you're keeping. We write the connective words with care; you " +
        "supply the specifics that make it yours. The companion to A Letter " +
        "from Your Pet — one letter from them, one from you. Illustrated with a " +
        "watercolor portrait painted from your photo. Designed to be printed on " +
        "cardstock and framed. Written with care by people who have been on the " +
        "other side of this.",
      priceUsd: PLACEHOLDER_STORY_5_PRICE_USD,
      sampleImages: [
        "/samples/story-5-letter-to/note-cover.jpg",
        "/samples/story-5-letter-to/note-page-5.jpg",
      ],
      previewPdf: "/samples/story-5-letter-to/preview.pdf",
      audience: "loss",
    }),
    buildProduct("story-6-tribute", "story-6", {
      title: "While You're Still Here",
      tagline: "A living tribute — made while they're still curled up beside you.",
      description:
        "An 8-page personalized keepsake for a pet who is still with you — a " +
        "senior companion, or one facing a hard diagnosis. While You're Still " +
        "Here celebrates your pet and your bond in the present tense, while you " +
        "can still hold the book beside them. Illustrated from a photo of your " +
        "actual pet — their real coat, their real grey muzzle, their real face — " +
        "in soft watercolor across every page. Customized with your pet's name, " +
        "the ordinary rituals that are only yours, and the small things only they " +
        "do. Written gently, honestly, and with love — for the time you have, not " +
        "the time you're afraid of losing. Delivered as a print-ready PDF, " +
        "lovingly hand-finished, within 24–48 hours.",
      priceUsd: PLACEHOLDER_STORY_6_PRICE_USD,
      sampleImages: [
        "/samples/story-6-tribute/tribute-cover.jpg",
        "/samples/story-6-tribute/tribute-page-1.jpg",
        "/samples/story-6-tribute/tribute-page-2.jpg",
        "/samples/story-6-tribute/tribute-page-3.jpg",
        "/samples/story-6-tribute/tribute-page-4.jpg",
        "/samples/story-6-tribute/tribute-page-5.jpg",
        "/samples/story-6-tribute/tribute-page-6.jpg",
      ],
      previewPdf: "/samples/story-6-tribute/preview.pdf",
      // Living, not loss: a tribute to a pet who is STILL ALIVE — the deliberate
      // reclassification (filing "the goodbye" was a tone-miss). See PR-1 spec.
      audience: "living",
    }),
    buildProduct("story-7-welcome", "story-7", {
      title: "Welcome Home",
      tagline: "A gotcha-day book — the story of the day they came home.",
      description:
        "A personalized storybook celebrating the day your pet came home. " +
        "Welcome Home tells your pet's origin story — the empty house before, the " +
        "day you found each other, the drive home, the first night, and all the " +
        "small ways they became family — illustrated from a single photo of your " +
        "actual pet, kept looking like themselves on every page. Perfect for a " +
        "brand-new arrival, an adoption gift, or your pet's annual Gotcha Day. " +
        "Delivered as a print-quality PDF, lovingly hand-finished within 24–48 " +
        "hours. Customized with your pet's name, how you found each other, your " +
        "first-day memory, and the quirks that make them yours. Because every pet " +
        "deserves the story of the best day — the day they finally came home.",
      priceUsd: PLACEHOLDER_STORY_7_PRICE_USD,
      sampleImages: [
        "/samples/story-7-welcome/welcome-cover.jpg",
        "/samples/story-7-welcome/welcome-before.jpg",
        "/samples/story-7-welcome/welcome-choosing.jpg",
        "/samples/story-7-welcome/welcome-drive-home.jpg",
        "/samples/story-7-welcome/welcome-first-night.jpg",
        "/samples/story-7-welcome/welcome-learning.jpg",
        "/samples/story-7-welcome/welcome-now-ours.jpg",
        "/samples/story-7-welcome/welcome-belong.jpg",
      ],
      previewPdf: "/samples/story-7-welcome/preview.pdf",
      audience: "living",
    }),
    buildProduct("story-8-adventure", "story-8", {
      title: "The Amazing Adventures of Your Pet",
      tagline: "A joyful adventure starring your actual pet — and your kid.",
      description:
        "A joyful, personalized picture book where your actual pet — illustrated " +
        "from a photo you upload — stars as the hero of a fun 'save the day' quest " +
        "alongside your child. Unlike other personalized pet books that pick a " +
        "generic breed from a list, every illustration is painted to look like " +
        "your pet: same markings, same floppy ear, same goofy face. Tell us your " +
        "pet's real-life quirk and we'll make it their superpower — the dog who " +
        "always finds the ball becomes the World's Greatest Nose. Choose whether " +
        "your child adventures alongside them or hears the legend as the reader, " +
        "and the reading level that fits. Delivered as a print-quality PDF, " +
        "lovingly hand-finished within 24–48 hours. The gift for the kid who " +
        "thinks their dog is already a legend — because they're right.",
      priceUsd: PLACEHOLDER_STORY_8_PRICE_USD,
      sampleImages: [
        "/samples/story-8-adventure/adventure-cover.jpg",
        "/samples/story-8-adventure/adventure-ordinary.jpg",
        "/samples/story-8-adventure/adventure-special.jpg",
        "/samples/story-8-adventure/adventure-call.jpg",
        "/samples/story-8-adventure/adventure-clue.jpg",
        "/samples/story-8-adventure/adventure-deeper.jpg",
        "/samples/story-8-adventure/adventure-discovery.jpg",
        "/samples/story-8-adventure/adventure-wobble.jpg",
        "/samples/story-8-adventure/adventure-climax.jpg",
        "/samples/story-8-adventure/adventure-celebration.jpg",
      ],
      previewPdf: "/samples/story-8-adventure/preview.pdf",
      audience: "living",
    }),
    buildProduct("story-9-newbaby", "story-9", {
      title: "And the New Baby",
      tagline: "A keepsake for the first family member — the big sibling.",
      description:
        "An 8-to-10-page personalized storybook celebrating your pet as the " +
        "original first family member — and the new baby's big sibling. Whether " +
        "you're expecting or the baby has already arrived, this is a warm, " +
        "reassuring keepsake that says what every pet parent wants their animal " +
        "to know: you are not being replaced. Our family is growing, and " +
        "there's room for everyone. Illustrated with your actual pet — drawn " +
        "from a single photo you upload, so the pet in the story looks like " +
        "yours, not a generic breed pick — across every page. Customized with " +
        "your pet's name, your family's name, and your daily rituals together. " +
        "Delivered as a print-ready PDF, lovingly hand-finished within 24–48 " +
        "hours. Read it to your pet before the baby comes, or keep it as the " +
        "first chapter of your growing family's story.",
      priceUsd: PLACEHOLDER_STORY_9_PRICE_USD,
      // The full 7-illustration rabbit sample set (Story Samples PR-09), named by
      // slot id (cover + baby-page-2..7), generated at the locked mixed
      // PRODUCTION_QUALITY tier; the downloadable preview.pdf renders the book.
      sampleImages: [
        "/samples/story-9-newbaby/baby-cover.jpg",
        "/samples/story-9-newbaby/baby-page-2.jpg",
        "/samples/story-9-newbaby/baby-page-3.jpg",
        "/samples/story-9-newbaby/baby-page-4.jpg",
        "/samples/story-9-newbaby/baby-page-5.jpg",
        "/samples/story-9-newbaby/baby-page-6.jpg",
        "/samples/story-9-newbaby/baby-page-7.jpg",
      ],
      previewPdf: "/samples/story-9-newbaby/preview.pdf",
      audience: "living",
      // The only displayTitle override: "And the New Baby" reads incomplete on a
      // standalone card, so the card/landing show the full phrase.
      displayTitle: "Your Pet and the New Baby",
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

/**
 * The catalog filtered to one world (`living` celebrates / `loss` remembers),
 * preserving catalog order. One place for the storefront's two-world split so
 * pages don't each re-implement the filter.
 */
export function getProductsByAudience(audience: "living" | "loss"): Product[] {
  return getProducts().filter((p) => p.audience === audience);
}

/**
 * The title to show on a card/landing/detail: the `displayTitle` override when
 * set, otherwise the stored `title`. The one place that resolves the fallback.
 */
export function productDisplayTitle(p: Product): string {
  return p.displayTitle ?? p.title;
}
