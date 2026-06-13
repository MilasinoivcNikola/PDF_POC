// The Story-7 master text ("Welcome Home — [PET_NAME]'s Gotcha Day") as
// structured data — the single source of wording for the whole homecoming book.
// Story 7 is the catalog's FIRST joyful, non-memorial title and the second
// NARRATIVE-layout book after Story 1/6: cover + page-1 dedication + pages 2-8 +
// closing + back cover (11 page ids, 10 printed leaves). It reuses Story 1's
// `cover`/`dedication`/`narrative`/`closing`/`back-cover` layouts wholesale — there
// is NO `truth` (death) page. This module owns only the *unresolved* template:
// every page's copy carries `{mergeField}` placeholders, an illustration brief
// (data for the imagery agent's prompt builders), and a stable page id. Variant
// selection (story7/variants.ts) and merge (story7/merge.ts) layer on top, with
// `resolveStory7()` as the single entry point.
//
// THE ONE RULE ABOVE ALL OTHERS (from the master template's quality bar): this is
// the HAPPY book. The voice is warm and celebratory, never sentimental, never
// saccharine. Hard rules baked in here, never to be paraphrased: NO grief/memorial
// language ever ("rainbow bridge", "watching over", "gone too soon", "passed
// away", "fur baby"); NO lazy clichés ("forever home" as filler, "purrfect",
// "pawsome", "meant to be", "a match made in heaven"); the "before you came" page
// is ANTICIPATION, not loss (the empty house is hopeful); the emotion comes from
// the SPECIFICS (the trembling car ride, the stolen sock), not stacked adjectives;
// end on BELONGING, not cuteness.
//
// The exact wording below is the product requirement, from
// context/masterstories/story-7-master-template.md (default copy = the new-arrival
// occasion, adult life stage, shelter source, dog voice — past-tense origin pages,
// present-tense belonging pages).

import type { MasterPage, Story7PageId } from "@/lib/story/master-text";

/**
 * A Story-7 master page: a `MasterPage` narrowed so its `id` must be a Story-7
 * slot id (a compile-time guard that the homecoming book never accidentally
 * carries a Story-1/2/4/5/6 page id). `Story7Story` is the ordered set, before
 * variants.
 */
export type Story7MasterPage = MasterPage & { id: Story7PageId };
export type Story7Story = Story7MasterPage[];

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1/2/4/5/6 use,
// so the shared merge primitives (PLACEHOLDER_PATTERN / substitute,
// lib/story/merge.ts) resolve them unchanged. Keys map to merge fields as follows
// (derived pronoun forms are computed in story7/merge.ts from pet.pronoun):
//
//   {petName}          ← pet.name              {species}          ← pet.species
//   {breedColor}       ← pet.breedColor        {pronounSubject}   ← pet.pronoun
//   {pronounObject}    ← derived               {pronounPossessive}← derived
//   {ownerNames}       ← owner.names
//   {childName}        ← memories.childName     (optional — Pages 6 & 8 beats)
//   {familyMembers}    ← memories.familyMembers (optional — Page 7 swap)
//   {favoriteActivity} ← memories.favoriteActivity (Page 7)
//   {sleepingSpot}     ← memories.sleepingSpot     (Pages 5 & 7)
//   {quirks}           ← memories.quirks           (optional — Page-6 fallback)
//   {homecomingMemory} ← memories.homecomingMemory (optional — Page-4 fallback)
//   {dateAdopted}      ← memories.dateAdopted      (optional — dedication line)
//   {yearsHome}        ← toggles.yearsHome         (anniversary occasion only)

// ---------------------------------------------------------------------------
// The Story-7 master pages (new-arrival / adult / shelter / dog default)
// ---------------------------------------------------------------------------
//
// Reuses `MasterPage` (lib/story/master-text.ts) — the shape is product-agnostic:
// id, pageNumber, optional title/subtitle, body paragraphs, illustration brief.
// The cover/back-cover carry no page number (null); pages 1-9 are numbered 1-9.
// The Page-1 dedication uses the Story-1 dedication treatment (title = the opening
// lines, body = the attribution / signed line). Page 3's origin sentence is a
// placeholder paragraph the variant layer fills per adoption source.
//
// Returned by a function (not a frozen const) so variant composition takes a
// fresh, mutable copy each call without aliasing module state.

