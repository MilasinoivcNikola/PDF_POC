// Variant composition for Story 7, and the single public entry point
// `resolveStory7()`. Same compose-before-merge pattern as Story 1/2/4/5/6: variants
// are composed onto a fresh copy of the master text BEFORE merge, then the merge
// fields are substituted. Everything here is pure and deterministic — no IO.
//
// Story 7 is the catalog's first JOYFUL, non-memorial book. There is no tense
// engine (origin pages are past tense, belonging pages present tense, baked into
// the master copy); the anniversary occasion reframes the opener/closing. The SIX
// dimensions are:
//   1. occasion → cover subtitle, dedication line, Page 7, Page 9 (closing), back
//      cover prompt (gotcha-day-anniversary; requires {yearsHome})
//   2. adoption source → Page 3's origin sentence (5 verbatim variants) + the
//      thank-you-to-the-past line (shelter/rescue/found-as-stray only); Page 4
//      stray softening
//   3. life stage → Page 2 senior "you were waiting too" beat + Page 5 senior "a
//      lot of places that weren't home" beat; puppy-kitten leans younger on Page 4
//   4. species → Page 2 ("a walk that nobody asked for" → cat windowsill) + Page 5
//      cat "settle on your own terms" beat
//   5. child present → Page 6 ("{childName} learned you fastest of all.") + Page 8
//      beat ("…and most of all, some days, to {childName}.")
//   6. family members present → Page 7 second sentence swap
//
// Like Story 4/5/6, each variant-affected body page is BUILT WHOLE by a per-page
// builder (so an origin sentence and a softened opener can never half-mix). The
// wording below is the product requirement, copied verbatim from the template.
// The {homecomingMemory} (Page 4) + {quirks} (Page 6) blank-input fallbacks and
// the {yearsHome} singular/plural live in story7/merge.ts, not here.

import type {
  AdoptionSource,
  LifeStage,
  Occasion,
  Species,
  Story7Session,
} from "@/lib/session/types";
import type { Story7PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory7,
  type Story7Story,
} from "@/lib/story/story7/master-text";
import { mergeStory7 } from "@/lib/story/story7/merge";

// ---------------------------------------------------------------------------
// Dimension 2 — adoption source (Page 3 origin sentence + thank-you gating)
// ---------------------------------------------------------------------------
//
// The 5 origin sentences, verbatim from the master template. The shelter / rescue
// / found-as-stray sentences carry their own warm "thank you to whoever had you
// before" line inline; breeder + other do not.

/** Page-3 origin sentence (master paragraph 2) for each adoption source. */
function originSentence(source: AdoptionSource): string {
  switch (source) {
    case "shelter":
      return "We went to the shelter not quite sure what we were looking for — and there you were, looking right back at us. Whoever cared for you before we met, thank you. We took it from there.";
    case "rescue":
      return "A rescue had been keeping you safe until the right family came along. That family turned out to be us. To everyone who looked after you before we did — thank you. We are so glad you held on.";
    case "breeder":
      return "We had been counting the days until we could meet you. And when we did — small, brand new, entirely yourself — there was no question. You were coming home with us.";
    case "found-as-stray":
      // The template's verbatim stray sentence, plus the gated warm thank-you beat
      // (the variants quick-ref groups found-as-stray with shelter/rescue for the
      // "whoever had you before, thank you" line — for a stray, the thanks go to
      // whoever kept them going out there).
      return "You found us, really. One day you simply appeared — a little lost, a little hungry, looking for somebody. To whoever fed you or kept you safe out there before we met — thank you. We decided that somebody would be us.";
    case "other":
      return "However you came to us — and it's a good story, the way you tell it — the ending is the same. You were ours, and we were yours.";
  }
}

// ---------------------------------------------------------------------------
// Dimension 4 — species (Page 2 absence line, Page 5 cat beat)
// ---------------------------------------------------------------------------

/** Page-2 "telling absence" sentence, swapped for a cat-true one. */
function page2AbsenceSentence(species: Species): string {
  if (species === "cat") {
    // Template cat variant for Page 2.
    return "There was a spot by the door where nobody waited. A bowl that wasn't on the floor yet. A windowsill with nobody sitting in it.";
  }
  // dog (default) + rabbit/bird/other: the master wording.
  return "There was a spot by the door where nobody waited. A bowl that wasn't on the floor yet. A walk that nobody asked for.";
}

// ---------------------------------------------------------------------------
// Page builders (each variant-affected page built WHOLE)
// ---------------------------------------------------------------------------

/** Compose the full Page-2 body for species × life stage (senior appends one beat). */
function page2Body(species: Species, stage: LifeStage): string[] {
  const body = [
    "Before you came, the house was a little too quiet.",
    page2AbsenceSentence(species),
    "We didn't know it then, but we were waiting for you.",
  ];
  if (stage === "senior-adoption") {
    // Template senior-adoption beat for Page 2.
    body.push(
      "And somewhere, you were waiting too. You had been waiting a long time.",
    );
  }
  return body;
}

