// Variant composition for Story 4, and the single public entry point
// `resolveStory4()`. Same compose-before-merge pattern as Story 1/2: variants are
// composed onto a fresh copy of the master text BEFORE merge, then the merge
// fields are substituted. Everything here is pure and deterministic — no IO.
//
// THE TWO-TENSE ENGINE is the headline of this module. The master text
// (story4/master-text.ts) holds the LIVING (present-tense) default bodies. When
// `livingOrMemorial === "memorial"`, `composeVariants4` swaps in the FULL memorial
// (past-tense) bodies for every page, THEN layers the other dimensions, and —
// memorial only — appends the Page-5 death-type seam line + belief-frame closing.
//
// The single biggest risk for this product is a TENSE LEAK: a present-tense
// sentence surviving into a memorial letter (or vice versa). To make leaks
// structurally hard, each page body is BUILT WHOLE by a per-page builder that
// takes the tense as an argument and returns the fully-composed body — there is no
// "swap then patch one sentence" step where a stray present-tense line could
// survive into the past-tense path. The living and memorial wordings are kept in
// separate, side-by-side functions so a reviewer can read both paths end to end.
//
// Variant dimensions (context/masterstories/story-4-master-template.md):
//   - Living/memorial → tense across the whole letter (the headline toggle)
//   - Relationship    → addressing (single default / couple → "you both" / "my favorites")
//   - Species         → Pages 2, 3, 4 voice tweaks
//   - Gift-for        → cover inscription (sympathy/gift context)
//   - Death type      → Page 5 seam line (MEMORIAL ONLY)
//   - Belief frame    → Page 5 closing frame (MEMORIAL ONLY)
// Plus a sparse-input fallback: a blank/shallow {quirks} → the stock Page-3 line.
//
// The wording below is the product requirement, copied verbatim from the template
// where it supplies text. Pages 2/4/5/6 give the memorial rewrite in full; Pages 3
// is flipped to past tense per its per-page "memorial" note ("Tense to past
// throughout").

import type {
  GiftFor,
  LetterBeliefFrame,
  LetterDeathType,
  LivingOrMemorial,
  Relationship,
  Species,
  Story4Session,
} from "@/lib/session/types";
import type { Story4PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory4,
  type Story4Story,
  TALK_SIGNOFF,
} from "@/lib/story/story4/master-text";
import { mergeStory4 } from "@/lib/story/story4/merge";

// ---------------------------------------------------------------------------
// Quirks fallback (sparse input)
// ---------------------------------------------------------------------------
//
// When the customer left {quirks} blank or shallow, the page-3 "I love {quirks}"
// sentence is replaced with the template's stock line, so {quirks} is never
// resolved to an empty token AND the page still reads as full sentences. Two
// tenses, since the page is tense-dependent.

const PAGE_3_QUIRKS_FALLBACK_LIVING =
  "I love that you always save me a bite, even when you say you won't. I love that you use my whole name when you're pretending to be mad. I love that your hand finds my head without you even looking. I notice everything.";

const PAGE_3_QUIRKS_FALLBACK_MEMORIAL =
  "I loved that you always saved me a bite, even when you said you wouldn't. I loved that you used my whole name when you were pretending to be mad. I loved that your hand found my head without you even looking. I noticed everything.";

/** A {quirks} value counts as "shallow" (use the fallback) below this length. */
const QUIRKS_MIN_LENGTH = 3;

/** Whether a quirks value is present and substantial enough to use as-is. */
function hasSubstantialQuirks(quirks: string | undefined): boolean {
  return quirks !== undefined && quirks.trim().length >= QUIRKS_MIN_LENGTH;
}

// ---------------------------------------------------------------------------
// Species voice clauses (Pages 2, 3)
// ---------------------------------------------------------------------------

/**
 * Page-2 "I have something better" sentence by species. The template gives dog
 * (default), cat, rabbit/small-mammal, and bird verbatim; the session `Species`
 * union has no horse slot, so horse folds into the species-neutral "other"
 * branch. Tense-dependent (present in the living path, past in the memorial path).
 * The relationship dimension ("you both") is handled by the caller, which only
 * applies the cat/rabbit/bird tweak for single owners — for couples the template
 * supplies a single composed "you both" line (dog voice) and the species tweak is
 * folded into the couple rewrite below.
 */