/** The canonical Story-7 master pages at the default tone (new-arrival, adult, shelter, dog). */
export function masterStory7(): Story7Story {
  return [
    {
      // COVER. Title carries the pet name; the subtitle is the new-arrival default
      // (the anniversary occasion swaps it in story7/variants.ts).
      id: "welcome-cover",
      pageNumber: null,
      title: "Welcome Home, {petName}",
      subtitle: "The story of the day you became ours",
      body: [],
      illustrationBrief:
        "{petName} (a {breedColor} {species}) at the threshold of a warm, lived-in home — paws on the doormat, looking up and into the light, tail/ears in a happy, curious posture. Bright golden-morning palette (more upbeat and saturated than the memorial titles — this is a beginning, not a sunset). {ownerNames} may be a soft, partial presence (a knee, a hand on the doorframe), but {petName} is the subject and the hero. This is the 'you're here now' image.",
    },
    {
      // PAGE 1 — Dedication. The Story-1 dedication treatment: `title` is the
      // opening lines, `body` is the attribution; the optional dated line + the
      // anniversary "years home" line are layered in story7/variants.ts.
      id: "welcome-dedication",
      pageNumber: 1,
      title: "For {petName}, who found {pronounPossessive} way to us — and made the house a home.",
      body: ["— {ownerNames}"],
      illustrationBrief:
        "Single soft portrait of {petName} alone, looking toward the reader, content. Gentle pastel watercolor border. The pet as they actually are — the likeness page, the reference anchor for the rest of the book.",
    },
    {
      // PAGE 2 — Before You Came. The only page the pet is absent from, by design.
      // The senior-adoption beat + the cat species swap are layered in
      // story7/variants.ts. ANTICIPATION, never loss.
      id: "welcome-before",
      pageNumber: 2,
      title: "Before You Came",
      body: [
        "Before you came, the house was a little too quiet.",
        "There was a spot by the door where nobody waited. A bowl that wasn't on the floor yet. A walk that nobody asked for.",
        "We didn't know it then, but we were waiting for you.",
      ],
      illustrationBrief:
        "A warm but slightly empty interior — a cozy room with one telling absence: an empty dog bed, a bare hook where a leash will hang, a sunlit patch of floor with no one in it. NO pet in this image (or only a faint hint — a collar on a table). Inviting, not sad — 'ready to be filled.' This is the only page {petName} is absent from, by design. FIGURE-FREE.",
    },
    {
      // PAGE 3 — The Day We Found Each Other. The origin sentence (paragraph 2) is
      // a placeholder filled per adoption source in story7/variants.ts; the
      // default below is the shelter origin sentence. The emotional hinge.
      id: "welcome-choosing",
      pageNumber: 3,
      title: "The Day We Found Each Other",
      body: [
        "Then came the day everything changed.",
        "We went to the shelter not quite sure what we were looking for — and there you were, looking right back at us. Whoever cared for you before we met, thank you. We took it from there.",
        "And out of every {species} in the whole wide world, it was you. It was always going to be you.",
      ],
      illustrationBrief:
        "The choosing moment — {petName} meeting their people for the first time. At the shelter/rescue (a kennel door opening, a gentle first sniff), or arriving home (a carrier, a first look around). Warm, hopeful light. {petName} curious or a little unsure — the 'first hello' expression, not full joy yet (that builds across the book).",
    },
    {
      // PAGE 4 — The Drive Home. {homecomingMemory} is optional-with-fallback
      // (story7/merge.ts swaps the stock line in when blank/sparse). The
      // puppy-kitten + found-as-stray softenings are layered in story7/variants.ts.
      id: "welcome-drive-home",
      pageNumber: 4,
      title: "The Drive Home",
      body: [
        "Then we brought you home.",
        "{homecomingMemory}",
        "The whole way, one thing was true, even if you didn't know it yet: you were safe now. You were ours.",
      ],
      illustrationBrief:
        "The journey home — {petName} in a car (on a lap, in a carrier, nose to the window) or being carried up a front path. A small, intimate, in-between moment. Soft motion, warm afternoon light.",
    },
    {
      // PAGE 5 — The First Night. {sleepingSpot} is required. The senior-adoption +
      // cat beats are layered in story7/variants.ts. Many customers' most-
      // remembered moment — make it tender.
      id: "welcome-first-night",
      pageNumber: 5,
      title: "The First Night",
      body: [
        "The first night was new for all of us.",
        "Everything smelled different. Every sound was a question. You weren't sure where you fit yet.",
        "So we showed you. We made you a place — {sleepingSpot} — soft and warm and yours. And little by little, the questions went quiet, and you slept.",
      ],
      illustrationBrief:
        "{petName} settling into {sleepingSpot} for the first time — low, soft lamp-light, cozy, the household quieting around them. Warmth of a BEGINNING of safety, not a memory of it. Tender.",
    },
    {
      // PAGE 6 — Learning Each Other. {quirks} is optional-with-fallback
      // (story7/merge.ts swaps the stock line in when blank). The child beat is
      // layered in story7/variants.ts when {childName} is provided.
      id: "welcome-learning",
      pageNumber: 6,
      title: "Learning Each Other",
      body: [
        "After that, we got to know you. And you, us.",
        "We learned {quirks}.",
        "We learned what made your tail go, and what made you hide, and the exact sound that meant now, please, walk, now. You learned us right back — our footsteps, our voices, the times of day that were yours.",
        "That is how a {species} and a family become a {species} and their family: one small thing at a time.",
      ],
      illustrationBrief:
        "A warm everyday scene full of personality — {petName} mid-quirk (head-tilt, the zoomie, the parade with a stolen sock), the family laughing or watching. The 'now they're a character, not a stranger' page. Bright, busy-but-cozy.",
    },
    {
      // PAGE 7 — Now You're Ours. {favoriteActivity} + {sleepingSpot} required.
      // The family-members swap (sentence 3) + the anniversary "years on" framing
      // are layered in story7/variants.ts. The visual payoff of the empty-house page.
      id: "welcome-now-ours",
      pageNumber: 7,
      title: "Now You're Ours",
      body: [
        "And now? Now you're just part of it.",
        "Your favorite thing in the world is {favoriteActivity}. Your spot is {sleepingSpot}. Your people are {ownerNames}. Your home is here.",
        "The house isn't quiet anymore. It's better.",
      ],
      illustrationBrief:
        "{petName} doing {favoriteActivity}, full of joy and belonging — the 'peak happy' image of the book, brightest palette. The family present or implied. The visual payoff of the empty-house page: the spot by the door has somebody in it now.",
    },
    {
      // PAGE 8 — You Belong Here (the love-beat). The template tags this
      // `narrative` (NOT `love`). The child beat (sentence swap) is layered in
      // story7/variants.ts when {childName} is provided. The emotional anchor.
      id: "welcome-belong",
      pageNumber: 8,
      title: "You Belong Here",
      body: [
        "Here is the truest thing in this whole book.",
        "You are not a guest. You are not \"the new {species}.\" You are family — all the way through, no trial period, no taking-back.",
        "You belong here. You belong to us, and we belong to you, and that is simply how it is now.",
      ],
      illustrationBrief:
        "The emotional anchor image — quiet and a little dreamlike. {petName} close against their person — a hand on the head, the pet leaning in, full trust. Soft glow, warm. The single strongest, most frame-able illustration in the book.",
    },
    {
      // PAGE 9 — Closing. The new-arrival default below; the anniversary occasion
      // swaps the whole body in story7/variants.ts. Ends on belonging.
      id: "welcome-closing",
      pageNumber: 9,
      body: [
        "So welcome home, {petName}.",
        "You were worth the wait. You were worth the empty bowl and the quiet house and all the days before you came.",
        "This is your home now, {petName}. It always will be.",
      ],
      illustrationBrief:
        "The closing image — {petName} settled and content in the heart of the home, warm golden light, the family near. Should rhyme with the cover (same pet, same warmth) but feel SETTLED where the cover felt ARRIVING — the journey complete. End on belonging, glowing, hopeful.",
    },
    {
      // BACK COVER — Our First Year (Memory Page). The Story-1 `back-cover`
      // treatment: a soft-bordered writing space. The anniversary occasion swaps
      // the prompt in story7/variants.ts. Decorative border only; no generated scene.
      id: "welcome-back-cover",
      pageNumber: null,
      title: "The story of {petName}'s first days with us",
      body: [
        "The day {petName} came home: ___________",
        "Where {petName} slept the first night: ___________",
        "The first thing {petName} ever stole / destroyed / charmed: ___________",
        "The moment we knew {petName} was really ours: ___________",
      ],
      illustrationBrief:
        "Soft, cheerful border around the writing space — paw prints, a little house, a sprig of something green. Should not compete with the handwritten content. Brighter than Story 1's memory-page border (this is a happy keepsake).",
    },
  ];
}
