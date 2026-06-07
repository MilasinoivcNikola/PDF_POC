// The pure merge engine: substitute a finalized `StorySession`'s field values
// into the `{placeholder}` tokens of a composed master story, producing the
// fully-resolved, ordered `ResolvedStory` that feature 04 renders. No IO, no
// side effects — trivially unit-testable, callable on server and client.
//
// Derived merge fields (object/possessive pronoun, species descriptor) are NOT
// re-implemented here: they come from the feature-02 mappers in
// @/lib/session/mappers, the single source of truth.
//
// CRITICAL invariant: after merge, no literal placeholder survives. A missing
// required field is REPORTED (a thrown `MergeError`), never rendered as a bare
// `{field}` / `[FIELD]` token.

import type { StorySession } from "@/lib/session/types";
import {
  pronounObject,
  pronounPossessive,
  speciesDescriptor,
} from "@/lib/session/mappers";
import {
  type MasterPage,
  type MasterStory,
  type PageId,
  PLACEHOLDER_PATTERN,
} from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Resolved page model (this module's output — feature 04 renders this directly)
// ---------------------------------------------------------------------------

/**
 * One fully-resolved book page: same shape as `MasterPage`, but every
 * `{placeholder}` has been substituted, so all strings are final printed copy.
 * The optional `dedication` (Page 1 only) appears here only when provided.
 */
export interface ResolvedPage {
  id: PageId;
  /** Printed page number for numbered pages; null for cover/back cover. */
  pageNumber: number | null;
  /** Resolved heading copy, where the page has one. */
  title?: string;
  /** Resolved secondary heading copy, where the page has one. */
  subtitle?: string;
  /** Resolved body paragraphs. */
  body: string[];
  /**
   * The parent's optional dedication message — present on Page 1 only, and only
   * when the session supplied a non-empty one. A distinct text block from the
   * Page-1 dedication poem (the template prints it "below in a different
   * typeface, smaller"), so it is kept out of `body`. Omitted/undefined when not
   * provided — never an empty string, never a missing-field error.
   */
  dedication?: string;
  /** Resolved scene brief for the AI illustration pipeline (feature 07). */
  illustrationBrief: string;
}

/** The full ordered, fully-resolved book — feature 04's render input. */
export type ResolvedStory = ResolvedPage[];

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

/**
 * Thrown when a placeholder cannot be resolved (an unknown key, or a required
 * field that is empty). Surfaces the offending placeholder keys so the caller
 * (and tests) can see exactly what was missing — we never silently emit a
 * literal token.
 */
export class MergeError extends Error {
  /** The placeholder keys that could not be resolved. */
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `Cannot resolve story: missing or empty merge field(s): ${missingKeys.join(", ")}`,
    );
    this.name = "MergeError";
    this.missingKeys = missingKeys;
  }
}

// ---------------------------------------------------------------------------
// Value map
// ---------------------------------------------------------------------------

/**
 * Light free-text cleanup applied to every customer-supplied value before
 * substitution: strip the placeholder brace characters `{` `}` (a parent's
 * memory like "the {best} day" must not inject a literal `{best}` token that
 * survives the single-pass `substitute`), then collapse whitespace and trim.
 * Braces are not meaningful in grief prose, so removing them is lossless enough;
 * brackets `[...]` are harmless prose and are left untouched. This runs only on
 * substituted *values*, never on the template text itself.
 */
function clean(value: string): string {
  return value.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Build the placeholder → value lookup from the session. Free-text fields are
 * cleaned (trim + collapse whitespace). Derived fields come from the feature-02
 * mappers. `parentDedication` is omitted entirely when not provided (it is the
 * only optional field, and appears only on Page 1).
 */
function buildValues(session: StorySession): Record<string, string> {
  const { pet, child, memories } = session;

  const values: Record<string, string> = {
    petName: clean(pet.name),
    species: clean(pet.species),
    breedColor: clean(pet.breedColor),
    pronounSubject: pet.pronoun,
    pronounObject: pronounObject(pet.pronoun),
    pronounPossessive: pronounPossessive(pet.pronoun),
    speciesDescriptor: speciesDescriptor(pet.species, pet.pronoun),
    childName: clean(child.name),
    favoriteActivity: clean(memories.favoriteActivity),
    sleepingSpot: clean(memories.sleepingSpot),
    favoriteMemory: clean(memories.favoriteMemory),
  };

  if (memories.parentDedication !== undefined) {
    const dedication = clean(memories.parentDedication);
    if (dedication.length > 0) {
      values.parentDedication = dedication;
    }
  }

  return values;
}

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

/**
 * Replace every `{key}` in `text` from `values`, recording any key whose value
 * is missing or empty into `missing` (so the whole story can report all gaps at
 * once). A key resolved to an empty string counts as missing — an empty
 * required field must be surfaced, not silently rendered as a blank.
 */
function substitute(
  text: string,
  values: Record<string, string>,
  missing: Set<string>,
): string {
  return text.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = values[key];
    if (value === undefined || value.length === 0) {
      missing.add(key);
      return _match;
    }
    return value;
  });
}

/** Resolve one master page's strings, recording any missing keys. */
function resolvePage(
  page: MasterPage,
  values: Record<string, string>,
  missing: Set<string>,
): ResolvedPage {
  const resolved: ResolvedPage = {
    id: page.id,
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
  // Page 1 carries the parent's optional dedication as its own field (not a
  // body paragraph, not a placeholder). `buildValues` only adds the (cleaned)
  // `parentDedication` key when a non-empty one was supplied, so its mere
  // presence here means "render it"; otherwise the field stays undefined.
  if (page.id === "page-1" && values.parentDedication !== undefined) {
    resolved.dedication = values.parentDedication;
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Public merge
// ---------------------------------------------------------------------------

/**
 * Merge a composed (variant-applied) master story with a session's values.
 * Returns the ordered `ResolvedStory`; throws `MergeError` listing every
 * placeholder that could not be resolved. On success, no `{placeholder}` token
 * survives anywhere in the output.
 *
 * Note: `parentDedication` is optional and is not referenced by the master/
 * variant page bodies, so its absence is never a missing-field error. When
 * provided (non-empty) it surfaces on the resolved Page 1 as `dedication`, so
 * feature 04 renders it with no further text logic.
 */
export function mergeStory(
  story: MasterStory,
  session: StorySession,
): ResolvedStory {
  const values = buildValues(session);
  const missing = new Set<string>();

  const resolved = story.map((page) => resolvePage(page, values, missing));

  if (missing.size > 0) {
    throw new MergeError([...missing].sort());
  }

  return resolved;
}
