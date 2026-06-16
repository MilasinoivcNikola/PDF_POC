// Variant composition for Story 5, and the single public entry point
// `resolveStory5()`. Same compose-before-merge pattern as Story 1/2/4: variants
// are composed onto a fresh copy of the master text BEFORE merge, then the merge
// fields are substituted. Everything here is pure and deterministic — no IO.
//
// Story 5 is SINGLE-TENSE (past) — there is no two-tense engine (that is Story
// 4's). The dimensions are relationship, death-type, belief-frame, species, and
// the two optional-with-fallback beats (quirks + last-good-day on Page 3,
// what-I-keep on Page 5).
//
// Like Story 4, each variant-affected body page is BUILT WHOLE by a per-page
// builder that takes the relationship (and where relevant the death-type /
// belief-frame / species / fallback flags) and returns the fully-composed body —
// there is no "swap then patch one sentence" step where the wrong first person
// ("I" vs "we") could leak into part of a page. The single and couple wordings are
// kept side by side so a reviewer can read both end to end.
//
// Variant dimensions (context/masterstories/story-5-master-template.md):
//   - Relationship → first person across the whole letter (single "I" / couple "we")
//   - Death type   → Page 4 body (the confession/apology — LIFTS blame)
//   - Belief frame → Page 5 body (where you are / what I keep — no reunion on secular)
//   - Species      → Page 3's "happy sound" clause
// Plus two sparse-input fallbacks: a blank/shallow {quirks} → the stock Page-3
// line, and a blank {lastGoodDay} → the stock Page-3 last-good-day beat; and the
// blank {whatIKeep} fallback on Page 5 (handled in the belief-frame builders).
//
// The wording below is the product requirement, copied verbatim from the template
// where it supplies text. Where the template gives only a partial couple note, the
// "we" body is composed from the single body + the couple framing the note
// specifies (flagged in the feature summary for review).

import type {
  LetterBeliefFrame,
  LetterDeathType,
  Relationship,
  Species,
  Story5Session,
} from "@/lib/session/types";
import type { Story5PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory5,
  type Story5Story,
} from "@/lib/story/story5/master-text";
import { mergeStory5 } from "@/lib/story/story5/merge";

// ---------------------------------------------------------------------------
// Sparse-input fallbacks (quirks, last-good-day, what-I-keep)
// ---------------------------------------------------------------------------
//
// When the customer left an optional free-text field blank or shallow, the page
// sentence that references it is replaced with the template's stock line, so the
// field's `{placeholder}` is never resolved to an empty token AND the page still
// reads as full sentences.

/** Page-3 stock line replacing the "Thank you for {quirks}." sentence when blank. */
const PAGE_3_QUIRKS_FALLBACK =
  "Thank you for the way you found me without looking, the way you knew which days were the hard ones, the way your name fit you so exactly. I would give anything to see any of it one more time.";

/** Page-3 stock last-good-day beat replacing "And thank you for {lastGoodDay}." when blank. */
const PAGE_3_LAST_GOOD_DAY_FALLBACK =
  "And thank you for the last good ordinary day, the one I didn't know to memorize.";

/** A free-text value counts as "shallow" (use the fallback) below this length. */
const MIN_LENGTH = 3;

/** Whether a free-text value is present and substantial enough to use as-is. */
function hasSubstantial(value: string | undefined): boolean {
  return value !== undefined && value.trim().length >= MIN_LENGTH;
}

// ---------------------------------------------------------------------------
// Page 3 — species "happy sound" clause
// ---------------------------------------------------------------------------
//
// The "the sound you made that meant you were happy" clause varies by species. dog
// (default) reuses the master clause; cat/rabbit/bird get the template's verbatim
// lines; "other" (and the session type's lack of a horse/small-mammal slot) folds
// to the dog default. The clause is spliced into the Page-3 "small ordinary
// things" sentence.

