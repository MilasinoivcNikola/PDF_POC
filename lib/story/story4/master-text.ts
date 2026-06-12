// The Story-4 master text ("If [PET_NAME] Could Talk") as structured data — the
// single source of wording for the whole letter. The sibling of
// lib/story/story2/master-text.ts (the grief letter): same shape, same
// placeholder syntax, same "fresh mutable copy each call" contract, so variant
// composition can mutate without leaking module state. This module owns only the
// *unresolved* template; variant selection (story4/variants.ts) and merge
// (story4/merge.ts) layer on top, with `resolveStory4()` as the single entry point.
//
// This module holds the DEFAULT **living** (present-tense, celebration) bodies —
// a dog speaking, present tense, single owner. The two-tense engine
// (story4/variants.ts `composeVariants4`) swaps in the FULL memorial (past-tense)
// bodies when `livingOrMemorial === "memorial"`, then layers relationship /
// species / gift-for, and — memorial only — the Page-5 death-type seam + belief-
// frame closing.
//
// The exact wording below is the product requirement, copied verbatim from
// context/masterstories/story-4-master-template.md (default voice = a dog speaking,
// present tense, relationship "single"). Hard rules from that template's "Quality
// bar / what to avoid" are baked in and must never be paraphrased: first-person
// pet voice ("I"); owner addressed as "you"; never "fur baby"; never the pet
// "watching over you" (banned in BOTH paths); no external quotation; the living
// path never mentions death. Memorial-path rules ("died", never the euphemisms;
// the never-funny death-type line) live in story4/variants.ts where the past-tense
// swaps are authored. No date is printed that the customer didn't provide (the
// optional date line is added by merge only when present).

import type { MasterPage, Story4PageId } from "@/lib/story/master-text";

/**
 * A Story-4 master page: a `MasterPage` narrowed so its `id` must be a Story-4
 * slot id (a compile-time guard that the letter never accidentally carries a
 * Story-1/Story-2 page id). `Story4Story` is the ordered set, before variants.
 */
export type Story4MasterPage = MasterPage & { id: Story4PageId };
export type Story4Story = Story4MasterPage[];

/**
 * The letter's sign-off line, single-sourced here so the Page-6 master text and
 * the shared letter renderer (lib/pdf/pages-story2.tsx) agree on where the
 * signature block begins WITHOUT the renderer hard-coding the literal copy. It
 * carries no merge field, so it is invariant across every variant (living and
 * memorial both end "Yours,"); the renderer splits the Page-6 body at this line —
 * everything from it onward (the sign-off, the pet name, the optional nickname +
 * date lines) is the signature block, regardless of how many prose paragraphs
 * precede it. Distinct from Story 2's "Yours, always," — this book signs "Yours,".
 */
export const TALK_SIGNOFF = "Yours,";

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1/2 use, so the
// shared merge primitives (PLACEHOLDER_PATTERN / substitute, lib/story/merge.ts)
// resolve them unchanged. Keys map to merge fields as follows (all come straight
// from the session — Story 4 has no derived/pronoun fields except {species}):
//
//   {petName}          ← pet.name             {species}         ← pet.species
//   {ownerNames}       ← owner.names          {quirks}          ← memories.quirks
//   {favoriteRitual}   ← memories.favoriteRitual
//   {favoriteSpots}    ← memories.favoriteSpots
//   {favoriteActivity} ← memories.favoriteActivity
//   {petNicknames}     ← memories.nicknames   (optional — signature line)
//   {dateAdopted}      ← memories.dateAdopted (optional — date line)
//   {datePassed}       ← memories.datePassed  (optional — memorial date line)
//
// "you both" / "my favorites" addressing for the couple relationship comes from
// the couple variant TEXT (story4/variants.ts), not a pronoun map — there is no
// {ownerPronoun} key.

// ---------------------------------------------------------------------------
// The Story-4 master pages (living / present-tense default)
// ---------------------------------------------------------------------------
//
// Reuses `MasterPage` (lib/story/master-text.ts) — the shape is product-agnostic:
// id, pageNumber, optional title/subtitle, body paragraphs, illustration brief.
// The letter has no printed page numbers (the typography guide: "Page numbers:
// none"), so every page's `pageNumber` is null. The cover carries title/subtitle;
// the body pages are plain typeset prose (paragraph list). The optional cover date
// line and the signature nickname line are NOT in the template here — merge.ts
// adds them only when the customer supplied the values, so a missing date/nickname
// leaves no empty artifact.
//
// Returned by a function (not a frozen const) so variant composition takes a
// fresh, mutable copy each call without aliasing module state.

