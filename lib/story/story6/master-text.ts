// The Story-6 master text ("While You're Still Here, [PET_NAME]") as structured
// data — the single source of wording for the whole living tribute. Story 6 is the
// first NARRATIVE-layout new book since Story 1 (cover + page-1 dedication + pages
// 2-6 + back cover); it reuses Story 1's `cover`/`dedication`/`narrative`/`love`/
// `back-cover` layouts wholesale. This module owns only the *unresolved* template:
// every page's copy carries `{mergeField}` placeholders, an illustration brief
// (data for the imagery agent's prompt builders), and a stable page id. Variant
// selection (story6/variants.ts) and merge (story6/merge.ts) layer on top, with
// `resolveStory6()` as the single entry point.
//
// THE ONE RULE ABOVE ALL OTHERS (from the master template's quality bar): this
// book is written TO and ABOUT a pet who is STILL ALIVE, in PRESENT TENSE, always.
// Hard rules baked in here, never to be paraphrased: present tense throughout (no
// past-tense slip, no speaking of the pet as gone); never the banned euphemisms
// ("passed away", "put to sleep", "lost", "crossing over", "rainbow bridge",
// "better place", "watching over", "fur baby"); DEATH IS NEVER NAMED in the living
// path (the `road-ahead` variant names finitude once, plainly, no euphemism, in
// story6/variants.ts — never here); celebration, never pre-burial.
//
// SCOPE NOTE (PM, 2026-06-12): the memorial-conversion / "second life" of this
// order — the DEATH_TYPE / BELIEF_FRAME toggles + the `truth` death layout — is
// DROPPED ENTIRELY. This module has no death page and never assigns the `truth`
// layout. A future agent must not re-introduce it (see the template's annotation).
//
// The exact wording below is the product requirement, from
// context/masterstories/story-6-master-template.md (default tone =
// transitionFrame "still-here", senior age band, single owner, dog voice).

import type { MasterPage, Story6PageId } from "@/lib/story/master-text";

/**
 * A Story-6 master page: a `MasterPage` narrowed so its `id` must be a Story-6
 * slot id (a compile-time guard that the tribute never accidentally carries a
 * Story-1/2/4/5 page id). `Story6Story` is the ordered set, before variants.
 */
export type Story6MasterPage = MasterPage & { id: Story6PageId };
export type Story6Story = Story6MasterPage[];

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1/2/4/5 use, so
// the shared merge primitives (PLACEHOLDER_PATTERN / substitute, lib/story/merge.ts)
// resolve them unchanged. Keys map to merge fields as follows (the pronoun forms
// and the sentence-initial-capitalized subject pronoun are derived in
// story6/merge.ts from pet.pronoun):
//
//   {petName}          ← pet.name              {species}          ← pet.species
//   {breedColor}       ← pet.breedColor        {pronounSubject}   ← pet.pronoun
//   {pronounSubjectCap}← derived (sentence-initial)
//   {pronounObject}    ← derived               {pronounPossessive}← derived
//   {ownerNames}       ← owner.names
//   {ageOrStage}       ← memories.ageOrStage
//   {stillLoves}       ← memories.stillLoves   (optional — Page-3 fallback)
//   {quirks}           ← memories.quirks       (optional — Page-4 fallback)
//   {favoriteActivity} ← memories.favoriteActivity
//   {favoriteRitual}   ← memories.favoriteRitual
//   {favoriteSpots}    ← memories.favoriteSpots (optional — feeds briefs)
//   {sleepingSpot}     ← memories.sleepingSpot  (optional — feeds briefs)
//   {ownerMessage}     ← memories.ownerMessage  (optional — dedication line)
//   {petNicknames}     ← memories.nicknames     (optional — not in default body)
//   {dateAdopted}      ← memories.dateAdopted   (optional — not in default body)

