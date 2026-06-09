// Slot prompt builders for Story 2's minimal Premium imagery (Craft Area 2,
// feature 17). Story 2 ("A Letter from [PET_NAME]") is a text-first keepsake; the
// Premium tier illustrates exactly TWO slots, not the thirteen a Story-1 book gets:
//
//   - `letter-cover`  — a soft pet portrait / silhouette ("looking back", single
//     subject, lots of white space). Uses the uploaded photo as a reference for
//     consistency — it's essentially the reference-illustration path, so it reuses
//     buildReferencePrompt's style + "maintain the pet's exact appearance" clause.
//   - `letter-page-5` — the belief-frame wash. ABSTRACT and PHOTO-FREE: no pet
//     figure, so there is no consistency concern and no reference image is passed.
//     The prompt varies by `beliefFrame` (see PER_FRAME_WASH below).
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session — mirroring lib/ai/prompts.ts for Story 1.
//
// The two slot ids are owned by the registry (lib/story/story-2.ts ⇒
// LETTER_SCENE_PAGE_IDS) and consumed by the letter PDF template (feature 16); we
// import them rather than re-declare so the prompt set can never drift from the
// slots the template renders.

import type {
  IllustrationStyle,
  LetterBeliefFrame,
  Story2Session,
} from "@/lib/session/types";
import type { Story2PageId } from "@/lib/story/master-text";
import { buildReferencePrompt } from "@/lib/ai/generate";

/**
 * One Story-2 image to generate: the prompt string plus whether the uploaded pet
 * photo is passed as a reference. The cover portrait references the photo (pet
 * consistency); the belief wash does not (it has no pet figure). `useReference`
 * is the single fact the orchestrator needs to choose the API path
 * (`images.edit` with the photo vs. prompt-only `images.generate`).
 */
export interface Story2SlotPrompt {
  /** The fully-built prompt (no `{placeholder}` tokens — values are merged in). */
  prompt: string;
  /** Whether to pass the uploaded pet photo as a reference image. */
  useReference: boolean;
}

// ---------------------------------------------------------------------------
// Cover portrait
// ---------------------------------------------------------------------------

/**
 * Build the Story-2 cover-portrait prompt. Reuses `buildReferencePrompt`'s style
 * + "maintain the pet's exact appearance" consistency clause (the cover uses the
 * photo as a reference), then frames it for the keepsake cover per the master
 * template's cover brief: a soft silhouette / "looking back", a single subject,
 * and lots of white space — "the cover of a book of poems, not a children's
 * product." Pure.
 */
export function buildCoverPortraitPrompt(
  petDescription: string,
  style: IllustrationStyle,
): string {
  return (
    `${buildReferencePrompt(petDescription, style)}` +
    " Compose it as a quiet keepsake cover: a single subject, gently looking back" +
    " over the shoulder, set in generous empty white space with no other objects" +
    " or text. Understated and elegant — like the cover of a book of poems, not a" +
    " children's book."
  );
}

// ---------------------------------------------------------------------------
// Belief-frame wash (abstract, photo-free — no pet figure)
// ---------------------------------------------------------------------------

/**
 * The abstract wash prompt for each belief frame. NO pet figure in any of them
 * (the master template's Page-5 brief: "abstract, no figure"). rainbow-bridge and
 * heaven both render a soft sunlit landscape; secular renders a single quiet
 * object that stands in for the pet's absent presence. Style phrasing is appended
 * by `buildBeliefWashPrompt` so the wash matches the chosen illustration style.
 */
const PER_FRAME_WASH: Record<LetterBeliefFrame, string> = {
  "rainbow-bridge":
    "An abstract, soft wash of a sunlit meadow at golden hour — gentle rolling" +
    " light and warm pastel color, no animal, no figure, no people, no text.",
  heaven:
    "An abstract, soft wash of a sunlit landscape — a peaceful meadow under a" +
    " gentle sky, warm and luminous, no animal, no figure, no people, no text.",
  secular:
    "A quiet, still-life wash of a single small object that holds a pet's absence" +
    " — a leash hanging on a hook by a door, or an empty pet bed by a window in" +
    " soft afternoon light. Just the one object, no animal, no figure, no people," +
    " no text.",
};

/**
 * Build the Story-2 belief-wash prompt for a belief frame + style. Pure. Pulls
 * the per-frame abstract scene from `PER_FRAME_WASH` and appends the style
 * phrasing (warm pastels, soft light). Contains no pet reference and no pet figure
 * — the orchestrator must NOT pass a reference image for this slot.
 */
export function buildBeliefWashPrompt(
  beliefFrame: LetterBeliefFrame,
  style: IllustrationStyle,
): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `${PER_FRAME_WASH[beliefFrame]} In a ${stylePhrase} style, warm pastel` +
    " palette, soft golden-hour light, no harsh contrasts, no pure black."
  );
}

/** Human-readable phrasing for each illustration style (kept in step with prompts.ts). */
const STYLE_PHRASE: Record<IllustrationStyle, string> = {
  watercolor: "soft watercolor",
  storybook: "gentle storybook",
  pencil: "soft pencil-sketch",
};

// ---------------------------------------------------------------------------
// Per-session slot prompts
// ---------------------------------------------------------------------------

/**
 * Build the prompt (and the reference flag) for every Story-2 illustrated slot,
 * keyed by slot id. Pure. The cover portrait references the photo; the belief wash
 * does not. The pet description mirrors the Story-1 orchestrator
 * (`breedColor species`). Only the two Premium slots are produced
 * (`letter-cover`, `letter-page-5`) — the registry's `illustrationSlots` is the
 * authoritative list and the orchestrator iterates it, looking each id up here.
 */
export function buildStory2SlotPrompts(
  session: Story2Session,
): Partial<Record<Story2PageId, Story2SlotPrompt>> {
  const style = session.pet.illustrationStyle;
  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();
  return {
    "letter-cover": {
      prompt: buildCoverPortraitPrompt(petDescription, style),
      useReference: true,
    },
    "letter-page-5": {
      prompt: buildBeliefWashPrompt(session.toggles.beliefFrame, style),
      useReference: false,
    },
  };
}