function page2SenseLine(
  living: boolean,
  species: Species,
): string {
  if (living) {
    switch (species) {
      case "cat":
        return "I don't have words. I have something better — a stillness that means I know you're there, a particular blink I save only for you, and a heart that points at you (even when I'm pretending to look out the window).";
      case "rabbit":
        return "I don't have words. I have something better — a nose that never stops, a thump that means pay attention, and a heart that points at you from the corner of the room.";
      case "bird":
        return "I don't have words — well. I have some of your words, and I use them at the wrong times on purpose. But I have something better: a head-tilt that means yes, you, and a heart that points at you all day long.";
      case "dog":
      case "other":
        return "I don't have words. I have something better — a tail that tells you everything, ears that hear your car three houses away, and a heart that points at you like a compass.";
    }
  }
  // Memorial (past tense). The template gives the dog rewrite in full; the other
  // species fold to the same past-tense "something better" structure with their
  // own sense, keeping the tense consistent.
  switch (species) {
    case "cat":
      return "I never had words. I had something better — a stillness that meant I knew you were there, a particular blink I saved only for you, and a heart that pointed at you (even when I pretended to look out the window).";
    case "rabbit":
      return "I never had words. I had something better — a nose that never stopped, a thump that meant pay attention, and a heart that pointed at you from the corner of the room.";
    case "bird":
      return "I never had words — well. I had some of your words, and I used them at the wrong times on purpose. But I had something better: a head-tilt that meant yes, you, and a heart that pointed at you all day long.";
    case "dog":
    case "other":
      return "I never had words. I had something better — a tail that told you everything, ears that heard your car three houses away, and a heart that pointed at you like a compass.";
  }
}

/**
 * The couple "I have something better" sentence (dog voice, "you both"). The
 * template supplies the living couple line in full; the memorial couple line is
 * composed from the couple framing + the memorial tense (flagged for review).
 */
function page2SenseLineCouple(living: boolean): string {
  return living
    ? "I don't have words. I have something better — a tail that tells you both everything, ears that hear both your cars three houses away, and a heart that points at the two of you like a compass."
    : "I never had words. I had something better — a tail that told you both everything, ears that heard both your cars three houses away, and a heart that pointed at the two of you like a compass.";
}

/**
 * Page-3 "kind of happy" clause by species. dog = default; cat/rabbit/bird get the
 * template's verbatim clause; "other" (and horse, which the type folds in) get the
 * species-neutral fallback. Returns just the clause that follows "the kind".
 */
const PAGE_3_HAPPY_CLAUSE_BY_SPECIES: Record<Species, string> = {
  dog: "that runs in circles for no reason and doesn't need explaining",
  cat: "of happy that loaf-shapes in a sunbeam and decides nothing else needs to happen today",
  rabbit: "of happy that binkies across the floor for no reason at all",
  bird: "of happy that sings when nobody asked",
  // Species-neutral fallback ("the kind of happy that doesn't need a reason").
  // The session type has no horse / small-mammal slot, so they fold in here.
  other: "of happy that doesn't need a reason",
};

// ---------------------------------------------------------------------------
// Page 2 — Opening
// ---------------------------------------------------------------------------

/** Compose the full Page-2 body for tense × relationship × species. */
function page2Body(
  living: boolean,
  relationship: Relationship,
  species: Species,
): string[] {
  const couple = relationship === "couple";
  const senseLine = couple
    ? page2SenseLineCouple(living)
    : page2SenseLine(living, species);
  const penLine = living
    ? couple
      ? "But if I had words, just for one afternoon, this is the letter I'd write you both."
      : "But if I had words, just for one afternoon, this is the letter I'd write you."
    : couple
      ? "But if I'd had words, just for one afternoon, this is the letter I would have written you both."
      : "But if I'd had words, just for one afternoon, this is the letter I would have written you.";

  return [
    "Dear {ownerNames},",
    senseLine,
    penLine,
    "Because there are things I want you to know. And I think you should hear them from me.",
  ];
}

