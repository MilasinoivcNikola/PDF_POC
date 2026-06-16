// The Story-2 merge: turn a finalized `Story2Session`'s field values into the
// placeholder lookup, then substitute into a composed (variant-applied) letter,
// producing the fully-resolved, ordered `ResolvedStory` feature 16 renders.
//
// REUSES the shared merge primitives from lib/story/merge.ts — `clean`,
// `substitute`, `MergeError`, and the `PLACEHOLDER_PATTERN` (via `substitute`) —
// rather than re-implementing the placeholder contract. The single-pass
// substitution + all-at-once missing-key reporting is identical to Story 1; only
// the value map, the page→layout mapping, and the optional-line handling differ.
//
// No IO, no side effects — trivially unit-testable, callable on server and client.
//
// CRITICAL invariants (product requirements from the master template's quality
// bar, asserted across the full variant matrix by the test step):
//   - After merge, no literal placeholder survives. A missing REQUIRED field is
//     REPORTED (a thrown `MergeError`), never rendered as a bare `{field}` token.
//   - Optional fields (nicknames, dates) drop their WHOLE line when blank — no
//     "— —" date artifact, no empty signature/nickname line. The date line appears
//     only when BOTH dates are present (the template never prints a date the
//     customer didn't provide).

import type { Story2Session } from "@/lib/session/types";
import {
  type PageLayout,
  type ResolvedPage,
  type ResolvedStory,
  clean,
  MergeError,
  substitute,
} from "@/lib/story/merge";
import type { MasterPage, Story2PageId } from "@/lib/story/master-text";
import type { Story2Story } from "@/lib/story/story2/master-text";

// ---------------------------------------------------------------------------
// Layout mapping
// ---------------------------------------------------------------------------
//
// The renderer (lib/pdf/pages.tsx) dispatches on `layout`, not on page id, so a
// Story-2 letter page must declare one of the shared `PageLayout` values. Feature
// 16 added the dedicated letter layouts: the cover maps to "letter-cover" (a
// typeset poem-book cover, not a children's-book cover), and every letter body
// page maps to "letter" (plain reverent prose, with the final page's signature
// hierarchy handled inside the `letter` treatment). This replaces feature 15's
// stop-gap that mapped the body pages to the children's-book "narrative" tag.
const STORY_2_LAYOUT: Record<Story2PageId, PageLayout> = {
  "letter-cover": "letter-cover",
  "letter-page-2": "letter",
  "letter-page-3": "letter",
  "letter-page-4": "letter",
  "letter-page-5": "letter",
  "letter-page-6": "letter",
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
 * Story 2 has no derived/pronoun values — `{species}` is the only "lookup" field
 * and it is just the cleaned species string.
 */
function buildValues(session: Story2Session): Record<string, string> {
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
// The template prints two conditional lines:
//   - the dates "[DATE_ADOPTED] — [DATE_PASSED]" (cover bottom + below the Page-6
//     signature), shown ONLY when BOTH dates were provided; and
//   - the signature nickname line ([PET_NICKNAMES], below "{petName}"), shown only
//     when nicknames were provided.
// We append these as ordinary `{placeholder}` body lines to the COMPOSED story
// before substitution, so they resolve through the normal path — but only when the
// values exist, so a missing optional leaves no line at all (no "— —", no blank).

/** Add the conditional date/nickname lines to the composed story, in place. */
function appendOptionalLines(
  story: Story2Story,
  values: Record<string, string>,
): void {
  const hasBothDates =
    values.dateAdopted !== undefined && values.datePassed !== undefined;

  if (hasBothDates) {
    // Cover: the small date line under the title.
    pageBody(story, "letter-cover").push("{dateAdopted} — {datePassed}");
  }

  if (values.petNicknames !== undefined) {
    // Page 6: the nickname line, just under the "{petName}" signature.
    pageBody(story, "letter-page-6").push("{petNicknames}");
  }

  if (hasBothDates) {
    // Page 6: the date line, below the signature (and nickname line, if any).
    pageBody(story, "letter-page-6").push("{dateAdopted} — {datePassed}");
  }
}

/** The mutable body array of a page (always present in the composed story). */
function pageBody(story: Story2Story, id: Story2PageId): string[] {
  const page = story.find((p) => p.id === id);
  if (page === undefined) {
    // Unreachable: the composed story always contains every Story-2 page.
    throw new Error(`Story 2 page ${id} missing from composed story`);
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
    layout: STORY_2_LAYOUT[page.id as Story2PageId],
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
 * Merge a composed (variant-applied) Story-2 letter with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * The optional date/nickname lines are added to the story BEFORE substitution and
 * only when their values exist, so they never become a missing-field error and a
 * missing optional leaves no empty line.
 */
export function mergeStory2(
  story: Story2Story,
  session: Story2Session,
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
