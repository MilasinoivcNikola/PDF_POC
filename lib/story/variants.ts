// Variant composition for Story-1, and the single public entry point
// `resolveStory()`. Per the master template's own guidance, variants are
// composed onto the master text BEFORE merge: we first swap/adjust the right
// page bodies based on the session's toggles + age bracket, then substitute the
// merge fields. Everything here is pure and deterministic — no IO.
//
// Four variant dimensions (context/masterstories/story-1-master-template.md):
//   - Age bracket  → Pages 7 / 8 / 11 (and an extra Page 9 line at 9-12)
//   - Death type   → Page 7 body
//   - Belief frame → Page 9 body
//   - Other pets   → Page 11 (append one line when "yes")
//
// The wording below is the product requirement, copied from the template. The
// default master body already covers: age 6-8, deathType "natural",
// beliefFrame "rainbow-bridge", otherPetsInHome "no" — so those need no swap.

import type {
  AgeBracket,
  BeliefFrame,
  DeathType,
  StorySession,
} from "@/lib/session/types";
import {
  type MasterStory,
  masterStory,
  type PageId,
} from "@/lib/story/master-text";
import { mergeStory, type ResolvedStory } from "@/lib/story/merge";

// ---------------------------------------------------------------------------
// Page-7 death-type bodies (unresolved, still carrying {placeholders})
// ---------------------------------------------------------------------------

/** Page-7 body for each death type. "natural" reuses the master body (null). */
const PAGE_7_BY_DEATH_TYPE: Record<DeathType, string[] | null> = {
  // Default master body — no swap.
  natural: null,
  // Closest template-faithful phrasing: a long, gentle decline. Mirrors the
  // master arc ("body got tired") while naming the long illness gently, and
  // keeps the required word "died".
  illness: [
    "But every living thing has a beginning, a middle, and an end. Even the ones we love most.",
    "{petName}'s body had been sick for a long time, and slowly it got too tired to keep going.",
    'And then, very gently, {pronounPossessive} body stopped working. That is what "died" means.',
  ],
  // Verbatim template variant for sudden death.
  sudden: [
    "But every living thing has a beginning, a middle, and an end. Even the ones we love most.",
    "Sometimes, {petName}'s body got tired all at once, without warning. We didn't get to say goodbye the way we wanted to. That is one of the hardest parts. It is not anyone's fault.",
    'And then {pronounPossessive} body stopped working. That is what "died" means.',
  ],
  // Verbatim template variant for euthanasia.
  euthanasia: [
    "But every living thing has a beginning, a middle, and an end. Even the ones we love most.",
    "When a pet's body is too tired or hurting, sometimes a doctor helps them stop hurting. That is the kindest thing we can do for someone we love. {petName}'s body stopped working, very gently, with people who loved {pronounObject} right there.",
    'That is what "died" means.',
  ],
};

// ---------------------------------------------------------------------------
// Page-9 belief-frame bodies (unresolved)
// ---------------------------------------------------------------------------

/** Page-9 body for each belief frame. "rainbow-bridge" reuses the master body (null). */
const PAGE_9_BY_BELIEF_FRAME: Record<BeliefFrame, string[] | null> = {
  // Default master body — no swap.
  "rainbow-bridge": null,
  // Verbatim template variant for heaven.
  heaven: [
    "Many families believe that pets who die go to a peaceful place — a sunny meadow, or heaven, or somewhere their bodies are not tired anymore.",
    "Wherever {petName} is now, {pronounSubject} is at peace.",
  ],
  // Verbatim template variant for secular.
  secular: [
    "{petName}'s body is not here anymore.",
    "But the {petName} that {childName} loved — {pronounPossessive} silly bark, {pronounPossessive} soft fur, {pronounPossessive} favorite spot {sleepingSpot} — all of that stays in our hearts. That is where {petName} lives now.",
  ],
  // "none" shares the secular framing (no afterlife claim).
  none: [
    "{petName}'s body is not here anymore.",
    "But the {petName} that {childName} loved — {pronounPossessive} silly bark, {pronounPossessive} soft fur, {pronounPossessive} favorite spot {sleepingSpot} — all of that stays in our hearts. That is where {petName} lives now.",
  ],
};

// ---------------------------------------------------------------------------
// Age-bracket adjustments
// ---------------------------------------------------------------------------
//
// 6-8 is the default master text (no change). 3-5 simplifies Pages 7/8/11.
// 9-12 adds extra sentences on Pages 7/8/9/11.

/** Verbatim template Page-7 simplification for the 3-5 bracket. */
const PAGE_7_AGE_3_5: string[] = [
  "After a long, happy life, {petName}'s body got very tired. And then {pronounPossessive} body stopped working.",
  'That is what "died" means.',
];

/** Verbatim template Page-8 simplification for the 3-5 bracket. */
const PAGE_8_AGE_3_5: string[] = [
  "This might make {childName} feel sad. Maybe very sad.",
  "It's okay to feel sad. It means you loved {petName}.",
];

/** Verbatim template Page-11 simplification (two actions) for the 3-5 bracket. */
const PAGE_11_AGE_3_5: string[] = [
  "When {childName} misses {petName}, there are things {childName} can do.",
  "Look at a picture and remember.",
  "Say {petName}'s name.",
];

