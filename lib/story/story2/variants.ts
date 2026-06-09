// Variant composition for Story 2, and the single public entry point
// `resolveStory2()`. Same pattern as Story 1 (lib/story/variants.ts): variants
// are composed onto a fresh copy of the master text BEFORE merge — swap/adjust
// the right page bodies based on the session's relationship / death type / belief
// frame / species / new-pet / gift-for, then substitute the merge fields.
// Everything here is pure and deterministic — no IO.
//
// Six variant dimensions (context/masterstories/story-2-master-template.md):
//   - Relationship → addressing throughout (single default / couple → "you both")
//   - Death type   → Page 4 body
//   - Belief frame → Page 5 body
//   - Species      → Pages 3 (the "kind of happy" line) and Page 2 (cat stillness)
//   - New pet      → Page 6 (one extra paragraph before the always-included ending)
//   - Gift-for     → cover inscription (sympathy-gift context)
// Plus a sparse-input fallback: a blank/shallow {quirks} → the stock sentences.
//
// The wording below is the product requirement, copied verbatim from the template
// where it supplies text. The default master body already covers: relationship
// "single", deathType "peaceful", beliefFrame "rainbow-bridge", a dog voice,
// newPet "no", giftFor "self" — so those need no swap.

import type {
  GiftFor,
  LetterBeliefFrame,
  LetterDeathType,
  Relationship,
  Species,
  Story2Session,
} from "@/lib/session/types";
import type { Story2PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory2,
  type Story2Story,
} from "@/lib/story/story2/master-text";
import { mergeStory2 } from "@/lib/story/story2/merge";

// ---------------------------------------------------------------------------
// Page 2 — Opening (relationship × cat species)
// ---------------------------------------------------------------------------
//
// The opening has two independent dimensions: relationship (you / you both) and
// the cat "stillness" variant of the "I had something better" line. The template
// supplies single-dog, single-cat and couple-dog verbatim; the couple-cat line is
// composed from those two (couple framing + cat stillness) — flagged in the
// feature summary for review. dog/rabbit/bird/other keep the default (dog) line.

/**
 * Page-2 salutation. Intentionally relationship-invariant: the couple address
 * ("Dear Sarah and David,") already lives in {ownerNames}, so single and couple
 * share one salutation. The "you both" differentiation is carried by
 * page2PenLine / page2SenseLine, not here.
 */
function page2Salutation(): string {
  return "Dear {ownerNames},";
}

/** Page-2 "if I could have held a pen" line by relationship. */
function page2PenLine(relationship: Relationship): string {
  return relationship === "couple"
    ? "If I could have held a pen, this is the letter I would have written you both."
    : "If I could have held a pen, this is the letter I would have written you.";
}

/** Page-2 "I had something better" paragraph by relationship × (cat | other). */
function page2SenseLine(relationship: Relationship, isCat: boolean): string {
  if (relationship === "couple") {
    return isCat
      ? "I didn't have words while I was with you. I had something better — eyes that knew which of you needed me on any given day, the kind of stillness that said I knew you were there, and a heart that was always, always pointed at you both (even when I pretended otherwise)."
      : "I didn't have words while I was with you. I had something better — eyes that knew which of you needed me on any given day, ears that heard both cars before anyone else's, and a heart that was always, always pointed at you both.";
  }
  return isCat
    ? "I didn't have words while I was with you. I had something better — eyes that knew when you were sad, the kind of stillness that said I knew you were there, and a heart that was always, always pointed at you (even when I pretended otherwise)."
    : "I didn't have words while I was with you. I had something better — eyes that knew when you were sad, ears that heard your car before anyone else's, and a heart that was always, always pointed at you.";
}

/** Compose the full Page-2 body for the given relationship + species. */
function page2Body(relationship: Relationship, species: Species): string[] {
  return [
    page2Salutation(),
    page2PenLine(relationship),
    page2SenseLine(relationship, species === "cat"),
    "But now I have something like words. And there are things I want you to know.",
  ];
}

// ---------------------------------------------------------------------------
// Page 3 — Gratitude: the "kind of happy" closing paragraph, by species
// ---------------------------------------------------------------------------
//
// Replaces the whole 4th paragraph so the species-specific "kind of happy" clause
// reads cleanly. dog = default; cat/rabbit/bird get the template's verbatim lines;
// "other" gets a species-neutral fallback (the type has no horse/small-mammal —
// those template lines fold into the generic fallback).

