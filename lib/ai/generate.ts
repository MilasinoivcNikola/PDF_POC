// Reference-illustration generation (Craft Area 2, Milestone 2).
//
// From the uploaded pet photo, produce ONE stylized "reference illustration" of
// the same animal in the chosen style. This is the consistency anchor the full
// scene pipeline (feature 07) will pass alongside the photo when generating each
// page. Per the illustration style guide, a reference image is locked before any
// page art is generated.
//
// API-surface note (verified against openai@6.42.0,
// node_modules/openai/resources/images.d.ts):
//   - We call `images.edit`, not `images.generate`: only `edit` accepts input
//     images (`image: Uploadable | Array<Uploadable>`, up to 16 for gpt-image-2).
//     The plan's `images.generate({ reference_images })` sketch does not match the
//     current SDK — there is no `reference_images` param.
//   - `model: "gpt-image-2-2026-04-21"` and `size: "1024x1024"` are both valid.
//   - `quality` is `'low' | 'medium' | 'high' | 'auto' | ...`; our Quality tier
//     maps 1:1. We default to `low` to keep prompt iteration cheap (~$0.006/img).
//   - `input_fidelity: "low" | "high"` controls how hard the model matches input
//     features (incl. the pet's markings). Supported for gpt-image-2; we leave it
//     at the API default ("low") here to keep cost down while iterating, and let
//     feature 07 raise it for real book runs if the pet drifts.
//   - GPT image models always return base64; we read `result.data[0].b64_json`
//     and decode to a Buffer for the caller to save.

import type {
  GeneratedImage,
  IllustrationStyle,
  StorySession,
  Story2Session,
  Story4Session,
  Story5Session,
  Story6Session,
} from "@/lib/session/types";
import type {
  PageId,
  Story2PageId,
  Story4PageId,
  Story5PageId,
  Story6PageId,
} from "@/lib/story/master-text";
import { getOpenAI, photoToFile } from "@/lib/ai/client";
import { buildScenePrompts, SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import {
  buildStory2SlotPrompts,
  type Story2SlotPrompt,
} from "@/lib/ai/story2-prompts";
import {
  buildStory4SlotPrompts,
  type Story4SlotPrompt,
} from "@/lib/ai/story4-prompts";
import {
  buildStory5SlotPrompts,
  type Story5SlotPrompt,
} from "@/lib/ai/story5-prompts";
import {
  buildStory6SlotPrompts,
  type Story6SlotPrompt,
} from "@/lib/ai/story6-prompts";
import { getStory } from "@/lib/story/registry";
import {
  findCachedImage,
  hashPrompt,
  hashReferenceSet,
} from "@/lib/ai/cache";
import { isSafeSessionId, resolveUnder } from "@/lib/ai/paths";
import { withRetry, mapWithConcurrency, DEFAULT_CONCURRENCY } from "@/lib/ai/retry";
import type { Uploadable } from "openai";

/** Cost/quality tier. Maps 1:1 to the SDK's `quality` enum. Default: low. */
export type Quality = "low" | "medium" | "high";

/** The model used for all illustration generation in this project. */
export const IMAGE_MODEL = "gpt-image-2-2026-04-21";

/**
 * Pet-consistency strategy (plan's Approaches A/B/C). Configurable, not
 * hard-wired, so consistency can be tuned empirically on Milestone 3:
 *   - "A" (default): each scene gets [photo + reference illustration] + prompt.
 *     Scenes are independent ⇒ generated in parallel.
 *   - "B": accumulate prior scenes as extra references (capped at the 16-image
 *     limit) to drift-compensate. Sequential by nature.
 *   - "C": photo-only baseline (cheapest, fewest refs) for comparison.
 */
export type ConsistencyApproach = "A" | "B" | "C";

/** The OpenAI Images API hard limit on reference images for gpt-image-2. */
export const MAX_REFERENCE_IMAGES = 16;

/** Human-readable phrasing for each illustration style, used in prompts. */
const STYLE_PHRASE: Record<IllustrationStyle, string> = {
  watercolor: "soft watercolor",
  storybook: "gentle storybook",
  pencil: "soft pencil-sketch",
};

/**
 * Build the reference-illustration prompt. Pure and exported so it can be
 * unit-tested without hitting the API. Encodes the project's style guide: warm
 * pastels, golden-hour light, a neutral pose, and — critically — that the model
 * must preserve the pet's exact appearance from the reference photo.
 */
export function buildReferencePrompt(
  petDescription: string,
  style: IllustrationStyle,
): string {
  const stylePhrase = STYLE_PHRASE[style];
  const description = petDescription.trim();
  const descriptionClause = description ? ` The pet is ${description}.` : "";
  return (
    `A ${stylePhrase} children's-book illustration of the pet in the reference photo.` +
    descriptionClause +
    " Neutral, gentle pose against a simple warm background. Warm pastel palette," +
    " soft golden-hour light, no harsh contrasts. Maintain the pet's exact" +
    " appearance — color, markings, and breed characteristics — from the" +
    " reference photo. Suitable for a children's storybook."
  );
}

/**
 * Generate a single stylized reference illustration of the pet in the uploaded
 * photo. Returns the raw PNG bytes as a Buffer; the caller saves them (the
 * convention is `./generated/[session-id]/reference.png`).
 *
 * @param petPhotoPath  Local path to the uploaded photo (under ./uploads).
 * @param petDescription Free-text appearance, e.g. session `breedColor` + species.
 * @param style          Chosen illustration treatment.
 * @param quality        Cost tier; defaults to "low" while iterating on prompts.
 */
export async function generateReferenceIllustration(
  petPhotoPath: string,
  petDescription: string,
  style: IllustrationStyle,
  quality: Quality = "low",
): Promise<Buffer> {
  const openai = getOpenAI();
  const photo = await photoToFile(petPhotoPath);
  const prompt = buildReferencePrompt(petDescription, style);

  const result = await withRetry(() =>
    openai.images.edit({
      model: IMAGE_MODEL,
      image: photo,
      prompt,
      size: "1024x1024",
      quality,
      n: 1,
    }),
  );

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data for the reference illustration.");
  }
  return Buffer.from(b64, "base64");
}

