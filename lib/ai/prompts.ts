// Per-scene prompt builders for the full Story-1 illustration set (Craft Area 2,
// Milestone 3). One prompt per illustration the book needs, derived from each
// page's *resolved* illustration brief (lib/story/merge.ts → ResolvedStory) plus
// the chosen style. Driving prompts from the resolved briefs keeps the art and
// the story text in sync — the scene descriptions live in exactly one place
// (lib/story/master-text.ts), never duplicated here.
//
// Everything in this module is PURE (no IO, no network, no SDK) so the prompt
// strings can be unit-tested directly from a session without mocks.
//
// Style-guide requirements baked into every scene prompt (from the masterstory
// illustration style guide): warm pastels, golden-hour light, no harsh black,
// the child rendered slightly stylized (3/4 view or from behind) to dodge the
// uncanny valley, and — the central consistency requirement — the same breed
// markings, eye color, and body posture as the locked reference on every page.

import type { IllustrationStyle, StorySession } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import { resolveStory } from "@/lib/story/variants";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { SCENE_PAGE_IDS } from "@/lib/story/scenes";

// ---------------------------------------------------------------------------
// Scene identity
// ---------------------------------------------------------------------------
//
// `SceneId` + `SCENE_PAGE_IDS` are PURE data shared with the client-safe
// catalog/registry chain, so they live in lib/story/scenes.ts (a neutral module
// the public storefront can reach without pulling in a `lib/ai/*` engine module).
// Re-exported here so every existing `@/lib/ai/prompts` consumer is unchanged.
export type { SceneId } from "@/lib/story/scenes";
export { SCENE_PAGE_IDS } from "@/lib/story/scenes";

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
 * The shared style + consistency clause appended to every scene prompt. Encodes
 * the masterstory style guide: the locked reference defines the pet, warm
 * pastels / golden-hour light, no harsh black, child kept stylized (3/4 or from
 * behind). This is the single place the pet-consistency instruction lives for
 * scenes, mirroring the reference prompt's "maintain the pet's exact appearance".
 */
function styleAndConsistencyClause(style: IllustrationStyle): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `In the ${stylePhrase} children's-book style of the reference illustration.` +
    " The pet must be the same animal as in the reference images — identical" +
    " breed markings, coat color, eye color, and body posture. Warm pastel" +
    " palette, soft golden-hour light, no harsh contrasts, no pure black. Any" +
    " child is drawn slightly stylized, in a 3/4 view or seen from behind."
  );
}

// ---------------------------------------------------------------------------
// Per-scene prompt
// ---------------------------------------------------------------------------

/**
 * Build the scene prompt for one resolved page. Pure. Wraps the page's resolved
 * illustration brief (already merged with the pet/child/memory fields) in the
 * "same pet as the references" framing + the shared style/consistency clause.
 * The brief carries no `{placeholder}` tokens — `resolveStory` substituted them.
 */
export function buildScenePromptFromPage(
  page: ResolvedPage,
  style: IllustrationStyle,
): string {
  const brief = page.illustrationBrief.trim();
  return `Children's-book scene of the same pet shown in the reference images: ${brief} ${styleAndConsistencyClause(style)}`;
}

/**
 * Build every scene prompt for a session, keyed by page id (cover + pages 1–12).
 * Resolves the story once (so variants/merge are applied) and maps each
 * illustrated page to its prompt. Pure — `resolveStory` is itself pure. Throws
 * `MergeError` (from merge.ts) if a required field is missing, exactly as the
 * text pipeline does, so a half-filled session fails loudly here too.
 */
export function buildScenePrompts(
  session: StorySession,
): Record<PageId, string> {
  const story: ResolvedStory = resolveStory(session);
  const style = session.pet.illustrationStyle;
  const scenePages = new Set<PageId>(SCENE_PAGE_IDS);

  const prompts = {} as Record<PageId, string>;
  for (const page of story) {
    if (scenePages.has(page.id)) {
      prompts[page.id] = buildScenePromptFromPage(page, style);
    }
  }
  return prompts;
}
