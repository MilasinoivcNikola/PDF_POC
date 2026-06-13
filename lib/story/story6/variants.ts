// Variant composition for Story 6, and the single public entry point
// `resolveStory6()`. Same compose-before-merge pattern as Story 1/2/4/5: variants
// are composed onto a fresh copy of the master text BEFORE merge, then the merge
// fields are substituted. Everything here is pure and deterministic — no IO.
//
// Story 6 is SINGLE-TENSE (present) with ONE defining toggle — there is no
// two-tense engine (that is Story 4's). The dimensions are:
//   - transitionFrame → Page 5's CLOSER paragraph (still-here default = gratitude,
//     no future; road-ahead = a single plain forward-looking sentence, death never
//     named, finitude named once)
//   - ageOrStage band → Page 2 (very-senior appends one line) and Page 5's LEAD
//     (younger-but-diagnosed softens the opener; the gratitude register is unchanged)
//   - species voice → Pages 2-4 (cat stillness / rabbit binky / bird song; other →
//     neutral default)
//   - otherPetsInHome → Page 4 (append one line when "yes")
//   - plus two sparse-input fallbacks: a blank {stillLoves} (Page 3) and a blank
//     {quirks} (Page 4) → the template's stock lines.
//
// Like Story 4/5, each variant-affected body page is BUILT WHOLE by a per-page
// builder (so a present-tense default and a road-ahead closer can never half-mix).
// The wording below is the product requirement, copied verbatim from the template
// where it supplies text. Where the template gives only a partial note (e.g. the
// cat Page-3/4 touches), the composed line is built from the default + the note's
// framing — flagged in the feature summary for the grief-counselor copy review.

import type {
  OtherPetsInHome,
  Species,
  Story6Session,
  TransitionFrame,
} from "@/lib/session/types";
import type { Story6PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory6,
  type Story6Story,
} from "@/lib/story/story6/master-text";
import { mergeStory6 } from "@/lib/story/story6/merge";

// ---------------------------------------------------------------------------
// Age-or-stage band derivation (from the free-text {ageOrStage})
// ---------------------------------------------------------------------------
//
// The wizard collects AGE_OR_STAGE as free text ("13 years young", "a grand old
// senior", "almost fifteen", "two, and facing something hard"). We derive a band
// for the page variants the template specifies: a number ≥ 15 (or an explicit
// "very senior" phrasing) is "very-senior"; a diagnosis signal without a
// senior-age signal is "younger-diagnosed"; everything else is the "senior"
// default. This is a heuristic on free text — flagged for PR 26, which could
// promote it to an explicit wizard field if the band ever matters more.

export type AgeBand = "senior" | "very-senior" | "younger-diagnosed";

/** Spelled-out / phrase signals that read as very senior (15+). */
const VERY_SENIOR_WORDS =
  /\b(fifteen|sixteen|seventeen|eighteen|nineteen|twenty|grand old|ancient|very senior|so old|old man|old lady|old girl|old boy)\b/i;

/** Signals that the pet is facing a hard/terminal diagnosis (not just old). */
const DIAGNOSIS_WORDS =
  /\b(diagnos\w*|terminal|cancer|tumou?r|illness|ill|sick|failing|hard turn|hospice|the vet said|months left|not long)\b/i;

/** The first standalone integer in the string, or null. */
function firstNumber(text: string): number | null {
  const match = text.match(/\b(\d{1,2})\b/);
  return match ? Number(match[1]) : null;
}

/**
 * Derive the age band from the free-text age-or-stage value. A number ≥ 15 (or an
 * explicit very-senior phrase) → "very-senior"; otherwise a diagnosis signal with
 * no senior-age signal → "younger-diagnosed"; otherwise the "senior" default.
 */
export function deriveAgeBand(ageOrStage: string): AgeBand {
  const text = ageOrStage.toLowerCase();
  const n = firstNumber(text);

  if ((n !== null && n >= 15) || VERY_SENIOR_WORDS.test(text)) {
    return "very-senior";
  }

  const seniorAge = n !== null && n >= 11;
  if (DIAGNOSIS_WORDS.test(text) && !seniorAge) {
    return "younger-diagnosed";
  }

  return "senior";
}

