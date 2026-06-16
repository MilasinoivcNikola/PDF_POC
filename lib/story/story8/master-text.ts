// The Story-8 master text ("The Amazing Adventures of [PET_NAME]") as structured
// data — the single source of wording for the whole adventure book. Story 8 is the
// catalog's FIRST joyful kids' adventure title and a NARRATIVE-layout book like
// Story 1/6/7: cover + pages 1-11 + back cover (13 page ids, 10 illustration
// slots). It reuses Story 1's `cover`/`narrative`/`closing`/`back-cover` layouts
// wholesale — there is NO `dedication`, NO `love`, NO `truth` (no death page). This
// module owns only the *unresolved* template: every page's copy carries
// `{mergeField}` placeholders, an illustration brief (data for the imagery agent's
// prompt builders), and a stable page id. Variant selection (story8/variants.ts)
// and merge (story8/merge.ts) layer on top, with `resolveStory8()` as the single
// entry point.
//
// THE RULE ABOVE ALL OTHERS (from the master template's quality bar): this is the
// HAPPY adventure book. The voice is playful, warm and read-aloud. Hard rules baked
// in here, never to be paraphrased: NO grief/memorial language ever ("rainbow
// bridge", "passed away", "fur baby", "watching over", "crossed over"); NO lazy
// filler ("little did they know…", "happily ever after" verbatim); NO emojis/icons
// in the body (the back-cover star rating is the one decorative exception); the
// WOBBLE (Page 7) is real but MILD jeopardy that ALWAYS resolves safely on the next
// beat — never scary, never sad. The SUPERPOWER is the soul of the book: the pet's
// real quirk reframed as the skill that saves the day.
//
// THE ILLUSTRATION BRIEFS LIVE HERE (the single source). Each scene page carries
// the Backyard-Mystery beat brief PR-0 inlined in lib/ai/story8-prompts.ts; PR-A
// moves them into the master text so the imagery agent reads each page's resolved
// brief from `resolveStory8` (the Story-6/7 shape). The pose-discipline /
// dynamic-watercolor clause stays in the prompt builder, NOT the brief.
//
// The exact wording below is the product requirement, from
// context/masterstories/story-8-master-template.md (default copy = the Backyard
// Mystery theme, age 6-8, pet-plus, dog voice).

import type { MasterPage, Story8PageId } from "@/lib/story/master-text";

/**
 * A Story-8 master page: a `MasterPage` narrowed so its `id` must be a Story-8
 * slot id (a compile-time guard that the adventure book never accidentally carries
 * a Story-1/2/4/5/6/7 page id). `Story8Story` is the ordered set, before variants.
 */
export type Story8MasterPage = MasterPage & { id: Story8PageId };
export type Story8Story = Story8MasterPage[];

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1/2/4/5/6/7 use,
// so the shared merge primitives (PLACEHOLDER_PATTERN / substitute,
// lib/story/merge.ts) resolve them unchanged. Keys map to merge fields as follows
// (derived pronoun forms + speciesDescriptor are computed in story8/merge.ts from
// pet.pronoun / pet.species):
//
//   {petName}           ← pet.name              {species}           ← pet.species
//   {breedColor}        ← pet.breedColor        {pronounSubject}    ← pet.pronoun
//   {pronounObject}     ← derived               {pronounPossessive} ← derived
//   {speciesDescriptor} ← derived (Page 9)
//   {childName}         ← adventure.childName   (conditional — required in pet-plus)
//   {superpower}        ← adventure.superpower  (optional-with-fallback chain)
//   {favoriteActivity}  ← adventure.favoriteActivity (optional-with-fallback)
//   {quirks}            ← adventure.quirks      (optional-with-fallback)
//   {sidekickName}      ← adventure.sidekickName (optional-omit — Page-5 party line)

// ---------------------------------------------------------------------------
// The Story-8 master pages (Backyard Mystery / age 6-8 / pet-plus / dog default)
// ---------------------------------------------------------------------------
//
// Reuses `MasterPage` (lib/story/master-text.ts) — the shape is product-agnostic:
// id, pageNumber, optional title/subtitle, body paragraphs, illustration brief.
// The cover/back-cover carry no page number (null); pages 1-11 are numbered 1-11.
//
// Returned by a function (not a frozen const) so variant composition takes a
// fresh, mutable copy each call without aliasing module state.

