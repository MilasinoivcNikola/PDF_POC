// Per-scene prompt builders for Story 6's living-tribute imagery (Craft Area 2,
// feature 25). Story 6 ("While You're Still Here, [PET_NAME]") is the present-tense
// living tribute of a pet who is STILL ALIVE — and its imagery is STORY 1'S SHAPE,
// not the letters' two-image shape: a locked reference illustration + SEVEN
// reference-anchored, brief-driven scene illustrations (cover, the page-1 dedication
// portrait, and pages 2-6). ALL seven slots show the actual uploaded pet via
// `images.edit` (Approach A). There is deliberately NO figure-free wash — unlike
// Story 2/5's belief wash via `images.generate`.
//
// So this module MIRRORS lib/ai/prompts.ts (Story 1's brief-driven per-scene
// builders), NOT the 2-slot letter builders (story2/story4/story5-prompts.ts):
// each of the 7 slot prompts derives from the resolved page's `illustrationBrief`
// (single-sourced from `resolveStory6`, so the art and the story text can never
// drift), wrapped in the shared "same animal as the reference" consistency/style
// clause. The Story-6 briefs are already age-aware — they ask for the grey muzzle
// / senior signs to be HONORED and HONEST (never elegiac, never clinical — the pet
// is alive and well-loved), so no extra age handling is needed here.
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session without mocks — mirroring lib/ai/prompts.ts.
//
// Import direction is one-way: the slot/page types come FROM master-text.ts /
// story-6.ts, never the reverse — so the registry/catalog public graph stays
// engine-free (the boundary guard bans lib/ai/* from the public closure).

import type { IllustrationStyle, Story6Session } from "@/lib/session/types";
import type { Story6PageId } from "@/lib/story/master-text";
import { resolveStory6 } from "@/lib/story/story6/variants";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { TRIBUTE_SCENE_PAGE_IDS } from "@/lib/story/story-6";

/**
 * One Story-6 image to generate: the prompt string plus whether the uploaded pet
 * photo is passed as a reference. ALL Story-6 slots reference the photo (every page
 * shows the actual pet — it's Story 1's reference-anchored shape, not a letter's
 * figure-free wash), so every slot carries `useReference: true`. The field is kept
 * (rather than assumed) to match the other products' slot-prompt shape so the
 * orchestrator's per-slot dispatch reads consistently.
 */
export interface Story6SlotPrompt {
  /** The fully-built prompt (no `{placeholder}` tokens — values are merged in). */
  prompt: string;
  /** Whether to pass the uploaded pet photo as a reference image. Always true for Story 6. */
  useReference: boolean;
}

// ---------------------------------------------------------------------------
// Style phrasing (kept in step with buildReferencePrompt's STYLE_PHRASE)
// ---------------------------------------------------------------------------

/** Human-readable phrasing for each illustration style, used in scene prompts. */
const STYLE_PHRASE: Record<IllustrationStyle, string> = {
  watercolor: "soft watercolor",
  storybook: "gentle storybook",
  pencil: "soft pencil-sketch",
};

/**
 * The shared style + consistency clause appended to every Story-6 scene prompt.
 * Encodes the style guide and — critically — that the locked reference defines the
 * pet, mirroring the Story-1 scene clause and `buildReferencePrompt`'s "maintain
 * the pet's exact appearance". The "same animal as in the reference images"
 * wording is the single place the pet-consistency instruction lives for Story-6
 * scenes (the #1 QA risk across 7 pages). Living-tribute register is carried by the
 * resolved brief itself (grey allowed, never elegiac), so it is not repeated here.
 */
function styleAndConsistencyClause(style: IllustrationStyle): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `In the ${stylePhrase} children's-book style of the reference illustration.` +
    " The pet must be the same animal as in the reference images — identical" +
    " breed markings, coat color, eye color, and body posture. Maintain the pet's" +
    " exact appearance — color, markings, and breed characteristics. Warm pastel" +
    " palette, soft golden-hour light, no harsh contrasts, no pure black. Any" +
    " person is drawn slightly stylized, in a 3/4 view or seen from behind."
  );
}

// ---------------------------------------------------------------------------
// Per-scene prompt
// ---------------------------------------------------------------------------

/**
 * Build the scene prompt for one resolved Story-6 page. Pure. Wraps the page's
 * resolved illustration brief (already merged with the pet/owner/memory fields) in
 * the "same pet as the references" framing + the shared style/consistency clause.
 * The brief carries no `{placeholder}` tokens — `resolveStory6` substituted them.
 */
export function buildScenePromptFromPage(
  page: ResolvedPage,
  style: IllustrationStyle,
): string {
  const brief = page.illustrationBrief.trim();
  return `Children's-book scene of the same pet shown in the reference images: ${brief} ${styleAndConsistencyClause(style)}`;
}

/**
 * Build the prompt (and the reference flag) for every Story-6 illustrated slot,
 * keyed by slot id. Pure. Resolves the story once (so variants/merge are applied),
 * then maps each of the 7 illustrated pages (`TRIBUTE_SCENE_PAGE_IDS`) to its
 * brief-driven prompt. ALL seven carry `useReference: true` — every page shows the
 * actual pet (no figure-free wash). The orchestrator iterates the registry's
 * `illustrationSlots` and looks each id up here. Throws `MergeError` (from merge.ts)
 * if a required field is missing, exactly as the text pipeline does.
 */
export function buildStory6SlotPrompts(
  session: Story6Session,
): Partial<Record<Story6PageId, Story6SlotPrompt>> {
  const story: ResolvedStory = resolveStory6(session);
  const style = session.pet.illustrationStyle;
  const scenePages = new Set<string>(TRIBUTE_SCENE_PAGE_IDS);

  const prompts: Partial<Record<Story6PageId, Story6SlotPrompt>> = {};
  for (const page of story) {
    if (scenePages.has(page.id)) {
      prompts[page.id as Story6PageId] = {
        prompt: buildScenePromptFromPage(page, style),
        useReference: true,
      };
    }
  }
  return prompts;
}
