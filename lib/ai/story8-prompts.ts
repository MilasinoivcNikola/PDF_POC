// Per-scene prompt builders for Story 8's "The Amazing Adventures of [PET_NAME]"
// imagery (Craft Area 2). Story 8 is the catalog's first joyful kids' adventure
// book, and its entire moat is "this is YOUR actual pet, having an adventure" —
// which is exactly what the AI pipeline is worst at: holding a pet's real
// markings, ear shape, and eye color across running, leaping, sneaking, mid-rescue
// poses. So the central craft rule of this book is POSE DISCIPLINE, and it is
// baked into every prompt below.
//
// PR-0 (feature 30) proved this set holds under Approach B with the beat briefs
// INLINED as constants (no text engine existed yet). PR-A (feature 31) refactors
// the builder to read each scene page's resolved `illustrationBrief` from
// `resolveStory8` — the single source, so the art and the story text can never
// drift (the Story-6/7 shape). The pose-discipline / dynamic-watercolor clause and
// the climax side-leap rule stay HERE in the builder (deliberately kept out of the
// briefs); only the per-beat content moved into the master text.
//
// This module mirrors the SHAPE of lib/ai/story7-prompts.ts (a per-slot prompt
// builder driven by the resolved page's brief), but EVERY Story-8 slot is
// reference-anchored (`useReference: true`) — the pet is the hero of all 10 pages,
// there is no figure-free wash in this book (unlike Story 7's `welcome-before`).
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session without mocks — mirroring lib/ai/prompts.ts.
//
// Import direction is one-way: the slot/page types come FROM master-text.ts /
// story-8.ts, never the reverse — so the registry/catalog public graph stays
// engine-free (the boundary guard bans lib/ai/* from the public closure).

import type { IllustrationStyle, Story8Session } from "@/lib/session/types";
import type { Story8PageId } from "@/lib/story/master-text";
import { resolveStory8 } from "@/lib/story/story8/variants";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { ADVENTURE_SCENE_PAGE_IDS } from "@/lib/story/story-8";

// ---------------------------------------------------------------------------
// Scene identity (re-export for back-compat)
// ---------------------------------------------------------------------------
//
// `ADVENTURE_SCENE_PAGE_IDS` is PURE data shared with the client-safe catalog/
// registry chain, so its source of truth lives in lib/story/story-8.ts (a product
// module the public storefront can reach without pulling in a `lib/ai/*` engine
// module). It is only RE-EXPORTED here for back-compat, matching the pattern
// lib/ai/prompts.ts uses for `SCENE_PAGE_IDS` — never redefined in lib/ai/*.
export { ADVENTURE_SCENE_PAGE_IDS } from "@/lib/story/story-8";

/**
 * One Story-8 image to generate: the fully-built prompt and whether the references
 * are passed. ALWAYS `true` for Story 8 — the pet is the hero of every one of the
 * 10 slots, there is no figure-free wash (unlike Story 7's `welcome-before`). The
 * `useReference` field is kept (rather than assumed) to match the other products'
 * slot-prompt shape so the orchestrator's per-slot dispatch reads consistently.
 */
export interface Story8SlotPrompt {
  /** The fully-built prompt (no `{placeholder}`/`[FIELD]` tokens — values merged in). */
  prompt: string;
  /** Whether to pass the reference set. Always true for Story 8 (pet is the hero everywhere). */
  useReference: true;
}

// ---------------------------------------------------------------------------
// Style + pose-discipline clauses (the central craft rule of this book)
// ---------------------------------------------------------------------------

/** Human-readable phrasing for each illustration style, used in scene prompts. */
const STYLE_PHRASE: Record<IllustrationStyle, string> = {
  watercolor: "soft watercolor",
  storybook: "gentle storybook",
  pencil: "soft pencil-sketch",
};

/**
 * The Story-8 palette modifier — the tonal divergence from Story 1's gentle grief
 * wash. Adventure books are DYNAMIC: looser, more energetic brushwork, golden
 * sunny light, bright but never garish-primary, never flat-cartoon or clipart.
 * Appended to every prompt.
 */
const STORY8_PALETTE =
  "Soft warm watercolor but dynamic — looser, more energetic brushwork than a" +
  " gentle grief palette, golden sunny light, bright but not garish-primary," +
  " never flat-cartoon or clipart. No harsh contrasts and no pure black.";

