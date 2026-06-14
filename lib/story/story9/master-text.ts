// The Story-9 master text ("[PET_NAME] and the New Baby") as structured data —
// the single source of wording for the whole family-transition keepsake. Story 9
// is a NARRATIVE-layout book like Story 1/6/7 (cover + page-1 dedication + pages
// 2-7 + back cover); it reuses Story 1's `cover`/`dedication`/`narrative`/`love`/
// `back-cover` layouts wholesale. This module owns only the *unresolved* template:
// every page's copy carries `{mergeField}` placeholders, an illustration brief
// (data for the imagery agent's prompt builders), and a stable page id. Variant
// selection (story9/variants.ts) and merge (story9/merge.ts) layer on top, with
// `resolveStory9()` as the single entry point.
//
// THE ONE RULE ABOVE ALL OTHERS (from the master template's quality bar): the new
// baby NEVER replaces, displaces, or competes with the pet — love MULTIPLIES, it
// never divides. The pet's security is established (Pages 2-3) BEFORE the baby is
// mentioned (Page 4). Hard rules baked in here, never to be paraphrased: never the
// phrase "fur baby"; no memorial / death language of any kind (this is a JOYFUL,
// living, growing-family book — no "rainbow bridge", no "watching over", no
// goodbye); the pet is loved for itself, first, never *because* it helps with the
// baby; reframe the change as a promotion (big sibling), not a loss.
//
// The exact wording below is the product requirement, from
// context/masterstories/story-9-master-template.md (default tone = babyStatus
// "expecting", no other pets, dog voice). The babyStatus "arrived" framing, the
// species voice tweaks, and the other-pets lines are layered in story9/variants.ts.

import type { MasterPage, Story9PageId } from "@/lib/story/master-text";

/**
 * A Story-9 master page: a `MasterPage` narrowed so its `id` must be a Story-9 slot
 * id (a compile-time guard that the keepsake never accidentally carries a
 * Story-1/2/4/5/6/7/8 page id). `Story9Story` is the ordered set, before variants.
 */
export type Story9MasterPage = MasterPage & { id: Story9PageId };
export type Story9Story = Story9MasterPage[];

// ---------------------------------------------------------------------------
// Placeholder syntax
// ---------------------------------------------------------------------------
//
// Placeholders are `{camelCaseKey}` tokens — the SAME syntax Story 1/2/4/5/6 use,
// so the shared merge primitives (PLACEHOLDER_PATTERN / substitute,
// lib/story/merge.ts) resolve them unchanged. Keys map to merge fields as follows
// (the pronoun forms, the sentence-initial-capitalized subject pronoun, the species
// descriptor, and the degraded {babyName} are derived in story9/merge.ts):
//
//   {petName}          ← pet.name              {species}          ← pet.species
//   {breedColor}       ← pet.breedColor        {pronounSubject}   ← pet.pronoun
//   {pronounSubjectCap}← derived (sentence-initial)
//   {pronounObject}    ← derived               {pronounPossessive}← derived
//   {speciesDescriptor}← derived (good boy / sweet girl / kitty / bunny / friend)
//   {ownerNames}       ← owner.names
//   {favoriteActivity} ← memories.favoriteActivity
//   {sleepingSpot}     ← memories.sleepingSpot
//   {quirks}           ← memories.quirks        (optional-with-fallback, Page 3)
//   {babyName}         ← derived (degrades to "the new baby"; never a literal)
//   {petNicknames}     ← memories.nicknames     (optional — not in default body)
//   {babyArrival}      ← memories.babyArrival   (optional — Page 4 append, expecting)

// ---------------------------------------------------------------------------
// The Story-9 master pages (expecting / no other pets / dog default)
// ---------------------------------------------------------------------------
//
// Reuses `MasterPage` (lib/story/master-text.ts) — the shape is product-agnostic:
// id, pageNumber, optional title/subtitle, body paragraphs, illustration brief.
// The cover/back-cover carry no page number (null); pages 1-7 are numbered 1-7.
// The Page-1 dedication uses the Story-1 dedication treatment (title = the opening
// lines, body = the attribution). Page 7 uses the `love` layout (lead / hero), so
// its body is authored as [lead, hero] — see the LovePage renderer for the split;
// the hero is "Love does not divide. It multiplies." Page 8 uses the `closing`
// layout (body + image, no title) and carries the master template's
// room-for-everyone closing echo on its own page.
//
// Returned by a function (not a frozen const) so variant composition takes a fresh,
// mutable copy each call without aliasing module state.

