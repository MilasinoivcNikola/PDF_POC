// Variant composition for Story 8, and the single public entry point
// `resolveStory8()`. Same compose-before-merge pattern as Story 1/2/4/5/6/7:
// variants are composed onto a fresh copy of the master text BEFORE merge, then the
// merge fields are substituted. Everything here is pure and deterministic — no IO.
//
// Story 8 ("The Amazing Adventures of [PET_NAME]") is the catalog's first joyful
// kids' adventure. The FIVE dimensions:
//   1. adventure theme → which pre-authored arc fills the page bodies + briefs.
//      PR-A authors `backyard-mystery` ONLY; the other three values FALL BACK to
//      backyard-mystery (never a half-themed page). Structured as a switch ready for
//      more themes (each new theme = a new case + its page bodies, follow-on work).
//   2. hero count → `pet-solo` rewrites the call (Page 3) + expedition (Page 5)
//      beats so the child narrates as the reader (not a character) and is OMITTED
//      from those scenes, and swaps the cover subtitle to drop the child; `pet-plus`
//      (default) keeps the child as a co-adventurer.
//   3. age bracket → `3-5` simplifies the climax (Page 8) to one clean action
//      sentence + a gentler wobble (Page 7) + less text; `9-12` lengthens sentences,
//      adds a wink of wordplay, keeps the sequel hook; `6-8` is the master text.
//   4. species → handled entirely in story8/merge.ts ({speciesDescriptor} + the
//      species-tuned superpower stock fallback); no page-level rewrite here.
//   5. sidekick present → when `sidekickName` is set AND `heroCount = pet-plus`,
//      insert the Page-5 party line; omit cleanly otherwise.
//
// Like Story 4/5/6/7, each variant-affected body page is BUILT WHOLE by a per-page
// builder (so the pet-solo call and the master call can never half-mix). The wording
// below is the product requirement, copied verbatim-ish from the template. The
// {superpower} fallback chain + the conditional {childName} requirement live in
// story8/merge.ts, not here.

import type {
  AdventureTheme,
  AgeBracket,
  HeroCount,
  Story8Session,
} from "@/lib/session/types";
import type { Story8PageId } from "@/lib/story/master-text";
import { type ResolvedStory } from "@/lib/story/merge";
import {
  masterStory8,
  type Story8Story,
} from "@/lib/story/story8/master-text";
import { mergeStory8 } from "@/lib/story/story8/merge";

// ---------------------------------------------------------------------------
// Dimension 2 — hero count (cover subtitle + Page 3 + Page 5)
// ---------------------------------------------------------------------------

// pet-solo is the LONE-HERO legend: the child is the reader being told the tale,
// not a character in any scene. So pet-solo rewrites EVERY child-referencing page
// (the cover + Pages 1, 2, 3, 4, 5, 6, 9, 10) to a child-free voice, not only the
// call / expedition beats — which is what makes {childName} genuinely OPTIONAL in
// pet-solo
// (a blank child name leaves no {childName} placeholder anywhere to fail merge). In
// pet-plus, the child is a co-adventurer throughout and {childName} is required.

/** Cover subtitle: pet-plus names the child too; pet-solo stars the pet alone. */
function coverSubtitle(heroCount: HeroCount): string {
  return heroCount === "pet-solo"
    ? "The Backyard Mystery — starring {petName}"
    : "The Backyard Mystery — starring {childName} and {petName}";
}

/** Page 1 (the ordinary day). pet-solo drops the child as the named best friend. */
function page1Body(heroCount: HeroCount): string[] {
  if (heroCount === "pet-solo") {
    return [
      "In a cozy little house with a big green backyard, there lived a {species} named {petName}.",
      "{petName} was a {breedColor}, and {pronounSubject} was the very best friend a family could ask for.",
      "Most days were perfectly ordinary. But {petName} was about to become a hero.",
    ];
  }
  return [
    "In a cozy little house with a big green backyard, there lived a {species} named {petName}.",
    "{petName} was a {breedColor}, and {pronounSubject} was {childName}'s very best friend in the whole world.",
    "Most days were perfectly ordinary. But {petName} was about to become a hero.",
  ];
}

/** Page 2 (what made [PET] special). pet-solo drops the child's nickname line. */
function page2Body(heroCount: HeroCount): string[] {
  if (heroCount === "pet-solo") {
    return [
      "Now, {petName} had one truly amazing talent.",
      "{petName} had {superpower}. Whenever there was something to find, something hidden, or something that just wasn't right — {petName} always knew.",
      "Everyone in the house knew {pronounObject} as the greatest hero in the whole backyard. And today, that would matter very much.",
    ];
  }
  return [
    "Now, {petName} had one truly amazing talent.",
    "{petName} had {superpower}. Whenever there was something to find, something hidden, or something that just wasn't right — {petName} always knew.",
    "{childName} called {pronounObject} \"the greatest hero in the whole backyard.\" And today, that would matter very much.",
  ];
}