/**
 * The same-animal / markings anchor — the #1 thing that drifts across action
 * poses and the #1 thing the customer checks against their real pet. The single
 * place the pet-consistency instruction lives for Story-8 scenes.
 */
const MARKINGS_ANCHOR =
  "The pet must be the same animal as in the reference images — identical breed" +
  " markings, coat color, eye color, ear shape, and body proportions.";

/**
 * The pose-discipline rule, on EVERY prompt: 3/4 or side dynamic poses, motion
 * shown through stride / ears / tail / environment (NOT by aiming the pet at the
 * camera), and no extreme foreshortening (where the face distorts and likeness
 * collapses). Plus the costume rule (a prop must never obscure the face).
 */
const POSE_DISCIPLINE =
  "Use a 3/4 or side dynamic pose; show motion through stride, ears, tail, and" +
  " the environment — not by aiming the pet at the camera. No extreme" +
  " foreshortening. Any costume or prop (bandana, magnifying glass) must not" +
  " obscure the face, eyes, ears, or markings. Keep any child or person slightly" +
  " stylized, in a 3/4 view or seen from behind.";

/**
 * The extra, explicit instruction folded ONLY into the climax leap — the single
 * highest-drift-risk pose (PR-0 confirmed it as the cost floor at Medium). It must
 * be a 3/4 SIDE leap (full profile/silhouette visible), never a foreshortened
 * lunge toward the camera.
 */
const CLIMAX_SIDE_LEAP =
  "Render this as a 3/4 side leap — the full profile/silhouette of the pet is" +
  " visible, never a foreshortened lunge toward the camera.";

/**
 * The shared style + consistency clause appended to every Story-8 prompt. Encodes
 * the style guide and — critically — that the locked reference defines the pet.
 */
function styleAndConsistencyClause(style: IllustrationStyle): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `In the ${stylePhrase} children's-book style of the reference illustration. ` +
    MARKINGS_ANCHOR +
    " " +
    POSE_DISCIPLINE +
    " " +
    STORY8_PALETTE
  );
}

// ---------------------------------------------------------------------------
// Per-scene prompt
// ---------------------------------------------------------------------------

/**
 * Build the prompt for one resolved Story-8 scene page. Pure. Frames "the same pet
 * shown in the reference images", appends the style/consistency + pose-discipline
 * clause, and — for `adventure-climax` only — folds in the explicit 3/4-side-leap
 * instruction (the single highest-drift pose). The brief carries no `{placeholder}`
 * tokens — `resolveStory8` substituted them. Every Story-8 slot is reference-
 * anchored (the pet is the hero of every page), so `useReference` is always true.
 */
export function buildScenePromptFromPage(
  page: ResolvedPage,
  style: IllustrationStyle,
): Story8SlotPrompt {
  const brief = page.illustrationBrief.trim();
  const climaxClause =
    page.id === "adventure-climax" ? ` ${CLIMAX_SIDE_LEAP}` : "";
  const prompt =
    `Children's-book adventure scene of the same pet shown in the reference images: ` +
    `${brief} ${styleAndConsistencyClause(style)}${climaxClause}`;
  return { prompt, useReference: true };
}

/**
 * Build the prompt (and the reference flag) for every Story-8 illustrated slot,
 * keyed by slot id. Pure. Resolves the story once (so variants/merge are applied),
 * then maps each of the 10 illustrated pages (`ADVENTURE_SCENE_PAGE_IDS`) to its
 * brief-driven prompt. All 10 carry `useReference: true`. The orchestrator iterates
 * the registry's `illustrationSlots` and looks each id up here. Throws `MergeError`
 * (from merge.ts) if a required field is missing, exactly as the text pipeline does.
 */
export function buildStory8SlotPrompts(
  session: Story8Session,
): Partial<Record<Story8PageId, Story8SlotPrompt>> {
  const story: ResolvedStory = resolveStory8(session);
  const style = session.pet.illustrationStyle;
  const scenePages = new Set<string>(ADVENTURE_SCENE_PAGE_IDS);

  const prompts: Partial<Record<Story8PageId, Story8SlotPrompt>> = {};
  for (const page of story) {
    if (scenePages.has(page.id)) {
      prompts[page.id as Story8PageId] = buildScenePromptFromPage(page, style);
    }
  }
  return prompts;
}