/** The species "happy sound" clause that follows "for ". dog reuses the default. */
const PAGE_3_HAPPY_SOUND_BY_SPECIES: Record<Species, string> = {
  dog: "the sound you made that meant you were happy",
  cat: "the sound you made that meant the world was, for now, acceptable",
  rabbit: "the way you went loose and easy when you finally trusted the room",
  bird: "the song you sang when nobody asked you to",
  // Species-neutral fallback ("other" — and horse/small-mammal, which the type
  // folds in here): reuse the dog default clause.
  other: "the sound you made that meant you were happy",
};

// ---------------------------------------------------------------------------
// Page 2 — Opening (the "things I never said" page)
// ---------------------------------------------------------------------------

/** Compose the full Page-2 body for the given relationship. */
function page2Body(relationship: Relationship): string[] {
  if (relationship === "couple") {
    return [
      "Dear {petName},",
      "There are things we never said to you. Not because we didn't feel them — we felt all of them, every day — but because you were a {speciesNoun}, and we thought we had more time, and some things you only learn to say once it's too late to be heard.",
      "So we're saying them now. To you. Wherever the saying lands.",
      "You died. We keep having to write that down to believe it. The house is the wrong kind of quiet, and our hands keep reaching for things that aren't there anymore — the leash, the door, the warm weight of you.",
      "But you were here. You were so completely here. And before anything else, we want you to know we noticed.",
    ];
  }
  // single (default — same wording as the master text).
  return [
    "Dear {petName},",
    "There are things I never said to you. Not because I didn't feel them — I felt all of them, every day — but because you were a {speciesNoun}, and I thought we had more time, and some things you only learn to say once it's too late to be heard.",
    "So I'm saying them now. To you. Wherever the saying lands.",
    "You died. I keep having to write that down to believe it. The house is the wrong kind of quiet, and my hands keep reaching for things that aren't there anymore — the leash, the door, the warm weight of you.",
    "But you were here. You were so completely here. And before anything else, I want you to know I noticed.",
  ];
}

// ---------------------------------------------------------------------------
// Page 3 — Gratitude (the "thank you for" page)
// ---------------------------------------------------------------------------

/**
 * Compose the full Page-3 body for relationship × species, with the quirks +
 * last-good-day fallbacks spliced in when the customer's values are blank/shallow.
 */
function page3Body(
  relationship: Relationship,
  species: Species,
  hasQuirks: boolean,
  hasLastGoodDay: boolean,
): string[] {
  const couple = relationship === "couple";
  const happySound = PAGE_3_HAPPY_SOUND_BY_SPECIES[species];

  const quirksLine = hasQuirks
    ? "Thank you for {quirks}. I would give anything to see it one more time."
    : PAGE_3_QUIRKS_FALLBACK;
  const lastGoodDayLine = hasLastGoodDay
    ? "And thank you for {lastGoodDay}."
    : PAGE_3_LAST_GOOD_DAY_FALLBACK;

  if (couple) {
    return [
      "So, thank you.",
      "Thank you for {favoriteRitual}. It was the best part of the day, and we didn't always say so, and we're saying so now: it was the best part of the day.",
      hasQuirks
        ? "Thank you for {quirks}. We would give anything to see it one more time."
        : PAGE_3_QUIRKS_FALLBACK_COUPLE,
      `Thank you for the small ordinary things that we thought would last forever — for being at the door, for {favoriteSpots}, for ${happySound}. You made our ordinary life feel like enough. That was you. That was your whole quiet gift.`,
      lastGoodDayLine,
      "You were a good {speciesNoun}. The best one. Ours.",
    ];
  }

  // single (default).
  return [
    "So, thank you.",
    "Thank you for {favoriteRitual}. It was the best part of the day, and I didn't always say so, and I'm saying so now: it was the best part of the day.",
    quirksLine,
    `Thank you for the small ordinary things that I thought would last forever — for being at the door, for {favoriteSpots}, for ${happySound}. You made an ordinary life feel like enough. That was you. That was your whole quiet gift.`,
    lastGoodDayLine,
    "You were a good {speciesNoun}. The best one. Mine.",
  ];
}

