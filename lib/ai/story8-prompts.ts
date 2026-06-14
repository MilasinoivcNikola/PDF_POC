// Scene-prompt builder for Story 8's "The Amazing Adventures of [PET_NAME]"
// imagery (Craft Area 2, feature 30 — the PR-0 prototype gate). Story 8 is the
// catalog's first joyful kids' adventure book, and its entire moat is "this is
// YOUR actual pet, having an adventure" — which is exactly what the AI pipeline
// is worst at: holding a pet's real markings, ear shape, and eye color across
// running, leaping, sneaking, mid-rescue poses. So the central craft rule of this
// book is POSE DISCIPLINE, and it is baked into every prompt below.
//
// This module mirrors the SHAPE of lib/ai/story6-prompts.ts / story7-prompts.ts
// (a pure per-slot prompt builder returning `{ slot, prompt, useReference }`),
// but it is deliberately STANDALONE of any text engine: PR-0 has no resolved
// story to read `illustrationBrief`s from, so the 10 Backyard-Mystery beat briefs
// are inlined here as constants. PR-A (feature 31) will refactor these to read
// each page's resolved brief from `resolveStory8`, but the pose-discipline clause
// and the slot ids below carry forward VERBATIM — these slot ids are the exact
// literals PR-A registers as `ADVENTURE_SCENE_PAGE_IDS`.
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly without mocks — mirroring lib/ai/story6/7-prompts.ts.

import type { IllustrationStyle } from "@/lib/session/types";

/**
 * The 10 Backyard-Mystery illustration slots, in BOOK order (cover first …
 * celebration last). These ids are the exact literals PR-A will register as
 * `ADVENTURE_SCENE_PAGE_IDS`. The prototype script (feature 30) generates them in
 * a different RISK order, but the canonical book order lives here.
 */
export const ADVENTURE_PROTOTYPE_SLOT_IDS = [
  "adventure-cover",
  "adventure-ordinary",
  "adventure-special",
  "adventure-call",
  "adventure-clue",
  "adventure-deeper",
  "adventure-discovery",
  "adventure-wobble",
  "adventure-climax",
  "adventure-celebration",
] as const;

/** One of the 10 prototype slot ids. */
export type AdventurePrototypeSlot = (typeof ADVENTURE_PROTOTYPE_SLOT_IDS)[number];

/**
 * One Story-8 prototype image to generate: the slot id, the fully-built prompt,
 * and whether the references are passed (always true here — the pet is the hero
 * of every one of the 10 slots, there is no figure-free wash in this book). The
 * `useReference` field is kept (rather than assumed) to match the other products'
 * slot-prompt shape so the orchestrator's per-slot dispatch reads consistently.
 */
export interface Story8SlotPrompt {
  /** The slot id (= a future `ADVENTURE_SCENE_PAGE_IDS` literal). */
  slot: AdventurePrototypeSlot;
  /** The fully-built prompt (no `{placeholder}`/`[FIELD]` tokens — values merged in). */
  prompt: string;
  /** Whether to pass the reference set. Always true for Story 8 (pet is the hero everywhere). */
  useReference: true;
}

// ---------------------------------------------------------------------------
// Per-beat briefs (inlined constants — PR-A reads these from resolveStory8)
// ---------------------------------------------------------------------------
//
// One brief per slot, derived from the master template's per-page illustration
// briefs (the Backyard Mystery worked theme). `{pet}` is interpolated to the pet
// description so the prompt reads as this specific animal. Each brief carries its
// own pose register (calm / dynamic / leap) per the table in the spec.

