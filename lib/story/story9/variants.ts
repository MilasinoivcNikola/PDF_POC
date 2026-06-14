// Variant composition for Story 9, and the single public entry point
// `resolveStory9()`. Same compose-before-merge pattern as Story 1/2/4/5/6: variants
// are composed onto a fresh copy of the master text BEFORE merge, then the merge
// fields are substituted. Everything here is pure and deterministic — no IO.
//
// Story 9 has ONE defining toggle (`babyStatus`) plus the species voice + other-pets
// dimensions. The dimensions are:
//   - babyStatus (expecting | arrived) → rewrites the cover subtitle, the Page-1
//     dedication, Page 4 (something is changing → the baby arrived), Page 6 (the
//     bond, anticipatory → present), and Page 8 (the closing "you are loved" line).
//     Both paths read as a complete, natural book — the "arrived" path names the
//     baby ({babyName}) and shifts to present tense; the "expecting" default keeps
//     the baby abstract ("the new baby") and anticipatory ("coming / will be").
//   - species voice → Pages 2, 3 & 6 (cat: Page 2 "first to claim the warm spot..."
//     + Page 6 supervises rather than crowds; bird/rabbit "settles in" rather than
//     "curls up" — Page 3's sleeping line; the "other" species reads as "friend" in
//     Page 6's "a friend who loves" line; dog → the default wording).
//   - otherPetsInHome → Pages 2, 4, 5, 7 (append one warm "the more, the merrier"
//     line when "yes"; never competitive).
//   - plus the sparse-input fallback: a blank {quirks} (Page 3) → the template's
//     stock clause.
//
// Like Story 4/5/6, each variant-affected body page is BUILT WHOLE by a per-page
// builder (so an expecting default and an arrived rewrite can never half-mix). The
// wording below is the product requirement, copied verbatim from the master template
// where it supplies text; where the template gives only a note (e.g. the bird/rabbit
// "settles in" touch), the composed line is built from the default + that note.

import type {
  BabyStatus,
  Species,
  Story9Session,
} from "@/lib/session/types";
import type { Story9PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory9,
  type Story9Story,
} from "@/lib/story/story9/master-text";
import { mergeStory9 } from "@/lib/story/story9/merge";

// ---------------------------------------------------------------------------
// Sparse-input fallback (quirks on Page 3)
// ---------------------------------------------------------------------------

/** A free-text value counts as "shallow" (use the fallback) below this length. */
const MIN_LENGTH = 3;

/** Whether a free-text value is present and substantial enough to use as-is. */
function hasSubstantial(value: string | undefined): boolean {
  return value !== undefined && value.trim().length >= MIN_LENGTH;
}

// ---------------------------------------------------------------------------
// Species voice
// ---------------------------------------------------------------------------
//
// The template gives species touches on Pages 2 & 6 (cat supervises; bird/rabbit
// "settles in"). dog (default) keeps the master wording. "other" folds to the dog
// default (species-neutral). The bird/rabbit touch is on Page 3's sleeping line
// ("curls up" → "settles in"), per the master template's Page-3 note.

/** Page-3 sleeping-line sentence, varied by species (bird/rabbit "settle in"). */
function page3SleepingSentence(species: Species): string {
  if (species === "bird" || species === "rabbit") {
    // Template bird/small-mammal variant: "settles in" rather than "curls up".
    return "When the day winds down, {petName} settles in {sleepingSpot}, where it is warm and safe and exactly where {pronounSubject} belongs.";
  }
  // dog (default) + cat/other: the master wording.
  return "When the day winds down, {petName} curls up {sleepingSpot}, where it is warm and safe and exactly where {pronounSubject} belongs.";
}