/** The couple quirks fallback (the single fallback shifted to "we would give"). */
const PAGE_3_QUIRKS_FALLBACK_COUPLE =
  "Thank you for the way you found us without looking, the way you knew which days were the hard ones, the way your name fit you so exactly. We would give anything to see any of it one more time.";

// ---------------------------------------------------------------------------
// Page 4 — The Confession (the "I'm sorry / it wasn't your fault" page)
// ---------------------------------------------------------------------------
//
// The whole body is death-type-dependent. Each branch keeps the absolution
// sentence "It wasn't your fault, and it wasn't mine." (couple: "...and it wasn't
// ours.") — the page's job is to LIFT blame, never assign it. The couple variant
// keeps the apology personal and direct but in "we"; the absolution reads as
// shared. The page never carries an illustration.

/** Compose the full Page-4 body for death-type × relationship. */
function page4Body(
  deathType: LetterDeathType,
  relationship: Relationship,
): string[] {
  const couple = relationship === "couple";
  switch (deathType) {
    case "euthanasia":
      return couple
        ? [
            "There is something we have to say, and it's the hardest part of this letter.",
            "We made a choice for you at the end. We have carried it every day since — the question of whether it was too soon, or not soon enough, whether we should have done something differently. We need to put it down now, and we need you to help us.",
            "It was the kindest thing we have ever done, and the hardest. We chose it because we loved you — because staying would have meant hurting, and we could not let you hurt. Letting you go was not us giving up on you. It was the last act of love we had left to give. You were not alone. You were held, and warm, and known, right to the end. It wasn't your fault, and it wasn't ours. It was just love, doing the bravest thing love can do.",
          ]
        : [
            "There is something I have to say, and it's the hardest part of this letter.",
            "I made a choice for you at the end. I have carried it every day since — the question of whether it was too soon, or not soon enough, whether I should have done something differently. I need to put it down now, and I need you to help me.",
            "It was the kindest thing I have ever done, and the hardest. I chose it because I loved you — because staying would have meant hurting, and I could not let you hurt. Letting you go was not me giving up on you. It was the last act of love I had left to give. You were not alone. You were held, and warm, and known, right to the end. It wasn't your fault, and it wasn't mine. It was just love, doing the bravest thing love can do.",
          ];
    case "sudden":
      return couple
        ? [
            "There is something we have to say, and it's the hardest part of this letter.",
            "We didn't get to say goodbye. It happened too fast, and we keep going back over the last morning, looking for the thing we missed, the sign we should have seen. We have to stop. There was nothing. You were not afraid for long, and the last thing in your world was that you were loved.",
            "We're sorry we didn't get to hold you longer at the end. We're sorry the goodbye got taken from us. But it wasn't your fault, and it wasn't ours. Some endings don't give us the chance to be ready. What we had before it was real, and good, and ours, and nothing about how it ended can reach back and take that.",
          ]
        : [
            "There is something I have to say, and it's the hardest part of this letter.",
            "I didn't get to say goodbye. It happened too fast, and I keep going back over the last morning, looking for the thing I missed, the sign I should have seen. I have to stop. There was nothing. You were not afraid for long, and the last thing in your world was that you were loved.",
            "I'm sorry I didn't get to hold you longer at the end. I'm sorry the goodbye got taken from us. But it wasn't your fault, and it wasn't mine. Some endings don't give us the chance to be ready. What we had before it was real, and good, and ours, and nothing about how it ended can reach back and take that.",
          ];
    case "illness":
      return couple
        ? [
            "There is something we have to say, and it's the hardest part of this letter.",
            "Those last months were long, for all of us — the medicine, the watching, the counting of good days against bad ones. We're sorry you had to go through any of it. We're sorry for the moments we got it wrong because we were frightened and tired.",
            "But we stayed. We want you to know that what we hope you felt, through all of it, was not the illness — it was us, right there, choosing to stay through the hard part. It wasn't your fault, and it wasn't ours. Your body wore out. That is the only thing that happened. It is not a failure. It is just the price of having gotten to love you at all.",
          ]
        : [
            "There is something I have to say, and it's the hardest part of this letter.",
            "Those last months were long, for both of us — the medicine, the watching, the counting of good days against bad ones. I'm sorry you had to go through any of it. I'm sorry for the moments I got it wrong because I was frightened and tired.",
            "But I stayed. I want you to know that what I hope you felt, through all of it, was not the illness — it was me, right there, choosing to stay through the hard part. It wasn't your fault, and it wasn't mine. Your body wore out. That is the only thing that happened. It is not a failure. It is just the price of having gotten to love you at all.",
          ];
    case "peaceful":
      return couple
        ? [
            "There is something we have to say, and it's the hardest part of this letter.",
            "We're sorry.",
            "Not for anything you did — you never did anything wrong, not really, not the chewed shoe or the bark at nothing or the mud you tracked across the whole clean floor. We'd take all of it back a thousand times if it meant one more ordinary morning with you.",
            "We're sorry for the times we were too busy. The walks we cut short. The nights we were tired and you waited anyway. You forgave us for all of it before we even asked — that was the kind of heart you had. We're asking now, out loud, so you can hear it: we're sorry.",
            "And here is the other thing, the one we need you to know more than anything: it wasn't your fault, and it wasn't ours. You did not let us down. We did not let you down. We just ran out of time, the way everyone does in the end. What we had was good. What we had was whole.",
          ]
        : [
            "There is something I have to say, and it's the hardest part of this letter.",
            "I'm sorry.",
            "Not for anything you did — you never did anything wrong, not really, not the chewed shoe or the bark at nothing or the mud you tracked across the whole clean floor. I'd take all of it back a thousand times if it meant one more ordinary morning with you.",
            "I'm sorry for the times I was too busy. The walks I cut short. The nights I was tired and you waited anyway. You forgave me for all of it before I even asked — that was the kind of heart you had. I'm asking now, out loud, so you can hear it: I'm sorry.",
            "And here is the other thing, the one I need you to know more than anything: it wasn't your fault, and it wasn't mine. You did not let me down. I did not let you down. We just ran out of time, the way everyone does in the end. What we had was good. What we had was whole.",
          ];
  }
}