/** Compose the full Page-3 body for the adoption source (the origin sentence). */
function page3Body(source: AdoptionSource): string[] {
  return [
    "Then came the day everything changed.",
    originSentence(source),
    "And out of every {speciesNoun} in the whole wide world, it was you. It was always going to be you.",
  ];
}

/**
 * Compose the full Page-4 body for the adoption source + life stage. The
 * found-as-stray softening swaps the opener ("we took you home"); puppy-kitten
 * keeps the master opener but leans younger via a closing aside. The middle
 * paragraph stays the {homecomingMemory} placeholder (the merge layer applies the
 * blank/sparse fallback).
 */
function page4Body(source: AdoptionSource, stage: LifeStage): string[] {
  const opener =
    source === "found-as-stray"
      ? // Template found-as-stray softening.
        "Then we took you home — and you let us, which felt like a gift."
      : "Then we brought you home.";

  const closer =
    stage === "puppy-kitten"
      ? // Template puppy-kitten lean-younger close (keeps the safe-now beat).
        "You were so small you fit in the crook of an arm. The whole way, one thing was true, even if you didn't know it yet: you were safe now. You were ours."
      : "The whole way, one thing was true, even if you didn't know it yet: you were safe now. You were ours.";

  return [opener, "{homecomingMemory}", closer];
}

/** Compose the full Page-5 body for species × life stage (senior + cat beats). */
function page5Body(species: Species, stage: LifeStage): string[] {
  const settle =
    species === "cat"
      ? // Template cat variant: the cat does not settle on cue.
        "So we showed you. We made you a place — {sleepingSpot} — soft and warm and yours. You inspected every corner first, the way you do, and only then — on your own terms, as always — you slept."
      : "So we showed you. We made you a place — {sleepingSpot} — soft and warm and yours. And little by little, the questions went quiet, and you slept.";

  const body = [
    "The first night was new for all of us.",
    "Everything smelled different. Every sound was a question. You weren't sure where you fit yet.",
    settle,
  ];
  if (stage === "senior-adoption") {
    // Template senior-adoption beat for Page 5.
    body.push(
      "You had slept in a lot of places that weren't home. This one was. You seemed to know it.",
    );
  }
  return body;
}

/**
 * Compose the full Page-6 body, appending the child beat when a child name is set.
 * The {quirks} line is "We learned {quirks}." when the customer supplied quirks (a
 * short phrase reads as a sentence), but a bare "{quirks}" when they didn't — the
 * blank-quirks fallback (story7/merge.ts) is a whole verbatim paragraph that already
 * opens with "We learned" and ends with its own period, so the "We learned …."
 * frame would double both. (Page 4's {homecomingMemory} fallback is a bare slot, so
 * it needs no such switch.)
 */
function page6Body(hasChild: boolean, hasQuirks: boolean): string[] {
  const body = [
    "After that, we got to know you. And you, us.",
    hasQuirks ? "We learned {quirks}." : "{quirks}",
    "We learned what made your tail go, and what made you hide, and the exact sound that meant now, please, walk, now. You learned us right back — our footsteps, our voices, the times of day that were yours.",
    "That is how a {speciesNoun} and a family become a {speciesNoun} and their family: one small thing at a time.",
  ];
  if (hasChild) {
    // Template child beat for Page 6.
    body.push("{childName} learned you fastest of all.");
  }
  return body;
}

/**
 * Compose the full Page-7 body. The family-members variant swaps the "Your
 * people are…" sentence; the anniversary occasion swaps the opening sentence to
 * the "{yearsHome} years on" framing.
 */
function page7Body(occasion: Occasion, hasFamily: boolean): string[] {
  const opener =
    occasion === "gotcha-day-anniversary"
      ? // Template anniversary framing for Page 7.
        "And now, {yearsHome} on, you're just part of it — like you were always here."
      : "And now? Now you're just part of it.";

  const people = hasFamily
    ? // Template family-members swap (names the real household).
      "Your favorite thing in the world is {favoriteActivity}. Your spot is {sleepingSpot}. Your people are {familyMembers}. Your home is here."
    : "Your favorite thing in the world is {favoriteActivity}. Your spot is {sleepingSpot}. Your people are {ownerNames}. Your home is here.";

  return [opener, people, "The house isn't quiet anymore. It's better."];
}

/** Compose the full Page-8 body, swapping the closing line when a child name is set. */
function page8Body(hasChild: boolean): string[] {
  const closer = hasChild
    ? // Template child beat for Page 8.
      "You belong here. You belong to us — to {ownerNames}, and most of all, some days, to {childName}, and we belong to you, and that is simply how it is now."
    : "You belong here. You belong to us, and we belong to you, and that is simply how it is now.";

  return [
    "Here is the truest thing in this whole book.",
    "You are not a guest. You are not \"the new {speciesNoun}.\" You are family — all the way through, no trial period, no taking-back.",
    closer,
  ];
}

