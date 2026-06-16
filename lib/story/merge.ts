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
  type Story1PageId,
  PLACEHOLDER_PATTERN,
} from "@/lib/story/master-text";

// ---------------------------------------------------------------------------
// Resolved page model (this module's output — feature 04 renders this directly)
// ---------------------------------------------------------------------------

/**
 * The render layout a resolved page uses, decoupled from its (product-specific)
 * page id. The PDF/preview renderer (lib/pdf/pages.tsx) dispatches on this, NOT
 * on literal ids, so one renderer can serve more than one product: a Story-2
 * letter page declares its own layout and never falls through to the
 * children's-book narrative treatment.
 *
 * Story-1 uses every value below. The union is intentionally extensible — when
 * Story 2 (feature 15) adds letter layouts, they extend this union and the
 * renderer grows a case, with no change to the Story-1 mapping.
 */
export type PageLayout =
  | "cover"
  | "dedication"
  | "narrative"
  | "truth"
  | "love"
  | "closing"
  | "back-cover"
  // Story-2 letter layouts (feature 16): the typeset-letter cover and the plain
  // letter body pages. A frameable letter is not a children's book, so it gets
  // its own treatments instead of falling through to "narrative" (art slot +
  // petal divider + drop-cap). The signature hierarchy on the final letter page
  // is handled inside the `letter` treatment, keyed off the sign-off sentinel —
  // see lib/pdf/pages-story2.tsx.
  | "letter-cover"
  | "letter";

/**
 * One fully-resolved book page: same shape as `MasterPage`, but every
 * `{placeholder}` has been substituted, so all strings are final printed copy,
 * plus a `layout` tag the renderer dispatches on. The optional `dedication`
 * (Page 1 only) appears here only when provided.
 */
export interface ResolvedPage {
  id: PageId;
  /** Which render treatment this page uses (renderer dispatches on this). */
  layout: PageLayout;
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
 *
 * Exported so the preview "edit your own words" path (lib/story/editable-fields)
 * persists exactly the same normalization the merge engine would apply — an edit
 * can't reintroduce a placeholder injection or a double-space the merge would
 * have collapsed.
 */
export function clean(value: string): string {
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
    speciesNoun: pet.species === "other" ? "friend" : clean(pet.species),
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
 *
 * Exported so a second product's merge (lib/story/story2/merge.ts) reuses the
 * exact same single-pass substitution + missing-key accounting, rather than
 * re-implementing the placeholder contract.
 */
export function substitute(
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

/**
 * The render layout each Story-1 page uses. This mirrors exactly the per-id
 * dispatch the renderer used before it switched to dispatching on `layout`:
 * cover/dedication/truth(7)/love(10)/closing(12)/back-cover get bespoke
 * treatments; every other numbered page (2-6, 8, 9, 11) is "narrative". Kept
 * here (beside the merge) because the layout is a property of the resolved page.
 */
const STORY_1_LAYOUT: Record<Story1PageId, PageLayout> = {
  cover: "cover",
  "page-1": "dedication",
  "page-2": "narrative",
  "page-3": "narrative",
  "page-4": "narrative",
  "page-5": "narrative",
  "page-6": "narrative",
  "page-7": "truth",
  "page-8": "narrative",
  "page-9": "narrative",
  "page-10": "love",
  "page-11": "narrative",
  "page-12": "closing",
  "back-cover": "back-cover",
};

/** Resolve one master page's strings, recording any missing keys. */
function resolvePage(
  page: MasterPage,
  values: Record<string, string>,
  missing: Set<string>,
): ResolvedPage {
  const resolved: ResolvedPage = {
    id: page.id,
    // `mergeStory` is the Story-1 path: every page in the master story carries a
    // Story-1 id, so the (Story-1-scoped) layout map always has an entry.
    layout: STORY_1_LAYOUT[page.id as Story1PageId],
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
