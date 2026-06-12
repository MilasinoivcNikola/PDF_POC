// Slot prompt builders for Story 4's minimal Premium imagery (Craft Area 2,
// feature 21). Story 4 ("If [PET_NAME] Could Talk") is the living/celebration twin
// of Story 2 — the same text-first keepsake letter, but the pet is alive. The
// Premium tier illustrates exactly TWO slots, not the thirteen a Story-1 book gets:
//
//   - `talk-cover`  — the cover portrait of the actual pet ("hello, it's me":
//     looking back over the shoulder, alert and happy, ears up). Uses the uploaded
//     photo as a reference for consistency, so it reuses Story 2's
//     `buildCoverPortraitPrompt` (which itself reuses `buildReferencePrompt`'s
//     style + "maintain the pet's exact appearance" consistency clause).
//   - `talk-page-4` — the "daily joy" scene: the actual pet *doing* the favorite
//     activity in the favorite spot, golden-hour light. THE one full scene in the
//     book. Unlike Story 2's belief wash (which was abstract + photo-free), this
//     slot IS the pet — so it is ALSO reference-anchored (the PM call): the photo is
//     passed and the same consistency clause applies. This is the divergence from
//     Story 2's imagery shape (its Page-5 wash had no figure).
//
// Path-independence: the `[LIVING_OR_MEMORIAL]` tense affects only the TEXT, never
// the art. Neither prompt branches on `toggles.livingOrMemorial`.
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session — mirroring lib/ai/prompts.ts (Story 1) and
// lib/ai/story2-prompts.ts (Story 2).
//
// The two slot ids are owned by the registry (lib/story/story-4.ts ⇒
// TALK_SCENE_PAGE_IDS) and consumed by the letter PDF template; we import the slot
// type rather than re-declare it so the prompt set can never drift from the slots
// the template renders.

import type { IllustrationStyle, Story4Session } from "@/lib/session/types";
import type { Story4PageId } from "@/lib/story/master-text";
import { buildCoverPortraitPrompt } from "@/lib/ai/story2-prompts";

/**
 * One Story-4 image to generate: the prompt string plus whether the uploaded pet
 * photo is passed as a reference. BOTH Story-4 slots reference the photo (the pet
 * appears in both — cover portrait and daily-joy scene), so both carry
 * `useReference: true`. The field is kept (rather than assumed) to match Story 2's
 * `Story2SlotPrompt` shape so the orchestrator's per-slot dispatch is identical.
 */
export interface Story4SlotPrompt {
  /** The fully-built prompt (no `{placeholder}` tokens — values are merged in). */
  prompt: string;
  /** Whether to pass the uploaded pet photo as a reference image. Always true for Story 4. */
  useReference: boolean;
}

/** Human-readable phrasing for each illustration style (kept in step with prompts.ts). */
const STYLE_PHRASE: Record<IllustrationStyle, string> = {
  watercolor: "soft watercolor",
  storybook: "gentle storybook",
  pencil: "soft pencil-sketch",
};

// ---------------------------------------------------------------------------
// Page-4 daily-joy scene (the one full scene illustration in the book)
// ---------------------------------------------------------------------------

/**
 * Build the Story-4 Page-4 "daily joy" scene prompt. The actual pet *doing* the
 * favorite activity in the favorite spot, in warm golden-hour light, per the
 * master template's Page-4 brief. Reference-anchored: it carries the same
 * "maintain the pet's exact appearance" consistency clause that `buildReferencePrompt`
 * uses, so a full-width scene of the real pet stays recognizably the same animal.
 * Path-independent — the memorial tense changes only the text, never this art. Pure.
 *
 * @param session The finalized Story-4 session (pet + memories supply the merge values).
 * @param style   The chosen illustration treatment.
 */
export function buildJoyScenePrompt(
  session: Story4Session,
  style: IllustrationStyle,
): string {
  const stylePhrase = STYLE_PHRASE[style];
  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();
  const descriptionClause = petDescription ? ` The pet is ${petDescription}.` : "";
  const activity = session.memories.favoriteActivity.trim();
  const spot = session.memories.favoriteSpots.trim();
  const activityClause = activity ? ` ${activity}` : " enjoying an ordinary, happy day";
  const spotClause = spot ? `, in ${spot}` : "";
  return (
    `A ${stylePhrase} illustration of the pet in the reference photo` +
    `${activityClause}${spotClause}.` +
    descriptionClause +
    " A single warm scene — the late-afternoon sun lands and the whole world goes" +
    " warm. Warm pastel palette, soft golden-hour light, no harsh contrasts, no" +
    " pure black. Maintain the pet's exact appearance — color, markings, and breed" +
    " characteristics — from the reference photo. Suitable for a framed keepsake letter."
  );
}

// ---------------------------------------------------------------------------
// Per-session slot prompts
// ---------------------------------------------------------------------------

/**
 * Build the prompt (and the reference flag) for every Story-4 illustrated slot,
 * keyed by slot id. Pure. BOTH slots reference the photo (the pet appears in both),
 * so both carry `useReference: true` and the orchestrator routes both through the
 * reference path (`generateSceneIllustration`) — never the photo-free
 * `generateImageFromPrompt` Story 2's belief wash used. Only the two Premium slots
 * are produced (`talk-cover`, `talk-page-4`) — the registry's `illustrationSlots`
 * is the authoritative list and the orchestrator iterates it, looking each id up here.
 */
export function buildStory4SlotPrompts(
  session: Story4Session,
): Partial<Record<Story4PageId, Story4SlotPrompt>> {
  const style = session.pet.illustrationStyle;
  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();
  return {
    "talk-cover": {
      prompt: buildCoverPortraitPrompt(petDescription, style),
      useReference: true,
    },
    "talk-page-4": {
      prompt: buildJoyScenePrompt(session, style),
      useReference: true,
    },
  };
}