/** Page 6 (the discovery). pet-solo drops the child's gasp + the child's sock. */
function page6Body(heroCount: HeroCount): string[] {
  if (heroCount === "pet-solo") {
    return [
      "At last, the trail stopped at the tallest, leafiest corner of the garden.",
      "And there — high up in the old oak tree — was a nest. A big, messy, cozy nest. And woven right into it, soft and warm, was the missing red sock!",
      "A bird had taken it! Mystery solved — by {petName}, the greatest hero in the whole backyard.",
    ];
  }
  return [
    "At last, the trail stopped at the tallest, leafiest corner of the garden.",
    "And there — high up in the old oak tree — was a nest. A big, messy, cozy nest. And woven right into it, soft and warm, was {childName}'s favorite red sock!",
    "\"A bird took it!\" gasped {childName}. \"Mystery solved — by {petName}, the greatest hero in the whole backyard!\"",
  ];
}

/** Page 9 (the celebration). pet-solo drops the child's "got the sock back" beat. */
function page9Body(heroCount: HeroCount): string[] {
  if (heroCount === "pet-solo") {
    return [
      "What a day!",
      "The favorite red sock was found. The baby bird got home safe. And the whole backyard knew the truth:",
      "{petName} wasn't just a {speciesDescriptor}. {petName} was a HERO.",
    ];
  }
  return [
    "What a day!",
    "{childName} got the favorite red sock back. The baby bird got home safe. And the whole backyard knew the truth:",
    "{petName} wasn't just a {speciesDescriptor}. {petName} was a HERO.",
  ];
}

/** Page 10 (home again, more loved). pet-solo keeps the warmth without a named child. */
function page10Body(heroCount: HeroCount): string[] {
  if (heroCount === "pet-solo") {
    return [
      "That night, after the greatest adventure of all time, {petName} curled up in {pronounPossessive} favorite warm spot, tired and happy.",
      "The bravest hero the backyard had ever known. That's what everyone whispered.",
      "{petName} gave a sleepy, contented sigh. Tomorrow might be ordinary again. But tonight, {pronounSubject} was a legend.",
    ];
  }
  return [
    "That night, after the greatest adventure of all time, {petName} curled up next to {childName}, tired and happy.",
    "\"You're my best friend,\" whispered {childName}. \"And the bravest hero I know.\"",
    "{petName} gave a sleepy, contented sigh. Tomorrow might be ordinary again. But tonight, {pronounSubject} was a legend.",
  ];
}

/**
 * Page 4 (the first clue — the quirk becomes the key). The first three beats name
 * no child, so only the closing "You found it!" cheer is rewritten: pet-plus keeps
 * the child cheering on the discovery; pet-solo narrates the find in the lone-hero
 * voice (the pet finds it, nobody else noticed) with no child as a speaking
 * character.
 */
function page4Body(heroCount: HeroCount): string[] {
  const body = [
    "{petName} put {pronounPossessive} amazing {superpower} to work.",
    "Sniff, sniff, SNIFF. Across the grass. Around the flowerpots. Past the wobbly fence.",
    "And then — {petName} stopped. Right at the edge of the garden, where the dandelions grew tall, was a clue: a single thread of bright red wool.",
  ];
  if (heroCount === "pet-solo") {
    return [
      ...body,
      "{petName} found it! Nobody else had noticed a thing. But {petName} did. The trail started HERE.",
    ];
  }
  return [
    ...body,
    "\"You found it!\" cheered {childName}. \"The trail starts HERE!\"",
  ];
}

/**
 * Page 3 (the call to adventure). pet-plus keeps the child as a character (the
 * sock-is-gone dialogue); pet-solo recasts the child as the reader being told the
 * tale ("Nobody else noticed. But {petName} did.") and {petName} sets off alone.
 */
function page3Body(heroCount: HeroCount): string[] {
  if (heroCount === "pet-solo") {
    return [
      "One morning, something was wrong.",
      "A favorite red sock had vanished right off the line. Nobody else noticed. But {petName} did. {petName} always did.",
      "{petName}'s ears went up. {pronounPossessive} nose went down. A mystery! And every great mystery needs a great hero.",
      "There was a case to solve, and {petName} was just the hero to solve it.",
    ];
  }
  return [
    "One morning, something was wrong.",
    "\"My favorite red sock is GONE!\" said {childName}. \"It was right here, and now it's vanished!\"",
    "{petName}'s ears went up. {pronounPossessive} nose went down. A mystery! And every great mystery needs a great hero.",
    "\"{petName},\" said {childName}, \"we have a case to solve.\"",
  ];
}

