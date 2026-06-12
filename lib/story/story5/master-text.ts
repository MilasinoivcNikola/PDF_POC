// The Story-5 master text ("A Letter to [PET_NAME]") as structured data — the
// single source of wording for the whole letter. The sibling of
// lib/story/story2/master-text.ts (the grief letter FROM the pet): same shape,
// same placeholder syntax, same "fresh mutable copy each call" contract, so
// variant composition can mutate without leaking module state. This module owns
// only the *unresolved* template; variant selection (story5/variants.ts) and merge
// (story5/merge.ts) layer on top, with `resolveStory5()` as the single entry point.
//
// Story 5 is the INVERSE of Story 2: the OWNER's second-person voice, writing TO
// the pet who died ("You always knew") — single-tense PAST. This module holds the
// DEFAULT bodies: single owner ("I"), peaceful death, rainbow-bridge belief. The
// variant layer (story5/variants.ts) builds each body page WHOLE per dimension —
// relationship (single "I" / couple "we"), death-type (Page 4 confession/apology),
// belief-frame (Page 5), species (Page 3 "happy sound" clause), plus the
// optional-with-fallback quirks / last-good-day (Page 3) and what-I-keep (Page 5).
//
// The exact wording below is the product requirement, copied verbatim from
// context/masterstories/story-5-master-template.md (default voice = single owner,
// past tense, peaceful, rainbow-bridge). Hard rules from that template's "Quality
// bar / what to avoid" are baked in and must never be paraphrased: the owner's
// second-person voice (addresses the pet as "you", every page); the word "died"
// appears plainly and early (Page 2); never the banned euphemisms ("passed away",
// "went to sleep", "lost", "crossed the rainbow bridge", "watching over", "fur
// baby"); the apology page (Page 4) LIFTS blame, never assigns it; no reunion
// promise on the secular frame; no external quotation; the honest ending is "I
// will carry you", never "and now I am at peace". No date is printed that the
// customer didn't provide (the optional date line is added by merge only when both
// dates are present).

import type { MasterPage, Story5PageId } from "@/lib/story/master-text";

/**
 * A Story-5 master page: a `MasterPage` narrowed so its `id` must be a Story-5
 * slot id (a compile-time guard that the letter never accidentally carries a
 * Story-1/Story-2/Story-4 page id). `Story5Story` is the ordered set, before
 * variants.
 */
export type Story5MasterPage = MasterPage & { id: Story5PageId };
export type Story5Story = Story5MasterPage[];

/**
 * The letter's sign-off line, single-sourced here so the Page-6 master text and
 * the shared letter renderer (lib/pdf/pages-story2.tsx) agree on where the
 * signature block begins WITHOUT the renderer hard-coding the literal copy. It
 * carries no merge field, so it is invariant across every variant (single and
 * couple both end "With all my love, always,"); the renderer splits the Page-6
 * body at this line — everything from it onward (the sign-off, the owner name, the
 * optional nickname + date lines) is the signature block, regardless of how many
 * prose paragraphs precede it. Distinct from Story 2's "Yours, always," and Story
 * 4's "Yours," — this book signs "With all my love, always,".
 */
export const NOTE_SIGNOFF = "With all my love, always,";

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1/2/4 use, so
// the shared merge primitives (PLACEHOLDER_PATTERN / substitute, lib/story/merge.ts)
// resolve them unchanged. Keys map to merge fields as follows (all come straight
// from the session — Story 5 has no derived/pronoun fields except {species}):
//
//   {petName}        ← pet.name            {species}       ← pet.species
//   {ownerNames}     ← owner.names         {quirks}        ← memories.quirks
//   {favoriteRitual} ← memories.favoriteRitual
//   {favoriteSpots}  ← memories.favoriteSpots
//   {lastGoodDay}    ← memories.lastGoodDay (optional — Page-3 fallback)
//   {whatIKeep}      ← memories.whatIKeep   (optional — Page-5 fallback)
//   {petNicknames}   ← memories.nicknames   (optional — signature line)
//   {dateAdopted}    ← memories.dateAdopted (optional — date line)
//   {datePassed}     ← memories.datePassed  (optional — date line)
//
// "we"/"us"/"ours" addressing for the couple relationship comes from the couple
// variant TEXT (story5/variants.ts), not a pronoun map — there is no {ownerPronoun}
// key.

// ---------------------------------------------------------------------------
// The Story-5 master pages (single owner / past-tense default)
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