// ---------------------------------------------------------------------------
// Scene generation (feature 07) — one page illustration from reference images
// ---------------------------------------------------------------------------

/**
 * Generate one scene illustration from an ordered set of reference images and a
 * scene prompt. The references are the consistency anchors per the chosen
 * approach (photo, the locked reference illustration, and — for Approach B —
 * prior scenes). The 16-image cap is enforced here as a final safety net: the
 * orchestrator already trims to the cap, but a direct caller (e.g. feature 10's
 * single-page regenerate) gets the same guard.
 *
 * Returns the raw PNG bytes; the orchestrator saves them.
 *
 * @param references Ordered reference image bytes (≤ MAX_REFERENCE_IMAGES).
 * @param prompt     The scene prompt (built by lib/ai/prompts.ts).
 * @param quality    Cost tier; defaults to "medium" — the tier for a real book.
 */
export async function generateSceneIllustration(
  references: readonly Buffer[],
  prompt: string,
  quality: Quality = "medium",
): Promise<Buffer> {
  if (references.length === 0) {
    throw new Error("At least one reference image is required to generate a scene.");
  }
  if (references.length > MAX_REFERENCE_IMAGES) {
    throw new Error(
      `Too many reference images: ${references.length} (the gpt-image-2 limit is ${MAX_REFERENCE_IMAGES}).`,
    );
  }

  const openai = getOpenAI();
  const { toFile } = await import("openai");
  const images: Uploadable[] = await Promise.all(
    references.map((buffer, i) =>
      toFile(buffer, `reference-${i}.png`, { type: "image/png" }),
    ),
  );

  const result = await withRetry(() =>
    openai.images.edit({
      model: IMAGE_MODEL,
      image: images,
      prompt,
      size: "1024x1024",
      quality,
      n: 1,
    }),
  );

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data for the scene illustration.");
  }
  return Buffer.from(b64, "base64");
}

/**
 * Generate one illustration from a PROMPT ONLY — no reference image. Used for
 * Story 2's belief-frame wash (feature 17): an abstract sunlit-meadow / quiet-
 * object wash with no pet figure, so there is nothing to anchor and no reference
 * to pass. The SDK's prompt-only path is `images.generate` (`images.edit`
 * requires an `image`); GPT image models always return base64, decoded here.
 *
 * @param prompt  The wash prompt (built by lib/ai/story2-prompts.ts).
 * @param quality Cost tier; defaults to "low" (the project default).
 */
export async function generateImageFromPrompt(
  prompt: string,
  quality: Quality = "low",
): Promise<Buffer> {
  const openai = getOpenAI();
  const result = await withRetry(() =>
    openai.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality,
      n: 1,
    }),
  );

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data for the prompt-only illustration.");
  }
  return Buffer.from(b64, "base64");
}

// ---------------------------------------------------------------------------
// Orchestration — reference + every scene, cached, saved to disk
// ---------------------------------------------------------------------------

/** Tunable options for a full book generation run. */
export interface GenerateOptions {
  /** Pet-consistency strategy. Default "A" (photo + reference per scene). */
  approach?: ConsistencyApproach;
  /** Quality tier for the scene pages. Default "low" (the project default for real book runs). */
  sceneQuality?: Quality;
  /**
   * Quality tier for the locked reference illustration. Default "low" — the
   * reference only anchors appearance; the scenes are the printed art.
   */
  referenceQuality?: Quality;
}

/**
 * The reference image bytes available to every scene: the original photo and the
 * locked reference illustration. Loaded once and reused across all scenes.
 */
interface ReferenceBundle {
  /** The uploaded pet photo bytes. */
  photo: Buffer;
  /** The generated reference-illustration bytes. */
  reference: Buffer;
}

/** Absolute path to a session's generated-images directory, traversal-guarded. */
async function generatedDir(sessionId: string): Promise<string> {
  if (!isSafeSessionId(sessionId)) {
    throw new Error(`Unsafe session id: ${sessionId}`);
  }
  // Safe after the allowlist check; resolveUnder re-checks each per-file path.
  const path = await import("node:path");
  return path.join(process.cwd(), "generated", sessionId);
}