// ---------------------------------------------------------------------------
// Page 3 — Gratitude / Quirks
// ---------------------------------------------------------------------------

/** Compose the full Page-3 body for tense × species, with the quirks fallback. */
function page3Body(
  living: boolean,
  species: Species,
  hasQuirks: boolean,
): string[] {
  const happyClause = PAGE_3_HAPPY_CLAUSE_BY_SPECIES[species];

  if (living) {
    const quirksLine = hasQuirks
      ? "I love {quirks}. I know you think I don't notice. I notice everything."
      : PAGE_3_QUIRKS_FALLBACK_LIVING;
    return [
      "Here is what I love about us. And I notice all of it.",
      "I love {favoriteRitual}. That's my favorite part of every day. I start waiting for it before it's time.",
      quirksLine,
      "And I love that you came home tired and sat on the floor with me anyway, in your good clothes, because I was there and that was enough. You talk to me in your real voice — the one nobody else gets to hear. I keep all of it.",
      `I'm not just fine. I'm not just okay. I'm happy — the kind ${happyClause}. You did that. That's you.`,
    ];
  }

  // Memorial (past tense throughout, per the page's per-page note).
  const quirksLine = hasQuirks
    ? "I loved {quirks}. I knew you thought I didn't notice. I noticed everything."
    : PAGE_3_QUIRKS_FALLBACK_MEMORIAL;
  return [
    "Here is what I loved about us. And I noticed all of it.",
    "I loved {favoriteRitual}. That was my favorite part of every day. I started waiting for it before it was time.",
    quirksLine,
    "And I loved that you came home tired and sat on the floor with me anyway, in your good clothes, because I was there and that was enough. You talked to me in your real voice — the one nobody else got to hear. I kept all of it.",
    `I wasn't just fine. I wasn't just okay. I was happy — the kind ${happyClause}. You did that. That was you.`,
  ];
}

// ---------------------------------------------------------------------------
// Page 4 — Daily Joy
// ---------------------------------------------------------------------------

/** Compose the full Page-4 body for tense × species. */
function page4Body(living: boolean, species: Species): string[] {
  if (living) {
    const spotLine =
      species === "cat"
        ? "I'll tell you a secret: it's the ordinary ones. It's {favoriteActivity}. It's the spot at {favoriteSpots}, where the sun lands and I can watch you and pretend I'm watching something else."
        : "I'll tell you a secret: it's the ordinary ones. It's {favoriteActivity}. It's the spot at {favoriteSpots}, where the sun lands and the whole world goes warm and I have nothing to do but be near you.";
    return [
      "People think the big days are the ones that matter. The beach, the birthday, the snow.",
      spotLine,
      "I don't need much. A walk. A window. The sound of you in the next room. You, coming back — you always come back, and I am amazed every single time.",
      "That's the whole secret. The days don't have to be big. They just have to have you in them.",
    ];
  }

  // Memorial (past tense). The template gives the dog rewrite in full; the cat
  // "watch you and pretend" clause folds in, past tense.
  const spotLine =
    species === "cat"
      ? "I'll tell you a secret: it was the ordinary ones. It was {favoriteActivity}. It was the spot at {favoriteSpots}, where the sun landed and I could watch you and pretend I was watching something else."
      : "I'll tell you a secret: it was the ordinary ones. It was {favoriteActivity}. It was the spot at {favoriteSpots}, where the sun landed and the whole world went warm and I had nothing to do but be near you.";
  return [
    "People think the big days are the ones that matter. The beach, the birthday, the snow.",
    spotLine,
    "I didn't need much. A walk. A window. The sound of you in the next room. You always came back, and I was amazed every single time.",
    "That was the whole secret. The days didn't have to be big. They just had to have you in them.",
  ];
}

// ---------------------------------------------------------------------------
// Page 5 — The truth (+ memorial death-type seam + belief-frame closing)
// ---------------------------------------------------------------------------