// ---------------------------------------------------------------------------
// Sparse-input fallbacks (stillLoves on Page 3, quirks on Page 4)
// ---------------------------------------------------------------------------

/** A free-text value counts as "shallow" (use the fallback) below this length. */
const MIN_LENGTH = 3;

/** Whether a free-text value is present and substantial enough to use as-is. */
function hasSubstantial(value: string | undefined): boolean {
  return value !== undefined && value.trim().length >= MIN_LENGTH;
}

/**
 * The Page-3 "ordinary days" sentence, with the {stillLoves} clause replaced by
 * the template's stock fallback when blank. {favoriteRitual} + {favoriteActivity}
 * are required, so they stay as placeholders.
 */
function page3OrdinarySentence(hasStillLoves: boolean): string {
  return hasStillLoves
    ? "{favoriteRitual}. {stillLoves}. {favoriteActivity} — slower now than it used to be, and somehow better for it."
    : // Template fallback for a blank STILL_LOVES.
      "{favoriteRitual}. The things you still love — the sun, the sound of the leash, the half-second before you realize it's me at the door. {favoriteActivity} — slower now than it used to be, and somehow better for it.";
}

/** Template stock Page-4 line replacing the "{quirks}" paragraph when blank. */
const PAGE_4_QUIRKS_FALLBACK =
  "The sounds you make when you settle. The way you find the one warm spot in any room. The look you give me that means more than most of what people say to me all day.";

// ---------------------------------------------------------------------------
// Species voice (Pages 2-4)
// ---------------------------------------------------------------------------
//
// The template gives species touches on Pages 2-4 (cat stillness, rabbit binky,
// bird song). dog (default) keeps the master wording. We compose the affected
// sentence whole per species. "other" folds to the dog default (species-neutral).

/** Page-2 "how my days are shaped" sentence, varied by species (cat gets the stillness note). */
function page2ShapeSentence(species: Species): string {
  if (species === "cat") {
    // Template cat variant for Page 2.
    return "{pronounSubjectCap} is part of how my days are shaped — the quiet that says you know I'm in the room, the weight that arrives on the bed at exactly the wrong hour and is forgiven every time, the reason I look up from what I'm doing.";
  }
  // dog (default) + rabbit/bird/other: the master wording.
  return "{pronounSubjectCap} is not a thing that happened to me. {pronounSubjectCap} is part of how my days are shaped — the first sound in the morning, the weight against the couch in the evening, the reason I look up from what I'm doing.";
}

/**
 * Page-3 species touch appended to the "ordinary days" sentence (rabbit binky /
 * bird song). dog/cat/other add nothing extra (cat's stillness is carried on Page
 * 2). Returns null when there is no species addition.
 */
