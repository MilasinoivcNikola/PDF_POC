// The Story-7 merge: turn a finalized `Story7Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) homecoming
// story, producing the fully-resolved, ordered `ResolvedStory` the shared NARRATIVE
// renderer consumes. The narrative-layout sibling of story6/merge.ts; the
// differences are this product's value map (derived pronoun forms — Story 7 keeps
// the pet's pronoun, like Story 1/6), its page→layout map (Story 1's narrative
// layouts MINUS `truth` — there is no death page), and the three Story-7-specific
// merge behaviours:
//   - {homecomingMemory} (Page 4): optional-with-fallback — a blank or sparse
//     (≤ ~4 words) value is replaced by the template's stock line.
//   - {quirks} (Page 6): optional-with-fallback — a blank value is replaced by the
//     template's stock line.
//   - {yearsHome} (anniversary occasion): rendered as "1 year" (singular) vs
//     "N years" (plural), computed here.
//   - the dedication dated line (Page 1): "Home since {dateAdopted}." (new-arrival)
//     or "{yearsHome} home, and counting." (anniversary), appended only when the
//     source data is present (omit-when-blank, no dangling line).
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, the `PLACEHOLDER_PATTERN` (via `substitute`) — rather
// than re-implementing the placeholder contract. No IO, no side effects.
//
// CRITICAL invariants (product requirements from the master template's quality bar,
// asserted across the full occasion × adoption-source × life-stage × species ×
// child × family matrix by the test step):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - The optional childName / familyMembers / nicknames / dateAdopted fields are
//     handled by registering the value ONLY when supplied (the variant layer drops
//     the child/family sentences when absent), so a missing optional is never a
//     missing-field error and leaves no empty artifact.
//   - NO grief/memorial language is a property of the master + variant copy, not
//     the merge; merge only substitutes.

import type { Story7Session } from "@/lib/session/types";
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
import type { MasterPage, Story7PageId } from "@/lib/story/master-text";
import type { Story7Story } from "@/lib/story/story7/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// Story 7 reuses Story 1's NARRATIVE layouts (the master template: "no new
// PageLayout needed") MINUS `truth`: cover → "cover", dedication → "dedication",
// pages 2-8 → "narrative", closing → "closing", back cover → "back-cover". The
// Page-8 love-beat uses "narrative" (the template tags it `narrative`, not `love`).
// No new `PageLayout` value, no renderer case, no CSS. The `truth` (death) layout
// is NEVER assigned — this is a joyful, non-memorial book.
export const STORY_7_LAYOUT: Record<Story7PageId, PageLayout> = {
  "welcome-cover": "cover",
  "welcome-dedication": "dedication",
  "welcome-before": "narrative",
  "welcome-choosing": "narrative",
  "welcome-drive-home": "narrative",
  "welcome-first-night": "narrative",
  "welcome-learning": "narrative",
  "welcome-now-ours": "narrative",
  "welcome-belong": "narrative",
  "welcome-closing": "closing",
  "welcome-back-cover": "back-cover",
};

// ---------------------------------------------------------------------------
// Optional-with-fallback stock lines (verbatim from the master template)
// ---------------------------------------------------------------------------

/** Page-4 fallback when {homecomingMemory} is blank or under ~4 words. */
const HOMECOMING_MEMORY_FALLBACK =
  "You were so small in such a big new world. Maybe you trembled a little. Maybe you fell asleep before we even got there. Either way, we kept one hand on you the whole way, so you'd know you weren't alone.";

/** Page-6 fallback when {quirks} is blank. */
const QUIRKS_FALLBACK =
  "We learned the way you tilt your head when you're thinking. The way you greet us like we've been gone for years, even when it's been an hour. The small, particular things that are only yours.";

/** Word count of a cleaned free-text value (whitespace-delimited). */
function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
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
 * Format {yearsHome} with singular/plural agreement: "1 year" vs "N years". The
 * stored value is free numeric text ("3"); we parse the leading integer. A
 * non-numeric value is cleaned and returned as-is (the wizard collects a number,
 * but the merge layer never crashes on stray input).
 */
function formatYearsHome(raw: string): string {
  const cleaned = clean(raw);
  const match = cleaned.match(/^\d+/);
  if (!match) return cleaned;
  const n = Number(match[0]);
  return n === 1 ? "1 year" : `${n} years`;
}

