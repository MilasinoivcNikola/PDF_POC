// The Story-8 merge: turn a finalized `Story8Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) adventure
// story, producing the fully-resolved, ordered `ResolvedStory` the shared NARRATIVE
// renderer consumes. The narrative-layout sibling of story7/merge.ts; the
// differences are this product's value map (derived pronoun forms + speciesDescriptor
// — Story 8 keeps the pet's pronoun, like Story 1/6/7), its page→layout map (Story
// 1's narrative layouts MINUS `dedication`/`love`/`truth` — there is no death page,
// no dedication page, no love page), and the two Story-8-specific merge behaviours:
//   - {superpower} (Pages 2, 4): the SOUL of the book — optional-with-fallback via a
//     four-step chain. A blank value derives a delightful, on-theme superpower from
//     {favoriteActivity} → {quirks} → species stock, NEVER overriding a real quirk.
//   - {childName}: CONDITIONAL-required — a blank name throws `MergeError` when
//     heroCount = pet-plus (the child is a character), but is PERMITTED blank in
//     pet-solo (the variant layer rewrites those beats to omit the child, so no
//     {childName} placeholder ever reaches merge in that mode).
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, the `PLACEHOLDER_PATTERN` (via `substitute`) — rather
// than re-implementing the placeholder contract. No IO, no side effects.
//
// CRITICAL invariants (product requirements from the master template's quality bar,
// asserted across the full theme × hero-count × age × species × sidekick matrix by
// the test step):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - The {superpower} chain always yields a non-empty, on-theme superpower from a
//     thin input — a blank superpower is never a missing-field error.
//   - NO grief/euphemism and NO banned filler is a property of the master + variant
//     copy, not the merge; merge only substitutes.

import type { Species, Story8Session } from "@/lib/session/types";
import {
  pronounObject,
  pronounPossessive,
  speciesDescriptor,
} from "@/lib/session/mappers";
import {
  type PageLayout,
  type ResolvedPage,
  type ResolvedStory,
  clean,
  MergeError,
  substitute,
} from "@/lib/story/merge";
import type { MasterPage, Story8PageId } from "@/lib/story/master-text";
import type { Story8Story } from "@/lib/story/story8/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// Story 8 reuses Story 1's NARRATIVE layouts (the master template: "no new
// PageLayout needed") MINUS `dedication`/`love`/`truth`: cover → "cover", pages
// 1-10 → "narrative", closing → "closing", back cover → "back-cover". There is no
// dedication page, no love page, no death page. No new `PageLayout` value, no
// renderer case, no CSS. The `dedication`/`love`/`truth` layouts are NEVER assigned
// — this is a joyful, non-memorial adventure book.
export const STORY_8_LAYOUT: Record<Story8PageId, PageLayout> = {
  "adventure-cover": "cover",
  "adventure-ordinary": "narrative",
  "adventure-special": "narrative",
  "adventure-call": "narrative",
  "adventure-clue": "narrative",
  "adventure-deeper": "narrative",
  "adventure-discovery": "narrative",
  "adventure-wobble": "narrative",
  "adventure-climax": "narrative",
  "adventure-celebration": "narrative",
  "adventure-home": "narrative",
  "adventure-closing": "closing",
  "adventure-back-cover": "back-cover",
};

// ---------------------------------------------------------------------------
// The [SUPERPOWER] fallback chain (the soul of the book)
// ---------------------------------------------------------------------------
//
// blank → derive from {favoriteActivity} ("the very best in the world at …") →
// else from {quirks} ("the amazing power of …") → else species stock. The chain
// always yields a delightful, on-theme superpower from a thin input. When the
// customer gives a real superpower, it is preserved verbatim — never overridden.

/** The species-appropriate stock superpower (the last resort in the chain). */
function speciesStockSuperpower(species: Species): string {
  switch (species) {
    case "dog":
      return "the Best Nose in the World";
    case "cat":
      return "the Quietest Paws";
    case "rabbit":
      return "the Fastest Hop";
    case "bird":
      return "the Sharpest Eyes";
    case "other":
      return "the Greatest Heart in the Whole Backyard";
  }
}

/**
 * Resolve {superpower} through the fallback chain. A real (non-blank) superpower is
 * returned verbatim — specificity is the charm, so a customer quirk is NEVER
 * overridden with stock. A blank superpower derives from the favorite activity, then
 * the quirks, then the species stock. The derived forms are phrased so they read as
 * a "special skill" in the master copy ("{petName} had {superpower}").
 */
function resolveSuperpower(
  superpower: string | undefined,
  favoriteActivity: string | undefined,
  quirks: string | undefined,
  species: Species,
): string {
  const real = cleanOptional(superpower);
  if (real) return real;

  const activity = cleanOptional(favoriteActivity);
  if (activity) return `the very best in the world at ${activity}`;

  const quirk = cleanOptional(quirks);
  if (quirk) return `the amazing power of ${quirk}`;

  return speciesStockSuperpower(species);
}