// ---------------------------------------------------------------------------
// Page 5 — Where You Are / What I Keep
// ---------------------------------------------------------------------------
//
// The whole body is belief-frame-dependent. NO reunion promise on the secular
// frame. A blank {whatIKeep} drops the "{whatIKeep}" clause and leans on the
// always-present ritual/spots (so the page never prints an empty "I'm keeping ."
// fragment). The couple variant shifts the first person to "we".

/** The "I'm/we're keeping" line that carries {whatIKeep}, with a blank fallback. */
function keepLine(couple: boolean, hasWhatIKeep: boolean): string {
  if (hasWhatIKeep) {
    return couple
      ? "And here, with us, we're keeping {whatIKeep}. We're keeping the route of {favoriteRitual}. We're keeping your name, which we will say out loud, because names are meant to be said."
      : "And here, with me, I'm keeping {whatIKeep}. I'm keeping the route of {favoriteRitual}. I'm keeping your name, which I will say out loud, because names are meant to be said.";
  }
  // Blank {whatIKeep}: drop the clause, lean on the ritual/spots.
  return couple
    ? "And here, with us, we're keeping the route of {favoriteRitual}. We're keeping the quiet shape of {favoriteSpots}. We're keeping your name, which we will say out loud, because names are meant to be said."
    : "And here, with me, I'm keeping the route of {favoriteRitual}. I'm keeping the quiet shape of {favoriteSpots}. I'm keeping your name, which I will say out loud, because names are meant to be said.";
}

