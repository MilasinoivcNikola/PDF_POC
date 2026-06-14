// Per-scene prompt builders for Story 9's family-transition imagery (Craft Area 2,
// feature 33). Story 9 ("[PET_NAME] and the New Baby") is the JOYFUL, non-memorial
// keepsake celebrating the family pet as the original first family member and the
// new baby's big sibling — and its imagery is STORY 1'S SHAPE, not the letters'
// two-image shape: a locked reference illustration + SEVEN reference-anchored,
// brief-driven scene illustrations (cover + pages 2-7). ALL seven slots show the
// actual uploaded pet via `images.edit` (Approach A). There is deliberately NO
// figure-free wash — unlike Story 2/5's belief wash via `images.generate`.
//
// So this module MIRRORS lib/ai/prompts.ts (Story 1's brief-driven per-scene
// builders) and its sibling lib/ai/story6-prompts.ts, NOT the 2-slot letter builders
// (story2/story4/story5-prompts.ts): each of the 7 slot prompts derives from the
// resolved page's `illustrationBrief` (single-sourced from `resolveStory9`, so the
// art and the story text can never drift), wrapped in the shared "same animal as the
// reference" consistency/style clause.
//
// THE ONE IMAGERY RULE (from the master template's style guide, non-negotiable):
// ONLY THE PET IS PHOTO-ANCHORED. The baby and ALL adult/family figures are
// ABSTRACT — a swaddled bundle, a tiny reaching hand, a soft silhouette, seen 3/4 or
// from behind, NEVER a specific or recognizable face. This (a) keeps the pet the
// hero where our differentiator is, (b) dodges uncanny-valley problems, (c) lets any
// family see themselves, and (d) makes an un-born baby renderable. The per-page
// briefs already encode this (generic/abstract figures, "no specific baby face"); the
// shared clause below RE-STATES it globally so every human-bearing scene carries the
// constraint regardless of how a brief is worded.
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session without mocks — mirroring lib/ai/prompts.ts.
//
// Import direction is one-way: the slot/page types come FROM master-text.ts /
// story-9.ts, never the reverse — so the registry/catalog public graph stays
// engine-free (the boundary guard bans lib/ai/* from the public closure).

import type { IllustrationStyle, Story9Session } from "@/lib/session/types";
import type { Story9PageId } from "@/lib/story/master-text";
import { resolveStory9 } from "@/lib/story/story9/variants";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { STORY_9_SCENE_PAGE_IDS } from "@/lib/story/story-9";

/**
 * One Story-9 image to generate: the prompt string plus whether the uploaded pet
 * photo is passed as a reference. ALL Story-9 slots reference the photo (every page
 * shows the actual pet — it's Story 1's reference-anchored shape, not a letter's
 * figure-free wash), so every slot carries `useReference: true`. The field is kept
 * (rather than assumed) to match the other products' slot-prompt shape so the
 * orchestrator's per-slot dispatch reads consistently.
 */
export interface Story9SlotPrompt {
  /** The fully-built prompt (no `{placeholder}` tokens — values are merged in). */
  prompt: string;
  /** Whether to pass the uploaded pet photo as a reference image. Always true for Story 9. */
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
 * The shared style + consistency clause appended to every Story-9 scene prompt.
 * Encodes the style guide and — critically — that the locked reference defines the
 * pet, mirroring the Story-1/Story-6 scene clause and `buildReferencePrompt`'s
 * "maintain the pet's exact appearance". The "same animal as in the reference
 * images" wording is the single place the pet-consistency instruction lives for
 * Story-9 scenes (the #1 QA risk across 7 pages).
 *
 * It ALSO carries Story 9's defining imagery rule — the abstract-human constraint:
 * the baby and every adult/family figure must stay abstract (a bundle, a small hand,
 * a silhouette, 3/4 or from behind) with NO identifiable human face. This is a hard
 * product requirement from the master template's style guide, restated here so it
 * holds on every human-bearing scene independent of the per-page brief wording. The
 * palette leans nursery-adjacent (creams, dusty rose, sage, gentle gold, soft powder
 * blue/buttercup accents) per the same guide.
 */
function styleAndConsistencyClause(style: IllustrationStyle): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `In the ${stylePhrase} children's-book style of the reference illustration.` +
    " The pet must be the same animal as in the reference images — identical" +
    " breed markings, coat color, eye color, and body posture. Maintain the pet's" +
    " exact appearance — color, markings, and breed characteristics. The pet is the" +
    " only photo-anchored subject and the hero of every frame. The baby is a warm," +
    " abstract presence only — a swaddled bundle, a tiny reaching hand, or a soft" +
    " silhouette in a bassinet — never a specific, detailed, or recognizable baby" +
    " face. Any adult or family figure is likewise stylized, shown in a 3/4 view or" +
    " from behind, with no identifiable human face. Warm nursery-adjacent pastel" +
    " palette — soft creams, dusty rose, sage, gentle gold — soft golden-hour light," +
    " no harsh contrasts, no pure black. Calm, settled, content mood; the pet never" +
    " looks worried, left out, or peripheral."
  );
}

// ---------------------------------------------------------------------------
// Per-scene prompt
// ---------------------------------------------------------------------------

/**
 * Build the scene prompt for one resolved Story-9 page. Pure. Wraps the page's
 * resolved illustration brief (already merged with the pet/owner/baby fields, and
 * already babyStatus-aware — the expecting briefs keep the baby un-present/abstract,
 * the arrived briefs let the bundle appear) in the "same pet as the references"
 * framing + the shared style/consistency clause. The brief carries no `{placeholder}`
 * tokens — `resolveStory9` substituted them.
 */
export function buildScenePromptFromPage(
  page: ResolvedPage,
  style: IllustrationStyle,
): string {
  const brief = page.illustrationBrief.trim();
  return `Children's-book scene of the same pet shown in the reference images: ${brief} ${styleAndConsistencyClause(style)}`;
}

/**
 * Build the prompt (and the reference flag) for every Story-9 illustrated slot,
 * keyed by slot id. Pure. Resolves the story once (so variants/merge are applied —
 * including the babyStatus expecting/arrived rewrites on Pages 4/6), then maps each
 * of the 7 illustrated pages (`STORY_9_SCENE_PAGE_IDS`) to its brief-driven prompt.
 * ALL seven carry `useReference: true` — every page shows the actual pet (no
 * figure-free wash). The orchestrator iterates the registry's `illustrationSlots` and
 * looks each id up here. Throws `MergeError` (from merge.ts) if a required field is
 * missing, exactly as the text pipeline does.
 */
export function buildStory9SlotPrompts(
  session: Story9Session,
): Partial<Record<Story9PageId, Story9SlotPrompt>> {
  const story: ResolvedStory = resolveStory9(session);
  const style = session.pet.illustrationStyle;
  const scenePages = new Set<string>(STORY_9_SCENE_PAGE_IDS);

  const prompts: Partial<Record<Story9PageId, Story9SlotPrompt>> = {};
  for (const page of story) {
    if (scenePages.has(page.id)) {
      prompts[page.id as Story9PageId] = {
        prompt: buildScenePromptFromPage(page, style),
        useReference: true,
      };
    }
  }
  return prompts;
}
