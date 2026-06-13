// The Story-1 master text ("Saying Goodbye to [PET_NAME]") as structured data —
// the single source of wording for the whole book. This module owns only the
// *unresolved* template: every page's copy carries `{mergeField}` placeholders,
// an illustration brief (plain text for feature 07's prompt builders — not
// rendered here), and a stable page id/slot. Variant selection (variants.ts) and
// placeholder substitution (merge.ts) happen on top of this data; the single
// entry point `resolveStory()` (variants.ts) composes them.
//
// The exact wording below is the product requirement, copied from
// context/masterstories/story-1-master-template.md (default tone = age 6-8).
// Hard rules baked in here, never to be paraphrased: always the word "died"
// (never "passed away" / "went to sleep" / "lost"); the last full page (12) is
// hopeful; the pet's name and pronouns recur on every page.

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — internal to this module's data.
// The merge engine is the only consumer that knows the syntax; everything
// downstream (feature 04) receives fully-resolved strings. Keys map to merge
// fields as follows (derived ones are computed in merge.ts from the session):
//
//   {petName}          ← pet.name            {pronounSubject} ← pet.pronoun
//   {species}          ← pet.species          {breedColor} ← pet.breedColor
//   {pronounObject}    ← derived              {pronounPossessive} ← derived
//   {speciesDescriptor}← derived              {childName} ← child.name
//   {favoriteActivity} ← memories.favoriteActivity
//   {sleepingSpot}     ← memories.sleepingSpot
//   {favoriteMemory}   ← memories.favoriteMemory
//   {parentDedication} ← memories.parentDedication (Page 1, optional)

/** The regex the merge engine uses to find/validate placeholders. */
export const PLACEHOLDER_PATTERN = /\{([a-zA-Z]+)\}/g;

// ---------------------------------------------------------------------------
// Page identity
// ---------------------------------------------------------------------------

/**
 * Stable id for each Story-1 book slot. The numeric pages 1–12 use their number
 * in the id so variant code can address them precisely ("page-7" etc.).
 */
export type Story1PageId =
  | "cover"
  | "page-1"
  | "page-2"
  | "page-3"
  | "page-4"
  | "page-5"
  | "page-6"
  | "page-7"
  | "page-8"
  | "page-9"
  | "page-10"
  | "page-11"
  | "page-12"
  | "back-cover";

/**
 * Stable id for each Story-2 letter slot ("A Letter from [PET_NAME]"). The
 * template labels the cover "PAGE 1" and the letter body pages 2–6; the ids use
 * those numbers so the Story-2 variant code can address them precisely
 * ("letter-page-4" etc.) without colliding with the Story-1 numeric ids.
 */
export type Story2PageId =
  | "letter-cover"
  | "letter-page-2"
  | "letter-page-3"
  | "letter-page-4"
  | "letter-page-5"
  | "letter-page-6";

/**
 * Stable id for each Story-4 slot ("If [PET_NAME] Could Talk" — the living/
 * celebration twin of Story 2, feature 20). A distinct `talk-` prefix keeps the
 * ids from colliding with Story 2's `letter-` ids even though both products
 * render with the shared `letter-cover` / `letter` layouts: the cover is "PAGE 1"
 * and the body pages are 2–6, so the Story-4 variant code can address them
 * precisely ("talk-page-4" etc.).
 */
export type Story4PageId =
  | "talk-cover"
  | "talk-page-2"
  | "talk-page-3"
  | "talk-page-4"
  | "talk-page-5"
  | "talk-page-6";

/**
 * Stable id for each Story-5 slot ("A Letter to [PET_NAME]" — the inverse/
 * companion of Story 2, the owner writing TO the pet who died; feature 23). A
 * distinct `note-` prefix keeps the ids from colliding with Story 2's `letter-`
 * and Story 4's `talk-` ids even though all three render with the shared
 * `letter-cover` / `letter` layouts: the cover is "PAGE 1" and the body pages are
 * 2-6, so the Story-5 variant code can address them precisely ("note-page-4" etc.).
 */
export type Story5PageId =
  | "note-cover"
  | "note-page-2"
  | "note-page-3"
  | "note-page-4"
  | "note-page-5"
  | "note-page-6";

/**
 * Stable id for each Story-6 slot ("While You're Still Here, [PET_NAME]" — the
 * living tribute, feature 25). A distinct `tribute-` prefix keeps the ids from
 * colliding with the other products' ids even though Story 6 renders with Story
 * 1's NARRATIVE layouts (`cover`/`dedication`/`narrative`/`love`/`back-cover`).
 * Reusing a layout VALUE is not reusing a page id — the ids stay prefixed. The
 * book is cover + page-1 (dedication) + pages 2-6 + back cover (8 pages); the
 * variant code addresses pages precisely ("tribute-page-5" etc.).
 */
export type Story6PageId =
  | "tribute-cover"
  | "tribute-page-1"
  | "tribute-page-2"
  | "tribute-page-3"
  | "tribute-page-4"
  | "tribute-page-5"
  | "tribute-page-6"
  | "tribute-back-cover";