/** Page-3 "happy" paragraph for each species. dog reuses the master default (null). */
const PAGE_3_HAPPY_BY_SPECIES: Record<Species, string | null> = {
  dog: null,
  cat: "I want you to know that I was happy. Not just fine. Not just okay. Happy — the kind of happy that loaf-shapes in a sunbeam and decides nothing else needs to happen today. You gave me that. That was you.",
  rabbit:
    "I want you to know that I was happy. Not just fine. Not just okay. Happy — the kind of happy that binkies across the floor for no reason at all. You gave me that. That was you.",
  bird: "I want you to know that I was happy. Not just fine. Not just okay. Happy — the kind of happy that sings when nobody asked. You gave me that. That was you.",
  // Species-neutral fallback for "other" (the session type has no horse / small
  // mammal / reptile slot, so they fold into this generic line).
  other:
    "I want you to know that I was happy. Not just fine. Not just okay. Happy — the kind of happy that needs no reason and doesn't need explaining. You gave me that. That was you.",
};

// The quirks fallback, used when the customer left {quirks} blank or it is too
// shallow to carry the page. Verbatim from the template. Replaces the whole
// "I noticed when you came home tired..." paragraph so {quirks} is never resolved
// to an empty token AND the page still reads as full sentences.
const PAGE_3_QUIRKS_FALLBACK =
  "I noticed when you came home tired and sat on the floor with me instead of changing your clothes. I noticed when you talked to me in your real voice — the one nobody else got to hear. I noticed the way you always saved a bite for me, even when you said you wouldn't. The way you used my full name when you were pretending to be mad. The way your hand found my head without looking.";

/** A quirks value counts as "shallow" (use the fallback) below this length. */
const QUIRKS_MIN_LENGTH = 3;

// ---------------------------------------------------------------------------
// Page 4 — The Goodbye, by death type
// ---------------------------------------------------------------------------
//
// "peaceful" reuses the master body (null). The template gives each death type a
// single replacement paragraph for the "I know" section; we keep the opening
// "I know how it ended." and the closing "I was loved every day..." stable and
// swap the middle, matching the master structure. This page is NEVER funny.

const PAGE_4_OPENING = "I know how it ended.";
const PAGE_4_CLOSING =
  "I was loved every day of my life. I was warm, and full, and safe, and known. There is nothing more any of us can ask for.";

/** Page-4 middle paragraph(s) for each death type. "peaceful" reuses master (null). */
const PAGE_4_MIDDLE_BY_DEATH_TYPE: Record<LetterDeathType, string | null> = {
  // Default master body — no swap.
  peaceful: null,
  euthanasia:
    "I know what it cost you to make the choice you made for me. I know you carried it home alone in your chest, and you carry it still. But I want to tell you: it was the kindest thing anyone has ever done for me. You loved me enough to let me go, when staying would have meant hurting. That is the bravest love there is.",
  sudden:
    "I know we didn't get the goodbye we wanted. I know it happened too fast, and you keep replaying the last morning, looking for something you missed. Stop. There was nothing. The last thing I felt was being loved. That's enough. That's everything.",
  illness:
    "I know how hard those last months were on you — the medicine, the watching, the worrying. I want you to know that what I felt was not the pain. What I felt was you, beside me, choosing to stay through the hard part. That is what I will remember.",
};

// ---------------------------------------------------------------------------
// Page 5 — Where I Am Now, by belief frame
// ---------------------------------------------------------------------------

/** Page-5 body for each belief frame. "rainbow-bridge" reuses the master body (null). */
const PAGE_5_BY_BELIEF_FRAME: Record<LetterBeliefFrame, string[] | null> = {
  // Default master body — no swap.
  "rainbow-bridge": null,
  heaven: [
    "Wherever I am now, I am not tired. I am not hurting. The body that wore out at the end is not the body I have here. The sun feels good. Somewhere there is always {favoriteSpots}. And whatever heaven turns out to be, it has a room for me — and someday, when it's time, a room beside me for you.",
  ],
  secular: [
    "I'm not anywhere now. Not the way I used to be.",
    "But here is the strange and true thing: I am in {favoriteSpots}, because that's where you'll feel me. I am in the sound the leash made on the hook. I am in the half-second before you remember I'm not there to greet you. I am in the way your hand still goes to the spot on the couch.",
    "I am where you keep me. That is more than enough.",
  ],
};

// ---------------------------------------------------------------------------
// Page 6 — Closing: the new-pet extra paragraph
// ---------------------------------------------------------------------------

/** The extra Page-6 paragraph, inserted before the always-included ending. */
const PAGE_6_NEW_PET =
  "And if, one day, you let another animal sleep in {favoriteSpots} — that's okay too. I left my warmth there for them. There's room. Loving them won't replace me. It can't. It just means your heart is doing exactly what it was built to do.";