/**
 * Page 5 (deeper into the mystery). pet-plus keeps the child in the expedition party
 * (and inserts the sidekick line when present); pet-solo sends {petName} alone, as
 * the lone hero, with the child still the reader. The sidekick line is pet-plus only.
 */
function page5Body(heroCount: HeroCount, hasSidekick: boolean): string[] {
  if (heroCount === "pet-solo") {
    return [
      "The trail led {petName} on a grand backyard expedition.",
      "Under the bushy hedge (so dark and mysterious!). Over the old log bridge (so brave!). Around the bird bath, where a very suspicious squirrel watched {pronounObject} go.",
      "{petName} never lost the trail. Not once. That's what made {pronounObject} a hero.",
    ];
  }
  const body = [
    "The trail led {petName} and {childName} on a grand backyard expedition.",
    "Under the bushy hedge (so dark and mysterious!). Over the old log bridge (so brave!). Around the bird bath, where a very suspicious squirrel watched them go.",
    "{petName} never lost the trail. Not once. That's what made {pronounObject} a hero.",
  ];
  if (hasSidekick) {
    // Template sidekick party line — inserted second, naming the quest companions.
    body.splice(
      1,
      0,
      "{petName}, {childName}, and {sidekickName} followed the trail together.",
    );
  }
  return body;
}

// ---------------------------------------------------------------------------
// Dimension 3 — age bracket (Page 7 wobble + Page 8 climax)
// ---------------------------------------------------------------------------

/**
 * Page 7 (the wobble). 6-8 (master) is the default; 3-5 gets a gentler, shorter
 * wobble (less text, even milder jeopardy); 9-12 keeps the master wobble (the
 * climax carries its lengthening). pet-solo drops the "{childName} couldn't reach"
 * line in favour of a child-free framing.
 */
function page7Body(age: AgeBracket, heroCount: HeroCount): string[] {
  if (age === "3-5") {
    // Gentler, shorter wobble for the youngest readers.
    return [
      "But the adventure wasn't quite over.",
      "The smallest baby bird had hopped down to a low branch and couldn't get back up. It gave a tiny, worried cheep.",
      "The branch was too wobbly to reach. For a moment, nobody knew what to do.",
      "That's when {petName} took a deep breath.",
    ];
  }

  const reach =
    heroCount === "pet-solo"
      ? "The branch was too high, and too wobbly. For a moment, it seemed like nobody could help."
      : "{childName} couldn't reach. The branch was too wobbly. For a moment, nobody knew what to do.";

  return [
    "But the adventure wasn't over yet.",
    "The nest was very high. And the smallest baby bird had tumbled to a low branch and couldn't get back up. It cheeped a tiny, frightened cheep.",
    reach,
    "That's when {petName} took a deep breath.",
  ];
}

/**
 * Page 8 (the climax — save the day). 6-8 is the master. 3-5 simplifies to one clean
 * action sentence ("With one big, brave jump … Safe!"). 9-12 lengthens the action
 * and adds a wink of wordplay while keeping it a single clean side-leap beat.
 */
function page8Body(age: AgeBracket): string[] {
  if (age === "3-5") {
    // Template 3-5 simplification: one clean action sentence.
    return [
      "With one big, brave jump, {petName} helped the baby bird back to its branch. Safe!",
      "The baby bird cheeped a happy cheep. And {petName} landed back on the grass, a hero through and through.",
    ];
  }
  if (age === "9-12") {
    // Longer sentences + a wink of wordplay; still one clean side-leap beat.
    return [
      "And then, with one mighty, magnificent, absolutely-never-before-attempted leap —",
      "{petName} sprang up onto the old log, balanced there like a four-pawed champion gymnast, and — ever so gently, the way only a true professional hero can — nudged the little bird back along the branch until it hopped up, safe and sound and slightly amazed.",
      "The baby bird cheeped a triumphant cheep. Its mother sang an entire thank-you song (three verses, at least). And {petName} touched back down on the grass with the easy, modest grace of a {species} who saves the day before breakfast and twice on weekends.",
    ];
  }
  // 6-8 master text.
  return [
    "With one MIGHTY, magnificent, never-before-seen leap —",
    "{petName} sprang up onto the log, balanced like a champion, and gently — oh so gently — nudged the little bird back toward its branch until it hopped up safe and sound.",
    "The baby bird cheeped a happy cheep. Its mother sang a thank-you song. And {petName} landed back on the grass like the hero {pronounSubject} truly was.",
  ];
}

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/** Find the index of a page by id (always present in the master story). */
function pageIndex(story: Story8Story, id: Story8PageId): number {
  return story.findIndex((p) => p.id === id);
}