/** Compose the full Page-9 (closing) body for the occasion. */
function page9Body(occasion: Occasion): string[] {
  if (occasion === "gotcha-day-anniversary") {
    // Template anniversary closing.
    return [
      "So happy Gotcha Day, {petName}.",
      "{yearsHome} ago today, you came home — and you never stopped being exactly where you belong.",
      "This is your home, {petName}. It always will be.",
    ];
  }
  // new-arrival default.
  return [
    "So welcome home, {petName}.",
    "You were worth the wait. You were worth the empty bowl and the quiet house and all the days before you came.",
    "This is your home now, {petName}. It always will be.",
  ];
}

// ---------------------------------------------------------------------------
// Cover / dedication / back-cover occasion reframes (titles + subtitles)
// ---------------------------------------------------------------------------

/** Set the cover subtitle for the occasion (anniversary → "Happy Gotcha Day"). */
function coverSubtitle(occasion: Occasion): string {
  return occasion === "gotcha-day-anniversary"
    ? "Happy Gotcha Day, {petName}"
    : "The story of the day you became ours";
}

/** Set the back-cover prompt title for the occasion (anniversary → add-each-year). */
function backCoverTitle(occasion: Occasion): string {
  return occasion === "gotcha-day-anniversary"
    ? "A new memory from this year with {petName}"
    : "The story of {petName}'s first days with us";
}

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story7Story, id: Story7PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story7Story, id: Story7PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/** Replace the title of a page in place. */
function setTitle(story: Story7Story, id: Story7PageId, title: string): void {
  story[pageIndex(story, id)].title = title;
}

/** Replace the subtitle of a page in place. */
function setSubtitle(
  story: Story7Story,
  id: Story7PageId,
  subtitle: string,
): void {
  story[pageIndex(story, id)].subtitle = subtitle;
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-7 master text,
 * returning the still-unresolved (placeholder-carrying) page model. Each
 * variant-affected body page is built WHOLE by a per-page builder (so an origin
 * sentence never half-mixes and the anniversary closing never blends with the
 * new-arrival one). Pages 1 (dedication) carries no body variant (its dated /
 * anniversary line is added by the merge layer). Exported so the merge layer /
 * tests can inspect the composed-but-unresolved text; `resolveStory7()` is the
 * normal entry point.
 */
export function composeVariants7(session: Story7Session): Story7Story {
  const story = masterStory7();
  const { species } = session.pet;
  const { occasion, adoptionSource, lifeStage } = session.toggles;
  const { childName, familyMembers } = session.memories;

  const hasChild =
    childName !== undefined && childName.trim().length > 0;
  const hasFamily =
    familyMembers !== undefined && familyMembers.trim().length > 0;
  const hasQuirks =
    session.memories.quirks !== undefined &&
    session.memories.quirks.trim().length > 0;

  // The anniversary BODY reframes (Page 7 opener + closing) consume {yearsHome};
  // per the master template, they require it. When the occasion is anniversary but
  // yearsHome was not supplied, those pages fall back to the new-arrival wording so
  // no {yearsHome} placeholder is ever left to fail merge. (The cover subtitle +
  // back-cover prompt reframes carry no {yearsHome} and so always apply.)
  const hasYears =
    session.toggles.yearsHome !== undefined &&
    session.toggles.yearsHome.trim().length > 0;
  const bodyOccasion: Occasion =
    occasion === "gotcha-day-anniversary" && hasYears
      ? "gotcha-day-anniversary"
      : "new-arrival";

  // Cover + back-cover occasion reframes (no {yearsHome} dependency).
  setSubtitle(story, "welcome-cover", coverSubtitle(occasion));
  setTitle(story, "welcome-back-cover", backCoverTitle(occasion));

  // Body pages.
  setBody(story, "welcome-before", page2Body(species, lifeStage));
  setBody(story, "welcome-choosing", page3Body(adoptionSource));
  setBody(story, "welcome-drive-home", page4Body(adoptionSource, lifeStage));
  setBody(story, "welcome-first-night", page5Body(species, lifeStage));
  setBody(story, "welcome-learning", page6Body(hasChild, hasQuirks));
  setBody(story, "welcome-now-ours", page7Body(bodyOccasion, hasFamily));
  setBody(story, "welcome-belong", page8Body(hasChild));
  setBody(story, "welcome-closing", page9Body(bodyOccasion));

  return story;
}

/**
 * Resolve a finalized `Story7Session` into the ordered, fully-merged
 * `ResolvedStory` the shared narrative renderer consumes with no further text
 * logic. Composes the variants, then merges the session's field values into every
 * placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token.
 */
export function resolveStory7(session: Story7Session): ResolvedStory {
  return mergeStory7(composeVariants7(session), session);
}
