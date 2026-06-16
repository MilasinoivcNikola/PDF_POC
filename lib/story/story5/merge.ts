// The Story-5 merge: turn a finalized `Story5Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) letter,
// producing the fully-resolved, ordered `ResolvedStory` the shared letter renderer
// consumes. The sibling of story2/merge.ts; the only differences are the value map
// (two extra optional-with-fallback fields — lastGoodDay, whatIKeep, both fed
// through the variant layer, not as bare merge requirements) and the page→layout
// mapping. The optional date/nickname-line handling is identical to Story 2's.
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, the `PLACEHOLDER_PATTERN` (via `substitute`) — rather
// than re-implementing the placeholder contract. No IO, no side effects.
//
// CRITICAL invariants (product requirements from the master template's quality
// bar, asserted across the full relationship × death-type × belief-frame × species
// matrix by the test step):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - Optional fields (nicknames, dates) drop their WHOLE line when blank — no
//     "— —" date artifact, no empty signature/nickname line. The date line appears
//     only when BOTH dates are present (the template never prints a date the
//     customer didn't provide).
//   - lastGoodDay / whatIKeep are optional-with-fallback: the variant layer
//     (story5/variants.ts) drops the sentence that references the placeholder and
//     substitutes a stock line when the value is blank, so the placeholder is never
//     reached with an empty value — that is why neither appears in `buildValues`'s
//     required set below (only registered when supplied).

import type { Story5Session } from "@/lib/session/types";
import {
  type PageLayout,
  type ResolvedPage,
  type ResolvedStory,
  clean,
  MergeError,
  substitute,
} from "@/lib/story/merge";
import type { MasterPage, Story5PageId } from "@/lib/story/master-text";
import type { Story5Story } from "@/lib/story/story5/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// Story 5 reuses Story 2's letter layouts WHOLESALE (the master template: "zero new
// primitives"): the cover maps to "letter-cover" and every body page to "letter",
// exactly as Story 2 / Story 4 do. No new `PageLayout` value, no renderer case, no
// CSS — the renderer dispatches on these existing layouts.
const STORY_5_LAYOUT: Record<Story5PageId, PageLayout> = {
  "note-cover": "letter-cover",
  "note-page-2": "letter",
  "note-page-3": "letter",
  "note-page-4": "letter",
  "note-page-5": "letter",
  "note-page-6": "letter",
};

// ---------------------------------------------------------------------------
// Value map
// ---------------------------------------------------------------------------

/**
 * Build the placeholder → value lookup from the session. All free-text fields are
 * cleaned (trim + collapse whitespace + strip placeholder braces) with the SHARED
 * `clean` so a customer value can't inject a surviving `{token}`. Optional fields
 * (lastGoodDay, whatIKeep, nicknames, dates) are only added when non-empty; their
 * sentences/lines are handled separately (the variant fallback for lastGoodDay /
 * whatIKeep; `appendOptionalLines` for the dates/nickname), so a missing optional
 * is never a missing-field error and leaves no empty artifact.
 *
 * Story 5 has no derived/pronoun values — `{species}` is the only "lookup" field
 * and it is just the cleaned species string.
 */
function buildValues(session: Story5Session): Record<string, string> {
  const { pet, owner, memories } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    speciesNoun: pet.species === "other" ? "friend" : clean(pet.species),
    ownerNames: clean(owner.names),
    quirks: clean(memories.quirks),
    favoriteRitual: clean(memories.favoriteRitual),
    favoriteSpots: clean(memories.favoriteSpots),
  };

  // Optional-with-fallback fields: only register a value when one was actually
  // supplied (the variant layer drops their sentence + substitutes a stock line
  // when blank, so the placeholder is unreachable with an empty value).
  const lastGoodDay = cleanOptional(memories.lastGoodDay);
  if (lastGoodDay) values.lastGoodDay = lastGoodDay;
  const whatIKeep = cleanOptional(memories.whatIKeep);
  if (whatIKeep) values.whatIKeep = whatIKeep;

  // Optional signature/date fields: only register when supplied.
  const nicknames = cleanOptional(memories.nicknames);
  if (nicknames) values.petNicknames = nicknames;
  const dateAdopted = cleanOptional(memories.dateAdopted);
  if (dateAdopted) values.dateAdopted = dateAdopted;
  const datePassed = cleanOptional(memories.datePassed);
  if (datePassed) values.datePassed = datePassed;

  return values;
}

/** Clean an optional value, returning undefined when it is absent or empty. */
function cleanOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

// ---------------------------------------------------------------------------
// Optional lines (added only when their values are present)
// ---------------------------------------------------------------------------
//
// The template prints two conditional lines:
//   - the dates "[DATE_ADOPTED] — [DATE_PASSED]" (cover bottom + below the Page-6
//     signature), shown ONLY when BOTH dates were provided; and
//   - the signature nickname line ("for [PET_NAME] — [PET_NICKNAMES]", below the
//     "{ownerNames}" signature), shown only when nicknames were provided.
// We append these as ordinary `{placeholder}` body lines to the COMPOSED story
// before substitution, so they resolve through the normal path — but only when the
// values exist, so a missing optional leaves no line at all (no "— —", no blank).
// The literal "for " prefix on the nickname line is template text, part of the
// appended line, not a customer value.

/** Add the conditional date/nickname lines to the composed story, in place. */
function appendOptionalLines(
  story: Story5Story,
  values: Record<string, string>,
): void {
  const hasBothDates =
    values.dateAdopted !== undefined && values.datePassed !== undefined;

  if (hasBothDates) {
    // Cover: the small date line under the title.
    pageBody(story, "note-cover").push("{dateAdopted} — {datePassed}");
  }

  if (values.petNicknames !== undefined) {
    // Page 6: the nickname line ("for [PET_NAME] — [PET_NICKNAMES]"), just under
    // the "{ownerNames}" signature.
    pageBody(story, "note-page-6").push("for {petName} — {petNicknames}");
  }

  if (hasBothDates) {
    // Page 6: the date line, below the signature (and nickname line, if any).
    pageBody(story, "note-page-6").push("{dateAdopted} — {datePassed}");
  }
}

/** The mutable body array of a page (always present in the composed story). */
function pageBody(story: Story5Story, id: Story5PageId): string[] {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    // Unreachable: the composed story always contains every Story-5 page.
    throw new Error(`Story 5 page ${id} missing from composed story`);
  }
  return page.body;
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
    layout: STORY_5_LAYOUT[page.id as Story5PageId],
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
 * Merge a composed (variant-applied) Story-5 letter with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * The optional date/nickname lines are added to the story BEFORE substitution and
 * only when their values exist, so they never become a missing-field error and a
 * missing optional leaves no empty line.
 */
export function mergeStory5(
  story: Story5Story,
  session: Story5Session,
): ResolvedStory {
  const values = buildValues(session);
  appendOptionalLines(story, values);

  const missing = new Set<string>();
  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