/** Replace the body of a page in place. */
function setBody(story: Story8Story, id: Story8PageId, body: string[]): void {
  story[pageIndex(story, id)].body = body;
}

/** Replace the subtitle of a page in place. */
function setSubtitle(
  story: Story8Story,
  id: Story8PageId,
  subtitle: string,
): void {
  story[pageIndex(story, id)].subtitle = subtitle;
}

// ---------------------------------------------------------------------------
// Theme dispatch (PR-A: backyard-mystery only; others fall back)
// ---------------------------------------------------------------------------

/**
 * Compose the backyard-mystery arc onto a fresh master copy for the given session.
 * This is the only authored theme in PR-A; `composeVariants8` routes every
 * `AdventureTheme` value here (a non-authored theme falls back to backyard-mystery,
 * never a half-themed page). When a second theme is authored, it becomes a sibling
 * `composeXxx(story, session)` and the dispatch switch grows a case.
 */
function composeBackyardMystery(
  story: Story8Story,
  session: Story8Session,
): void {
  const { heroCount, childAgeBracket } = session.toggles;
  const hasSidekick =
    session.adventure.sidekickName !== undefined &&
    session.adventure.sidekickName.trim().length > 0;

  // Dimension 2 — hero count. pet-solo is the lone-hero legend: every child-
  // referencing page (cover + Pages 1, 2, 3, 4, 5, 6, 9, 10) is rewritten child-free,
  // which is what makes {childName} optional in pet-solo. pet-plus keeps the child
  // throughout (and {childName} is required by merge). The sidekick line (dimension
  // 5) rides on the Page-5 builder and is pet-plus only.
  setSubtitle(story, "adventure-cover", coverSubtitle(heroCount));
  setBody(story, "adventure-ordinary", page1Body(heroCount));
  setBody(story, "adventure-special", page2Body(heroCount));
  setBody(story, "adventure-call", page3Body(heroCount));
  setBody(story, "adventure-clue", page4Body(heroCount));
  setBody(
    story,
    "adventure-deeper",
    page5Body(heroCount, hasSidekick && heroCount === "pet-plus"),
  );
  setBody(story, "adventure-discovery", page6Body(heroCount));
  setBody(story, "adventure-celebration", page9Body(heroCount));
  setBody(story, "adventure-home", page10Body(heroCount));

  // Dimension 3 — age bracket (Page 7 wobble + Page 8 climax).
  setBody(story, "adventure-wobble", page7Body(childAgeBracket, heroCount));
  setBody(story, "adventure-climax", page8Body(childAgeBracket));
}

// ---------------------------------------------------------------------------
// Public composition + entry point
// ---------------------------------------------------------------------------

/**
 * Compose every variant dimension onto a fresh copy of the Story-8 master text,
 * returning the still-unresolved (placeholder-carrying) page model. The
 * adventure-theme dimension dispatches to the per-theme composer (PR-A: only
 * backyard-mystery is authored; the other three `AdventureTheme` values fall back to
 * it — never a half-themed page). Exported so the merge layer / tests can inspect the
 * composed-but-unresolved text; `resolveStory8()` is the normal entry point.
 */
export function composeVariants8(session: Story8Session): Story8Story {
  const story = masterStory8();
  composeForTheme(session.toggles.adventureTheme, story, session);
  return story;
}

/**
 * Dispatch a theme to its composer. PR-A authors only backyard-mystery; every other
 * value (sea-voyage / space-rescue / enchanted-forest) falls back to it, so the book
 * is always fully themed. Authoring a new theme = a new case here + its page bodies.
 */
function composeForTheme(
  theme: AdventureTheme,
  story: Story8Story,
  session: Story8Session,
): void {
  switch (theme) {
    case "backyard-mystery":
    case "sea-voyage":
    case "space-rescue":
    case "enchanted-forest":
      // PR-A: only backyard-mystery is authored; the others fall back to it.
      composeBackyardMystery(story, session);
      return;
  }
}

/**
 * Resolve a finalized `Story8Session` into the ordered, fully-merged
 * `ResolvedStory` the shared narrative renderer consumes with no further text
 * logic. Composes the variants, then merges the session's field values into every
 * placeholder.
 *
 * Throws `MergeError` (from lib/story/merge) if a required field is missing — it
 * never emits a literal placeholder token. The conditional `{childName}`
 * requirement surfaces here: in pet-plus a blank child name is a `MergeError`; in
 * pet-solo those beats are already rewritten to omit the child, so a blank name is
 * fine.
 */
export function resolveStory8(session: Story8Session): ResolvedStory {
  return mergeStory8(composeVariants8(session), session);
}