// ---------------------------------------------------------------------------
// The Story-6 master pages (still-here / senior / single / dog default)
// ---------------------------------------------------------------------------
//
// Reuses `MasterPage` (lib/story/master-text.ts) — the shape is product-agnostic:
// id, pageNumber, optional title/subtitle, body paragraphs, illustration brief.
// The cover/back-cover carry no page number (null); pages 1-6 are numbered 1-6.
// The Page-1 dedication uses the Story-1 dedication treatment (title = the two
// opening lines, body = the attribution; the optional owner message is added by
// merge as the distinct-typeface `dedication` block). Pages 5/6 use the `love`
// layout (lead / hero / closer), so their bodies are authored as
// [lead, hero, closer] — see the LovePage renderer for the split.
//
// Returned by a function (not a frozen const) so variant composition takes a
// fresh, mutable copy each call without aliasing module state.

/** The canonical Story-6 master pages at the default tone (still-here, senior, single, dog). */
export function masterStory6(): Story6Story {
  return [
    {
      // COVER. Title carries the pet name; the subtitle has no merge field.
      id: "tribute-cover",
      pageNumber: null,
      title: "While You're Still Here, {petName}",
      subtitle: "A book for the time we have",
      body: [],
      illustrationBrief:
        "{petName} (a {breedColor} {species}) in warm late-afternoon light, settled and at ease — looking toward the viewer with the soft, unhurried gaze of an older animal who is exactly where they want to be. Golden hour, cream-warm palette, watercolor. A CELEBRATION portrait, not a goodbye portrait: content and present, not frail and not sad. Render the actual pet from the uploaded photo — coat, markings, the grey at the muzzle if it's there. The grey is allowed; the sadness is not.",
    },
    {
      // PAGE 1 — Dedication. The Story-1 dedication treatment: `title` is the two
      // opening lines, `body` is the attribution; merge adds the optional
      // {ownerMessage} as the distinct-typeface `dedication` block (dropped, with
      // no em dash, when blank — story6/merge.ts).
      id: "tribute-page-1",
      pageNumber: 1,
      title: "For {petName}, who is here.",
      body: ["— {ownerNames}"],
      illustrationBrief:
        "Single quiet portrait of {petName} alone, soft watercolor wash border (the Story-1 dedication treatment). The pet as they are right now — themselves, present, looking softly toward the reader. Same likeness as the cover, calmer composition.",
    },
    {
      // PAGE 2 — Who You Are to Me. The species voice + very-senior age line are
      // layered in story6/variants.ts. Present tense throughout.
      id: "tribute-page-2",
      pageNumber: 2,
      body: [
        "This is {petName}.",
        "{petName} is a {breedColor}, and {pronounSubject} is {ageOrStage}.",
        "{pronounSubjectCap} is not a thing that happened to me. {pronounSubjectCap} is part of how my days are shaped — the first sound in the morning, the weight against the couch in the evening, the reason I look up from what I'm doing.",
        "I want to say it plainly, while I can say it to your face: you are one of the best things in my life.",
      ],
      illustrationBrief:
        "{petName} in the home, in a lived-in everyday scene — by the couch, in a doorway, beside the owner's chair. Warm interior light. Body language settled and familiar. The owner may be present only as a hand, a knee, the edge of a sleeve — keep the focus on the pet (human faces out of frame or 3/4, per the style guide).",
    },
    {
      // PAGE 3 — Our Ordinary Days. Carries {favoriteRitual}, {stillLoves}
      // (optional-with-fallback), {favoriteActivity}. Species voice layered in
      // variants.ts. Present tense throughout.
      id: "tribute-page-3",
      pageNumber: 3,
      body: [
        "Here is the truth about us: most of it is small.",
        "{favoriteRitual}. {stillLoves}. {favoriteActivity} — slower now than it used to be, and somehow better for it.",
        "I used to think the big days were the ones that counted. The trips, the firsts, the photographs. But it's the ordinary days I'd keep, if I could only keep some. The four o'clock light. Your breathing in the next room. The way the day has a shape because you're in it.",
      ],
      illustrationBrief:
        "{petName} mid-ritual — at the window, on the walk, in a favorite spot (use the customer's still-loves / favorite-spots input from the session for the specific setting). Golden hour, gentle, full of ordinary life. Not action-packed; PRESENT. The 'we are still doing this together' image.",
    },
    {
      // PAGE 4 — The Things Only You Do. Carries {quirks} (optional-with-fallback);
      // the other-pets line + species touches are layered in variants.ts. Present
      // tense throughout.
      id: "tribute-page-4",
      pageNumber: 4,
      body: [
        "No one else in the world does the things you do.",
        "{quirks}",
        "I notice them more now. The small, specific, ridiculous, entirely-yours things. I used to let them pass without looking. I look now. I am paying attention, on purpose, to exactly who you are.",
      ],
      illustrationBrief:
        "A close, character-forward portrait or small two-scene composition capturing the pet BEING THEMSELVES — the head tilt, the sigh-flop, the particular way they sit. The page where the likeness matters most; render the customer's actual pet doing a recognizably-theirs thing. Warm, intimate, slightly closer crop than the other pages.",
    },
    {
      // PAGE 5 — What This Season Is (the tender page, `love` layout: lead / hero /
      // closer). The defining page. The `still-here` default's CLOSER ends on
      // gratitude with NO mention of the future; `road-ahead` swaps ONLY the closer
      // for a single forward-looking paragraph; the younger-but-diagnosed age band
      // softens ONLY the lead — all in story6/variants.ts. Present tense; death
      // never named.
      id: "tribute-page-5",
      pageNumber: 5,
      body: [
        // lead
        "You're in the gentle part of a long life now. {ageOrStage}, and slower, and softer at the edges. I'm not going to pretend I don't notice.",
        // hero
        "But I'm not going to spend the time we have being afraid of the time we don't.",
        // closer (still-here default — gratitude, no future)
        "So this is what I'm choosing instead: to be glad. Glad it was you. Glad it's still you. Glad of every ordinary afternoon that we get to have, for as long as we get to have them.",
      ],
      illustrationBrief:
        "The most emotionally weighted image after the cover. {petName} in soft, late, golden light — resting, content, at ease in a favorite spot. The `love` layout's hero treatment: warm, slightly dreamlike, PEACEFUL IN A LIVING WAY (not the still, eyes-closed 'rest' of the memorial books — this pet is awake, breathing, here). Earthly and warm, never elegiac.",
    },
    {
      // PAGE 6 — You Are Here Now (`love` layout: lead / hero / closer). The
      // book's resolution: present-tense love, not future loss. The final line is
      // always present (the closer). No variant touches this page.
      id: "tribute-page-6",
      pageNumber: 6,
      body: [
        // lead
        "Here is the most important thing in this whole book.",
        // hero (two lines)
        "You are here. Right now, as I write this and as you read it, {petName} is in this house, in this life, in this exact afternoon.",
        "That's not a small thing. That's the whole thing.",
        // closer (always)
        "And I am right here with you.",
      ],
      illustrationBrief:
        "Pull the focus back to the present and the pair. {petName} beside the owner (owner as silhouette / hand / from behind), both settled into a warm, ordinary, NOW moment — the couch, the back step, the spot by the window. Symbolic but grounded. The book's resolution: not love that will survive a loss, but love that is happening, in present tense, today. Strongest warmth of the book.",
    },
    {
      // BACK COVER — A Page to Keep. The Story-1 `back-cover` treatment: a
      // soft-bordered writing space. Decorative border only; no generated scene.
      id: "tribute-back-cover",
      pageNumber: null,
      title:
        "A place to write the things about {petName} I don't want to forget",
      body: [
        "What {petName} still loves most: ___________",
        "The sound I'd know anywhere: ___________",
        "A small thing {pronounSubject} did today: ___________",
        "What I want to remember about this season: ___________",
      ],
      illustrationBrief:
        "A gentle decorative border only (paw prints, a leaf, a watercolor wash) — quiet enough not to compete with handwriting. No generated scene here.",
    },
  ];
}