/**
 * Build the placeholder → value lookup from the session. All free-text fields are
 * cleaned (trim + collapse whitespace + strip placeholder braces) with the SHARED
 * `clean` so a customer value can't inject a surviving `{token}`. The pronoun forms
 * are derived from `pet.pronoun` (Story 7 keeps the pet's pronoun, like Story 1/6).
 *
 * Optional-with-fallback fields ({homecomingMemory}, {quirks}) are ALWAYS
 * registered — either the cleaned input, or the template's stock fallback line when
 * the input is blank/sparse — so the page placeholder always resolves. Optional-omit
 * fields ({childName}, {familyMembers}, {petNicknames}, {dateAdopted}) are only
 * added when supplied; their sentences are dropped by the variant layer when absent,
 * so a missing optional is never a missing-field error and leaves no empty artifact.
 * {yearsHome} is registered only for the anniversary occasion (singular/plural
 * formatted).
 */
function buildValues(session: Story7Session): Record<string, string> {
  const { pet, owner, memories, toggles } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    speciesNoun: pet.species === "other" ? "friend" : clean(pet.species),
    breedColor: clean(pet.breedColor),
    pronounSubject: pet.pronoun,
    pronounObject: pronounObject(pet.pronoun),
    pronounPossessive: pronounPossessive(pet.pronoun),
    ownerNames: clean(owner.names),
    favoriteActivity: clean(memories.favoriteActivity),
    sleepingSpot: clean(memories.sleepingSpot),
  };

  // Optional-with-fallback: always register (input or the stock line). A value of
  // ≤ ~4 words counts as sparse for the homecoming memory; quirks falls back only
  // when blank.
  const homecomingMemory = cleanOptional(memories.homecomingMemory);
  values.homecomingMemory =
    homecomingMemory && wordCount(homecomingMemory) > 4
      ? homecomingMemory
      : HOMECOMING_MEMORY_FALLBACK;

  const quirks = cleanOptional(memories.quirks);
  values.quirks = quirks ?? QUIRKS_FALLBACK;

  // Optional-omit free-text: only register when supplied (the variant layer drops
  // the child/family sentences + the dedication line when absent).
  const childName = cleanOptional(memories.childName);
  if (childName) values.childName = childName;
  const familyMembers = cleanOptional(memories.familyMembers);
  if (familyMembers) values.familyMembers = familyMembers;
  const nicknames = cleanOptional(memories.nicknames);
  if (nicknames) values.petNicknames = nicknames;
  const dateAdopted = cleanOptional(memories.dateAdopted);
  if (dateAdopted) values.dateAdopted = dateAdopted;

  // {yearsHome} is meaningful only for the anniversary occasion; format it with
  // singular/plural agreement when present.
  if (toggles.occasion === "gotcha-day-anniversary") {
    const yearsHome = cleanOptional(toggles.yearsHome);
    if (yearsHome) values.yearsHome = formatYearsHome(yearsHome);
  }

  return values;
}

// ---------------------------------------------------------------------------
// Dedication dated line (Page 1, omit-when-blank)
// ---------------------------------------------------------------------------

/**
 * The optional dedication dated line appended beneath the "— {ownerNames}"
 * attribution on Page 1. For the anniversary occasion it is "{yearsHome} home, and
 * counting." (only when {yearsHome} is known); otherwise it is "Home since
 * {dateAdopted}." (only when {dateAdopted} is provided). Returns null when neither
 * source is present — no dangling line. Returns a still-unresolved string carrying
 * the placeholder (substituted by the normal merge pass).
 */
function dedicationDatedLine(
  session: Story7Session,
  values: Record<string, string>,
): string | null {
  if (session.toggles.occasion === "gotcha-day-anniversary") {
    return values.yearsHome !== undefined ? "{yearsHome} home, and counting." : null;
  }
  return values.dateAdopted !== undefined ? "Home since {dateAdopted}." : null;
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
    layout: STORY_7_LAYOUT[page.id as Story7PageId],
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
 * Merge a composed (variant-applied) Story-7 story with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * The dedication dated line is appended to Page 1's body before resolution (when
 * its source data is present), so the renderer prints it with no further text
 * logic.
 */
export function mergeStory7(
  story: Story7Story,
  session: Story7Session,
): ResolvedStory {
  const values = buildValues(session);
  const missing = new Set<string>();

  // Append the optional dedication dated line onto Page 1's body (omit-when-blank).
  const datedLine = dedicationDatedLine(session, values);
  if (datedLine) {
    const page1 = story.find((p) => p.id === "welcome-dedication");
    if (page1) page1.body = [...page1.body, datedLine];
  }

  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