/**
 * Resolve the on-disk path for one image (e.g. "reference.png", "cover.png"),
 * guaranteed to stay inside ./generated/[sessionId]. Throws on any attempt to
 * escape — a hard invariant for every write in this module. `filename` is a
 * fixed slot name (page id + ".png"), never client free-text, but the guard is
 * applied regardless for defense in depth.
 */
function imagePath(sessionId: string, filename: string): string {
  const resolved = resolveUnder(
    process.cwd(),
    `generated/${sessionId}`,
    `generated/${sessionId}/${filename}`,
  );
  if (!resolved) {
    throw new Error(`Refusing to write outside ./generated/${sessionId}: ${filename}`);
  }
  return resolved;
}

/** Save PNG bytes to ./generated/[sessionId]/[filename], returning the path. */
async function saveImage(
  sessionId: string,
  filename: string,
  bytes: Buffer,
): Promise<string> {
  const fs = await import("node:fs/promises");
  const dir = await generatedDir(sessionId);
  const outPath = imagePath(sessionId, filename);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outPath, bytes);
  return outPath;
}

/** Read PNG bytes back from disk (for cache hits / Approach B accumulation). */
async function readImage(path: string): Promise<Buffer> {
  const fs = await import("node:fs/promises");
  return fs.readFile(path);
}

/**
 * Assemble the reference set for a scene under the chosen approach, trimmed to
 * the 16-image cap. Pure given its inputs:
 *   - A: [photo, reference]
 *   - B: [photo, reference, ...prior scenes] — newest prior scenes kept, capped
 *   - C: [photo] only
 */
function referencesForScene(
  approach: ConsistencyApproach,
  bundle: ReferenceBundle,
  priorScenes: readonly Buffer[],
): Buffer[] {
  switch (approach) {
    case "C":
      return [bundle.photo];
    case "B": {
      const base = [bundle.photo, bundle.reference];
      const room = MAX_REFERENCE_IMAGES - base.length; // 14 prior scenes max
      // Keep the most recent prior scenes (closest in style to where we are).
      const recent = priorScenes.slice(Math.max(0, priorScenes.length - room));
      return [...base, ...recent];
    }
    case "A":
    default:
      return [bundle.photo, bundle.reference];
  }
}

/**
 * Generate (or reuse from cache) one scene, save it, and return its manifest
 * entry plus the bytes (the bytes feed Approach B's accumulation). A cache hit
 * — same page, same prompt hash, same reference hash, file still on disk —
 * skips the paid API call entirely and reads the saved PNG back.
 */
async function generateAndSaveScene(
  session: StorySession,
  page: PageId,
  prompt: string,
  references: readonly Buffer[],
  quality: Quality,
): Promise<{ entry: GeneratedImage; bytes: Buffer }> {
  const promptHash = hashPrompt(prompt);
  const referenceHash = hashReferenceSet(references);

  const cached = await findCachedImage(session.images, page, promptHash, referenceHash);
  if (cached) {
    return { entry: cached, bytes: await readImage(cached.path) };
  }

  const bytes = await generateSceneIllustration(references, prompt, quality);
  const path = await saveImage(session.id, `${page}.png`, bytes);
  return {
    entry: { page, path, promptHash, referenceHash },
    bytes,
  };
}

/**
 * Generate EVERY illustration a Story-1 book needs and return a manifest of
 * them, keyed by page slot. This is Milestone 3's "wow moment": photo + session
 * → reference → all scenes → saved PNGs under ./generated/[session-id]/.
 *
 * Flow:
 *   1. Generate the locked reference illustration (feature 06) and save it.
 *   2. Build every scene prompt from the resolved illustration briefs.
 *   3. For each illustrated page, assemble references per the chosen approach,
 *      check the cache, generate if needed, and save to ./generated/[id]/[page].png.
 *
 * Approach A and C scenes are independent ⇒ generated in PARALLEL, but through a
 * bounded worker pool (DEFAULT_CONCURRENCY) so the burst respects the live
 * ~5 image-input/min rate limit. Approach B accumulates prior scenes as
 * references ⇒ generated SEQUENTIALLY in book order. Either way, every scene
 * call is wrapped in withRetry so a 429 is retried with backoff. Every write
 * goes through the traversal guards in lib/ai/paths.ts.
 *
 * The caller is expected to pass the session's existing `images` manifest so a
 * re-run is a cache lookup, not a re-spend. Returns the new full manifest; the
 * caller persists it onto the session and/or maps it to a PageImageMap for the
 * renderer (see `manifestToImageMap`).
 *
 * @param session The finalized story session (pet photo path on `pet.photo`).
 * @param options Approach + quality tiers. Defaults: A, scenes "low".
 */
