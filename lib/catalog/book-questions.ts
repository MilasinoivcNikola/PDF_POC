// The storefront's "questions you'll answer" + "the example we used" content map,
// one entry per sellable book title (keyed by `productId`). It powers the
// book-detail page's prep section (book-detail-redesign PR-3) — a shopper can read
// the full create-wizard questionnaire, see required vs optional, and see the exact
// answers behind that title's sample PDF before they buy.
//
// CLIENT-SAFE by design, exactly like lib/catalog/products.ts: this is plain DATA —
// no IO, no network, no `lib/ai/*`, no `node:`/fs, no Puppeteer. The public
// storefront's static build imports it, so its module graph must stay engine-free.
//
// The question wording / grouping / required-flags / conditional reveals MIRROR the
// real /create wizard steps for each story (so the page's claim "the questions
// you'll answer" stays truthful). The `example` values are PINNED to each title's
// sample fixture by lib/catalog/book-questions.test.ts (approach A): they are hand-
// authored literals here, but the test asserts each one equals the corresponding
// field read from that title's fixture JSON, so an example can never drift from the
// sample it claims to describe.

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One question in the create wizard, as shown on the prep section. */
export interface QuestionItem {
  /** Customer-facing prompt, matching the wizard's wording. */
  label: string;
  /** Required to generate, or optional/degrades gracefully. */
  required: boolean;
  /** Optional note for a conditional reveal, e.g. "only on the anniversary path". */
  reveal?: string;
  /** The example answer used for this title's sample PDF (fixture-pinned). */
  example?: string;
}

/** A wizard step's worth of questions, headed by its section title. */
export interface QuestionGroup {
  /** Section heading, e.g. "Your pet", "The story", "Tone & options". */
  title: string;
  items: QuestionItem[];
}

/** The full questionnaire + worked example for one title. */
export interface BookQuestions {
  productId: string;
  groups: QuestionGroup[];
  /** The example pet's display name, for the worked-example caption (neutral framing). */
  exampleSummary?: string;
}

// ---------------------------------------------------------------------------
// The content map
// ---------------------------------------------------------------------------

