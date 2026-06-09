// The Story-2 master text ("A Letter from [PET_NAME]") as structured data — the
// single source of wording for the whole letter. The sibling of
// lib/story/master-text.ts (Story 1): same shape, same placeholder syntax, same
// "fresh mutable copy each call" contract, so variant composition can mutate
// without leaking module state. This module owns only the *unresolved* template;
// variant selection (story2/variants.ts) and merge (story2/merge.ts) layer on top,
// with `resolveStory2()` as the single entry point.
//
// The exact wording below is the product requirement, copied verbatim from
// context/masterstories/story-2-master-template.md (default voice = a dog speaking,
// relationship "single", death "peaceful"... see each variant module for the swaps).
// Hard rules from that template's "Quality bar / what to avoid" are baked in here
// and must never be paraphrased: first-person pet voice ("I"); owner addressed as
// "you"; Page 4 (the goodbye) is never funny; never the banned clichés ("fur baby",
// "crossed the rainbow bridge", "ran free in heaven", "now an angel watching over
// you", the pet "watching over" the owner); no external quotation; no date the
// customer didn't provide (the optional date line is added by merge only when both
// dates are present).

import type { MasterPage, Story2PageId } from "@/lib/story/master-text";

/**
 * A Story-2 master page: a `MasterPage` narrowed so its `id` must be a Story-2
 * slot id (a compile-time guard that the letter never accidentally carries a
 * Story-1 numeric page id). `Story2Story` is the ordered set, before variants.
 */
export type Story2MasterPage = MasterPage & { id: Story2PageId };
export type Story2Story = Story2MasterPage[];

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1 uses, so the
// shared merge primitives (PLACEHOLDER_PATTERN / substitute, lib/story/merge.ts)
// resolve them unchanged. Keys map to merge fields as follows (all come straight
// from the session — Story 2 has no derived/pronoun fields except {species}):
//
//   {petName}        ← pet.name            {species}       ← pet.species
//   {ownerNames}     ← owner.names         {quirks}        ← memories.quirks
//   {favoriteRitual} ← memories.favoriteRitual
//   {favoriteSpots}  ← memories.favoriteSpots
//   {petNicknames}   ← memories.nicknames   (optional — signature line)
//   {dateAdopted}    ← memories.dateAdopted (optional — date line)
//   {datePassed}     ← memories.datePassed  (optional — date line)
//
// "you both" addressing for the couple relationship comes from the couple variant
// TEXT (story2/variants.ts), not a pronoun map — there is no {ownerPronoun} key.

// ---------------------------------------------------------------------------
// The Story-2 master pages
// ---------------------------------------------------------------------------
//
// Reuses `MasterPage` (lib/story/master-text.ts) — the shape is product-agnostic:
// id, pageNumber, optional title/subtitle, body paragraphs, illustration brief.
// The letter has no printed page numbers (the typography guide: "Page numbers:
// none"), so every page's `pageNumber` is null. The cover carries title/subtitle;
// the body pages are plain typeset prose (paragraph list), which is what a letter
// is. The optional cover date line and the signature nickname line are NOT in the
// template here — merge.ts adds them only when the customer supplied the values,
// so a missing date/nickname leaves no empty artifact.
//
// Returned by a function (not a frozen const) so variant composition takes a
// fresh, mutable copy each call without aliasing module state.