/**
 * Stable id for each Story-7 slot ("Welcome Home — [PET_NAME]'s Gotcha Day" — the
 * catalog's first joyful, non-memorial book, feature 28). A distinct `welcome-`
 * prefix keeps the ids from colliding with the other products' ids even though
 * Story 7 renders with Story 1's NARRATIVE layouts (`cover`/`dedication`/
 * `narrative`/`closing`/`back-cover` — NO `truth`). Reusing a layout VALUE is not
 * reusing a page id — the ids stay prefixed. The book is cover + page-1
 * (dedication) + pages 2-8 + closing + back cover (11 page ids, 10 printed leaves);
 * the variant code addresses pages precisely ("welcome-drive-home" etc.).
 */
export type Story7PageId =
  | "welcome-cover"
  | "welcome-dedication"
  | "welcome-before"
  | "welcome-choosing"
  | "welcome-drive-home"
  | "welcome-first-night"
  | "welcome-learning"
  | "welcome-now-ours"
  | "welcome-belong"
  | "welcome-closing"
  | "welcome-back-cover";

/**
 * The stable id for any book slot, across products. Shared, product-agnostic
 * types key on this — `ResolvedPage.id`, `PageImageMap`, the registry's
 * `illustrationSlots` — so the union is the sum of every product's slot ids.
 * (Same generalization shape as `PageLayout` in lib/story/merge.ts, which feature
 * 14 widened so one renderer can serve more than one product.)
 */
export type PageId =
  | Story1PageId
  | Story2PageId
  | Story4PageId
  | Story5PageId
  | Story6PageId
  | Story7PageId;

// ---------------------------------------------------------------------------
// Unresolved page model (this module's output, before variants + merge)
// ---------------------------------------------------------------------------

/**
 * One page of the master text, still carrying `{placeholder}` tokens.
 *
 * `body` is an ordered list of paragraph strings (a page can be one or many
 * paragraphs). `title` / `subtitle` exist only where the layout has them
 * (cover, dedication, back cover). `illustrationBrief` is plain text describing
 * the scene for feature 07's prompt builders — it is data, not rendered copy.
 */
export interface MasterPage {
  id: PageId;
  /** Printed page number for numbered pages; null for cover/back cover. */
  pageNumber: number | null;
  /** Large heading copy, where the page has one. */
  title?: string;
  /** Secondary heading copy, where the page has one. */
  subtitle?: string;
  /** Ordered paragraphs of body copy. */
  body: string[];
  /** Plain-text scene brief for the AI illustration pipeline (feature 07). */
  illustrationBrief: string;
}

/** The full ordered set of master pages, before variants and merge. */
export type MasterStory = MasterPage[];

// ---------------------------------------------------------------------------
// The master text
// ---------------------------------------------------------------------------
//
// Returned by a function (not a frozen const) so variant composition can take a
// fresh, mutable copy each call without aliasing module state — keeps the whole
// pipeline pure and side-effect free.