export async function generateAllIllustrations(
  session: StorySession,
  options: GenerateOptions = {},
): Promise<GeneratedImage[]> {
  // Dispatch on the product. The slot list is the registry's (per storyType), not
  // a hardcoded Story-1 constant — the seam that lets a second product define its
  // own illustration plan. Story 1 keeps its existing reference-then-scenes flow
  // below, unchanged; Story 2 (feature 17) and Story 4 (feature 21) each have their
  // own minimal two-slot flow.
  const storyType = session.storyType ?? "story-1";
  if (storyType === "story-2") {
    return generateStory2Illustrations(session as unknown as Story2Session, options);
  }
  if (storyType === "story-4") {
    return generateStory4Illustrations(session as unknown as Story4Session, options);
  }
  if (storyType === "story-5") {
    return generateStory5Illustrations(session as unknown as Story5Session, options);
  }
  if (storyType === "story-6") {
    return generateStory6Illustrations(session as unknown as Story6Session, options);
  }

  const approach = options.approach ?? "A";
  const sceneQuality = options.sceneQuality ?? "low";
  const referenceQuality = options.referenceQuality ?? "low";

  if (!isSafeSessionId(session.id)) {
    throw new Error(`Unsafe session id: ${session.id}`);
  }

  // Resolve the uploaded photo strictly inside ./uploads before any read.
  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }

  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();

  // 1. Locked reference illustration (the consistency anchor). Cached like the
  //    scenes: its reference set is just the photo, its prompt the reference
  //    prompt, so an unchanged photo + style is a hit.
  const referencePrompt = buildReferencePrompt(petDescription, session.pet.illustrationStyle);
  const photoBytes = await readImage(photoPath);
  const referencePromptHash = hashPrompt(referencePrompt);
  const referenceRefHash = hashReferenceSet([photoBytes]);

  let referenceEntry: GeneratedImage;
  let referenceBytes: Buffer;
  const cachedReference = await findCachedImage(
    session.images,
    "reference",
    referencePromptHash,
    referenceRefHash,
  );
  if (cachedReference) {
    referenceEntry = cachedReference;
    referenceBytes = await readImage(cachedReference.path);
  } else {
    referenceBytes = await generateReferenceIllustration(
      photoPath,
      petDescription,
      session.pet.illustrationStyle,
      referenceQuality,
    );
    const referencePath = await saveImage(session.id, "reference.png", referenceBytes);
    referenceEntry = {
      page: "reference",
      path: referencePath,
      promptHash: referencePromptHash,
      referenceHash: referenceRefHash,
    };
  }

  const bundle: ReferenceBundle = { photo: photoBytes, reference: referenceBytes };
  const prompts = buildScenePrompts(session);

  const sceneEntries: GeneratedImage[] = [];

  if (approach === "B") {
    // Sequential: each scene accumulates the prior scenes as extra references.
    const priorScenes: Buffer[] = [];
    for (const page of SCENE_PAGE_IDS) {
      const references = referencesForScene(approach, bundle, priorScenes);
      const { entry, bytes } = await generateAndSaveScene(
        session,
        page,
        prompts[page],
        references,
        sceneQuality,
      );
      sceneEntries.push(entry);
      priorScenes.push(bytes);
    }
  } else {
    // A / C: scenes are independent ⇒ generate in parallel, but with a BOUNDED
    // worker pool. Firing all 13 at once trips the live ~5 image-input/min rate
    // limit (a 429 burst); a small in-flight cap plus withRetry's backoff keeps
    // the run under the ceiling. Results come back in input order, so the
    // manifest order is identical to the old unbounded path.
    const results = await mapWithConcurrency(
      SCENE_PAGE_IDS,
      DEFAULT_CONCURRENCY,
      async (page) => {
        const references = referencesForScene(approach, bundle, []);
        const { entry } = await generateAndSaveScene(
          session,
          page,
          prompts[page],
          references,
          sceneQuality,
        );
        return entry;
      },
    );
    sceneEntries.push(...results);
  }

  return [referenceEntry, ...sceneEntries];
}

// ---------------------------------------------------------------------------
// Story 2 — minimal Premium imagery (cover portrait + belief wash)
// ---------------------------------------------------------------------------

/**
 * Generate (or reuse from cache) one Story-2 slot, save it, and return its
 * manifest entry. The cover portrait passes the uploaded photo as a reference
 * (pet consistency, via `images.edit`); the belief wash passes NO reference (an
 * abstract, photo-free wash, via `images.generate`). Same cache contract as the
 * Story-1 scenes — same page + prompt hash + reference hash + file on disk ⇒ a
 * pure lookup, zero spend. The reference hash for the photo-free wash is the hash
 * of an empty reference set, so it is still part of the key.
 */
async function generateAndSaveStory2Slot(
  session: Story2Session,
  slot: Story2PageId,
  slotPrompt: Story2SlotPrompt,
  photoBytes: Buffer,
  quality: Quality,
): Promise<GeneratedImage> {
  const references = slotPrompt.useReference ? [photoBytes] : [];
  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);

  const cached = await findCachedImage(session.images, slot, promptHash, referenceHash);
  if (cached) {
    return cached;
  }

  const bytes = slotPrompt.useReference
    ? await generateSceneIllustration(references, slotPrompt.prompt, quality)
    : await generateImageFromPrompt(slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Generate Story 2's Premium imagery: the cover portrait + the belief-frame wash
 * (two images, not thirteen). The slot list comes from the registry
 * (`getStory("story-2").illustrationSlots`), so adding/removing a Story-2 slot is
 * a registry change, not an orchestrator change. Each slot's prompt + reference
 * flag come from `buildStory2SlotPrompts`. The two slots are independent ⇒
 * generated through the bounded worker pool (the same rate-limit guard the
 * Story-1 path uses), and every write goes through the traversal guards.
 *
 * Unlike Story 1, there is no separate "reference" anchor slot — `letter-cover`
 * IS the portrait — so the returned manifest is exactly the registry's slots.
 */
async function generateStory2Illustrations(
  session: Story2Session,
  options: GenerateOptions,
): Promise<GeneratedImage[]> {
  const quality = options.sceneQuality ?? "low";

  if (!isSafeSessionId(session.id)) {
    throw new Error(`Unsafe session id: ${session.id}`);
  }

  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }
  const photoBytes = await readImage(photoPath);

  const slots = getStory("story-2").illustrationSlots as readonly Story2PageId[];
  const prompts = buildStory2SlotPrompts(session);

  return mapWithConcurrency(slots, DEFAULT_CONCURRENCY, async (slot) => {
    const slotPrompt = prompts[slot];
    if (!slotPrompt) {
      throw new Error(`No Story-2 prompt builder for slot: ${slot}`);
    }
    return generateAndSaveStory2Slot(session, slot, slotPrompt, photoBytes, quality);
  });
}