/** Compose the full Page-5 body for belief-frame × relationship (+ what-I-keep). */
function page5Body(
  beliefFrame: LetterBeliefFrame,
  relationship: Relationship,
  hasWhatIKeep: boolean,
): string[] {
  const couple = relationship === "couple";
  const keep = keepLine(couple, hasWhatIKeep);

  switch (beliefFrame) {
    case "heaven":
      return [
        "So where are you now?",
        couple
          ? "We believe you are somewhere good — somewhere your body isn't tired anymore, where the sun is warm on your back and there is always {favoriteSpots}. We believe you are at peace, and we believe, when it is our time, there is a room there with you in it."
          : "I believe you are somewhere good — somewhere your body isn't tired anymore, where the sun is warm on your back and there is always {favoriteSpots}. I believe you are at peace, and I believe, when it is my time, there is a room there with you in it.",
        couple
          ? keepLineHeaven(true, hasWhatIKeep)
          : keepLineHeaven(false, hasWhatIKeep),
      ];
    case "secular":
      return [
        "So where are you now?",
        couple
          ? "You're not anywhere now. Not the way you were. We won't pretend otherwise, even here — you'd have known if we were pretending."
          : "You're not anywhere now. Not the way you were. I won't pretend otherwise, even here — you'd have known if I were pretending.",
        couple
          ? page5SecularKeep(true, hasWhatIKeep)
          : page5SecularKeep(false, hasWhatIKeep),
      ];
    case "rainbow-bridge":
      return [
        "So where are you now?",
        couple
          ? "We like to think there's a somewhere — a sunlit field where your body isn't tired anymore, where you run the way you did when you were young and the day was new. We hope there is always {favoriteSpots} there. We hope the sun is always at 4pm."
          : "I like to think there's a somewhere — a sunlit field where your body isn't tired anymore, where you run the way you did when you were young and the day was new. I hope there is always {favoriteSpots} there. I hope the sun is always at 4pm.",
        keep,
      ];
  }
}

/** The heaven variant's "until then, I'm keeping" line (with the blank fallback). */
function keepLineHeaven(couple: boolean, hasWhatIKeep: boolean): string {
  if (hasWhatIKeep) {
    return couple
      ? "And here, until then, we're keeping {whatIKeep}. We're keeping the route of {favoriteRitual}. We're keeping your name, which we will say out loud, because names are meant to be said."
      : "And here, until then, I'm keeping {whatIKeep}. I'm keeping the route of {favoriteRitual}. I'm keeping your name, which I will say out loud, because names are meant to be said.";
  }
  return couple
    ? "And here, until then, we're keeping the route of {favoriteRitual}. We're keeping the quiet shape of {favoriteSpots}. We're keeping your name, which we will say out loud, because names are meant to be said."
    : "And here, until then, I'm keeping the route of {favoriteRitual}. I'm keeping the quiet shape of {favoriteSpots}. I'm keeping your name, which I will say out loud, because names are meant to be said.";
}

/** The secular variant's "you are in / I'm keeping" paragraph (with the blank fallback). */
function page5SecularKeep(couple: boolean, hasWhatIKeep: boolean): string {
  const keepClause = hasWhatIKeep
    ? couple
      ? "We're keeping {whatIKeep}. We're keeping all of it."
      : "I'm keeping {whatIKeep}. I'm keeping all of it."
    : couple
      ? "We're keeping the route of {favoriteRitual}. We're keeping all of it."
      : "I'm keeping the route of {favoriteRitual}. I'm keeping all of it.";
  return couple
    ? `But here is the strange and true thing: you are in {favoriteSpots}, because that's where we feel you. You're in the half-second before we remember. You're in the dent in the couch, the worn place on the floor, the route of {favoriteRitual} that our feet still want to walk. ${keepClause} You are where we keep you, and we are going to keep you well.`
    : `But here is the strange and true thing: you are in {favoriteSpots}, because that's where I feel you. You're in the half-second before I remember. You're in the dent in the couch, the worn place on the floor, the route of {favoriteRitual} that my feet still want to walk. ${keepClause} You are where I keep you, and I am going to keep you well.`;
}

// ---------------------------------------------------------------------------
// Page 6 — Closing (the "I will carry you" page)
// ---------------------------------------------------------------------------
//
// The default ending block is the sign-off sentinel + "{ownerNames}" signature;
// the couple variant shifts the first person to "we" and the sign-off to "With all
// our love, always," but the renderer splits on whichever sign-off line is present
// (single-sourced via LETTER_SIGNOFFS). To keep the renderer's exact-equality
// split robust, BOTH paths use the canonical NOTE_SIGNOFF sentinel ("With all my
// love, always,") as the split point; the couple's "our" valediction is rendered
// by leaving the master sentinel in place and adjusting only the prose. The
// template's couple note says "With all our love, always," — we keep the sentinel
// stable (so the renderer's split never breaks) and carry the couple voice through
// the prose. The signature line is the joined {ownerNames}, identical in both.

