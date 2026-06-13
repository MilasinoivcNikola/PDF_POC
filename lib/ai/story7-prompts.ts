// Per-scene prompt builders for Story 7's "Welcome Home" imagery (Craft Area 2,
// feature 28). Story 7 ("Welcome Home — [PET_NAME]'s Gotcha Day") is the catalog's
// first joyful, non-memorial book — a homecoming/origin story — and its imagery is a
// MIXED set, combining the two shapes the prior books used separately:
//   - SEVEN reference-anchored scenes (the cover + pages 3-8) show the actual
//     uploaded pet via `images.edit` (Approach A), exactly like Story 1/6.
//   - ONE figure-free wash, `welcome-before` (the "before you came" empty-house
//     page), where the pet is DELIBERATELY ABSENT — generated prompt-only via
//     `images.generate` (the Story-2 belief-wash path), so it carries
//     `useReference: false`.
// The dedication portrait is NOT a slot here — it reuses the locked reference image
// (no separate generation), and the closing/back-cover get decorative/reused
// treatments — so this module builds exactly the 8 `WELCOME_SCENE_PAGE_IDS` slots.
//
// Like Story 6's builder, this MIRRORS lib/ai/prompts.ts (brief-driven per-scene
// prompts), NOT the 2-slot letter builders: each slot prompt derives from the
// resolved page's `illustrationBrief` (single-sourced from `resolveStory7`, so the
// art and the story text can never drift), wrapped in the shared style/consistency
// clause. Two Story-7-specific notes are folded into that clause: the BRIGHTER
// gotcha-day palette ("a beginning not a sunset") and the emotional-progression
// guide (curious/unsure early, fully joyful by the belonging pages), per the
// template's style guide.
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session without mocks — mirroring lib/ai/prompts.ts.
//
// Import direction is one-way: the slot/page types come FROM master-text.ts /
// story-7.ts, never the reverse — so the registry/catalog public graph stays
// engine-free (the boundary guard bans lib/ai/* from the public closure).

import type { IllustrationStyle, Story7Session } from "@/lib/session/types";
import type { Story7PageId } from "@/lib/story/master-text";
import { resolveStory7 } from "@/lib/story/story7/variants";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { WELCOME_SCENE_PAGE_IDS } from "@/lib/story/story-7";

// ---------------------------------------------------------------------------
// Scene identity (re-export for back-compat)
// ---------------------------------------------------------------------------
//
// `WELCOME_SCENE_PAGE_IDS` is PURE data shared with the client-safe catalog/registry
// chain, so its source of truth lives in lib/story/story-7.ts (a product module the
// public storefront can reach without pulling in a `lib/ai/*` engine module). It is
// only RE-EXPORTED here for back-compat, matching the pattern lib/ai/prompts.ts uses
// for `SCENE_PAGE_IDS` — never redefined in lib/ai/*.
export { WELCOME_SCENE_PAGE_IDS } from "@/lib/story/story-7";

/**
 * One Story-7 image to generate: the prompt string plus whether the uploaded pet
 * photo is passed as a reference. Most Story-7 slots reference the photo (the pet is
 * the hero of every page), but `welcome-before` is figure-free (the pet is absent by
 * design), so this flag is a REAL per-slot choice here — unlike Story 6 where every
 * slot was `true`. The orchestrator reads it to route the slot through
 * `generateSceneIllustration` (`images.edit`) vs `generateImageFromPrompt`
 * (`images.generate`).
 */
export interface Story7SlotPrompt {
  /** The fully-built prompt (no `{placeholder}` tokens — values are merged in). */
  prompt: string;
  /** Whether to pass the uploaded pet photo as a reference image. False only for `welcome-before`. */
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
 * The Story-7 palette modifier — the headline tonal divergence from every sibling
 * title. This is a HAPPY book, so the light is golden MORNING (a beginning), not the
 * golden-hour dusk of the memorial books. Appended to every Story-7 prompt (both the
 * reference-anchored scenes and the figure-free wash).
 */
const STORY7_PALETTE =
  "Bright golden-morning light, upbeat and saturated-but-soft, a beginning not a" +
  " sunset. Still no harsh contrasts and no pure black.";

/**
 * The shared style + consistency clause appended to every reference-anchored Story-7
 * scene prompt. Encodes the style guide and — critically — that the locked reference
 * defines the pet (the #1 quality issue and the entire value prop for an origin-story
 * book). Mirrors the Story-1/6 scene clause + `buildReferencePrompt`'s "maintain the
 * pet's exact appearance", with the Story-7 palette folded in.
 */
function styleAndConsistencyClause(style: IllustrationStyle): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `In the ${stylePhrase} children's-book style of the reference illustration.` +
    " The pet must be the same animal as in the reference images — identical" +
    " breed markings, coat color, eye color, and body posture. Maintain the pet's" +
    " exact appearance — color, markings, and breed characteristics. " +
    STORY7_PALETTE +
    " Any person is drawn slightly stylized, in a 3/4 view or seen from behind."
  );
}