/** The memorial death-type seam line (added after "I had everything."). Never funny. */
const PAGE_5_DEATH_SEAM_BY_TYPE: Record<LetterDeathType, string> = {
  euthanasia:
    "And the last choice you made for me was the kindest thing anyone ever did. You loved me enough to let me go. There is nothing to forgive.",
  sudden:
    "We didn't get the goodbye we wanted. The last thing I felt was being loved. That was enough. That was everything.",
  illness:
    "Those last hard months — what I felt wasn't the pain. What I felt was you, choosing to stay through it. That's what I kept.",
  peaceful:
    "I had a long, good life, and a soft end. There's nothing about it that needs forgiving.",
};

/**
 * The memorial belief-frame closing line — the final Page-5 line, replacing the
 * present-tense Page-6 default close. Never "crossed the rainbow bridge" /
 * "watching over you".
 */
const PAGE_5_BELIEF_CLOSE_BY_FRAME: Record<LetterBeliefFrame, string> = {
  "rainbow-bridge":
    "Wherever I am now, I'm not tired, and I'm not hurting, and the sun still lands on the floor at four o'clock.",
  heaven:
    "Wherever I am now, there's a room for me, and the door is the kind I can hear you coming through.",
  secular:
    "I'm not anywhere now, not the way I was. But I'm in the spot by the door, and the half-second before you remember. I'm where you keep me. That's more than enough.",
};

/** Compose the full Page-5 body for tense × relationship (+ memorial seams). */
function page5Body(
  living: boolean,
  relationship: Relationship,
  deathType: LetterDeathType,
  beliefFrame: LetterBeliefFrame,
): string[] {
  const couple = relationship === "couple";

  if (living) {
    const favoriteLine = couple
      ? "You are my favorites. Not my favorite thing — my favorites, full stop. The people I look for when I hear the door. The ones I'd pick out of any crowd, any room, anywhere, with my eyes closed, by the sound of you breathing."
      : "You are my favorite. Not my favorite thing — my favorite, full stop. The person I look for when I hear the door. The one I'd pick out of any crowd, any room, anywhere, with my eyes closed, by the sound of you breathing.";
    const lastLine = couple
      ? "But I want you to know: I'm not waiting for a better life than this one. This is the one I'd choose. The two of you, and the spot by the door, and the ordinary good morning. I already have everything."
      : "But I want you to know: I'm not waiting for a better life than this one. This is the one I'd choose. You, and the spot by the door, and the ordinary good morning. I already have everything.";
    return [
      "So here's the truth, since I've got the words for once.",
      favoriteLine,
      "I know I'm not always easy. I bark at nothing. I steal the socks. I wake you up too early because I can't believe it's already a day with you in it.",
      lastLine,
    ];
  }

  // Memorial (past tense, given in full) + the death-type seam + belief close.
  const favoriteLine = couple
    ? "You were my favorites. Not my favorite thing — my favorites, full stop. The people I looked for when I heard the door. The ones I'd have picked out of any crowd, anywhere, with my eyes closed, by the sound of you breathing."
    : "You were my favorite. Not my favorite thing — my favorite, full stop. The person I looked for when I heard the door. The one I'd have picked out of any crowd, anywhere, with my eyes closed, by the sound of you breathing.";
  const lastLine = couple
    ? "But I want you to know: I wasn't waiting for a better life than the one we had. That was the one I'd have chosen. The two of you, and the spot by the door, and the ordinary good morning. I had everything."
    : "But I want you to know: I wasn't waiting for a better life than the one we had. That was the one I'd have chosen. You, and the spot by the door, and the ordinary good morning. I had everything.";
  return [
    "So here's the truth, since I've got the words at last.",
    favoriteLine,
    "I know I wasn't always easy. I barked at nothing. I stole the socks. I woke you up too early because I couldn't believe it was already a day with you in it.",
    lastLine,
    PAGE_5_DEATH_SEAM_BY_TYPE[deathType],
    PAGE_5_BELIEF_CLOSE_BY_FRAME[beliefFrame],
  ];
}

// ---------------------------------------------------------------------------
// Page 6 — Closing / Signature
// ---------------------------------------------------------------------------