/** The canonical Story-5 master pages at the default voice (single, past, peaceful). */
export function masterStory5(): Story5Story {
  return [
    {
      // PAGE 1 — Cover / Title. "A Letter to [PET_NAME]" / "from [OWNER_NAMES]".
      // The optional [DATE_ADOPTED] — [DATE_PASSED] line is added by merge only
      // when BOTH dates are present. No relationship change to the cover (the
      // joined names already live in {ownerNames}).
      id: "note-cover",
      pageNumber: null,
      title: "A Letter to {petName}",
      subtitle: "from {ownerNames}",
      body: [],
      illustrationBrief:
        "A single watercolor portrait of {petName} (a {species}), looking gently toward the reader — generated from the uploaded photo so it reads as this animal, not a stand-in. Soft, warm palette; lots of white space around it. The cover should look like the cover of a book of poems, not a product. The portrait should feel like a photograph the owner kept on the mantel — present, alive, themselves.",
    },
    {
      // PAGE 2 — Opening (the "things I never said" page). The couple variant swaps
      // the whole body to the "we" rewrite (variants.ts). The word "died" appears
      // here, plainly and early, per the grief-literature rule.
      id: "note-page-2",
      pageNumber: null,
      body: [
        "Dear {petName},",
        "There are things I never said to you. Not because I didn't feel them — I felt all of them, every day — but because you were a {species}, and I thought we had more time, and some things you only learn to say once it's too late to be heard.",
        "So I'm saying them now. To you. Wherever the saying lands.",
        "You died. I keep having to write that down to believe it. The house is the wrong kind of quiet, and my hands keep reaching for things that aren't there anymore — the leash, the door, the warm weight of you.",
        "But you were here. You were so completely here. And before anything else, I want you to know I noticed.",
      ],
      illustrationBrief:
        "None on this page, or a very small ornamental element in a corner (a leaf, a curl). The text is the design — let the white space hold the opening.",
    },
    {
      // PAGE 3 — Gratitude (the "thank you for" page). The species voice variant
      // swaps the "happy sound" clause; a blank/shallow {quirks} falls back to the
      // stock sentence; a blank {lastGoodDay} falls back to the stock last-good-day
      // beat (all handled whole in variants.ts before merge).
      id: "note-page-3",
      pageNumber: null,
      body: [
        "So, thank you.",
        "Thank you for {favoriteRitual}. It was the best part of the day, and I didn't always say so, and I'm saying so now: it was the best part of the day.",
        "Thank you for {quirks}. I would give anything to see it one more time.",
        "Thank you for the small ordinary things that I thought would last forever — for being at the door, for {favoriteSpots}, for the sound you made that meant you were happy. You made an ordinary life feel like enough. That was you. That was your whole quiet gift.",
        "And thank you for {lastGoodDay}.",
        "You were a good {species}. The best one. Mine.",
      ],
      illustrationBrief:
        "Optional small margin element — a single hand-drawn line of {petName} doing one specific thing from the ritual, sketch style, not full color. Best version may have no illustration at all. Let Page 5's wash be the only painted body page.",
    },
    {
      // PAGE 4 — The Confession (the "I'm sorry / it wasn't your fault" page). The
      // default body is the "peaceful" framing; death-type variants swap the whole
      // body in variants.ts. The page LIFTS blame, never assigns it; it never
      // carries an illustration.
      id: "note-page-4",
      pageNumber: null,
      body: [
        "There is something I have to say, and it's the hardest part of this letter.",
        "I'm sorry.",
        "Not for anything you did — you never did anything wrong, not really, not the chewed shoe or the bark at nothing or the mud you tracked across the whole clean floor. I'd take all of it back a thousand times if it meant one more ordinary morning with you.",
        "I'm sorry for the times I was too busy. The walks I cut short. The nights I was tired and you waited anyway. You forgave me for all of it before I even asked — that was the kind of heart you had. I'm asking now, out loud, so you can hear it: I'm sorry.",
        "And here is the other thing, the one I need you to know more than anything: it wasn't your fault, and it wasn't mine. You did not let me down. I did not let you down. We just ran out of time, the way everyone does in the end. What we had was good. What we had was whole.",
      ],
      illustrationBrief:
        "None on this page. The white space is the point — the reader needs the room to feel this one. (This is the apology page; it must never carry a decorative image.)",
    },
    {
      // PAGE 5 — Where You Are / What I Keep. The default body is the
      // rainbow-bridge variant; belief-frame variants swap the whole body in
      // variants.ts. A blank {whatIKeep} falls back to the always-present
      // ritual/spots (handled in variants.ts). NO reunion promise on the secular
      // frame.
      id: "note-page-5",
      pageNumber: null,
      body: [
        "So where are you now?",
        "I like to think there's a somewhere — a sunlit field where your body isn't tired anymore, where you run the way you did when you were young and the day was new. I hope there is always {favoriteSpots} there. I hope the sun is always at 4pm.",
        "And here, with me, I'm keeping {whatIKeep}. I'm keeping the route of {favoriteRitual}. I'm keeping your name, which I will say out loud, because names are meant to be said.",
      ],
      illustrationBrief:
        "A soft, abstract watercolor wash — no animal, no figure, no people, same family as Story 2's belief wash, generated without the pet photo reference. For rainbow-bridge/heaven: a sunlit meadow or warm landscape, gentle light. For secular: a single quiet object that holds presence — a leash on a hook, an empty bed by a window, a worn patch on a floor. Feathered into the cream paper, sitting below the prose; never a full-bleed photo.",
    },
    {
      // PAGE 6 — Closing (the "I will carry you" page). The default (single) body
      // sits before the signoff sentinel; the couple variant swaps the whole prose
      // body in variants.ts. merge appends the optional date line / nickname line
      // only when those optionals are present. The honest ending is "I will carry
      // you", never closure.
      id: "note-page-6",
      pageNumber: null,
      body: [
        "Here is what I want you to know, if any of it reaches you.",
        "You were loved. Not a little. Not in the ordinary way people love the ordinary things in their lives — you were loved the whole way down, every day you were here, including the last one.",
        "I don't know how to be in this house without you yet. I'm learning. Some days I do alright and some days I don't, and on the days I don't, I'm going to do the thing you'd want: I'm going to go outside, and notice the things you taught me to notice — the grass after rain, the light in the late afternoon, the dog two houses down who barks at nothing. I'm going to say your name to people who will listen. I'm going to keep you in the telling.",
        "I will carry you. I will carry you everywhere, for the rest of my life, and it will not be a weight. It will be the opposite of a weight.",
        "Thank you for being mine.",
        NOTE_SIGNOFF,
        "{ownerNames}",
      ],
      illustrationBrief:
        "Below the signature, a single small watercolor paw print (dog/cat/rabbit/bird-foot to match {species}), or a simple hand-drawn flourish. Optional — the cleanest version is signature alone. No belief wash here; Page 5 carries the only painted body image.",
    },
  ];
}
