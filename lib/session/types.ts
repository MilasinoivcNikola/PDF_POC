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

/**
 * Which product a session is for. Story 1 is the children's storybook ("Saying
 * Goodbye to [PET_NAME]"); "story-2" is the adult grief letter (feature 15);
 * "story-4" is the celebration twin ("If [PET_NAME] Could Talk" — a living pet's
 * present-tense letter, with a memorial past-tense toggle; feature 20). The
 * registry (lib/story/registry.ts) maps each value to its resolver, illustration
 * plan, and PDF-filename builder.
 *
 * Back-compat: drafts/sessions written before this field existed have no
 * `storyType`, so every reader treats a missing value as Story 1 via
 * `session.storyType ?? "story-1"`. That is what makes the field zero-migration
 * for on-disk `./sessions/*.json`.
 */
export type StoryType = "story-1" | "story-2" | "story-4";

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
  /**
   * Which product this draft is for. Optional so drafts written before the field
   * existed (no `storyType`) read back cleanly; readers default to "story-1" via
   * `draft.storyType ?? "story-1"`.
   */
  storyType?: StoryType;
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
  /**
   * Which product this session is for. Optional so sessions written before the
   * field existed (no `storyType`) read back cleanly; readers default to
   * "story-1" via `session.storyType ?? "story-1"` — no migration of on-disk JSON.
   */
  storyType?: StoryType;
  pet: Pet;
  child: Child;
  memories: Memories;
  toggles: Toggles;
  /** Per-page generated-illustration manifest (empty until generation runs). */
  images: GeneratedImage[];
  /** Path to the rendered PDF under ./output, once produced. */
  pdfPath?: string;
}

// ===========================================================================
// Story 2 — "A Letter from [PET_NAME]" (adult keepsake letter)
// ===========================================================================
//
// The second product (feature 15). A first-person letter in the pet's voice,
// addressed to the owner — cover + 5 letter pages. Field coverage maps 1:1 to
// the master template's "Merge fields" + "Special-case toggles" tables
// (context/masterstories/story-2-master-template.md). Story 2 has NO child: it
// REUSES the `Pet` group above (name, species, breedColor, pronoun,
// illustrationStyle, photo) and adds the owner/letter-memory/toggle groups below.
// The "family" relationship variant is deliberately punted — single + couple only.

/** How the owner is addressed — drives the "you" vs "you both" letter voice. */
export type Relationship = "single" | "couple";

/** Death-type toggle (Story 2) — adjusts Page 4 (the goodbye). */
export type LetterDeathType = "peaceful" | "illness" | "sudden" | "euthanasia";

/** Belief-frame toggle (Story 2) — adjusts Page 5. Default "rainbow-bridge". */
export type LetterBeliefFrame = "rainbow-bridge" | "heaven" | "secular";

/** Whether the letter is for the owner themselves or a sympathy gift. */
export type GiftFor = "self" | "friend";

/** Whether the owner has / plans to adopt another pet — adjusts Page 6. */
export type NewPet = "yes" | "no";

/** The owner the letter is addressed to. */
export interface Owner {
  /** [OWNER_NAMES] — e.g. "Sarah" or "Sarah and David" or "Mom". */
  names: string;
  /** [RELATIONSHIP_TYPE] — drives "you" (single) vs "you both" (couple). */
  relationship: Relationship;
}

/** The customer's free-text inputs that personalize the letter. */
export interface LetterMemories {
  /** [QUIRKS] — 1-3 sentences, e.g. "the way you tilted your head". */
  quirks: string;
  /** [FAVORITE_RITUAL] — e.g. "our walk before coffee, every morning". */
  favoriteRitual: string;
  /** [FAVORITE_SPOTS] — 1-3 spots, e.g. "the spot by the back door". */
  favoriteSpots: string;
  /** [PET_NICKNAMES] — optional, up to 3, e.g. "Murph, Mr. Murph". */
  nicknames?: string;
  /** [DATE_ADOPTED] — optional, e.g. "March 2014". */
  dateAdopted?: string;
  /** [DATE_PASSED] — optional, e.g. "October 2025". */
  datePassed?: string;
}

/** The sensitivity/belief/gift toggles collected as short follow-up questions. */
export interface Story2Toggles {
  /** [DEATH_TYPE] — adjusts Page 4 (the goodbye). */
  deathType: LetterDeathType;
  /** [BELIEF_FRAME] — adjusts Page 5. Default "rainbow-bridge". */
  beliefFrame: LetterBeliefFrame;
  /** [GIFT_FOR] — adjusts the cover/dedication inscription. */
  giftFor: GiftFor;
  /** [NEW_PET] — adjusts the Page 6 closing. */
  newPet: NewPet;
}

/**
 * The in-progress Story-2 order the wizard holds in `localStorage`. Mirrors the
 * `StoryDraft` shape: every input group is `Partial` because the user fills them
 * step by step; `id`/`createdAt`/`status` exist from creation onward. Required-
 * field validation happens at the wizard boundary (feature 18), not in the type.
 *
 * Discriminated from `StoryDraft` by `storyType: "story-2"` (literal, not
 * optional, here — a Story-2 draft always knows it is one).
 */
export interface Story2Draft {
  id: string;
  createdAt: string;
  status: SessionStatus;
  storyType: "story-2";
  pet: Partial<Pet>;
  owner: Partial<Owner>;
  memories: Partial<LetterMemories>;
  toggles: Partial<Story2Toggles>;
}