/**
 * Compose the full Page-6 body for tense. The signature tail (TALK_SIGNOFF +
 * "{petName}") is identical in both paths; merge appends the optional nickname /
 * date line after it. Memorial swaps the prose body for the full past-tense
 * rewrite. The living path NEVER closes in a past-tense valediction; the memorial
 * path NEVER uses "watching over you".
 */
function page6Body(living: boolean): string[] {
  if (living) {
    return [
      "So go on. Have the good day. Eat the good thing. Take the long way home.",
      "And when you walk back through that door — I'll be the one who acts like you've been gone a year. Every time. That's not me forgetting how long you were gone. That's me, telling you the only way I know how:",
      "There you are. There you are. It's you.",
      "I love you. I always do. As much as a {species} can love — which, it turns out, is an enormous amount.",
      TALK_SIGNOFF,
      "{petName}",
    ];
  }

  // Memorial (past-tense rewrite of the body, keeping the signature). Uses "died"-
  // free grief copy from the template; no "watching over you".
  return [
    "So go on. Have the good day. Eat the good thing. Take the long way home — and notice the things I used to notice with you. The grass after rain. The light moving in the late afternoon. The dog two houses down, barking at nothing.",
    "And when you miss me — be sad for exactly as long as you need to be. Then, when you're ready, and only then, be happy again. I'd want that. I always did.",
    "I loved you. I always will, as much as a {species} can love — which, it turns out, was an enormous amount.",
    TALK_SIGNOFF,
    "{petName}",
  ];
}

// ---------------------------------------------------------------------------
// Cover — gift-for inscription
// ---------------------------------------------------------------------------
//
// For a gift the letter is still written TO the owner; per the template only a
// small inscription notes the gift context. Added as the cover subtitle tail (the
// letter body is untouched, always the owner's). Shared with Story 2's wording.

const COVER_GIFT_INSCRIPTION = "A gift, given with love.";

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story4Story, id: Story4PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story4Story, id: Story4PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/** Apply the gift-for inscription to the cover subtitle. */
function applyGiftFor(story: Story4Story, giftFor: GiftFor): void {
  if (giftFor !== "friend") return;
  const cover = story[pageIndex(story, "talk-cover")];
  cover.subtitle =
    cover.subtitle !== undefined
      ? `${cover.subtitle} · ${COVER_GIFT_INSCRIPTION}`
      : COVER_GIFT_INSCRIPTION;
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-4 master text,
 * returning the still-unresolved (placeholder-carrying) page model. Each body page
 * is built WHOLE by a per-page builder that takes the tense as an argument — so
 * the living and memorial paths never share a "swap then patch one sentence" step
 * where a tense could leak. Order: build pages 2–6 (tense × relationship × species
 * × quirks + memorial seams), then layer the gift-for cover inscription.
 *
 * Exported so the merge layer / tests can inspect the composed-but-unresolved
 * text; `resolveStory4()` is the normal entry point.
 */
export function composeVariants4(session: Story4Session): Story4Story {
  const story = masterStory4();
  const { relationship } = session.owner;
  const { species } = session.pet;
  const { livingOrMemorial, deathType, beliefFrame, giftFor } = session.toggles;
  const { quirks } = session.memories;

  const living = livingOrMemorial !== "memorial";
  const hasQuirks = hasSubstantialQuirks(quirks);

  setBody(story, "talk-page-2", page2Body(living, relationship, species));
  setBody(story, "talk-page-3", page3Body(living, species, hasQuirks));
  setBody(story, "talk-page-4", page4Body(living, species));
  setBody(
    story,
    "talk-page-5",
    page5Body(living, relationship, deathType, beliefFrame),
  );
  setBody(story, "talk-page-6", page6Body(living));
  applyGiftFor(story, giftFor);

  return story;
}

/**
 * Resolve a finalized `Story4Session` into the ordered, fully-merged
 * `ResolvedStory` the shared letter renderer consumes with no further text logic.
 * Composes the variants (the two-tense engine), then merges the session's field
 * values into every placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token.
 */
export function resolveStory4(session: Story4Session): ResolvedStory {
  return mergeStory4(composeVariants4(session), session);
}