/** The canonical Story-8 master pages at the default (Backyard Mystery, 6-8, pet-plus, dog) tone. */
export function masterStory8(): Story8Story {
  return [
    {
      // COVER — the hero shot. Title carries the pet name; the subtitle is the
      // Backyard-Mystery pet-plus default (story8/variants.ts swaps it for pet-solo).
      id: "adventure-cover",
      pageNumber: null,
      title: "The Amazing Adventures of {petName}",
      subtitle: "The Backyard Mystery — starring {childName} and {petName}",
      body: [],
      illustrationBrief:
        "HERO SHOT — this image sells the book. {petName} (a {breedColor} {species}) front and center in a confident, heroic pose in a bright sunny backyard, with {childName} grinning just behind {pronounObject}. A tiny adventurer's bandana or a magnifying glass held in {pronounPossessive} mouth is fine. This is the locked-likeness anchor for the whole book — {petName} is in clear 3/4 view with the face fully visible, so the customer instantly recognizes their pet. Warm watercolor, dynamic but readable.",
    },
    {
      // PAGE 1 — The Ordinary Day. Establishes the pet, the home, the bond.
      id: "adventure-ordinary",
      pageNumber: 1,
      title: "The Ordinary Day",
      body: [
        "In a cozy little house with a big green backyard, there lived a {speciesNoun} named {petName}.",
        "{petName} was a {breedColor}, and {pronounSubject} was {childName}'s very best friend in the whole world.",
        "Most days were perfectly ordinary. But {petName} was about to become a hero.",
      ],
      illustrationBrief:
        "{petName} and {childName} together in the backyard on a normal sunny morning — relaxed, happy, establishing the bond. A calm 3/4 view of the pet (we nail likeness here before the action starts).",
    },
    {
      // PAGE 2 — What Made [PET] Special. The first appearance of {superpower}.
      id: "adventure-special",
      pageNumber: 2,
      title: "What Made {petName} Special",
      body: [
        "Now, {petName} had one truly amazing talent.",
        "{petName} had {superpower}. Whenever there was something to find, something hidden, or something that just wasn't right — {petName} always knew.",
        "{childName} called {pronounObject} \"the greatest hero in the whole backyard.\" And today, that would matter very much.",
      ],
      illustrationBrief:
        "{petName} doing the thing that hints at {superpower} — nose to the ground sniffing, ears up, intensely focused, comic and charming. Side or 3/4 view, full body, lots of energy through posture not camera angle.",
    },
    {
      // PAGE 3 — The Call to Adventure. The pet-solo variant rewrites this beat in
      // story8/variants.ts (the child narrates as the reader, not a character).
      id: "adventure-call",
      pageNumber: 3,
      title: "The Call to Adventure",
      body: [
        "One morning, something was wrong.",
        "\"My favorite red sock is GONE!\" said {childName}. \"It was right here, and now it's vanished!\"",
        "{petName}'s ears went up. {pronounPossessive} nose went down. A mystery! And every great mystery needs a great hero.",
        "\"{petName},\" said {childName}, \"we have a case to solve.\"",
      ],
      illustrationBrief:
        "The moment the quest begins — {childName} looking puzzled at an empty clothesline, {petName} suddenly alert, snapping into detective mode. The energy shifts here. Pet in a 3/4 view, ears and posture signaling 'on the case.'",
    },
    {
      // PAGE 4 — The First Clue (the quirk becomes the key).
      id: "adventure-clue",
      pageNumber: 4,
      title: "The First Clue",
      body: [
        "{petName} put {pronounPossessive} amazing {superpower} to work.",
        "Sniff, sniff, SNIFF. Across the grass. Around the flowerpots. Past the wobbly fence.",
        "And then — {petName} stopped. Right at the edge of the garden, where the dandelions grew tall, was a clue: a single thread of bright red wool.",
        "\"You found it!\" cheered {childName}. \"The trail starts HERE!\"",
      ],
      illustrationBrief:
        "ACTION POSE — first real test of likeness in motion. {petName} mid-investigation, nose down following a trail through the garden, body in a dynamic but grounded 3/4 stance. Show motion through stride and ears, not by pointing the pet at the camera. A tiny red thread visible.",
    },
    {
      // PAGE 5 — Deeper Into the Mystery. The expedition. The sidekick party line +
      // pet-solo rewrite are layered in story8/variants.ts.
      id: "adventure-deeper",
      pageNumber: 5,
      title: "Deeper Into the Mystery",
      body: [
        "The trail led {petName} and {childName} on a grand backyard expedition.",
        "Under the bushy hedge (so dark and mysterious!). Over the old log bridge (so brave!). Around the bird bath, where a very suspicious squirrel watched them go.",
        "{petName} never lost the trail. Not once. That's what made {pronounObject} a hero.",
      ],
      illustrationBrief:
        "A traveling montage feel — {petName} leading the way through the 'epic' backyard, {childName} following. Pet in a confident trotting 3/4 pose. Keep it whimsical (the everyday backyard rendered as a grand landscape).",
    },
    {
      // PAGE 6 — The Discovery. The "aha!" reveal.
      id: "adventure-discovery",
      pageNumber: 6,
      title: "The Discovery",
      body: [
        "At last, the trail stopped at the tallest, leafiest corner of the garden.",
        "And there — high up in the old oak tree — was a nest. A big, messy, cozy nest. And woven right into it, soft and warm, was {childName}'s favorite red sock!",
        "\"A bird took it!\" gasped {childName}. \"Mystery solved — by {petName}, the greatest hero in the whole backyard!\"",
      ],
      illustrationBrief:
        "The 'aha!' reveal — {petName} looking up triumphantly at a nest in a tree, {childName} pointing in delight. Pet in a heroic upward-gazing 3/4 pose (head up, chest out). Warm, satisfying light.",
    },
    {
      // PAGE 7 — The Wobble (a little jeopardy). Mild, scary-but-safe, resolves on
      // Page 8. The age-3-5 variant softens this in story8/variants.ts.
      id: "adventure-wobble",
      pageNumber: 7,
      title: "The Wobble",
      body: [
        "But the adventure wasn't over yet.",
        "The nest was very high. And the smallest baby bird had tumbled to a low branch and couldn't get back up. It cheeped a tiny, frightened cheep.",
        "{childName} couldn't reach. The branch was too wobbly. For a moment, nobody knew what to do.",
        "That's when {petName} took a deep breath.",
      ],
      illustrationBrief:
        "The tension beat (gentle, never scary) — a tiny bird stuck on a low branch, {childName} reaching and failing, {petName} gathering {pronounPossessive} courage. Pet shown in a coiled, about-to-act 3/4 stance. The jeopardy is mild and resolves on the next page.",
    },
    {
      // PAGE 8 — Save the Day (the climax). The age-3-5 variant simplifies to one
      // clean action sentence in story8/variants.ts.
      id: "adventure-climax",
      pageNumber: 8,
      title: "Save the Day",
      body: [
        "With one MIGHTY, magnificent, never-before-seen leap —",
        "{petName} sprang up onto the log, balanced like a champion, and gently — oh so gently — nudged the little bird back toward its branch until it hopped up safe and sound.",
        "The baby bird cheeped a happy cheep. Its mother sang a thank-you song. And {petName} landed back on the grass like the hero {pronounSubject} truly was.",
      ],
      illustrationBrief:
        "THE money shot — the most dynamic image in the book. {petName} mid-heroic-leap, springing up to nudge the little bird back to safety. This is the single highest-drift-risk pose: keep it a 3/4 side leap (we see the full profile/silhouette, not a foreshortened lunge at the camera). Motion lines, joyful energy — but the face and markings must stay perfectly on-model.",
    },
    {
      // PAGE 9 — The Celebration. {speciesDescriptor} ("just a good boy / kitty").
      id: "adventure-celebration",
      pageNumber: 9,
      title: "The Celebration",
      body: [
        "What a day!",
        "{childName} got the favorite red sock back. The baby bird got home safe. And the whole backyard knew the truth:",
        "{petName} wasn't just a {speciesDescriptor}. {petName} was a HERO.",
      ],
      illustrationBrief:
        "Joyful celebration — {childName} hugging {petName}, maybe a little homemade 'hero' medal or a flower crown, the rescued bird family watching happily. Pet in a relaxed, beaming 3/4 view (back to a calm pose — easier to keep on-model for the resolution). Bright, golden, triumphant.",
    },
    {
      // PAGE 10 — Home Again, More Loved. No slot (reuses calm celebration imagery).
      id: "adventure-home",
      pageNumber: 10,
      title: "Home Again, More Loved",
      body: [
        "That night, after the greatest adventure of all time, {petName} curled up next to {childName}, tired and happy.",
        "\"You're my best friend,\" whispered {childName}. \"And the bravest hero I know.\"",
        "{petName} gave a sleepy, contented sigh. Tomorrow might be ordinary again. But tonight, {pronounSubject} was a legend.",
      ],
      illustrationBrief:
        "Cozy closing scene — {petName} and {childName} snuggled together at the end of the day, warm lamplight, peaceful. Pet curled or resting in a soft 3/4 view. This mirrors the cover's warmth but quieter — the 'home again' beat. (No generated slot — reuses the calm celebration imagery.)",
    },
    {
      // PAGE 11 — Closing. No slot. Ends on warmth + the sequel hook.
      id: "adventure-closing",
      pageNumber: 11,
      body: [
        "{petName} the {speciesNoun} —",
        "best friend, brave heart, and the greatest hero the backyard has ever known.",
        "The End… until the next amazing adventure.",
      ],
      illustrationBrief:
        "The closing image — {petName} and {childName} together, slightly farther back, a sunset-lit framing. Echoes the cover. Pet in clear 3/4 view, confident and content. Leave room for the 'until the next adventure' promise. (No generated slot — reuses the cover/reference framing.)",
    },
    {
      // BACK COVER — The Hero's Page. A playful "about the hero" fill-in page; the
      // one place a star rating is allowed. Decorative border only, no generated scene.
      id: "adventure-back-cover",
      pageNumber: null,
      title: "All about {petName}, Backyard Hero",
      body: [
        "{petName}'s real-life superpower: ___________",
        "The bravest thing {petName} ever did: ___________",
        "{petName}'s next adventure should be: ___________",
        "Hero rating: ⭐ ⭐ ⭐ ⭐ ⭐",
      ],
      illustrationBrief:
        "A fun 'hero badge' or paw-print medal border around the writing space. Light, celebratory, doesn't compete with the handwritten content. No generated pet scene — decorative only.",
    },
  ];
}