/** The canonical Story-2 master pages at the default voice (dog, single, peaceful). */
export function masterStory2(): Story2Story {
  return [
    {
      // PAGE 1 — Cover / Title. "A Letter from [PET_NAME]" / "for [OWNER_NAMES]".
      // The optional [DATE_ADOPTED] — [DATE_PASSED] line is added by merge only
      // when BOTH dates are present (the gift-for inscription is added by variants).
      id: "letter-cover",
      pageNumber: null,
      title: "A Letter from {petName}",
      subtitle: "for {ownerNames}",
      body: [],
      illustrationBrief:
        "A single understated element — a simple watercolor paw print, or a soft silhouette of {petName} ({species}) looking back, or just the title in white space. The cover should look like the cover of a book of poems, not a children's product. White space is the design.",
    },
    {
      // PAGE 2 — Opening. The couple variant swaps this whole body in variants.ts;
      // the cat species variant swaps the third paragraph.
      id: "letter-page-2",
      pageNumber: null,
      body: [
        "Dear {ownerNames},",
        "If I could have held a pen, this is the letter I would have written you.",
        "I didn't have words while I was with you. I had something better — eyes that knew when you were sad, ears that heard your car before anyone else's, and a heart that was always, always pointed at you.",
        "But now I have something like words. And there are things I want you to know.",
      ],
      illustrationBrief:
        "None on this page, or a very small ornamental element in the corner — a leaf, a curl. The text is the design.",
    },
    {
      // PAGE 3 — Gratitude (the "I noticed" page). The species voice variant swaps
      // the "kind of happy" line; a blank/shallow {quirks} falls back to stock
      // sentences (both handled in variants.ts before merge).
      id: "letter-page-3",
      pageNumber: null,
      body: [
        "I want you to know that I noticed everything.",
        "I noticed when you came home tired and sat on the floor with me instead of changing your clothes. I noticed when you talked to me in your real voice — the one nobody else got to hear. I noticed {quirks}.",
        "I noticed {favoriteRitual}. That was the best part of every day. Both of ours.",
        "I want you to know that I was happy. Not just fine. Not just okay. Happy — the kind that runs in circles for no reason and doesn't need explaining. You gave me that. That was you.",
      ],
      illustrationBrief:
        "Optional small element — a hand-drawn line drawing of {petName} doing one specific thing from the ritual. Sketch style, not full color. A margin doodle, not a feature illustration. Best version may have no illustration at all.",
    },
    {
      // PAGE 4 — The Goodbye (the "I know" page). Default body is the "peaceful"
      // tone framing; death-type variants swap the body in variants.ts. This page
      // is NEVER funny (product rule) and there is no illustration — white space.
      id: "letter-page-4",
      pageNumber: null,
      body: [
        "I know how it ended.",
        "I know what it cost you. I know you wondered, in the dark hours after, whether there was something you missed. Whether there was something you could have done differently.",
        "There wasn't.",
        "I was loved every day of my life. I was warm, and full, and safe, and known. There is nothing more any of us can ask for.",
      ],
      illustrationBrief:
        "None on this page. The white space is the point. The reader needs the room to feel this one.",
    },
    {
      // PAGE 5 — Where I Am Now. Default body is the rainbow-bridge variant;
      // belief-frame variants swap the body in variants.ts.
      id: "letter-page-5",
      pageNumber: null,
      body: [
        "Wherever I am now — and there is a now, somewhere — I am not tired. I am not hurting. My body moves the way it did when I was three years old. The sun feels good on my back. Somewhere there is always {favoriteSpots}.",
        "I think of you the way I always did. Constantly, and without complication.",
      ],
      illustrationBrief:
        "Optional, minimal. For rainbow-bridge/heaven — a soft watercolor wash of a meadow or sunlit landscape, abstract, no figure. For secular — a single watercolor object that represents {petName}'s presence (a leash hook, a blanket, an empty bed by a window).",
    },
    {
      // PAGE 6 — Closing. Default ending (always included) sits at the tail; the
      // new-pet variant inserts an extra paragraph before it, and merge appends the
      // signature nickname line / date line only when those optionals are present.
      // {species} appears twice ("just a {species}" + "as much as a {species} can
      // love"). The "just a {species}" scare-quote is published copy — the pet
      // voicing what others might dismissively say — NOT an external quotation.
      id: "letter-page-6",
      pageNumber: null,
      body: [
        "So here is what I want for you.",
        'Be sad. Be sad for exactly as long as you need to be. Don\'t let anyone tell you I was "just a {species}." They didn\'t know me, and they didn\'t know us.',
        "But then, when you're ready — and only when you're ready — be happy again. Laugh at something stupid. Eat something good. Take a walk and notice the things I used to notice with you. The smell of grass after rain. The way the light moves in the late afternoon. The dog two houses down who barks at nothing.",
        "I loved you. I always did. I always will, as much as a {species} can love — which, it turns out, is a lot.",
        "Yours, always,",
        "{petName}",
      ],
      illustrationBrief:
        "Below the signature, a single small paw print in watercolor (dog/cat-shaped, rabbit-shaped, or bird-foot to match {species}). Optional: a hand-drawn signature flourish.",
    },
  ];
}