// ---------------------------------------------------------------------------
// Story 4 — minimal Premium imagery (cover portrait + daily-joy scene)
// ---------------------------------------------------------------------------

/**
 * Generate (or reuse from cache) one Story-4 slot, save it, and return its manifest
 * entry. The clone of `generateAndSaveStory2Slot`, with ONE deliberate divergence:
 * BOTH Story-4 slots are reference-anchored (the pet appears in the cover portrait
 * AND the daily-joy scene — the PM call), so both pass the uploaded photo as a
 * reference and route through `generateSceneIllustration` (`images.edit`) — never
 * the photo-free `generateImageFromPrompt` Story 2's belief wash used. Same cache
 * contract as the Story-1/2 paths: same page + prompt hash + reference hash + file
 * on disk ⇒ a pure lookup, zero spend.
 */
async function generateAndSaveStory4Slot(
  session: Story4Session,
  slot: Story4PageId,
  slotPrompt: Story4SlotPrompt,
  photoBytes: Buffer,
  quality: Quality,
): Promise<GeneratedImage> {
  const references = slotPrompt.useReference ? [photoBytes] : [];
  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);

  const cached = await findCachedImage(session.images, slot, promptHash, referenceHash);
  if (cached) {
    return cached;
  }

  const bytes = await generateSceneIllustration(references, slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Generate Story 4's Premium imagery: the cover portrait + the Page-4 daily-joy
 * scene (two images, not thirteen). The slot list comes from the registry
 * (`getStory("story-4").illustrationSlots`), so adding/removing a Story-4 slot is a
 * registry change, not an orchestrator change. Each slot's prompt + reference flag
 * come from `buildStory4SlotPrompts` — and unlike Story 2, BOTH slots reference the
 * photo. The two slots are independent ⇒ generated through the bounded worker pool
 * (the same rate-limit guard the Story-1/2 paths use), and every write goes through
 * the traversal guards.
 *
 * Like Story 2, there is no separate "reference" anchor slot — `talk-cover` IS the
 * portrait — so the returned manifest is exactly the registry's slots.
 */
async function generateStory4Illustrations(
  session: Story4Session,
  options: GenerateOptions,
): Promise<GeneratedImage[]> {
  const quality = options.sceneQuality ?? "low";

  if (!isSafeSessionId(session.id)) {
    throw new Error(`Unsafe session id: ${session.id}`);
  }

  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }
  const photoBytes = await readImage(photoPath);

  const slots = getStory("story-4").illustrationSlots as readonly Story4PageId[];
  const prompts = buildStory4SlotPrompts(session);

  return mapWithConcurrency(slots, DEFAULT_CONCURRENCY, async (slot) => {
    const slotPrompt = prompts[slot];
    if (!slotPrompt) {
      throw new Error(`No Story-4 prompt builder for slot: ${slot}`);
    }
    return generateAndSaveStory4Slot(session, slot, slotPrompt, photoBytes, quality);
  });
}

// ---------------------------------------------------------------------------
// Story 5 — minimal Premium imagery (cover portrait + belief wash)
// ---------------------------------------------------------------------------

/**
 * Generate (or reuse from cache) one Story-5 slot, save it, and return its
 * manifest entry. Story 5's imagery shape is IDENTICAL to Story 2's: the cover
 * portrait passes the uploaded photo as a reference (pet consistency, via
 * `images.edit`); the belief wash passes NO reference (an abstract, photo-free
 * wash, via `images.generate`). So this is a near-clone of `generateAndSaveStory2Slot`
 * — NOT Story 4's both-reference-anchored shape. Same cache contract as the
 * Story-1/2/4 paths: same page + prompt hash + reference hash + file on disk ⇒ a
 * pure lookup, zero spend.
 */