/**
 * The style clause for the figure-free `welcome-before` wash. No pet, so there is no
 * consistency instruction (nothing to anchor) — just the style + the Story-7 palette,
 * matching how Story 2's belief wash drops the same-animal clause. Kept hopeful, not
 * melancholy (the empty house is anticipation, never loss).
 */
function washStyleClause(style: IllustrationStyle): string {
  const stylePhrase = STYLE_PHRASE[style];
  return (
    `In a ${stylePhrase} children's-book style. No animal and no people in the` +
    ` frame. ${STORY7_PALETTE} Warm and inviting, hopeful anticipation — a home` +
    " ready to be filled, never sad."
  );
}

/**
 * The emotional-progression note from the template's style guide: the pet's
 * expression should BUILD across the book — curious/unsure on the first-hello page
 * (`welcome-choosing`), settling in the middle, fully joyful and belonging by
 * `welcome-now-ours`/`welcome-belong`. Returned per slot so the prompt can carry the
 * right beat (empty for the slots the guide doesn't pin). Pure lookup.
 */
function emotionalProgressionNote(slot: Story7PageId): string {
  switch (slot) {
    case "welcome-choosing":
      return " The pet's expression is curious or a little unsure — the first-hello look, not full joy yet (joy builds across the book).";
    case "welcome-now-ours":
    case "welcome-belong":
      return " The pet is fully joyful and at home — the peak of the book's emotional build, glowing with belonging.";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Per-scene prompt
// ---------------------------------------------------------------------------

/**
 * Build the prompt for one resolved Story-7 page. Pure. The `welcome-before` page is
 * figure-free (the pet is absent by design) — its prompt wraps the resolved brief in
 * the wash style clause and asks for NO animal. Every other slot is reference-anchored
 * — its prompt frames "the same pet shown in the reference images", appends the
 * style/consistency clause, and folds in the slot's emotional-progression beat. The
 * brief carries no `{placeholder}` tokens — `resolveStory7` substituted them.
 */
export function buildScenePromptFromPage(
  page: ResolvedPage,
  style: IllustrationStyle,
): Story7SlotPrompt {
  const brief = page.illustrationBrief.trim();
  if (page.id === "welcome-before") {
    return {
      prompt: `Children's-book scene of an empty, waiting home: ${brief} ${washStyleClause(style)}`,
      useReference: false,
    };
  }
  const progression = emotionalProgressionNote(page.id as Story7PageId);
  return {
    prompt: `Children's-book scene of the same pet shown in the reference images: ${brief} ${styleAndConsistencyClause(style)}${progression}`,
    useReference: true,
  };
}

/**
 * Build the prompt (and the reference flag) for every Story-7 illustrated slot, keyed
 * by slot id. Pure. Resolves the story once (so variants/merge are applied), then maps
 * each of the 8 illustrated pages (`WELCOME_SCENE_PAGE_IDS`) to its brief-driven
 * prompt. `welcome-before` carries `useReference: false` (the figure-free empty-house
 * wash); the other seven carry `useReference: true`. The orchestrator iterates the
 * registry's `illustrationSlots` and looks each id up here. Throws `MergeError` (from
 * merge.ts) if a required field is missing, exactly as the text pipeline does.
 */
export function buildStory7SlotPrompts(
  session: Story7Session,
): Partial<Record<Story7PageId, Story7SlotPrompt>> {
  const story: ResolvedStory = resolveStory7(session);
  const style = session.pet.illustrationStyle;
  const scenePages = new Set<string>(WELCOME_SCENE_PAGE_IDS);

  const prompts: Partial<Record<Story7PageId, Story7SlotPrompt>> = {};
  for (const page of story) {
    if (scenePages.has(page.id)) {
      prompts[page.id as Story7PageId] = buildScenePromptFromPage(page, style);
    }
  }
  return prompts;
}