// ---------------------------------------------------------------------------
// Cover — gift-for inscription
// ---------------------------------------------------------------------------
//
// For a sympathy gift the letter is still written TO the bereaved owner; per the
// template only a small inscription notes the gift context. We add it as the
// cover's subtitle tail (the letter body is untouched, always the owner's).

const COVER_GIFT_INSCRIPTION = "A keepsake, given with love.";

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story2Story, id: Story2PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story2Story, id: Story2PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/** Replace a single body paragraph (by index) in place. */
function setParagraph(
  story: Story2Story,
  id: Story2PageId,
  index: number,
  text: string,
): void {
  story[pageIndex(story, id)].body[index] = text;
}

/** Whether a quirks value is present and substantial enough to use as-is. */
function hasSubstantialQuirks(quirks: string | undefined): boolean {
  return quirks !== undefined && quirks.trim().length >= QUIRKS_MIN_LENGTH;
}

/** Apply the relationship + species opening (Page 2). */
function applyOpening(
  story: Story2Story,
  relationship: Relationship,
  species: Species,
): void {
  setBody(story, "letter-page-2", page2Body(relationship, species));
}

/**
 * Apply the Page-3 adjustments: the species "happy" paragraph (index 3), and the
 * quirks fallback (index 1) when the customer's {quirks} is blank/shallow — so
 * {quirks} is never resolved to an empty token.
 */
function applyGratitude(
  story: Story2Story,
  species: Species,
  quirks: string | undefined,
): void {
  const happy = PAGE_3_HAPPY_BY_SPECIES[species];
  if (happy) {
    setParagraph(story, "letter-page-3", 3, happy);
  }
  if (!hasSubstantialQuirks(quirks)) {
    setParagraph(story, "letter-page-3", 1, PAGE_3_QUIRKS_FALLBACK);
  }
}

/** Apply the death-type swap to Page 4 (the middle paragraph). */
function applyGoodbye(story: Story2Story, deathType: LetterDeathType): void {
  const middle = PAGE_4_MIDDLE_BY_DEATH_TYPE[deathType];
  if (middle) {
    setBody(story, "letter-page-4", [PAGE_4_OPENING, middle, PAGE_4_CLOSING]);
  }
}

/** Apply the belief-frame swap to Page 5. */
function applyBeliefFrame(
  story: Story2Story,
  beliefFrame: LetterBeliefFrame,
): void {
  const body = PAGE_5_BY_BELIEF_FRAME[beliefFrame];
  if (body) {
    setBody(story, "letter-page-5", body);
  }
}

/**
 * Apply the new-pet extra paragraph to Page 6. The default ending block is the
 * last three paragraphs ("I loved you...", "Yours, always,", "{petName}"); the
 * extra paragraph is inserted just before that block so the signature stays last.
 */
function applyNewPet(story: Story2Story, newPet: boolean): void {
  if (!newPet) return;
  const page = story[pageIndex(story, "letter-page-6")];
  // Insert before the trailing 3-paragraph ending block (ending + signature).
  const insertAt = page.body.length - 3;
  page.body.splice(insertAt, 0, PAGE_6_NEW_PET);
}

/** Apply the gift-for inscription to the cover subtitle. */
function applyGiftFor(story: Story2Story, giftFor: GiftFor): void {
  if (giftFor !== "friend") return;
  const cover = story[pageIndex(story, "letter-cover")];
  cover.subtitle =
    cover.subtitle !== undefined
      ? `${cover.subtitle} · ${COVER_GIFT_INSCRIPTION}`
      : COVER_GIFT_INSCRIPTION;
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-2 master text,
 * returning the still-unresolved (placeholder-carrying) page model. Order: the
 * opening (relationship × species), gratitude (species + quirks fallback),
 * goodbye (death type), belief frame, new-pet insertion, then the gift-for cover
 * inscription. Exported so the merge layer / tests can inspect the composed-but-
 * unresolved text; `resolveStory2()` is the normal entry point.
 */
export function composeVariants2(session: Story2Session): Story2Story {
  const story = masterStory2();
  const { relationship } = session.owner;
  const { species } = session.pet;
  const { deathType, beliefFrame, giftFor, newPet } = session.toggles;
  const { quirks } = session.memories;

  applyOpening(story, relationship, species);
  applyGratitude(story, species, quirks);
  applyGoodbye(story, deathType);
  applyBeliefFrame(story, beliefFrame);
  applyNewPet(story, newPet === "yes");
  applyGiftFor(story, giftFor);

  return story;
}

/**
 * Resolve a finalized `Story2Session` into the ordered, fully-merged
 * `ResolvedStory` that feature 16 renders with no further text logic. Composes
 * the variants, then merges the session's field values into every placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token.
 */
export function resolveStory2(session: Story2Session): ResolvedStory {
  return mergeStory2(composeVariants2(session), session);
}