// ---------------------------------------------------------------------------
// Value map
// ---------------------------------------------------------------------------

/** Clean an optional value, returning undefined when it is absent or empty. */
function cleanOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Build the placeholder → value lookup from the session. All free-text fields are
 * cleaned (trim + collapse whitespace + strip placeholder braces) with the SHARED
 * `clean` so a customer value can't inject a surviving `{token}`. The pronoun forms
 * + speciesDescriptor are derived from `pet.pronoun` / `pet.species` (Story 8 keeps
 * the pet's pronoun, like Story 1/6/7).
 *
 * {superpower} is ALWAYS registered (the fallback chain guarantees a non-empty,
 * on-theme value). {favoriteActivity} + {quirks} are registered only when supplied
 * (they back no required placeholder in the master copy — they feed the superpower
 * chain and the optional briefs). {childName} is registered only when supplied; its
 * required-ness is CONDITIONAL on heroCount and is enforced at substitution time
 * (the variant layer drops the child beats in pet-solo). {sidekickName} is
 * optional-omit (the Page-5 party line is inserted by the variant layer only when
 * present + pet-plus).
 */
function buildValues(session: Story8Session): Record<string, string> {
  const { pet, adventure } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    breedColor: clean(pet.breedColor),
    pronounSubject: pet.pronoun,
    pronounObject: pronounObject(pet.pronoun),
    pronounPossessive: pronounPossessive(pet.pronoun),
    speciesDescriptor: speciesDescriptor(pet.species, pet.pronoun),
    // The soul of the book — always resolves to a non-empty, on-theme superpower.
    superpower: resolveSuperpower(
      adventure.superpower,
      adventure.favoriteActivity,
      adventure.quirks,
      pet.species,
    ),
  };

  // Optional-omit free-text feeding the briefs / party line. childName is the
  // conditional-required field — registered when supplied; a missing one is a
  // MergeError only in pet-plus (where the variant layer keeps the {childName}
  // beats), surfaced by the normal substitute pass.
  const favoriteActivity = cleanOptional(adventure.favoriteActivity);
  if (favoriteActivity) values.favoriteActivity = favoriteActivity;
  const quirks = cleanOptional(adventure.quirks);
  if (quirks) values.quirks = quirks;

  // {childName} is conditional-required. In pet-plus it backs the body beats AND the
  // illustration briefs, so a supplied name is registered and a blank one surfaces as
  // a MergeError (the body placeholders remain). In pet-solo the variant layer has
  // rewritten every child-referencing BODY page to a child-free voice, so a blank
  // name is fine for the body; but the illustration briefs (cover, Page 1) still name
  // the child as a soft scene presence, so we register a generic "the child" stand-in
  // for the briefs only — it never appears in the resolved body in pet-solo.
  const childName = cleanOptional(adventure.childName);
  if (childName) {
    values.childName = childName;
  } else if (session.toggles.heroCount === "pet-solo") {
    values.childName = "the child";
  }
  const sidekickName = cleanOptional(adventure.sidekickName);
  if (sidekickName) values.sidekickName = sidekickName;
  const nicknames = cleanOptional(adventure.nicknames);
  if (nicknames) values.petNicknames = nicknames;

  return values;
}

// ---------------------------------------------------------------------------
// Page resolution
// ---------------------------------------------------------------------------

/** Resolve one master page's strings, recording any missing keys. */
function resolvePage(
  page: MasterPage,
  values: Record<string, string>,
  missing: Set<string>,
): ResolvedPage {
  const resolved: ResolvedPage = {
    id: page.id,
    layout: STORY_8_LAYOUT[page.id as Story8PageId],
    pageNumber: page.pageNumber,
    body: page.body.map((p) => substitute(p, values, missing)),
    illustrationBrief: substitute(page.illustrationBrief, values, missing),
  };
  if (page.title !== undefined) {
    resolved.title = substitute(page.title, values, missing);
  }
  if (page.subtitle !== undefined) {
    resolved.subtitle = substitute(page.subtitle, values, missing);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Public merge
// ---------------------------------------------------------------------------

/**
 * Merge a composed (variant-applied) Story-8 story with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * The conditional `{childName}` requirement is enforced here implicitly: in
 * pet-plus the composed master pages still carry `{childName}` placeholders, so a
 * blank child name surfaces as a missing key (MergeError); in pet-solo the variant
 * layer has already rewritten those beats to omit the child, so no `{childName}`
 * placeholder remains and a blank name is fine.
 */
export function mergeStory8(
  story: Story8Story,
  session: Story8Session,
): ResolvedStory {
  const values = buildValues(session);
  const missing = new Set<string>();

  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