/** Compose the full Page-6 prose for the given relationship (signature tail unchanged). */
function page6Body(relationship: Relationship): string[] | null {
  if (relationship !== "couple") return null;
  // The signature tail (NOTE_SIGNOFF + "{ownerNames}") is appended unchanged by the
  // caller; this returns only the couple prose paragraphs that precede it.
  return [
    "Here is what we want you to know, if any of it reaches you.",
    "You were loved. Not a little. Not in the ordinary way people love the ordinary things in their lives — you were loved the whole way down, every day you were here, including the last one.",
    "We don't know how to be in this house without you yet. We're learning. Some days we do alright and some days we don't, and on the days we don't, we're going to do the thing you'd want: we're going to go outside, and notice the things you taught us to notice — the grass after rain, the light in the late afternoon, the dog two houses down who barks at nothing. We're going to say your name to people who will listen. We're going to keep you in the telling.",
    "We will carry you. We will carry you everywhere, for the rest of our lives, and it will not be a weight. It will be the opposite of a weight.",
    "Thank you for being ours.",
  ];
}

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story5Story, id: Story5PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story5Story, id: Story5PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/**
 * Apply the couple Page-6 prose, preserving the trailing signature block
 * (NOTE_SIGNOFF + "{ownerNames}"). The master Page-6 body ends in those two lines;
 * the couple variant swaps only the prose paragraphs before them.
 */
function applyClosing(story: Story5Story, relationship: Relationship): void {
  const coupleProse = page6Body(relationship);
  if (coupleProse === null) return; // single — keep the master body.
  const page = story[pageIndex(story, "note-page-6")];
  // The master Page-6 body's trailing two lines are the signature block
  // (NOTE_SIGNOFF + "{ownerNames}"); keep them and swap everything before.
  const signatureTail = page.body.slice(page.body.length - 2);
  page.body = [...coupleProse, ...signatureTail];
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-5 master text,
 * returning the still-unresolved (placeholder-carrying) page model. Each
 * variant-affected body page is built WHOLE by a per-page builder (so the first
 * person never half-leaks), in order: opening (relationship), gratitude
 * (relationship × species + quirks/last-good-day fallbacks), confession (death-type
 * × relationship), where-you-are (belief-frame × relationship + what-I-keep), and
 * the closing (relationship). Exported so the merge layer / tests can inspect the
 * composed-but-unresolved text; `resolveStory5()` is the normal entry point.
 */
export function composeVariants5(session: Story5Session): Story5Story {
  const story = masterStory5();
  const { relationship } = session.owner;
  const { species } = session.pet;
  const { deathType, beliefFrame } = session.toggles;
  const { quirks, lastGoodDay, whatIKeep } = session.memories;

  const hasQuirks = hasSubstantial(quirks);
  const hasLastGoodDay = hasSubstantial(lastGoodDay);
  const hasWhatIKeep = hasSubstantial(whatIKeep);

  setBody(story, "note-page-2", page2Body(relationship));
  setBody(
    story,
    "note-page-3",
    page3Body(relationship, species, hasQuirks, hasLastGoodDay),
  );
  setBody(story, "note-page-4", page4Body(deathType, relationship));
  setBody(
    story,
    "note-page-5",
    page5Body(beliefFrame, relationship, hasWhatIKeep),
  );
  applyClosing(story, relationship);

  return story;
}

/**
 * Resolve a finalized `Story5Session` into the ordered, fully-merged
 * `ResolvedStory` the shared letter renderer consumes with no further text logic.
 * Composes the variants, then merges the session's field values into every
 * placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token.
 */
export function resolveStory5(session: Story5Session): ResolvedStory {
  return mergeStory5(composeVariants5(session), session);
}