/** The canonical Story-1 master pages at the default (age 6-8) tone. */
export function masterStory(): MasterStory {
  return [
    {
      id: "cover",
      pageNumber: null,
      title: "Saying Goodbye to {petName}",
      subtitle: "A story for {childName}",
      body: [],
      illustrationBrief:
        "{petName} (a {breedColor} {species}) sitting in warm afternoon light with {childName} (a child, age-appropriate, gender-neutral if not specified) gently leaning against {pronounObject}. Soft sunset palette. The pet should look gentle, not sad. This is the 'we loved each other' image, not the 'goodbye' image.",
    },
    {
      id: "page-1",
      pageNumber: 1,
      title: "For {childName}, and for {petName},",
      body: ["who loved {pronounObject} so very much."],
      illustrationBrief:
        "Single portrait of {petName} alone, looking softly toward the reader. Soft pastel border (watercolor wash). The pet should look the way the customer remembers them — alive, present, themselves.",
    },
    {
      id: "page-2",
      pageNumber: 2,
      body: [
        "Once, in a home full of love, there lived a {species} named {petName}.",
        "{petName} was a {breedColor}.",
        "And {pronounSubject} always knew, somehow, when you needed a friend.",
      ],
      illustrationBrief:
        "{petName} at the front door of a cozy home, looking up as if greeting the reader. Warm interior lighting visible through window. Body language: alert, happy, tail position friendly.",
    },
    {
      id: "page-3",
      pageNumber: 3,
      body: [
        "{petName} loved {childName} more than anything in the whole world.",
        "And {childName} loved {petName} right back.",
      ],
      illustrationBrief:
        "{petName} and {childName} together in a quiet moment — perhaps the child reading to the pet, or the pet's head resting on the child's lap. Eye contact between them. This is the emotional anchor of the book.",
    },
    {
      id: "page-4",
      pageNumber: 4,
      body: [
        "Every day was an adventure together.",
        "{petName}'s favorite thing in the world was {favoriteActivity}.",
      ],
      illustrationBrief:
        "{petName} doing {favoriteActivity}, full of energy and life. Bright, joyful palette here — this is the 'peak alive' image. Keep focus on the pet.",
    },
    {
      id: "page-5",
      pageNumber: 5,
      body: [
        "And when the day was done, {pronounSubject} would curl up {sleepingSpot}, where it was warm and safe.",
        "That was {petName}'s favorite place to dream.",
      ],
      illustrationBrief:
        "{petName} sleeping peacefully {sleepingSpot}. Soft, low light. Cozy. This image sets up the 'peaceful rest' feeling echoed on Page 7.",
    },
    {
      id: "page-6",
      pageNumber: 6,
      body: [
        "There was one day {childName} will always remember.",
        "{favoriteMemory}",
        "That was the kind of love {petName} and {childName} shared.",
      ],
      illustrationBrief:
        "Evoke the memory the parent shared. If the memory is too specific to illustrate, use a warm 'looking at each other' image of {childName} and {petName}, with golden hour light.",
    },
    {
      // Default (natural) Page 7 — death-type variants swap the body in variants.ts.
      id: "page-7",
      pageNumber: 7,
      body: [
        "But every living thing has a beginning, a middle, and an end. Even the ones we love most.",
        "{petName}'s body got tired.",
        'And then, very gently, {pronounPossessive} body stopped working. That is what "died" means.',
      ],
      illustrationBrief:
        "{petName} resting peacefully — eyes closed, body relaxed, paws tucked. NOT scary, NOT lifeless. Soft, warm tones. Should mirror the sleeping image on Page 5 — same posture, same comfort. Do NOT show the body in a hospital, on a vet table, or anything clinical.",
    },
    {
      // Default Page 8 — the 3-5 and 9-12 age variants adjust the body in variants.ts.
      id: "page-8",
      pageNumber: 8,
      body: [
        "This might make {childName} feel a lot of things.",
        "Sad. Maybe angry. Maybe like nothing feels right anymore.",
        "Maybe like crying. Maybe like not crying at all.",
        "All of these feelings are okay.",
        "They mean {childName} loved {petName} very, very much.",
      ],
      illustrationBrief:
        "{childName} sitting quietly, perhaps holding {petName}'s collar, leash, or favorite toy. Expression: thoughtful, not weeping. The child is processing, not in crisis. An adult figure (parent's shape, no specific face) may be sitting nearby, present but giving space.",
    },
    {
      // Default (rainbow-bridge) Page 9 — belief-frame variants swap the body in variants.ts.
      id: "page-9",
      pageNumber: 9,
      body: [
        "Some people say there is a place called the Rainbow Bridge.",
        "A sunny meadow where pets run free, where bodies don't get tired anymore.",
        "Where {petName} is free to spend {pronounPossessive} days {favoriteActivity}.",
      ],
      illustrationBrief:
        "Peaceful meadow at golden hour, {petName} running freely, soft clouds, gentle light. Not too fantastical — keep it earthy, like a real sunlit field.",
    },
    {
      id: "page-10",
      pageNumber: 10,
      body: [
        "Here is the most important thing of all.",
        "The love between {childName} and {petName} did not stop when {petName} died.",
        "Love does not work that way.",
        "It stays. It always stays.",
      ],
      illustrationBrief:
        "{childName} with hand on heart, {petName}'s gentle silhouette or warm light beside them. Symbolic, slightly dreamlike. Make this illustration the strongest one in the book.",
    },
    {
      // Default Page 11 — the other-pets line is appended in variants.ts when "yes".
      id: "page-11",
      pageNumber: 11,
      body: [
        "When {childName} misses {petName} — and that will happen many times — there are things {childName} can do.",
        "Look at a picture and remember a happy day.",
        "Tell a story about {petName} to someone who will listen.",
        "Say {petName}'s name out loud — names are meant to be said.",
        "And know that, wherever {petName} is, {pronounSubject} is loved.",
      ],
      illustrationBrief:
        "Three small vignettes in a triptych: (1) {childName} looking at a framed photo of {petName}; (2) {childName} telling a story to a parent or sibling; (3) {childName} outdoors, looking up at the sky or a meadow, saying {petName}'s name.",
    },
    {
      // The hopeful closing page — the book's last full page must end on love.
      id: "page-12",
      pageNumber: 12,
      body: [
        "{petName} was a good {speciesDescriptor}.",
        "{petName} was {childName}'s {species}.",
        "And {petName} will always, always be loved.",
      ],
      illustrationBrief:
        "The closing image — {petName} and {childName} together in their happiest scene, warm golden light, slightly dreamlike to suggest memory. Mirrors the cover but feels more eternal — a soft glow, or seen from slightly farther away.",
    },
    {
      id: "back-cover",
      pageNumber: null,
      title: "A place to write a memory of {petName}",
      body: [
        "The day {petName} came home: ___________",
        "{petName}'s favorite sound: ___________",
        "The funniest thing {petName} ever did: ___________",
        "One thing {petName} taught me: ___________",
      ],
      illustrationBrief:
        "Soft border around the writing space — perhaps paw prints, a flower, or a gentle frame. Should not compete with the handwritten content.",
    },
  ];
}
