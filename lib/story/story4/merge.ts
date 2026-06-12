// The Story-4 merge: turn a finalized `Story4Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) letter,
// producing the fully-resolved, ordered `ResolvedStory` the shared letter renderer
// consumes. The sibling of story2/merge.ts; the only differences are the value map
// (one extra field — favoriteActivity), the page→layout mapping, and the
// optional-line handling (the date line is tense-dependent: a "together since"
// living line vs. a two-date memorial line).
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, the `PLACEHOLDER_PATTERN` (via `substitute`) — rather
// than re-implementing the placeholder contract. No IO, no side effects.
//
// CRITICAL invariants (product requirements from the master template's quality
// bar, asserted across the full living × memorial × variant matrix by the test
// step):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - Optional fields (nicknames, dates) drop their WHOLE line when blank — no
//     dangling dash, no empty line. The memorial two-date line appears only when
//     BOTH dates are present; the living "together since" line only when the
//     adopted date is present. The template never prints a date the customer
//     didn't provide.

import type { Story4Session } from "@/lib/session/types";
import {
  type PageLayout,
  type ResolvedPage,
  type ResolvedStory,
  clean,
  MergeError,
  substitute,
} from "@/lib/story/merge";
import type { MasterPage, Story4PageId } from "@/lib/story/master-text";
import type { Story4Story } from "@/lib/story/story4/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// Story 4 reuses Story 2's letter layouts WHOLESALE (the master template: "zero
// new primitives"): the cover maps to "letter-cover" and every body page to
// "letter", exactly as Story 2 does. No new `PageLayout` value, no renderer case,
// no CSS — the renderer dispatches on these existing layouts.
const STORY_4_LAYOUT: Record<Story4PageId, PageLayout> = {
  "talk-cover": "letter-cover",
  "talk-page-2": "letter",
  "talk-page-3": "letter",
  "talk-page-4": "letter",
  "talk-page-5": "letter",
  "talk-page-6": "letter",
};

// ---------------------------------------------------------------------------
// Value map
// ---------------------------------------------------------------------------

/**
 * Build the placeholder → value lookup from the session. All free-text fields are
 * cleaned (trim + collapse whitespace + strip placeholder braces) with the SHARED
 * `clean` so a customer value can't inject a surviving `{token}`. Optional fields
 * (nicknames, dates) are only added when non-empty; their corresponding lines are
 * appended to the composed story separately (see `appendOptionalLines`), so a
 * missing optional is never a missing-field error and leaves no empty artifact.
 *
 * Like Story 2, Story 4 has no derived/pronoun values — `{species}` is the only
 * "lookup" field and it is just the cleaned species string.
 */
function buildValues(session: Story4Session): Record<string, string> {
  const { pet, owner, memories } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    ownerNames: clean(owner.names),
    quirks: clean(memories.quirks),
    favoriteRitual: clean(memories.favoriteRitual),
    favoriteSpots: clean(memories.favoriteSpots),
    favoriteActivity: clean(memories.favoriteActivity),
  };

  // Optional fields: only register a value when one was actually supplied.
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
// The template prints conditional date/nickname lines that depend on BOTH the
// supplied values AND the tense:
//   - Living path: the cover bottom and the Page-6 line under the signature read
//     "together since [DATE_ADOPTED]" — shown only when the adopted date exists.
//   - Memorial path: those same two spots read "[DATE_ADOPTED] — [DATE_PASSED]" —
//     shown only when BOTH dates exist.
//   - The signature nickname line ([PET_NICKNAMES]) is shown (both paths) only when
//     nicknames were provided.
// We append these as ordinary `{placeholder}` body lines to the COMPOSED story
// before substitution, so they resolve through the normal path — but only when the
// values exist, so a missing optional leaves no line at all (no dangling dash, no
// blank). The literal "together since " prefix is template text, not a customer
// value, so it is part of the appended line, not a merge field.

/** Add the conditional date/nickname lines to the composed story, in place. */
function appendOptionalLines(
  story: Story4Story,
  values: Record<string, string>,
  living: boolean,
): void {
  const hasAdopted = values.dateAdopted !== undefined;
  const hasBothDates =
    values.dateAdopted !== undefined && values.datePassed !== undefined;

  // The cover/Page-6 date line, by tense.
  const dateLine = living
    ? hasAdopted
      ? "together since {dateAdopted}"
      : undefined
    : hasBothDates
      ? "{dateAdopted} — {datePassed}"
      : undefined;

  if (dateLine !== undefined) {
    pageBody(story, "talk-cover").push(dateLine);
  }

  if (values.petNicknames !== undefined) {
    // Page 6: the nickname line, just under the "{petName}" signature.
    pageBody(story, "talk-page-6").push("{petNicknames}");
  }

  if (dateLine !== undefined) {
    // Page 6: the date line, below the signature (and nickname line, if any).
    pageBody(story, "talk-page-6").push(dateLine);
  }
}

/** The mutable body array of a page (always present in the composed story). */
function pageBody(story: Story4Story, id: Story4PageId): string[] {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    // Unreachable: the composed story always contains every Story-4 page.
    throw new Error(`Story 4 page ${id} missing from composed story`);
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
    layout: STORY_4_LAYOUT[page.id as Story4PageId],
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
 * Merge a composed (variant-applied) Story-4 letter with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * The optional date/nickname lines are added to the story BEFORE substitution and
 * only when their values exist (and the date line's shape depends on the tense),
 * so they never become a missing-field error and a missing optional leaves no
 * empty line.
 */
export function mergeStory4(
  story: Story4Story,
  session: Story4Session,
): ResolvedStory {
  const values = buildValues(session);
  const living = session.toggles.livingOrMemorial !== "memorial";
  appendOptionalLines(story, values, living);

  const missing = new Set<string>();
  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