/** Extra sentence appended to Page 7 for the 9-12 bracket (verbatim). */
const PAGE_7_EXTRA_9_12 =
  "It is one of the hardest things about being alive: the people and animals we love don't stay forever. But the love does.";

/** Extra sentence appended to Page 8 for the 9-12 bracket (verbatim). */
const PAGE_8_EXTRA_9_12 =
  "Some days {childName} will feel okay, and then {pronounSubject} will feel sad again out of nowhere. Grief is like that. It comes in waves.";

/**
 * Extra sentence appended to Page 9 for the 9-12 bracket — but ONLY when the
 * death type is euthanasia (per the template, this line directly addresses the
 * self-blame older kids feel about that specific choice).
 */
const PAGE_9_EXTRA_9_12_EUTHANASIA =
  "If {childName} is wondering whether anything could have been done differently — the answer is no. Letting {petName} go was the most loving choice.";

/** Extra sentence appended to Page 11 for the 9-12 bracket (verbatim). */
const PAGE_11_EXTRA_9_12 =
  "And when {childName} is ready, it is okay to love another pet someday. Loving a new pet does not replace {petName}. It just means {childName}'s heart is big enough for both.";

/** Extra Page-11 line appended when other pets remain in the home (verbatim). */
const PAGE_11_OTHER_PETS =
  "And when the other pets in your home want extra cuddles, they probably miss {petName} too. You can comfort each other.";

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: MasterStory, id: PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: MasterStory, id: PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/** Append paragraphs to the body of a page in place. */
function appendBody(story: MasterStory, id: PageId, ...paragraphs: string[]): void {
  story[pageIndex(story, id)].body.push(...paragraphs);
}

/**
 * Apply the death-type swap to Page 7. Runs before the age adjustment so the
 * 3-5 simplification can still override, and the 9-12 extra still appends.
 */
function applyDeathType(story: MasterStory, deathType: DeathType): void {
  const body = PAGE_7_BY_DEATH_TYPE[deathType];
  if (body) {
    setBody(story, "page-7", body);
  }
}

/** Apply the belief-frame swap to Page 9. */
function applyBeliefFrame(story: MasterStory, beliefFrame: BeliefFrame): void {
  const body = PAGE_9_BY_BELIEF_FRAME[beliefFrame];
  if (body) {
    setBody(story, "page-9", body);
  }
}

/**
 * Apply the age-bracket adjustments. 3-5 fully replaces Pages 7/8/11 with the
 * simplified wording (so it intentionally overrides the death-type swap, per the
 * template, which gives 3-5 its own single Page-7 body). 9-12 appends the extra
 * sentences onto whatever death-type/belief bodies are already in place.
 */
function applyAgeBracket(
  story: MasterStory,
  ageBracket: AgeBracket,
  deathType: DeathType,
): void {
  switch (ageBracket) {
    case "3-5":
      setBody(story, "page-7", PAGE_7_AGE_3_5);
      setBody(story, "page-8", PAGE_8_AGE_3_5);
      setBody(story, "page-11", PAGE_11_AGE_3_5);
      break;
    case "6-8":
      // Default tone — no adjustment.
      break;
    case "9-12":
      appendBody(story, "page-7", PAGE_7_EXTRA_9_12);
      appendBody(story, "page-8", PAGE_8_EXTRA_9_12);
      if (deathType === "euthanasia") {
        appendBody(story, "page-9", PAGE_9_EXTRA_9_12_EUTHANASIA);
      }
      appendBody(story, "page-11", PAGE_11_EXTRA_9_12);
      break;
  }
}

/** Append the other-pets line to Page 11 when relevant. */
function applyOtherPets(story: MasterStory, otherPets: boolean): void {
  if (otherPets) {
    appendBody(story, "page-11", PAGE_11_OTHER_PETS);
  }
}

/**
 * Compose every variant dimension onto a fresh copy of the master story,
 * returning the still-unresolved (placeholder-carrying) page model. Order
 * matters: death type and belief frame swap first; the age bracket then layers
 * on (3-5 overrides Pages 7/8/11; 9-12 appends extras); the other-pets line is
 * appended last so it always trails Page 11.
 *
 * Exported so the merge layer / tests can inspect the composed-but-unresolved
 * text, but `resolveStory()` is the normal entry point.
 */
export function composeVariants(session: StorySession): MasterStory {
  const story = masterStory();
  const { deathType, beliefFrame, otherPetsInHome } = session.toggles;
  const { ageBracket } = session.child;

  applyDeathType(story, deathType);
  applyBeliefFrame(story, beliefFrame);
  applyAgeBracket(story, ageBracket, deathType);
  applyOtherPets(story, otherPetsInHome === "yes");

  return story;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Resolve a finalized `StorySession` into the ordered, fully-merged
 * `ResolvedStory` that feature 04 renders with no further text logic. Composes
 * the variants, then merges the session's field values into every placeholder.
 *
 * Throws `MergeError` (from merge.ts) if a required field is missing — it never
 * emits a literal placeholder token.
 */
export function resolveStory(session: StorySession): ResolvedStory {
  return mergeStory(composeVariants(session), session);
}