async function generateAndSaveStory5Slot(
  session: Story5Session,
  slot: Story5PageId,
  slotPrompt: Story5SlotPrompt,
  photoBytes: Buffer,
  quality: Quality,
): Promise<GeneratedImage> {
  const references = slotPrompt.useReference ? [photoBytes] : [];
  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);

  const cached = await findCachedImage(session.images, slot, promptHash, referenceHash);
  if (cached) {
    return cached;
  }

  const bytes = slotPrompt.useReference
    ? await generateSceneIllustration(references, slotPrompt.prompt, quality)
    : await generateImageFromPrompt(slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Generate Story 5's Premium imagery: the cover portrait + the belief-frame wash
 * (two images, not thirteen). The slot list comes from the registry
 * (`getStory("story-5").illustrationSlots`), so adding/removing a Story-5 slot is a
 * registry change, not an orchestrator change. Each slot's prompt + reference flag
 * come from `buildStory5SlotPrompts` — the same shape as Story 2 (cover references
 * the photo, the wash does not). The two slots are independent ⇒ generated through
 * the bounded worker pool (the same rate-limit guard the Story-1/2/4 paths use),
 * and every write goes through the traversal guards.
 *
 * Like Story 2, there is no separate "reference" anchor slot — `note-cover` IS the
 * portrait — so the returned manifest is exactly the registry's slots.
 */
async function generateStory5Illustrations(
  session: Story5Session,
  options: GenerateOptions,
): Promise<GeneratedImage[]> {
  const quality = options.sceneQuality ?? "low";

  if (!isSafeSessionId(session.id)) {
    throw new Error(`Unsafe session id: ${session.id}`);
  }

  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }
  const photoBytes = await readImage(photoPath);

  const slots = getStory("story-5").illustrationSlots as readonly Story5PageId[];
  const prompts = buildStory5SlotPrompts(session);

  return mapWithConcurrency(slots, DEFAULT_CONCURRENCY, async (slot) => {
    const slotPrompt = prompts[slot];
    if (!slotPrompt) {
      throw new Error(`No Story-5 prompt builder for slot: ${slot}`);
    }
    return generateAndSaveStory5Slot(session, slot, slotPrompt, photoBytes, quality);
  });
}

// ---------------------------------------------------------------------------
// Story 6 — living-tribute imagery (Story 1's shape: reference + 7 scenes)
// ---------------------------------------------------------------------------

/**
 * Generate (or reuse from cache) one Story-6 scene, save it, and return its manifest
 * entry. The clone of `generateAndSaveScene` for the Story-6 path: every Story-6 slot
 * is reference-anchored (the living tribute shows the actual pet on every page — Story
 * 1's shape, not a letter's figure-free wash), so the references are always
 * `[photo, reference]` and the call always routes through `generateSceneIllustration`
 * (`images.edit`) — `generateImageFromPrompt` (`images.generate`) is NEVER reached for
 * Story 6. Same cache contract as the Story-1 scenes: same page + prompt hash +
 * reference hash + file on disk ⇒ a pure lookup, zero spend.
 */
async function generateAndSaveStory6Scene(
  session: Story6Session,
  slot: Story6PageId,
  slotPrompt: Story6SlotPrompt,
  references: readonly Buffer[],
  quality: Quality,
): Promise<GeneratedImage> {
  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);

  const cached = await findCachedImage(session.images, slot, promptHash, referenceHash);
  if (cached) {
    return cached;
  }

  const bytes = await generateSceneIllustration(references, slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Generate Story 6's living-tribute imagery: a locked reference illustration + the
 * SEVEN reference-anchored scenes (cover portrait, the page-1 dedication portrait,
 * and pages 2-6). This is STORY 1'S SHAPE, not the letters' two-image shape — every
 * page shows the actual pet via `images.edit` (Approach A), with NO figure-free wash.
 * So it mirrors `generateAllIllustrations`' Story-1 body:
 *
 *   1. Generate the locked reference illustration (the consistency anchor) and save
 *      it as `reference.png` — cached on the photo + reference prompt, like Story 1.
 *   2. Build every brief-driven scene prompt (`buildStory6SlotPrompts`).
 *   3. Generate the 7 scenes anchored on `[photo, reference]`, through the bounded
 *      worker pool (the same rate-limit guard the Story-1 path uses), each call
 *      wrapped in withRetry. Every write goes through the traversal guards.
 *
 * The slot list comes from the registry (`getStory("story-6").illustrationSlots` =
 * the 7 `tribute-*` page slots), so the count is `slots + 1 = 8` (the +1 is the
 * separate `reference` anchor — like Story 1's 14 = 13 slots + 1, NOT the letters'
 * total = slots). A re-run with an unchanged session is a pure $0 cache hit.
 */
async function generateStory6Illustrations(
  session: Story6Session,
  options: GenerateOptions,
): Promise<GeneratedImage[]> {
  const sceneQuality = options.sceneQuality ?? "low";
  const referenceQuality = options.referenceQuality ?? "low";

  if (!isSafeSessionId(session.id)) {
    throw new Error(`Unsafe session id: ${session.id}`);
  }

  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }

  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();

  // 1. Locked reference illustration (the consistency anchor), cached like Story 1.
  const referencePrompt = buildReferencePrompt(petDescription, session.pet.illustrationStyle);
  const photoBytes = await readImage(photoPath);
  const referencePromptHash = hashPrompt(referencePrompt);
  const referenceRefHash = hashReferenceSet([photoBytes]);

  let referenceEntry: GeneratedImage;
  let referenceBytes: Buffer;
  const cachedReference = await findCachedImage(
    session.images,
    "reference",
    referencePromptHash,
    referenceRefHash,
  );
  if (cachedReference) {
    referenceEntry = cachedReference;
    referenceBytes = await readImage(cachedReference.path);
  } else {
    referenceBytes = await generateReferenceIllustration(
      photoPath,
      petDescription,
      session.pet.illustrationStyle,
      referenceQuality,
    );
    const referencePath = await saveImage(session.id, "reference.png", referenceBytes);
    referenceEntry = {
      page: "reference",
      path: referencePath,
      promptHash: referencePromptHash,
      referenceHash: referenceRefHash,
    };
  }

  // 2 + 3. Brief-driven scene prompts, then the 7 scenes anchored on [photo, reference].
  const references = [photoBytes, referenceBytes];
  const slots = getStory("story-6").illustrationSlots as readonly Story6PageId[];
  const prompts = buildStory6SlotPrompts(session);

  const sceneEntries = await mapWithConcurrency(
    slots,
    DEFAULT_CONCURRENCY,
    async (slot) => {
      const slotPrompt = prompts[slot];
      if (!slotPrompt) {
        throw new Error(`No Story-6 prompt builder for slot: ${slot}`);
      }
      return generateAndSaveStory6Scene(session, slot, slotPrompt, references, sceneQuality);
    },
  );

  return [referenceEntry, ...sceneEntries];
}

