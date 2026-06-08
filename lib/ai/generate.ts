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

import type { IllustrationStyle } from "@/lib/session/types";
import { getOpenAI, photoToFile } from "@/lib/ai/client";

/** Cost/quality tier. Maps 1:1 to the SDK's `quality` enum. Default: low. */
export type Quality = "low" | "medium" | "high";

/** The model used for all illustration generation in this project. */
export const IMAGE_MODEL = "gpt-image-2-2026-04-21";

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

  const result = await openai.images.edit({
    model: IMAGE_MODEL,
    image: photo,
    prompt,
    size: "1024x1024",
    quality,
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data for the reference illustration.");
  }
  return Buffer.from(b64, "base64");
}