const BEAT_BRIEFS: Record<AdventurePrototypeSlot, string> = {
  "adventure-cover":
    "HERO SHOT — the image that sells the book. {pet} front and center in a confident, heroic pose in a bright sunny backyard, the child grinning just behind the pet. A tiny adventurer's bandana is fine. This is the locked-likeness anchor for the whole book — the pet is calm and in clear 3/4 view with the face fully visible, so the customer instantly recognizes their pet.",
  "adventure-ordinary":
    "{pet} and the child together in the backyard on a normal sunny morning — relaxed, happy, establishing the bond. A calm 3/4 view of the pet (we nail likeness here before the action starts).",
  "adventure-special":
    "{pet} doing the thing that hints at a special talent — nose to the ground sniffing, ears up, intensely focused, comic and charming. Energetic but grounded, in a side or 3/4 view, full body, lots of energy through posture.",
  "adventure-call":
    "The moment the quest begins — the child looking puzzled at an empty spot, {pet} suddenly alert and snapping into detective mode. The pet is in a 3/4 view, ears and posture signaling 'on the case.'",
  "adventure-clue":
    "ACTION POSE — the first real test of likeness in motion. {pet} mid-investigation, nose down following a trail through the garden, body in a dynamic but grounded 3/4 stance, a tiny red thread visible.",
  "adventure-deeper":
    "A grand backyard expedition — {pet} leading the way through the 'epic' backyard, the child following. The pet is in a confident trotting 3/4 pose. Whimsical (the everyday backyard rendered as a grand landscape).",
  "adventure-discovery":
    "The 'aha!' reveal — {pet} looking up triumphantly at a nest high in an old oak tree, the child pointing in delight. The pet is in a heroic upward-gazing 3/4 pose (head up, chest out), in warm satisfying light.",
  "adventure-wobble":
    "The tension beat (gentle, never scary) — a tiny baby bird stuck on a low branch, the child reaching and failing, {pet} gathering courage. The pet is shown in a coiled, about-to-act 3/4 stance.",
  "adventure-climax":
    "THE money shot — the most dynamic image in the book. {pet} mid-heroic-leap, springing up to nudge the little bird back to safety. Motion lines, joyful energy — but the face and markings must stay perfectly on-model.",
  "adventure-celebration":
    "Joyful celebration — the child hugging {pet}, a little homemade 'hero' medal or flower crown, the rescued bird family watching happily. The pet is in a relaxed, beaming 3/4 view (back to a calm pose), in bright golden triumphant light.",
};

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
 * highest-drift-risk pose. It must be a 3/4 SIDE leap (full profile/silhouette
 * visible), never a foreshortened lunge toward the camera.
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
 * Build the prompt for one Story-8 prototype slot. Pure. Interpolates the pet
 * description into the inlined beat brief, frames "the same pet shown in the
 * reference images", and appends the style/consistency + pose-discipline clause.
 * The climax slot additionally gets the explicit 3/4-side-leap instruction. No
 * `{token}`/`[FIELD]` placeholder survives — `petDescription` and `style` are
 * woven in here.
 */
export function buildStory8PrototypePrompt(
  slot: AdventurePrototypeSlot,
  petDescription: string,
  style: IllustrationStyle,
): Story8SlotPrompt {
  const pet = petDescription.trim() || "the pet in the reference images";
  const brief = BEAT_BRIEFS[slot].replace(/\{pet\}/g, pet);
  const climaxClause = slot === "adventure-climax" ? ` ${CLIMAX_SIDE_LEAP}` : "";
  const prompt =
    `Children's-book adventure scene of the same pet shown in the reference images: ` +
    `${brief} ${styleAndConsistencyClause(style)}${climaxClause}`;
  return { slot, prompt, useReference: true };
}

/**
 * Build the ordered list of prompts for all 10 Backyard-Mystery prototype slots,
 * in BOOK order (cover first … celebration last). Pure. Every slot carries
 * `useReference: true` (the pet is the hero of every page). The prototype script
 * (feature 30) reorders these into a risk order at generation time; the order
 * here is the canonical book order PR-A inherits.
 */
export function buildStory8PrototypePrompts(
  petDescription: string,
  style: IllustrationStyle,
): Story8SlotPrompt[] {
  return ADVENTURE_PROTOTYPE_SLOT_IDS.map((slot) =>
    buildStory8PrototypePrompt(slot, petDescription, style),
  );
}