/**
 * Regenerate a SINGLE page's illustration, re-using the reference illustration
 * already on disk (no second reference generation). Feeds feature 10's
 * "regenerate this illustration" button — only this page re-calls the API.
 *
 * Bypasses the cache (the user explicitly asked for a fresh render), saves the
 * new PNG over the old one, and returns the updated manifest entry. The caller
 * splices it into the session manifest. Approach B is approximated as A here
 * (a single page has no meaningful "prior scenes" to accumulate).
 */
export async function regenerateSceneIllustration(
  session: StorySession,
  page: PageId,
  options: Pick<GenerateOptions, "sceneQuality"> = {},
): Promise<GeneratedImage> {
  if (!isSafeSessionId(session.id)) {
    throw new Error(`Unsafe session id: ${session.id}`);
  }

  // The illustrated-slot allowlist is the session's product (the registry), not a
  // hardcoded Story-1 constant. For Story 1 this set is identical to SCENE_PAGE_IDS,
  // so the behavior is unchanged; Story 2 / Story 4 gate on their own two slots.
  const storyType = session.storyType ?? "story-1";
  const slots = getStory(storyType).illustrationSlots;
  if (!slots.includes(page)) {
    throw new Error(`Page ${page} is not an illustrated scene.`);
  }

  const sceneQuality = options.sceneQuality ?? "low";

  if (storyType === "story-2") {
    return regenerateStory2Slot(
      session as unknown as Story2Session,
      page as Story2PageId,
      sceneQuality,
    );
  }

  if (storyType === "story-4") {
    return regenerateStory4Slot(
      session as unknown as Story4Session,
      page as Story4PageId,
      sceneQuality,
    );
  }

  if (storyType === "story-5") {
    return regenerateStory5Slot(
      session as unknown as Story5Session,
      page as Story5PageId,
      sceneQuality,
    );
  }

  if (storyType === "story-6") {
    return regenerateStory6Slot(
      session as unknown as Story6Session,
      page as Story6PageId,
      sceneQuality,
    );
  }

  const referenceManifest = session.images.find((image) => image.page === "reference");
  if (!referenceManifest) {
    throw new Error("No reference illustration on the session — run generateAllIllustrations first.");
  }
  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }

  const photoBytes = await readImage(photoPath);
  const referenceBytes = await readImage(referenceManifest.path);
  const references = [photoBytes, referenceBytes];

  const prompts = buildScenePrompts(session);
  const prompt = prompts[page];
  const promptHash = hashPrompt(prompt);
  const referenceHash = hashReferenceSet(references);

  const bytes = await generateSceneIllustration(references, prompt, sceneQuality);
  const path = await saveImage(session.id, `${page}.png`, bytes);
  return { page, path, promptHash, referenceHash };
}

/**
 * Regenerate a SINGLE Story-2 slot (the cover portrait or the belief wash),
 * bypassing the cache (an explicit fresh render). The cover references the photo;
 * the belief wash is photo-free — so the references / API path follow the slot's
 * `useReference` flag, exactly as the full Story-2 run does. Saves over the old
 * PNG and returns the updated manifest entry for the caller to splice.
 */
