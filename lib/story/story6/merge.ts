// The Story-6 merge: turn a finalized `Story6Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) tribute,
// producing the fully-resolved, ordered `ResolvedStory` the shared NARRATIVE
// renderer consumes. The narrative-layout sibling of story5/merge.ts; the
// differences are the value map (derived pronoun forms — Story 6 keeps Story 1's
// pronoun, unlike the letters — plus a sentence-initial-capitalized subject
// pronoun) and the page→layout map (Story 1's narrative layouts, not the letter
// layouts).
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, the `PLACEHOLDER_PATTERN` (via `substitute`) — rather
// than re-implementing the placeholder contract. No IO, no side effects.
//
// CRITICAL invariants (product requirements from the master template's quality bar,
// asserted across the full transition-frame × age-band × species × other-pets
// matrix by the test step):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - The optional {ownerMessage} dedication line and the {petNicknames}/dates are
//     handled by registering the value ONLY when supplied (story6/variants.ts drops
//     the {stillLoves}/{quirks} sentences via the fallback layer, so those
//     placeholders are never reached with an empty value either).
//   - `ownerMessage` surfaces on resolved Page 1 as the distinct-typeface
//     `dedication` block (mirroring Story 1's `parentDedication`), dropped — with
//     no em dash — when blank.
//   - PRESENT TENSE / death-never-named are properties of the master + variant
//     copy, not the merge; merge only substitutes.

import type { Story6Session } from "@/lib/session/types";
import {
  pronounObject,
  pronounPossessive,
} from "@/lib/session/mappers";
import {
  type PageLayout,
  type ResolvedPage,
  type ResolvedStory,
  clean,
  MergeError,
  substitute,
} from "@/lib/story/merge";
import type { MasterPage, Story6PageId } from "@/lib/story/master-text";
import type { Story6Story } from "@/lib/story/story6/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// Story 6 reuses Story 1's NARRATIVE layouts WHOLESALE (the master template: "no
// new PageLayout needed"): cover → "cover", page-1 → "dedication", pages 2-4 →
// "narrative", pages 5-6 → "love", back cover → "back-cover". No new `PageLayout`
// value, no renderer case, no CSS. The `truth` (death) layout is NEVER assigned —
// the living tribute has no death page (the memorial conversion is dropped).
const STORY_6_LAYOUT: Record<Story6PageId, PageLayout> = {
  "tribute-cover": "cover",
  "tribute-page-1": "dedication",
  "tribute-page-2": "narrative",
  "tribute-page-3": "narrative",
  "tribute-page-4": "narrative",
  "tribute-page-5": "love",
  "tribute-page-6": "love",
  "tribute-back-cover": "back-cover",
};

// ---------------------------------------------------------------------------
// Value map
// ---------------------------------------------------------------------------

/** Capitalize the first letter of a pronoun for sentence-initial use ("he" → "He"). */
function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

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
 * are derived from `pet.pronoun` (Story 6 keeps Story 1's pronoun, unlike the
 * letters). Optional fields ({stillLoves}, {quirks}, {favoriteSpots},
 * {sleepingSpot}, {ownerMessage}, {petNicknames}, {dateAdopted}) are only added
 * when non-empty; their sentences are handled separately (the variant fallback for
 * stillLoves/quirks; the dedication block for ownerMessage), so a missing optional
 * is never a missing-field error and leaves no empty artifact.
 */
function buildValues(session: Story6Session): Record<string, string> {
  const { pet, owner, memories } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    breedColor: clean(pet.breedColor),
    pronounSubject: pet.pronoun,
    pronounSubjectCap: capitalize(pet.pronoun),
    pronounObject: pronounObject(pet.pronoun),
    pronounPossessive: pronounPossessive(pet.pronoun),
    ownerNames: clean(owner.names),
    ageOrStage: clean(memories.ageOrStage),
    favoriteActivity: clean(memories.favoriteActivity),
    favoriteRitual: clean(memories.favoriteRitual),
  };

  // Optional-with-fallback free-text: only register when supplied (the variant
  // layer drops the sentence + substitutes a stock line when blank).
  const stillLoves = cleanOptional(memories.stillLoves);
  if (stillLoves) values.stillLoves = stillLoves;
  const quirks = cleanOptional(memories.quirks);
  if (quirks) values.quirks = quirks;

  // Optional-omit free-text (feed art briefs + the stillLoves fallback): only
  // register when supplied so an empty one never resolves to a blank.
  const favoriteSpots = cleanOptional(memories.favoriteSpots);
  if (favoriteSpots) values.favoriteSpots = favoriteSpots;
  const sleepingSpot = cleanOptional(memories.sleepingSpot);
  if (sleepingSpot) values.sleepingSpot = sleepingSpot;

  // Optional dedication / signature fields: only register when supplied.
  const ownerMessage = cleanOptional(memories.ownerMessage);
  if (ownerMessage) values.ownerMessage = ownerMessage;
  const nicknames = cleanOptional(memories.nicknames);
  if (nicknames) values.petNicknames = nicknames;
  const dateAdopted = cleanOptional(memories.dateAdopted);
  if (dateAdopted) values.dateAdopted = dateAdopted;

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
    layout: STORY_6_LAYOUT[page.id as Story6PageId],
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
  // Page 1 carries the owner's optional message as its own field (the
  // distinct-typeface `dedication` block, mirroring Story 1's parentDedication).
  // `buildValues` only registers a non-empty cleaned `ownerMessage`, so its
  // presence here means "render it"; otherwise the field stays undefined (and the
  // em dash never appears).
  if (page.id === "tribute-page-1" && values.ownerMessage !== undefined) {
    resolved.dedication = values.ownerMessage;
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Public merge
// ---------------------------------------------------------------------------

/**
 * Merge a composed (variant-applied) Story-6 tribute with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * `ownerMessage` is optional and is not referenced by any body/title placeholder,
 * so its absence is never a missing-field error. When provided (non-empty) it
 * surfaces on resolved Page 1 as `dedication`, so the renderer prints it with no
 * further text logic.
 */
export function mergeStory6(
  story: Story6Story,
  session: Story6Session,
): ResolvedStory {
  const values = buildValues(session);
  const missing = new Set<string>();

  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