/** Page-6 "bond" body, varied by species (cat supervises, doesn't crowd). */
function page6BondBody(species: Species, status: BabyStatus): string[] {
  // The master template uses [SPECIES] literally here ("a dog who loves..."); that
  // reads fine for dog/cat/rabbit/bird but "a other who loves" is ungrammatical, so
  // inline a grammatical species noun for the "other" case (the {species} merge
  // token stays available for the other pages that read fine with it).
  const speciesNoun = species === "other" ? "friend" : species;

  if (status === "arrived") {
    // babyStatus = arrived: present tense, the baby named ({babyName}).
    const body = [
      `Now there is a small new person, and a ${speciesNoun} who loves {pronounObject}.`,
      "{babyName} reaches for {petName}'s soft fur. {petName} keeps gentle watch nearby. Some of the very first happy things {babyName} will ever know are already {petName}.",
    ];
    if (species === "cat") {
      // Template cat variant: supervises rather than crowds.
      body.push(
        "A warm, watchful presence at the edge of the room — close enough to belong, far enough to keep {pronounPossessive} dignity.",
      );
    }
    return body;
  }

  // babyStatus = expecting (default): anticipatory, the baby abstract.
  const body = [
    `Soon there will be a small new person, and a ${speciesNoun} who loves {pronounObject}.`,
    "There will be quiet mornings with everyone home. A tiny hand reaching for soft fur. A warm body keeping watch beside the crib. The baby will learn the sound of {petName} before {pronounSubject} learns much else at all.",
    "Some of the very first happy things the baby ever knows will be {petName}.",
  ];
  if (species === "cat") {
    // Template cat variant: supervises rather than crowds.
    body.push(
      "A warm, watchful presence at the edge of the room — close enough to belong, far enough to keep {pronounPossessive} dignity.",
    );
  }
  return body;
}

// ---------------------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------------------

/** Compose the full Page-1 (dedication) — babyStatus rewrites it to name the baby. */
function page1Dedication(status: BabyStatus): { title: string; body: string[] } {
  if (status === "arrived") {
    // Template arrived variant: name both the pet and the (degraded-or-named) baby.
    return {
      title:
        "For {petName} and {babyName} —\nthe big {speciesDescriptor} and the little one,\nat the very beginning of everything.",
      body: ["— The {ownerNames} family"],
    };
  }
  // expecting default.
  return {
    title:
      "For {petName},\nwho was here first,\nand is loved just as much as ever.",
    body: ["— The {ownerNames} family"],
  };
}

/**
 * Compose the full Page-2 body. The cat species gets the template's "claim the warm
 * spot / decide which lap / on {pronounPossessive} own quiet terms" wording on line
 * 2 (master template line 140); to avoid a verbatim echo, the cat path also DROPS
 * the "The warm spot by the window." fragment from line 3 (it now appears in line
 * 2). dog/other/bird/rabbit keep the master default. Also varies on other-pets.
 */
function page2Body(species: Species, otherPets: boolean): string[] {
  const firstLine =
    species === "cat"
      ? // Template cat variant (master template line 140).
        "In this home full of love, {petName} was the very first — the first to claim the warm spot by the window, the first to decide which lap was best, the first to make this house a home on {pronounPossessive} own quiet terms."
      : "In this home full of love, {petName} was the very first — the first to be waited for, the first to be welcomed, the first to make this house a family.";
  const knewLine =
    species === "cat"
      ? // Drop the "warm spot by the window" fragment (now on line 2) to avoid an echo.
        "{petName} knew every corner. The sound of the right car in the driveway. The exact moment someone needed a friend."
      : "{petName} knew every corner. The warm spot by the window. The sound of the right car in the driveway. The exact moment someone needed a friend.";
  const body = [
    "Before the new baby, there was you.",
    firstLine,
    knewLine,
    "This was your home first, {petName}. It still is.",
  ];
  if (otherPets) {
    // Template OTHER_PETS_IN_HOME = yes append for Page 2.
    body.push(
      "And whatever other small ones share this home, they know it too: {petName} was here at the start of it all.",
    );
  }
  return body;
}

/** Template stock Page-3 line replacing the "{quirks}" clause when blank. */
const PAGE_3_QUIRKS_FALLBACK =
  "even the funny little habits that are {petName}'s alone";