/** The canonical Story-4 master pages at the default voice (living, dog, single). */
export function masterStory4(): Story4Story {
  return [
    {
      // PAGE 1 — Cover / Title. "If [PET_NAME] Could Talk" / "to [OWNER_NAMES]".
      // The optional bottom line ("together since {dateAdopted}" in the living
      // path, or "{dateAdopted} — {datePassed}" in the memorial path) is added by
      // merge only when the value(s) are present. The gift-for inscription is
      // added by variants.
      id: "talk-cover",
      pageNumber: null,
      title: "If {petName} Could Talk",
      subtitle: "to {ownerNames}",
      body: [],
      illustrationBrief:
        "A single watercolor portrait of {petName} ({species}) — recognizably this animal, from the uploaded photo — looking directly back at the reader, alert and happy, ears up, the way they look when you've just walked in. Warm, soft palette. The 'hello, it's me' image, with white space around it; the cover should read like a small book of poems.",
    },
    {
      // PAGE 2 — Opening ("here is what I'd say"). The couple variant swaps the
      // "if I had words" line, the cat/rabbit/bird species variants swap the
      // "I have something better" sentence (all in variants.ts). Memorial swaps the
      // whole body to the full past-tense rewrite.
      id: "talk-page-2",
      pageNumber: null,
      body: [
        "Dear {ownerNames},",
        "I don't have words. I have something better — a tail that tells you everything, ears that hear your car three houses away, and a heart that points at you like a compass.",
        "But if I had words, just for one afternoon, this is the letter I'd write you.",
        "Because there are things I want you to know. And I think you should hear them from me.",
      ],
      illustrationBrief:
        "None on this page, or a very small ornamental element in a corner — a leaf, a curl, a single watercolor paw print. The text is the design. White space.",
    },
    {
      // PAGE 3 — Gratitude / Quirks ("I love this about us"). The species voice
      // variant swaps the "kind of happy" line; a blank/shallow {quirks} falls back
      // to the stock sentence (both in variants.ts before merge). Memorial flips the
      // whole page to past tense.
      id: "talk-page-3",
      pageNumber: null,
      body: [
        "Here is what I love about us. And I notice all of it.",
        "I love {favoriteRitual}. That's my favorite part of every day. I start waiting for it before it's time.",
        "I love {quirks}. I know you think I don't notice. I notice everything.",
        "And I love that you came home tired and sat on the floor with me anyway, in your good clothes, because I was there and that was enough. You talk to me in your real voice — the one nobody else gets to hear. I keep all of it.",
        "I'm not just fine. I'm not just okay. I'm happy — the kind that runs in circles for no reason and doesn't need explaining. You did that. That's you.",
      ],
      illustrationBrief:
        "Optional small margin element only — a quick line-drawing of {petName} mid-ritual (leash in mouth, sat by the door, nose to a sunbeam). Sketch register, not a full scene. The best version of this page may carry no illustration at all.",
    },
    {
      // PAGE 4 — Daily Joy. The cat species variant swaps the "spot" sentence
      // (variants.ts). This is the one full scene illustration in the book
      // (letter-page-4 slot). Memorial flips the whole page to past tense.
      id: "talk-page-4",
      pageNumber: null,
      body: [
        "People think the big days are the ones that matter. The beach, the birthday, the snow.",
        "I'll tell you a secret: it's the ordinary ones. It's {favoriteActivity}. It's the spot at {favoriteSpots}, where the sun lands and the whole world goes warm and I have nothing to do but be near you.",
        "I don't need much. A walk. A window. The sound of you in the next room. You, coming back — you always come back, and I am amazed every single time.",
        "That's the whole secret. The days don't have to be big. They just have to have you in them.",
      ],
      illustrationBrief:
        "A soft watercolor scene wash — {petName} doing the favorite activity, or curled in the favorite spot with the late-afternoon light coming in. Single subject or figureless joy; warm, golden, gentle. The one full scene illustration in the book.",
    },
    {
      // PAGE 5 — The truth about how I feel about you. The couple variant swaps the
      // "favorite/favorites" lines (variants.ts). Memorial swaps the whole body to
      // the full past-tense rewrite AND appends the death-type seam line + the
      // belief-frame closing frame.
      id: "talk-page-5",
      pageNumber: null,
      body: [
        "So here's the truth, since I've got the words for once.",
        "You are my favorite. Not my favorite thing — my favorite, full stop. The person I look for when I hear the door. The one I'd pick out of any crowd, any room, anywhere, with my eyes closed, by the sound of you breathing.",
        "I know I'm not always easy. I bark at nothing. I steal the socks. I wake you up too early because I can't believe it's already a day with you in it.",
        "But I want you to know: I'm not waiting for a better life than this one. This is the one I'd choose. You, and the spot by the door, and the ordinary good morning. I already have everything.",
      ],
      illustrationBrief:
        "None on this page. White space is the point — the reader needs room to feel this one. The whole page is the gut-punch; let it breathe.",
    },
    {
      // PAGE 6 — Closing / Signature. The default (living) body sits before the
      // signoff sentinel; merge appends the signature nickname line / date line
      // only when those optionals are present. {species} appears once ("as much as
      // a {species} can love"). Memorial swaps the prose body for the past-tense
      // rewrite, keeping the same TALK_SIGNOFF + "{petName}" signature tail.
      id: "talk-page-6",
      pageNumber: null,
      body: [
        "So go on. Have the good day. Eat the good thing. Take the long way home.",
        "And when you walk back through that door — I'll be the one who acts like you've been gone a year. Every time. That's not me forgetting how long you were gone. That's me, telling you the only way I know how:",
        "There you are. There you are. It's you.",
        "I love you. I always do. As much as a {species} can love — which, it turns out, is an enormous amount.",
        TALK_SIGNOFF,
        "{petName}",
      ],
      illustrationBrief:
        "Below the signature, a single small watercolor paw print (dog/cat-shaped, rabbit-shaped, or bird-foot to match {species}). Optional: a small hand-drawn flourish after the name. No full scene here.",
    },
  ];
}