/** The canonical Story-9 master pages at the default tone (expecting, no other pets, dog). */
export function masterStory9(): Story9Story {
  return [
    {
      // COVER. Title carries the pet name; the subtitle names the family.
      id: "baby-cover",
      pageNumber: null,
      title: "{petName} and the New Baby",
      subtitle: "A story for the {ownerNames} family",
      body: [],
      illustrationBrief:
        "{petName} (a {breedColor} {species}) in warm afternoon light, sitting proudly and contentedly in a cozy home — a soft hint of a nursery or a small baby presence nearby (a mobile, a folded blanket, a bassinet shape), but the PET is the subject and the hero of the image. Gentle, happy, settled body language — not anxious. Soft golden palette. This is the 'all is well, and growing' image.",
    },
    {
      // PAGE 1 — Dedication. The Story-1 dedication treatment: `title` is the
      // opening lines, `body` is the attribution. The babyStatus=arrived variant
      // (story9/variants.ts) rewrites this whole page to name the baby.
      id: "baby-page-1",
      pageNumber: 1,
      title: "For {petName},\nwho was here first,\nand is loved just as much as ever.",
      body: ["— The {ownerNames} family"],
      illustrationBrief:
        "Single soft portrait of {petName} alone, looking gently toward the reader, with a pastel watercolor border. The pet looks the way the family knows them — present, themselves, at ease.",
    },
    {
      // PAGE 2 — You Were Here First. The species voice (cat) is layered in
      // story9/variants.ts; the other-pets line is appended there when "yes". The
      // pet's security is established HERE, before the baby is ever mentioned.
      id: "baby-page-2",
      pageNumber: 2,
      title: "You Were Here First",
      body: [
        "Before the new baby, there was you.",
        "In this home full of love, {petName} was the very first — the first to be waited for, the first to be welcomed, the first to make this house a family.",
        "{petName} knew every corner. The warm spot by the window. The sound of the right car in the driveway. The exact moment someone needed a friend.",
        "This was your home first, {petName}. It still is.",
      ],
      illustrationBrief:
        "{petName} settled comfortably in the heart of the home — curled in a favorite spot, or greeting the family at the door. Warm interior light. The pet is centered and at ease, the unmistakable resident of this place.",
    },
    {
      // PAGE 3 — Our Days Together. Carries {favoriteActivity}, {quirks}
      // (optional-with-fallback), {sleepingSpot}. No babyStatus/species touch here.
      id: "baby-page-3",
      pageNumber: 3,
      title: "Our Days Together",
      body: [
        "Every day, you and your family have a rhythm all your own.",
        "{petName}'s favorite thing in the world is {favoriteActivity}.",
        "And {ownerNames} love {pronounObject} for it — even {quirks}.",
        "When the day winds down, {petName} curls up {sleepingSpot}, where it is warm and safe and exactly where {pronounSubject} belongs.",
      ],
      illustrationBrief:
        "{petName} doing {favoriteActivity}, full of life and joy — the 'peak happy' image of the book. Bright, warm palette. Keep the focus on the pet; family figures, if present, are generic and in soft background.",
    },
    {
      // PAGE 4 — Something Is Changing. The babyStatus=arrived variant rewrites
      // this whole page (story9/variants.ts); the {babyArrival} append + other-pets
      // line are layered there too. The baby is introduced gently, as GOOD NEWS.
      id: "baby-page-4",
      pageNumber: 4,
      title: "Something Is Changing",
      body: [
        "Lately, something in the house has been changing.",
        "There are new smells. New sounds. A small room being made ready, with soft things and quiet colors. The grown-ups talk in gentle, excited voices.",
        "{petName} has noticed. Of course {petName} has — {pronounSubject} notices everything.",
        "Here is the good news, the happy news: a new baby is coming to join the family.",
      ],
      illustrationBrief:
        "{petName} curiously, calmly investigating a gentle sign of preparation — sniffing a folded baby blanket, watching a mobile turn, sitting in the doorway of a half-ready nursery. The pet is interested and calm, NOT worried. Soft nursery-adjacent palette. The baby is not present yet (expecting framing).",
    },
    {
      // PAGE 5 — You're Going to Be a Big Sibling. The pivot the whole book turns
      // on: the pet is PROMOTED, not displaced. {speciesDescriptor} drives the "big
      // [descriptor]" phrasing; the other-pets line is appended in variants.ts.
      id: "baby-page-5",
      pageNumber: 5,
      title: "You're Going to Be a Big Sibling",
      body: [
        "So here is something important for {petName} to know.",
        "When the new baby comes, {petName} will not be any less loved. Not for one single moment.",
        "{petName} is going to be a big sibling — the best big {speciesDescriptor}. The one who was here first. The one who knows the home best. The gentle, patient one the baby will learn to love right back.",
        "You are not being replaced, {petName}. You are being promoted.",
      ],
      illustrationBrief:
        "{petName} standing or sitting tall and proud — a 'big sibling' portrait — perhaps beside a small abstract baby presence (a bundle in a parent's generic arms, a bassinet) but with the pet clearly the steady, important figure. Warm, reassuring light. Body language: confident, gentle, dignified.",
    },
    {
      // PAGE 6 — The Bond. The babyStatus=arrived variant shifts this to present
      // tense + names the baby (story9/variants.ts); the species (cat) voice is
      // layered there too. The warmth of two small creatures in one home.
      id: "baby-page-6",
      pageNumber: 6,
      title: "The Bond",
      body: [
        "Soon there will be a small new person, and a {species} who loves {pronounObject}.",
        "There will be quiet mornings with everyone home. A tiny hand reaching for soft fur. A warm body keeping watch beside the crib. The baby will learn the sound of {petName} before {pronounSubject} learns much else at all.",
        "Some of the very first happy things the baby ever knows will be {petName}.",
      ],
      illustrationBrief:
        "The anticipated bond — {petName} resting gently near a bassinet or beside a generic, abstract baby (a small bundle, a tiny hand). Tender, calm, safe. The pet is attentive and soft, never crowding. Golden, peaceful light. NO specific baby face — keep the baby stylized.",
    },
    {
      // PAGE 7 — Love Grows (the `love` layout: lead / hero). The thesis, stated
      // plainly. The HERO line is "Love does not divide. It multiplies." (the
      // master template's `love` hero beat). The book's room-for-everyone closing
      // echo lives on its OWN page (baby-page-8, `closing`), not folded here. The
      // other-pets line is appended into the lead in variants.ts. LovePage renders a
      // [lead, hero] (2-element) body correctly — `closer` is undefined.
      id: "baby-page-7",
      pageNumber: 7,
      title: "Love Grows",
      body: [
        // lead
        "Here is the most important thing of all. When a family grows, the love grows with it. There is not a smaller piece of love for {petName} now — there is more love in the whole house than there has ever been, and {petName} is right in the middle of it.",
        // hero
        "Love does not divide. It multiplies.",
      ],
      illustrationBrief:
        "The strongest, most symbolic image in the book — {petName} and the family (generic, abstract figures + the abstract baby) gathered warmly together, soft glow, slightly dreamlike. {petName} is the heart of the scene. This is the most-quoted page; make it the best illustration.",
    },
    {
      // PAGE 8 — Closing (the `closing` layout, no title — like Story 7's closing;
      // ClosingPage renders body + the illustration only). Close on security and
      // belonging, echoing the opening so the book feels whole. babyStatus=arrived
      // rewrites the middle line to name the baby (story9/variants.ts). This page
      // carries an illustration brief (it still describes a scene) but is NOT a
      // generated slot — same split as the dedication / back cover.
      id: "baby-page-8",
      pageNumber: 8,
      body: [
        "So don't worry, {petName}.",
        "You are the first. You are the big {speciesDescriptor}. You are loved today, and you will be loved tomorrow, and you will be loved when the baby is grown and gone and grey.",
        "There's room for everyone, {petName}.\nThere always was.",
      ],
      illustrationBrief:
        "The closing image — {petName} and the whole growing family together in their happiest, warmest scene, golden light, slightly dreamlike to suggest a beginning rather than an ending. Should echo the cover but feel fuller and more settled. The pet is content and central.",
    },
    {
      // BACK COVER — Memory Page. The Story-1 `back-cover` treatment: a
      // soft-bordered writing space. Decorative border only; no generated scene.
      id: "baby-back-cover",
      pageNumber: null,
      title: "A place to remember the day our family grew",
      body: [
        "The day we told {petName} about the baby: ___________",
        "How {petName} reacted the first time: ___________",
        "{petName} and the baby's first quiet moment together: ___________",
        "One thing we never want to forget: ___________",
      ],
      illustrationBrief:
        "Soft border around the writing space — paw prints, a gentle leaf, a small nursery-soft motif. Should not compete with the handwritten content.",
    },
  ];
}