/** Compose the full Page-3 body for the quirks fallback + the species sleeping line. */
function page3Body(species: Species, hasQuirks: boolean): string[] {
  const quirksClause = hasQuirks ? "{quirks}" : PAGE_3_QUIRKS_FALLBACK;
  return [
    "Every day, you and your family have a rhythm all your own.",
    "{petName}'s favorite thing in the world is {favoriteActivity}.",
    `And {ownerNames} love {pronounObject} for it — even ${quirksClause}.`,
    page3SleepingSentence(species),
  ];
}

/**
 * Compose the full Page-4 body. babyStatus rewrites it whole (expecting = "a baby
 * is coming"; arrived = "the baby arrived"); {babyArrival} appends to the
 * expecting last line when supplied; the other-pets line is appended when "yes".
 */
function page4Body(
  status: BabyStatus,
  otherPets: boolean,
  hasBabyArrival: boolean,
): string[] {
  let body: string[];
  if (status === "arrived") {
    // Template arrived variant: past/present, the baby has come home.
    body = [
      "For a while, something in the house was changing. New smells, new sounds, a small room made ready.",
      "And then, one day, the new baby arrived. {babyName} came home to the family — and to {petName}, who had been waiting all along.",
    ];
  } else {
    // expecting default: the baby is coming, still abstract.
    const lastLine = hasBabyArrival
      ? // Template babyArrival append (expecting only).
        "Here is the good news, the happy news: a new baby is coming to join the family, {babyArrival}."
      : "Here is the good news, the happy news: a new baby is coming to join the family.";
    body = [
      "Lately, something in the house has been changing.",
      "There are new smells. New sounds. A small room being made ready, with soft things and quiet colors. The grown-ups talk in gentle, excited voices.",
      "{petName} has noticed. Of course {petName} has — {pronounSubject} notices everything.",
      lastLine,
    ];
  }
  if (otherPets) {
    // Template OTHER_PETS_IN_HOME = yes append for Page 4.
    body.push(
      "The other pets have noticed too. You can all wonder about it together.",
    );
  }
  return body;
}

/** Compose the full Page-5 body. babyStatus tweaks the bond line; other-pets appends. */
function page5Body(status: BabyStatus, otherPets: boolean): string[] {
  const bondLine =
    status === "arrived"
      ? // Template arrived variant: the baby is already learning to love them.
        "{petName} is going to be a big sibling — the best big {speciesDescriptor}. The one who was here first. The one who knows the home best. The gentle, patient one {babyName} is already learning to love right back."
      : "{petName} is going to be a big sibling — the best big {speciesDescriptor}. The one who was here first. The one who knows the home best. The gentle, patient one the baby will learn to love right back.";
  const body = [
    "So here is something important for {petName} to know.",
    "When the new baby comes, {petName} will not be any less loved. Not for one single moment.",
    bondLine,
    "You are not being replaced, {petName}. You are being promoted.",
  ];
  if (otherPets) {
    // Template OTHER_PETS_IN_HOME = yes append for Page 5.
    body.push(
      "And {petName} won't do it alone. Every one of the home's animals gets to be a big sibling too. The more, the merrier.",
    );
  }
  return body;
}

/**
 * Compose the full Page-7 body (the `love` layout: [lead, hero]). The hero is
 * invariant ("Love does not divide. It multiplies."); the other-pets line is
 * appended into the LEAD when "yes" (so the hero keeps its fixed, quotable shape).
 * The book's closing echo lives on its own page (page8Body / `closing`), NOT folded
 * here — Page 7 is the pure master Page-7 `love` beat.
 */
function page7Body(otherPets: boolean): string[] {
  let lead =
    "Here is the most important thing of all. When a family grows, the love grows with it. There is not a smaller piece of love for {petName} now — there is more love in the whole house than there has ever been, and {petName} is right in the middle of it.";
  if (otherPets) {
    // Template OTHER_PETS_IN_HOME = yes append for Page 7.
    lead +=
      " Enough for the baby. Enough for {petName}. Enough for every furred and feathered one under this roof.";
  }
  return [lead, "Love does not divide. It multiplies."];
}

