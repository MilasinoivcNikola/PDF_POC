// The single authoritative model of a Story-1 order ("Saying Goodbye to
// [PET_NAME]"). Three craft areas share this contract: the wizard (Area 3)
// writes it, story-merge (Area 1) reads it, and the AI pipeline (Area 2) reads
// the pet fields. Every enumerated field is a string-literal union — not a loose
// `string` — so merge/variant code and prompt builders get exhaustive `switch`
// safety. Field coverage maps 1:1 to the master template's "Merge fields" +
// "Special-case toggles" tables (context/masterstories/story-1-master-template.md).

// ---------------------------------------------------------------------------
// Enumerated fields (string-literal unions)
// ---------------------------------------------------------------------------

/** What kind of pet. Matches the wizard's species radio group. */
export type Species = "dog" | "cat" | "rabbit" | "bird" | "other";

/** Subject pronoun the family used. Drives the derived object/possessive forms. */
export type Pronoun = "he" | "she" | "they";

/** Illustration treatment offered in the wizard. Default is "watercolor". */
export type IllustrationStyle = "watercolor" | "storybook" | "pencil";

/** Child age bracket — drives the master template's tone variant. */
export type AgeBracket = "3-5" | "6-8" | "9-12";

/** Death-type toggle — adjusts Page 7 phrasing. */
export type DeathType = "natural" | "illness" | "sudden" | "euthanasia";

/** Belief-frame toggle — adjusts Page 9 phrasing. Default is "rainbow-bridge". */
export type BeliefFrame = "rainbow-bridge" | "heaven" | "secular" | "none";

/** Whether other pets remain in the home — adjusts Page 11 phrasing. */
export type OtherPetsInHome = "yes" | "no";

/** Lifecycle of a session as it moves from wizard to generated book. */
export type SessionStatus = "draft" | "generating" | "ready";

// ---------------------------------------------------------------------------
// Input groups (collected by the wizard)
// ---------------------------------------------------------------------------

/**
 * The pet's identity and look. `speciesDescriptor` and the object/possessive
 * pronoun forms are NOT stored here — they are derived from `species` + `pronoun`
 * via the pure mappers in ./mappers, so there is a single source of truth.
 *
 * `photo` is a *reference* (path/filename under ./uploads), never the bytes —
 * feature 06 (/api/upload) owns the upload itself.
 */
export interface Pet {
  /** [PET_NAME] — e.g. "Otis". */
  name: string;
  /** [SPECIES] — dropdown/radio. */
  species: Species;
  /** [BREED_COLOR] — free text, e.g. "rescue mutt with one floppy ear". */
  breedColor: string;
  /** [PRONOUN_SUBJECT] — he/she/they; object/possessive are derived. */
  pronoun: Pronoun;
  /** Chosen illustration treatment. */
  illustrationStyle: IllustrationStyle;
  /** Path/filename of the uploaded photo under ./uploads (reference only). */
  photo: string;
}

/** The child the book is written for. */
export interface Child {
  /** [CHILD_NAME] — e.g. "Emma". */
  name: string;
  /** [CHILD_AGE_BRACKET] — drives the tone variant. */
  ageBracket: AgeBracket;
}

/** The customer's free-text memories that personalize the story. */
export interface Memories {
  /** [FAVORITE_ACTIVITY] — e.g. "chasing tennis balls in the backyard". */
  favoriteActivity: string;
  /** [SLEEPING_SPOT] — e.g. "at the foot of your bed". */
  sleepingSpot: string;
  /** [FAVORITE_MEMORY] — 1-3 sentences. */
  favoriteMemory: string;
  /** [PARENT_DEDICATION] — optional custom dedication-page message. */
  parentDedication?: string;
}

/** The sensitivity/belief toggles collected as short follow-up questions. */
export interface Toggles {
  /** [DEATH_TYPE] — adjusts Page 7. */
  deathType: DeathType;
  /** [BELIEF_FRAME] — adjusts Page 9. Default "rainbow-bridge". */
  beliefFrame: BeliefFrame;
  /** [OTHER_PETS_IN_HOME] — adjusts Page 11. */
  otherPetsInHome: OtherPetsInHome;
}

// ---------------------------------------------------------------------------
// Runtime / generation state
// ---------------------------------------------------------------------------

/**
 * One generated illustration tied to a book page. Feature 07 caches on
 * `promptHash` + `referenceHash` so regenerating a single page only re-calls the
 * API when its prompt or reference images changed.
 */
export interface GeneratedImage {
  /** Page slot the image fills — "cover", "1".."12", "reference", etc. */
  page: string;
  /** Path to the saved image under ./generated/[session-id]. */
  path: string;
  /** Hash of the scene prompt used (cache key part 1). */
  promptHash: string;
  /** Hash of the reference images used (cache key part 2). */
  referenceHash: string;
}

// ---------------------------------------------------------------------------
// Draft (wizard, localStorage) vs Session (finalized, on disk)
// ---------------------------------------------------------------------------

/**
 * The in-progress order the wizard holds in `localStorage`. Every input field is
 * optional because the user fills them step by step; `id`, `createdAt` and
 * `status` exist from `newDraft()` onward. Required-field validation
 * (pet name, child name, photo) happens at the wizard boundary, not in the type.
 */
export interface StoryDraft {
  id: string;
  createdAt: string;
  status: SessionStatus;
  pet: Partial<Pet>;
  child: Partial<Child>;
  memories: Partial<Memories>;
  toggles: Partial<Toggles>;
}

/**
 * A finalized order written to `./sessions/[id].json` at Generate time. All
 * input groups are complete (required fields present); generation state is
 * filled in as illustrations and the PDF are produced.
 */
export interface StorySession {
  id: string;
  createdAt: string;
  status: SessionStatus;
  pet: Pet;
  child: Child;
  memories: Memories;
  toggles: Toggles;
  /** Per-page generated-illustration manifest (empty until generation runs). */
  images: GeneratedImage[];
  /** Path to the rendered PDF under ./output, once produced. */
  pdfPath?: string;
}