/**
 * A finalized Story-2 order written to `./sessions/[id].json` at Generate time.
 * Mirrors `StorySession`: all input groups are complete (required fields
 * present); generation state fills in as illustrations and the PDF are produced.
 *
 * Discriminated from `StorySession` by `storyType: "story-2"` (literal, not
 * optional). A `StorySession` with a missing `storyType` still reads as Story 1
 * via `?? "story-1"`; a `Story2Session` always carries the literal so the
 * registry routes it to `resolveStory2`.
 */
export interface Story2Session {
  id: string;
  createdAt: string;
  status: SessionStatus;
  storyType: "story-2";
  pet: Pet;
  owner: Owner;
  memories: LetterMemories;
  toggles: Story2Toggles;
  /** Per-page generated-illustration manifest (empty until generation runs). */
  images: GeneratedImage[];
  /** Path to the rendered PDF under ./output, once produced. */
  pdfPath?: string;
}

// ===========================================================================
// Story 4 — "If [PET_NAME] Could Talk" (living/celebration twin of Story 2)
// ===========================================================================
//
// The celebration twin (feature 20). A first-person letter in a *living* pet's
// present-tense voice — cover + 5 letter pages — with a headline
// `livingOrMemorial` toggle that flips the whole letter to past tense for a
// grieving buyer. Field coverage maps 1:1 to the master template's "Merge fields"
// + "Special-case toggles" tables (context/masterstories/story-4-master-template.md).
//
// REUSES the Story-1 `Pet` group and the Story-2 `Owner` group wholesale; there
// is NO child. Its memory group is Story 2's `LetterMemories` PLUS Story 1's
// `favoriteActivity` field (`Story4Memories`). Its enums reuse Story 2's
// `GiftFor` / `LetterDeathType` / `LetterBeliefFrame`; the death-type/belief-frame
// answers are dormant in the default living path and consulted only in the
// memorial path. As with Story 2, the "family" relationship variant is punted —
// single + couple only (the master template redirects family to Story 1).

/** The headline Story-4 toggle: a living pet (present tense, default) or a memorial (past tense). */
export type LivingOrMemorial = "living" | "memorial";

/**
 * The customer's free-text inputs that personalize the celebration letter.
 * Story 2's `LetterMemories` plus Story 1's `favoriteActivity` (the "daily joy"
 * beat on Page 4). The optional nickname/date fields carry the same omit-when-blank
 * semantics as Story 2; `datePassed` is only meaningful in the memorial path.
 */
export interface Story4Memories extends LetterMemories {
  /** [FAVORITE_ACTIVITY] — e.g. "stealing one sock and running a victory lap". */
  favoriteActivity: string;
}

/**
 * The toggles collected as short follow-up questions. `livingOrMemorial` is the
 * headline switch; `giftFor` adjusts the cover inscription; `deathType` /
 * `beliefFrame` are consulted ONLY when `livingOrMemorial === "memorial"` (they
 * lie dormant in the default living path). There is deliberately no `newPet`
 * (Story 2's new-pet beat is not part of this book).
 */
export interface Story4Toggles {
  /** [LIVING_OR_MEMORIAL] — the headline tense toggle. Default "living". */
  livingOrMemorial: LivingOrMemorial;
  /** [GIFT_FOR] — adjusts the cover/dedication inscription. */
  giftFor: GiftFor;
  /** [DEATH_TYPE] — memorial path only; the Page-5 seam line. */
  deathType: LetterDeathType;
  /** [BELIEF_FRAME] — memorial path only; the Page-5 closing frame. Default "rainbow-bridge". */
  beliefFrame: LetterBeliefFrame;
}

/**
 * The in-progress Story-4 order the wizard holds in `localStorage`. Mirrors the
 * `Story2Draft` shape: every input group is `Partial` because the user fills them
 * step by step; `id`/`createdAt`/`status` exist from creation onward. Required-
 * field validation happens at the wizard boundary (PR 22), not in the type.
 *
 * Discriminated by the literal `storyType: "story-4"` (not optional — a Story-4
 * draft always knows it is one).
 */
export interface Story4Draft {
  id: string;
  createdAt: string;
  status: SessionStatus;
  storyType: "story-4";
  pet: Partial<Pet>;
  owner: Partial<Owner>;
  memories: Partial<Story4Memories>;
  toggles: Partial<Story4Toggles>;
}

/**
 * A finalized Story-4 order written to `./sessions/[id].json` at Generate time.
 * Mirrors `Story2Session`: all input groups are complete (required fields
 * present); generation state fills in as illustrations and the PDF are produced.
 * Discriminated by the literal `storyType: "story-4"`, so the registry routes it
 * to `resolveStory4`.
 */
export interface Story4Session {
  id: string;
  createdAt: string;
  status: SessionStatus;
  storyType: "story-4";
  pet: Pet;
  owner: Owner;
  memories: Story4Memories;
  toggles: Story4Toggles;
  /** Per-page generated-illustration manifest (empty until generation runs). */
  images: GeneratedImage[];
  /** Path to the rendered PDF under ./output, once produced. */
  pdfPath?: string;
}

// ===========================================================================
// Wizard draft union — what the in-browser wizard holds (any product)
// ===========================================================================

/**
 * The draft the wizard provider holds in localStorage, for any product. The
 * `storyType` discriminant decides which groups are present: a `StoryDraft`
 * (Story 1, with `child`/`memories: Memories`), a `Story2Draft` (Story 2, with
 * `owner`/`memories: LetterMemories`), or a `Story4Draft` (Story 4, with
 * `owner`/`memories: Story4Memories`). Consumers branch on `storyType` (a missing
 * one is Story 1, via `?? "story-1"`, since legacy Story-1 drafts omit it).
 *
 * `loadDraft()` returns this union so a single localStorage entry can hold any
 * product without crashing the other products' readers.
 */
export type WizardDraft = StoryDraft | Story2Draft | Story4Draft;