/**
 * Compose the full Page-8 (closing) body. babyStatus rewrites the middle "you are
 * loved" line: the expecting default keeps the abstract "when the baby is grown and
 * gone and grey" wording; arrived names the baby ("you and {babyName} both"). Page 8
 * has no species/other-pets variant — only babyStatus. The `closing` layout renders
 * body + the illustration, no title.
 */
function page8Body(status: BabyStatus): string[] {
  const lovedLine =
    status === "arrived"
      ? // Template arrived variant (master template line 251).
        "You are the first. You are the big {speciesDescriptor}. You are loved today, {petName} — you and {babyName} both — and you will be loved for every day that comes after."
      : "You are the first. You are the big {speciesDescriptor}. You are loved today, and you will be loved tomorrow, and you will be loved when the baby is grown and gone and grey.";
  return [
    "So don't worry, {petName}.",
    lovedLine,
    "There's room for everyone, {petName}.\nThere always was.",
  ];
}

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story9Story, id: Story9PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story9Story, id: Story9PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/** Replace the title of a page in place. */
function setTitle(story: Story9Story, id: Story9PageId, title: string): void {
  story[pageIndex(story, id)].title = title;
}

/** Replace the subtitle of a page in place. */
function setSubtitle(
  story: Story9Story,
  id: Story9PageId,
  subtitle: string,
): void {
  story[pageIndex(story, id)].subtitle = subtitle;
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-9 master text,
 * returning the still-unresolved (placeholder-carrying) page model. Each
 * variant-affected page is built WHOLE by a per-page builder (so an expecting
 * default and an arrived rewrite can never half-mix), in order: the cover subtitle
 * (arrived names the baby), the Page-1 dedication (babyStatus), You-Were-First
 * (species + other-pets), Our-Days (species sleeping line + quirks fallback),
 * Something-Changing (babyStatus + babyArrival + other-pets), Big-Sibling
 * (babyStatus + other-pets), The-Bond (babyStatus + species), Love-Grows
 * (other-pets), and the Closing (babyStatus). The covers/back-cover carry no variant
 * beyond the cover subtitle.
 * Exported so the merge layer / tests can inspect the composed-but-unresolved text;
 * `resolveStory9()` is the normal entry point.
 */
export function composeVariants9(session: Story9Session): Story9Story {
  const story = masterStory9();
  const { species } = session.pet;
  const { babyStatus, otherPetsInHome } = session.toggles;
  const { quirks } = session.memories;
  const otherPets = otherPetsInHome === "yes";
  const hasQuirks = hasSubstantial(quirks);
  const hasBabyArrival = hasSubstantial(session.babyArrival);

  // Cover subtitle: the arrived path names the baby ({babyName}); expecting names
  // the family (the master default).
  if (babyStatus === "arrived") {
    setSubtitle(story, "baby-cover", "A story for {babyName} and {petName}");
  }

  // Page 1 — dedication.
  const dedication = page1Dedication(babyStatus);
  setTitle(story, "baby-page-1", dedication.title);
  setBody(story, "baby-page-1", dedication.body);

  setBody(story, "baby-page-2", page2Body(species, otherPets));
  setBody(story, "baby-page-3", page3Body(species, hasQuirks));
  setBody(
    story,
    "baby-page-4",
    page4Body(babyStatus, otherPets, hasBabyArrival),
  );
  setBody(story, "baby-page-5", page5Body(babyStatus, otherPets));
  setBody(story, "baby-page-6", page6BondBody(species, babyStatus));
  setBody(story, "baby-page-7", page7Body(otherPets));
  setBody(story, "baby-page-8", page8Body(babyStatus));

  return story;
}

/**
 * Resolve a finalized `Story9Session` into the ordered, fully-merged
 * `ResolvedStory` the shared narrative renderer consumes with no further text
 * logic. Composes the variants, then merges the session's field values into every
 * placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token, and `{babyName}` always degrades to "the
 * new baby" rather than leaking.
 */
export function resolveStory9(session: Story9Session): ResolvedStory {
  return mergeStory9(composeVariants9(session), session);
}