async function regenerateStory2Slot(
  session: Story2Session,
  slot: Story2PageId,
  quality: Quality,
): Promise<GeneratedImage> {
  const slotPrompt = buildStory2SlotPrompts(session)[slot];
  if (!slotPrompt) {
    throw new Error(`No Story-2 prompt builder for slot: ${slot}`);
  }

  const references: Buffer[] = [];
  if (slotPrompt.useReference) {
    const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
    if (!photoPath) {
      throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
    }
    references.push(await readImage(photoPath));
  }

  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);
  const bytes = slotPrompt.useReference
    ? await generateSceneIllustration(references, slotPrompt.prompt, quality)
    : await generateImageFromPrompt(slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Regenerate a SINGLE Story-4 slot (the cover portrait or the daily-joy scene),
 * bypassing the cache (an explicit fresh render). Both Story-4 slots are
 * reference-anchored, so the photo is always passed and the call always routes
 * through `generateSceneIllustration` (no photo-free path). Saves over the old PNG
 * and returns the updated manifest entry for the caller to splice.
 */
async function regenerateStory4Slot(
  session: Story4Session,
  slot: Story4PageId,
  quality: Quality,
): Promise<GeneratedImage> {
  const slotPrompt = buildStory4SlotPrompts(session)[slot];
  if (!slotPrompt) {
    throw new Error(`No Story-4 prompt builder for slot: ${slot}`);
  }

  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }
  const references = [await readImage(photoPath)];

  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);
  const bytes = await generateSceneIllustration(references, slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Regenerate a SINGLE Story-5 slot (the cover portrait or the belief wash),
 * bypassing the cache (an explicit fresh render). Identical shape to Story 2: the
 * cover references the photo; the belief wash is photo-free — so the references /
 * API path follow the slot's `useReference` flag, exactly as the full Story-5 run
 * does. Saves over the old PNG and returns the updated manifest entry for the
 * caller to splice.
 */
async function regenerateStory5Slot(
  session: Story5Session,
  slot: Story5PageId,
  quality: Quality,
): Promise<GeneratedImage> {
  const slotPrompt = buildStory5SlotPrompts(session)[slot];
  if (!slotPrompt) {
    throw new Error(`No Story-5 prompt builder for slot: ${slot}`);
  }

  const references: Buffer[] = [];
  if (slotPrompt.useReference) {
    const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
    if (!photoPath) {
      throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
    }
    references.push(await readImage(photoPath));
  }

  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);
  const bytes = slotPrompt.useReference
    ? await generateSceneIllustration(references, slotPrompt.prompt, quality)
    : await generateImageFromPrompt(slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

/**
 * Regenerate a SINGLE Story-6 scene, bypassing the cache (an explicit fresh render).
 * Story 6 is Story 1's reference-anchored shape, so this mirrors the Story-1 default
 * path: it re-uses the `reference` illustration already on disk (no second reference
 * generation), anchors on `[photo, reference]`, and always routes through
 * `generateSceneIllustration` (`images.edit`) — there is no figure-free path. Saves
 * over the old PNG and returns the updated manifest entry for the caller to splice.
 */
async function regenerateStory6Slot(
  session: Story6Session,
  slot: Story6PageId,
  quality: Quality,
): Promise<GeneratedImage> {
  const slotPrompt = buildStory6SlotPrompts(session)[slot];
  if (!slotPrompt) {
    throw new Error(`No Story-6 prompt builder for slot: ${slot}`);
  }

  const referenceManifest = session.images.find((image) => image.page === "reference");
  if (!referenceManifest) {
    throw new Error("No reference illustration on the session — run generateAllIllustrations first.");
  }
  const photoPath = resolveUnder(process.cwd(), "uploads", session.pet.photo);
  if (!photoPath) {
    throw new Error(`Pet photo path is outside ./uploads: ${session.pet.photo}`);
  }

  const photoBytes = await readImage(photoPath);
  const referenceBytes = await readImage(referenceManifest.path);
  const references = [photoBytes, referenceBytes];

  const promptHash = hashPrompt(slotPrompt.prompt);
  const referenceHash = hashReferenceSet(references);
  const bytes = await generateSceneIllustration(references, slotPrompt.prompt, quality);
  const path = await saveImage(session.id, `${slot}.png`, bytes);
  return { page: slot, path, promptHash, referenceHash };
}

// ---------------------------------------------------------------------------
// Manifest → renderer input
// ---------------------------------------------------------------------------

/**
 * Turn a generated-images manifest into the `PageImageMap` the PDF template /
 * preview consume: page id → a self-contained `data:image/png;base64,…` URL the
 * renderer needs no base path to resolve (matching how render.ts inlines all
 * assets). Only ILLUSTRATED slots map through — the set is the union of every
 * product's `illustrationSlots` (the registry), so the Story-1 anchor "reference"
 * and the writing-only "back-cover" are both excluded (neither is an illustration
 * slot), while Story-2's `letter-cover`/`letter-page-5`, Story-4's
 * `talk-cover`/`talk-page-4`, Story-5's `note-cover`/`note-page-5`, and Story-6's
 * seven `tribute-*` page slots pass through (Story 6's `reference` anchor and its
 * writing-only `tribute-back-cover` are still excluded — neither is a slot).
 * Reads each saved PNG back from disk; missing files are skipped so the template
 * falls back to its placeholder art for that page.
 */
export async function manifestToImageMap(
  manifest: readonly GeneratedImage[],
): Promise<Partial<Record<PageId, string>>> {
  const map: Partial<Record<PageId, string>> = {};
  const illustratedSlots = new Set<string>([
    ...getStory("story-1").illustrationSlots,
    ...getStory("story-2").illustrationSlots,
    ...getStory("story-4").illustrationSlots,
    ...getStory("story-5").illustrationSlots,
    ...getStory("story-6").illustrationSlots,
  ]);
  await Promise.all(
    manifest
      .filter((image) => illustratedSlots.has(image.page))
      .map(async (image) => {
        try {
          const bytes = await readImage(image.path);
          map[image.page as PageId] = `data:image/png;base64,${bytes.toString("base64")}`;
        } catch {
          // File missing — leave the page to render its placeholder.
        }
      }),
  );
  return map;
}