function page3SpeciesLine(species: Species): string | null {
  switch (species) {
    case "rabbit":
      // Template rabbit/small-mammal variant for Page 3.
      return "The binky across the floor that's a little lower to the ground these days, and still the funniest thing I see all week.";
    case "bird":
      // Template bird variant for Page 3.
      return "The song that starts when the light hits the cage, that I would not trade for silence in any house.";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------------------

/** Compose the full Page-2 body for species × age band (very-senior appends one line). */
function page2Body(species: Species, band: AgeBand): string[] {
  const body = [
    "This is {petName}.",
    "{petName} is a {breedColor}, and {pronounSubject} is {ageOrStage}.",
    page2ShapeSentence(species),
    "I want to say it plainly, while I can say it to your face: you are one of the best things in my life.",
  ];
  if (band === "very-senior") {
    // Template very-senior (15+) append for Page 2.
    body.push(
      "You have been with me a long time. Long enough that I can't quite remember the shape of the house before you. I don't want to.",
    );
  }
  return body;
}

/** Compose the full Page-3 body for species + the stillLoves fallback. */
function page3Body(species: Species, hasStillLoves: boolean): string[] {
  const body = [
    "Here is the truth about us: most of it is small.",
    page3OrdinarySentence(hasStillLoves),
    "I used to think the big days were the ones that counted. The trips, the firsts, the photographs. But it's the ordinary days I'd keep, if I could only keep some. The four o'clock light. Your breathing in the next room. The way the day has a shape because you're in it.",
  ];
  const speciesLine = page3SpeciesLine(species);
  if (speciesLine) {
    // Insert the species touch right after the ordinary-days sentence.
    body.splice(2, 0, speciesLine);
  }
  return body;
}

/** Compose the full Page-4 body for the quirks fallback + the other-pets line. */
function page4Body(hasQuirks: boolean, otherPets: boolean): string[] {
  const body = [
    "No one else in the world does the things you do.",
    hasQuirks ? "{quirks}" : PAGE_4_QUIRKS_FALLBACK,
    "I notice them more now. The small, specific, ridiculous, entirely-yours things. I used to let them pass without looking. I look now. I am paying attention, on purpose, to exactly who you are.",
  ];
  if (otherPets) {
    // Template OTHER_PETS_IN_HOME = yes append for Page 4.
    body.push(
      "The others in this house know you too. They feel the shape of you in the room, the same way I do. We are all paying attention.",
    );
  }
  return body;
}

/**
 * Compose the full Page-5 body (the `love` layout: [lead, hero, closer]). The age
 * band sets the LEAD (younger-diagnosed softens the opener); the transition frame
 * sets the CLOSER (still-here = gratitude, no future; road-ahead = a single
 * forward-looking paragraph, death never named, finitude named once). The hero is
 * invariant.
 */
function page5Body(band: AgeBand, frame: TransitionFrame): string[] {
  const lead =
    band === "younger-diagnosed"
      ? // Template younger-but-diagnosed softened opener (gratitude unchanged).
        "You came to a hard turn earlier than either of us expected. {ageOrStage}, and facing something neither of us chose."
      : // Default opener (senior / very-senior).
        "You're in the gentle part of a long life now. {ageOrStage}, and slower, and softer at the edges. I'm not going to pretend I don't notice.";

  const hero =
    "But I'm not going to spend the time we have being afraid of the time we don't.";

  const closer =
    frame === "road-ahead"
      ? // Template road-ahead variant: the ONLY place the future is named. Named
        // plainly, once; no euphemism; death itself never named.
        "I know the road ahead is shorter than the one behind us. I'm not going to look away from that. But I'm not going to live there, either. The road still has us on it today. So today, I'm choosing to be glad — glad it was you, glad it's still you, glad of every ordinary afternoon we get, for as long as we get them."
      : // still-here default: gratitude, with NO mention of the future.
        "So this is what I'm choosing instead: to be glad. Glad it was you. Glad it's still you. Glad of every ordinary afternoon that we get to have, for as long as we get to have them.";

  return [lead, hero, closer];
}

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story6Story, id: Story6PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story6Story, id: Story6PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-6 master text,
 * returning the still-unresolved (placeholder-carrying) page model. Each
 * variant-affected body page is built WHOLE by a per-page builder (so the present
 * tense never half-leaks and the road-ahead closer never mixes with the still-here
 * one), in order: who-you-are (species × age band), ordinary-days (species +
 * stillLoves fallback), the-things-only-you-do (quirks fallback + other-pets), and
 * what-this-season-is (age band lead × transition-frame closer). Pages 1, 6 and the
 * covers carry no variant. Exported so the merge layer / tests can inspect the
 * composed-but-unresolved text; `resolveStory6()` is the normal entry point.
 */
export function composeVariants6(session: Story6Session): Story6Story {
  const story = masterStory6();
  const { species } = session.pet;
  const { transitionFrame, otherPetsInHome } = session.toggles;
  const { ageOrStage, stillLoves, quirks } = session.memories;

  const band = deriveAgeBand(ageOrStage ?? "");
  const hasStillLoves = hasSubstantial(stillLoves);
  const hasQuirks = hasSubstantial(quirks);

  setBody(story, "tribute-page-2", page2Body(species, band));
  setBody(story, "tribute-page-3", page3Body(species, hasStillLoves));
  setBody(
    story,
    "tribute-page-4",
    page4Body(hasQuirks, otherPetsInHome === "yes"),
  );
  setBody(story, "tribute-page-5", page5Body(band, transitionFrame));

  return story;
}

/**
 * Resolve a finalized `Story6Session` into the ordered, fully-merged
 * `ResolvedStory` the shared narrative renderer consumes with no further text
 * logic. Composes the variants, then merges the session's field values into every
 * placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token.
 */
export function resolveStory6(session: Story6Session): ResolvedStory {
  return mergeStory6(composeVariants6(session), session);
}
