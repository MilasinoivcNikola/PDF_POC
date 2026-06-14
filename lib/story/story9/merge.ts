// The Story-9 merge: turn a finalized `Story9Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) keepsake,
// producing the fully-resolved, ordered `ResolvedStory` the shared NARRATIVE
// renderer consumes. The narrative-layout sibling of story6/merge.ts; the
// differences are the value map (the degraded `{babyName}`, the species descriptor
// reused from Story 1's mapper) and the page→layout map.
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, the `PLACEHOLDER_PATTERN` (via `substitute`) — rather
// than re-implementing the placeholder contract. No IO, no side effects.
//
// CRITICAL invariants (product requirements from the master template's quality bar,
// asserted across the full babyStatus × species × other-pets matrix by the tests):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - `{babyName}` is NEVER a literal token in output: it DEGRADES to "the new baby"
//     whenever babyStatus is "expecting" OR the customer's name is blank (see
//     `resolveBabyName` below), and there is NO doubled article ("a a", "the the")
//     because the degraded value already carries its own article and the templated
//     sentences that use it never prepend one.
//   - `{quirks}` is optional-with-fallback (the variant layer substitutes a stock
//     clause when blank), so its placeholder is never reached with an empty value.
//   - The joyful / non-memorial tone is a property of the master + variant copy, not
//     the merge; merge only substitutes.

import type { Story9Session } from "@/lib/session/types";
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
import type { MasterPage, Story9PageId } from "@/lib/story/master-text";
import type { Story9Story } from "@/lib/story/story9/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// Story 9 reuses Story 1's NARRATIVE layouts WHOLESALE (the master template: "no
// new PageLayout needed"): cover → "cover", page-1 → "dedication", pages 2-6 →
// "narrative", page-7 → "love" (the "Love does not divide. It multiplies." hero
// beat), page-8 → "closing" (the room-for-everyone closing echo, on its own page),
// back cover → "back-cover". No new `PageLayout` value, no renderer case, no CSS.
// The `truth` (death) layout is NEVER assigned — this is a joyful, living,
// growing-family book.
const STORY_9_LAYOUT: Record<Story9PageId, PageLayout> = {
  "baby-cover": "cover",
  "baby-page-1": "dedication",
  "baby-page-2": "narrative",
  "baby-page-3": "narrative",
  "baby-page-4": "narrative",
  "baby-page-5": "narrative",
  "baby-page-6": "narrative",
  "baby-page-7": "love",
  "baby-page-8": "closing",
  "baby-back-cover": "back-cover",
};

// ---------------------------------------------------------------------------
// Baby-name degradation
// ---------------------------------------------------------------------------

/** The literal the baby is referred to by whenever no name is used. */
export const NEW_BABY_FALLBACK = "the new baby";

/**
 * Resolve the value `{babyName}` substitutes to. Per the master template's
 * auto-mapping rule: the customer's name is used ONLY when babyStatus is "arrived"
 * AND a non-empty name was supplied; otherwise — expecting, OR a blank/whitespace
 * name — it degrades to the literal "the new baby". The degraded value already
 * reads as a complete noun phrase (it carries its own article "the"), so the
 * sentences that use `{babyName}` never prepend an article — no "a the new baby"
 * doubling. Exported so the variant layer can decide tense/phrasing on the same
 * signal without re-deriving it.
 */
export function resolveBabyName(session: Story9Session): string {
  const { babyStatus } = session.toggles;
  const name = session.babyName !== undefined ? clean(session.babyName) : "";
  if (babyStatus === "arrived" && name.length > 0) {
    return name;
  }
  return NEW_BABY_FALLBACK;
}

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
 * + species descriptor are derived from `pet` (Story 9 keeps Story 1's pronoun, like
 * the other narrative books); `{babyName}` is the degraded value from
 * `resolveBabyName` (never a literal token). Optional fields ({quirks},
 * {babyArrival}, {petNicknames}) are only added when non-empty; their sentences are
 * handled separately (the variant fallback for quirks; the babyArrival append), so a
 * missing optional is never a missing-field error and leaves no empty artifact.
 */
function buildValues(session: Story9Session): Record<string, string> {
  const { pet, owner, memories } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    breedColor: clean(pet.breedColor),
    pronounSubject: pet.pronoun,
    pronounSubjectCap: capitalize(pet.pronoun),
    pronounObject: pronounObject(pet.pronoun),
    pronounPossessive: pronounPossessive(pet.pronoun),
    speciesDescriptor: speciesDescriptor(pet.species, pet.pronoun),
    ownerNames: clean(owner.names),
    favoriteActivity: clean(memories.favoriteActivity),
    sleepingSpot: clean(memories.sleepingSpot),
    babyName: resolveBabyName(session),
  };

  // Optional-with-fallback free-text: only register when supplied (the variant
  // layer drops the sentence + substitutes a stock clause when blank).
  const quirks = cleanOptional(memories.quirks);
  if (quirks) values.quirks = quirks;

  // Optional-omit free-text: only register when supplied so an empty one never
  // resolves to a blank.
  const babyArrival = cleanOptional(session.babyArrival);
  if (babyArrival) values.babyArrival = babyArrival;
  const nicknames = cleanOptional(memories.nicknames);
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
    layout: STORY_9_LAYOUT[page.id as Story9PageId],
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
 * Merge a composed (variant-applied) Story-9 keepsake with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output — and `{babyName}` is always a real noun phrase
 * (the customer's name or the degraded "the new baby"), never a literal token.
 */
export function mergeStory9(
  story: Story9Story,
  session: Story9Session,
): ResolvedStory {
  const values = buildValues(session);
  const missing = new Set<string>();

  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