const BOOK_QUESTIONS: BookQuestions[] = [
  // -------------------------------------------------------------------------
  // Story 1 — "Saying Goodbye" (narrative children's storybook). Wording from
  // the prototype index.html (the verbatim design source). Example pinned to
  // fixtures/sample-story1-dog.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-1-book",
    exampleSummary: "Mango",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Mango" },
          { label: "What kind of animal", required: true, example: "dog" },
          {
            label: "How they look",
            required: true,
            example:
              "fawn pug with a black mask over his muzzle, deep velvety wrinkles, big dark round eyes, and a tightly curled tail",
          },
          { label: "He, she, or they", required: true, example: "he" },
          { label: "Illustration style", required: true, example: "watercolor" },
        ],
      },
      {
        title: "The child",
        items: [
          { label: "The child's name", required: true, example: "Maya" },
          { label: "Their age", required: true, example: "6-8" },
        ],
      },
      {
        title: "The memories",
        items: [
          {
            label: "Their favorite thing to do",
            required: true,
            example: "waddling beside you on slow evening walks around the park",
          },
          {
            label: "Where they loved to sleep",
            required: true,
            example: "snuggled into the cushions at the foot of your bed",
          },
          {
            label: "A favorite memory",
            required: true,
            example:
              "The evening you two sat together on the low wall by the park fence, your hand resting on his back, both of you watching the world go by until the light turned golden.",
          },
          { label: "A dedication", required: false },
        ],
      },
      {
        title: "Tone & gentle choices",
        items: [
          { label: "How they died", required: false, example: "natural" },
          {
            label: "Where the book says they are now",
            required: false,
            example: "rainbow-bridge",
          },
          { label: "Other pets at home", required: false, example: "no" },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 2 — "A Letter from Your Pet" (grief letter, the pet's voice).
  // Wording from the /create letter + owner + tone steps (story-2 path).
  // Example pinned to fixtures/sample-story2-cat.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-2-letter",
    exampleSummary: "Clementine",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Clementine" },
          { label: "What kind of animal", required: true, example: "cat" },
          {
            label: "How they look",
            required: false,
            reveal: "Optional, but it helps us paint the cover.",
            example:
              "long-haired British Longhair with a soft dove-grey coat and round copper eyes",
          },
          {
            label: "Who the letter is written to",
            required: true,
            example: "Eleanor",
          },
        ],
      },
      {
        title: "The letter",
        items: [
          {
            label: "A quirk or two that were only theirs",
            required: true,
            example:
              "the way you waited on the third stair every evening, exactly where the last of the light landed",
          },
          {
            label: "A ritual that was the best part of the day",
            required: true,
            example:
              "the slow first coffee, you curled against my arm before the day could start",
          },
          {
            label: "The spots that were theirs",
            required: true,
            example:
              "the warm square of windowsill above the radiator, and the folded blanket at the foot of the bed",
          },
          {
            label: "Nicknames",
            required: false,
            example: "Clem, Miss Clementine, the small grey shadow",
          },
          { label: "Together since…", required: false, example: "Spring 2011" },
          { label: "The years you shared", required: false, example: "October 2025" },
        ],
      },
      {
        title: "Tone & options",
        items: [
          { label: "How they died", required: false, example: "peaceful" },
          {
            label: "Where the letter says they are now",
            required: false,
            example: "rainbow-bridge",
          },
          { label: "Is this for you, or a gift?", required: false, example: "self" },
          {
            label: "Has another pet come home, or might one soon?",
            required: false,
            example: "no",
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 4 — "If Your Pet Could Talk" (joyful letter, the pet's voice).
  // Wording from the /create letter + owner + tone steps (story-4 path; the
  // headline conditional is living vs memorial). Example pinned to
  // fixtures/sample-story4-other.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-4-talk",
    exampleSummary: "Pepper",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Pepper" },
          { label: "What kind of animal", required: true, example: "other" },
          {
            label: "How they look",
            required: false,
            reveal: "Optional, but it helps us paint the cover.",
            example:
              "a tri-colour guinea pig with a white blaze, a caramel saddle, and a swirl of black around one ear",
          },
          {
            label: "Who the letter is written to",
            required: true,
            example: "Maya",
          },
        ],
      },
      {
        title: "The letter",
        items: [
          {
            label: "A quirk or two that are only theirs",
            required: true,
            example:
              "the little burst of happy squeaks you make the second you hear the fridge open",
          },
          {
            label: "A ritual that's the best part of the day",
            required: true,
            example:
              "our breakfast handoff — a sprig of parsley over the side of the hutch, every single morning",
          },
          {
            label: "The spots that are theirs",
            required: true,
            example:
              "the cosy fleece tunnel by the window where the afternoon sun pools",
          },
          {
            label: "Their favorite thing to do",
            required: true,
            example: "popcorning across the rug like the floor is made of springs",
          },
          {
            label: "Nicknames",
            required: false,
            example: "Pep, Sir Pepper, the little potato",
          },
          { label: "Together since…", required: false, example: "May 2023" },
        ],
      },
      {
        title: "Tone & options",
        items: [
          {
            label: "Is your pet here with you, or is this a keepsake?",
            required: false,
            reveal:
              "Choosing the keepsake (past-tense) path reveals the gentle grief questions below.",
            example: "living",
          },
          { label: "Is this for you, or a gift?", required: false, example: "self" },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 5 — "A Letter to Your Pet" (grief letter, the owner's voice).
  // Wording from the prototype variant-sparse.html (the verbatim design source).
  // Example pinned to fixtures/sample-story5-dog.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-5-letter-to",
    exampleSummary: "Biscuit",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Biscuit" },
          { label: "What kind of animal", required: true, example: "dog" },
          {
            label: "How they look",
            required: false,
            reveal: "Helps the cover portrait, but the letter stands without it.",
            example:
              "small senior terrier-mix with a short tan-and-grey brindle coat, a soft white-and-grey muzzle, one ear that flops and one that stands half up",
          },
          { label: "Who signs the letter", required: true, example: "Margaret" },
        ],
      },
      {
        title: "The letter",
        items: [
          {
            label: "A daily ritual that was yours",
            required: true,
            example:
              "the slow loop around the block after dinner, you setting the pace, me letting you",
          },
          {
            label: "The spots that were theirs",
            required: true,
            example:
              "the worn patch of carpet by the radiator, and the bottom step where you waited for me every evening",
          },
          {
            label: "A quirk",
            required: false,
            example:
              "the way you turned your whole body to look at me, not just your head, like I deserved the full effort",
          },
          {
            label: "The last good day",
            required: false,
            example:
              "the last warm afternoon, when you found a sunbeam on the kitchen floor and slept in it for hours while I worked beside you",
          },
          {
            label: "Something you're keeping",
            required: false,
            example:
              "your frayed red collar on the hook by the door, and the soft dent your weight left in the old armchair",
          },
          {
            label: "Nicknames · when adopted · when they passed",
            required: false,
            example: "Biscuit, Bisky, the old girl",
          },
        ],
      },
      {
        title: "Tone",
        items: [
          { label: "How they died", required: false, example: "euthanasia" },
          {
            label: "Where they are now",
            required: false,
            example: "heaven",
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 6 — "While You're Still Here" (living tribute, present tense).
  // Wording from the /create pet + tribute + tone steps (story-6 path; it adds
  // the present-tense ageOrStage field). Example pinned to
  // fixtures/sample-story6-cat.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-6-tribute",
    exampleSummary: "Hazel",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Hazel" },
          { label: "What kind of animal", required: true, example: "cat" },
          {
            label: "How they look",
            required: true,
            example:
              "brown tabby gone grizzled and silver around the muzzle, with a white chest and chin and pale green eyes",
          },
          {
            label: "Where they are in life right now",
            required: true,
            example: "sixteen now, slower but still the boss of the house",
          },
          { label: "He, she, or they", required: true, example: "she" },
          { label: "Illustration style", required: true, example: "watercolor" },
        ],
      },
      {
        title: "The tribute",
        items: [
          {
            label: "Who is this book dedicated by?",
            required: true,
            example: "Diane",
          },
          {
            label: "Something you still do together",
            required: true,
            example: "the slow patrol of the garden fence we still take at dusk",
          },
          {
            label: "A ritual that's the best part of the day",
            required: true,
            example: "the saucer of warm milk I set down while the kettle boils",
          },
          {
            label: "What does your pet still love?",
            required: false,
            example: "still climbs into the window box every morning to watch the birds",
          },
          {
            label: "A quirk or two that are only theirs",
            required: false,
            example: "the way you knead the blanket three times before you finally settle",
          },
          {
            label: "The spots that are theirs",
            required: false,
            example: "the sunny sill above the kitchen sink, where the afternoon light lands",
          },
          {
            label: "Where do they love to sleep?",
            required: false,
            example: "the folded quilt on the radiator shelf",
          },
          {
            label: "A line for the dedication, if you'd like one",
            required: false,
            example: "Thank you for sixteen years of quiet company.",
          },
          { label: "Nicknames", required: false, example: "Haze, the old lady" },
          { label: "Together since…", required: false, example: "Autumn 2010" },
        ],
      },
      {
        title: "Tone & options",
        items: [
          {
            label: "How should the book hold this time with your pet?",
            required: false,
            example: "still-here",
          },
          {
            label: "Are there other pets at home?",
            required: false,
            example: "yes",
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 7 — "Welcome Home" (gotcha-day storybook). Wording from the prototype
  // variant-living.html (the verbatim design source). Example pinned to
  // fixtures/sample-story7-bird.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-7-welcome",
    exampleSummary: "Kiwi",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Kiwi" },
          { label: "What kind of animal", required: true, example: "bird" },
          {
            label: "How they look",
            required: true,
            example:
              "a grey cockatiel with a sunny yellow face and crest, bright orange cheek patches, and white flashes along the wings",
          },
          { label: "He, she, or they", required: true, example: "he" },
          { label: "Illustration style", required: true, example: "watercolor" },
        ],
      },
      {
        title: "The homecoming",
        items: [
          {
            label: "Who they came home to",
            required: true,
            example: "Dana and Theo",
          },
          {
            label: "Their favorite thing in the world",
            required: true,
            example:
              "whistling the first three notes of every song until someone whistles back",
          },
          {
            label: "Where they love to sleep",
            required: true,
            example: "tucked up on the high corner perch by the kitchen window",
          },
          {
            label: "The day you brought them home",
            required: false,
            example:
              "He clung to the side of the travel carrier the whole way, dead quiet, and then the moment we opened it at home he stepped onto Theo's finger like he'd always lived there.",
          },
          {
            label: "A quirk that's all theirs",
            required: false,
            example:
              "the crest that shoots straight up when the kettle clicks; the soft chatter to his reflection in the toaster",
          },
          { label: "A child in the family", required: false, example: "Theo" },
          {
            label: "Who else is in the home",
            required: false,
            example:
              "Dana, Theo, and the old tabby Marmalade who watches the cage like a soap opera",
          },
          {
            label: "Nicknames",
            required: false,
            example: "Kiwi-bird, the little whistler",
          },
        ],
      },
      {
        title: "Tone & options",
        items: [
          {
            label: "A new arrival, or a gotcha-day anniversary",
            required: false,
            reveal:
              "Choosing “anniversary” reveals one more question: how many years home.",
            example: "gotcha-day-anniversary",
          },
          {
            label: "How many years ago did they come home?",
            required: false,
            reveal: "Only on the anniversary path.",
            example: "3",
          },
          { label: "Where they came from", required: false, example: "rescue" },
          { label: "Their life stage", required: false, example: "adult" },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 8 — "The Amazing Adventures of Your Pet" (kids' adventure). Wording
  // from the /create adventure + tone steps (story-8 path; childName is required
  // only when the child adventures alongside). Example pinned to
  // fixtures/sample-story8-dog.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-8-adventure",
    exampleSummary: "Pickle",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Pickle" },
          { label: "What kind of animal", required: true, example: "dog" },
          {
            label: "How they look",
            required: true,
            example:
              "Pembroke Welsh corgi with a red-and-white coat, a white blaze down the nose, very short legs, and big upright ears",
          },
          { label: "He, she, or they", required: true, example: "she" },
          { label: "Illustration style", required: true, example: "watercolor" },
        ],
      },
      {
        title: "The adventure",
        items: [
          {
            label: "Their real-life superpower",
            required: false,
            example: "the Great Round-Up",
          },
          {
            label: "Their favorite thing to do",
            required: false,
            example: "rounding up the family's slippers into one tidy pile by the door",
          },
          {
            label: "A quirk or two that are only theirs",
            required: false,
            example: "boops the back of everyone's knees to steer them where she wants them to go",
          },
          {
            label: "The child in the story",
            required: false,
            reveal:
              "Required when the child adventures alongside; optional when they hear the legend as the reader.",
            example: "Nora",
          },
          {
            label: "A sidekick on the quest?",
            required: false,
            reveal: "Only when the child adventures alongside.",
            example: "Maple",
          },
          {
            label: "Nicknames",
            required: false,
            example: "Pickle-pie, the Loaf",
          },
        ],
      },
      {
        title: "Tone & options",
        items: [
          {
            label: "Which adventure?",
            required: false,
            example: "backyard-mystery",
          },
          {
            label: "Does the child adventure along, or hear the legend?",
            required: false,
            example: "pet-plus",
          },
          {
            label: "What reading level fits the child?",
            required: false,
            example: "6-8",
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Story 9 — "Your Pet and the New Baby" (family-transition keepsake). Wording
  // from the /create baby + tone steps (story-9 path; babyStatus expecting vs
  // arrived is the primary toggle). Example pinned to
  // fixtures/sample-story9-rabbit.json.
  // -------------------------------------------------------------------------
  {
    productId: "story-9-newbaby",
    exampleSummary: "Clementine",
    groups: [
      {
        title: "Your pet",
        items: [
          { label: "Their name", required: true, example: "Clementine" },
          { label: "What kind of animal", required: true, example: "rabbit" },
          {
            label: "How they look",
            required: true,
            example:
              "a sandy-orange rabbit with a cream chest and muzzle, tall upright ears, and a rounded, fluffy body",
          },
          { label: "He, she, or they", required: true, example: "she" },
          { label: "Illustration style", required: true, example: "watercolor" },
        ],
      },
      {
        title: "The family",
        items: [
          {
            label: "Your family name, as the dedication should read",
            required: true,
            example: "Bennett",
          },
          {
            label: "Their favorite thing in the world",
            required: true,
            example: "doing happy little binky hops across the living-room rug after breakfast",
          },
          {
            label: "Where they curl up at the end of the day",
            required: true,
            example: "the soft hay corner beneath the window",
          },
          {
            label: "A quirk or two that are only theirs",
            required: false,
            example: "the way you thump one back foot to let everyone know it is dinnertime",
          },
          {
            label: "The new baby's name, if you have one",
            required: false,
            reveal: "Never required — an expecting order degrades to “the new baby.”",
            example: "Theo",
          },
          {
            label: "When is the baby arriving?",
            required: false,
            example: "this past spring",
          },
          {
            label: "Nicknames",
            required: false,
            example: "Clem, the little loaf",
          },
        ],
      },
      {
        title: "Tone & options",
        items: [
          {
            label: "Is the baby on the way, or already here?",
            required: false,
            example: "arrived",
          },
          {
            label: "Are there other pets at home?",
            required: false,
            example: "no",
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/** The questionnaire + worked example for one title; `undefined` if unknown. */
export function getBookQuestions(productId: string): BookQuestions | undefined {
  return BOOK_QUESTIONS.find((q) => q.productId === productId);
}

/** Every title's questionnaire, in catalog order. */
export function getAllBookQuestions(): BookQuestions[] {
  return BOOK_QUESTIONS;
}
