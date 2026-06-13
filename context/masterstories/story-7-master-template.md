# Story 7 Master Template — "Welcome Home — [PET_NAME]'s Gotcha Day"

> **Product:** The catalog's first joyful, non-memorial book — a personalized PDF storybook celebrating a pet's adoption / arrival
> **Length:** ~10 pages (cover + dedication + 7 narrative pages + closing + back cover)
> **Purpose:** Tell a pet's origin story as a warm picture book — the day they were chosen, the drive home, the first night, becoming family — for a freshly adopted new pet OR the annual "Gotcha Day" anniversary
> **Status:** Working v1 draft — spec for build
> **Last updated:** 2026-06-12

---

## How to use this document

This is the master text. Every paid order generates a PDF by substituting the merge fields below into the page-by-page text, then composing the correct occasion / adoption-source / life-stage variants and the matching illustration set.

This is the **first happy book** in the Quietly Kept catalog — every other title (Stories 1–3) is grief work. The voice is warm and celebratory, not sentimental, never saccharine. It must read aloud to a child without going babyish, and read just as well to an adult holding the first photos of a pet they only met last week.

**Hire a copy editor** to polish the connective text before launch. There's no specialist-grief bar here, so the budget is lower — $100–150 for a warmth-and-flow pass. The bar is: does it sound like a real family telling the story of the best day, not a greeting card?

---

## Where this sits in the catalog

| | Quietly Kept catalog |
|---|---|
| **Story 1** | Saying Goodbye — child grief picture book |
| **Story 2** | A Letter from [PET] — adult keepsake letter |
| **Story 3** | A Life Well Lived — celebration-of-life booklet |
| **Story 7 (this)** | **Welcome Home — the Gotcha Day book** |

Story 7 is the catalog's pivot from *loss* to *beginning*. It is the only title bought in joy rather than grief, which changes the marketing surface entirely: it can be sold as an **adoption gift** (bought by friends/family when someone brings a new pet home) and — the real upside — as a **recurring annual occasion**. "Gotcha Day" (the anniversary of an adoption) is increasingly celebrated like a birthday; a family that buys this book the year they adopt has a reason to come back every year. No other Quietly Kept title has a built-in repeat-purchase cadence.

Ranked **#4** in the catalog by expected demand.

---

## Market rationale & demand evidence

The personalized **celebration / adoption pet-book** category is broadly validated by established sellers — buyers already pay premium prices for a personalized book starring their own pet:

- **Hooray Heroes** — personalized pet "bond" books at **$46.99**, with **3.5M+ personalizations** across their range. (https://hoorayheroes.com/personalized-book/dog-book)
- **I See Me!** — *"If My Dog Could Talk"* personalized book at **$29.99**. (https://www.iseeme.com/en-us/if-my-dog-could-talk-personalized-book.html)
- **Petventures** — personalized pet-adventure storybook at **$44.99**, **143 reviews, 85% five-star**. (https://petventuresbook.com/)
- **Etsy** — *"personalized dog book"* returns **1,000+ listings**, confirming a deep, active long-tail market. (https://www.etsy.com/market/personalized_dog_book)

**Honest caveat:** no single dedicated **"Gotcha Day"** competitor surfaced cleanly in research. Demand for *this specific framing* is **inferred from the broader personalized-pet-book category, not a named, proven listing.** We are betting that the adoption/anniversary occasion is an underserved slice of a clearly-large market, not entering a crowded one. Treat the gotcha-day angle as a hypothesis to validate with early sales, not a sure thing.

**Our differentiator (the whole moat):** the competitors above use breed pickers, avatar builders, or pre-made art styles — the book stars *a* dog, not *your* dog. Quietly Kept generates the illustrations from **one uploaded photo of the customer's actual pet**, kept consistent across every page. For an origin-story book — where the entire emotional payload is "this is *our* one, exactly as they look" — that likeness is worth more here than in any other title.

**Position:** ranked **#4**; the upside that justifies the slot is the **recurring annual gotcha-day purchase**, which none of our grief titles have.

---

## Pipeline fit & build notes

This book is deliberately scoped to be **low build effort — authoring-mostly** — per [new-book-playbook.md](../new-book-playbook.md).

- **Layouts: zero new primitives.** Story 7 reuses the **Story-1 narrative set** entirely — `cover`, `dedication`, `narrative`, `closing`, `back-cover`. There is **no `truth` (death) page** — that's the only Story-1 layout we drop, and dropping a layout needs no code. So **Step 3 of the playbook (layout/CSS) is skipped**: no new `PageLayout` value, no `renderPage` case, no new print/screen CSS, and existing-book PDFs stay byte-identical. This is the cheapest possible new title.
- **Illustration slots: 8.** The illustrated pages are the **cover** plus seven scene pages — *before you came*, *the day we found each other*, *the drive home*, *the first night*, *learning each other*, *now you're ours*, and the *you belong here* love-beat. The **dedication** carries a small portrait (illustrated, but it's the dedication slot, not a unique scene) and the **closing** + **back cover** are treated like Story 1's (closing gets art, back cover is a writing/memory page). For the engine's `illustrationSlots` list, target **8 generated scenes** (cover + 7), matching the playbook's ~8–9 guidance. State this exactly in the registry's `illustrationSlots`; `illustrationCount` derives from it automatically (do not hardcode).
- **Wizard fields — mostly reused.** Reuses `PET_NAME`, `PET_NICKNAMES`, `SPECIES`, `SPECIES_DESCRIPTOR`, `BREED_COLOR`, `PRONOUN_*`, `OWNER_NAMES`, `CHILD_NAME` (optional), `FAVORITE_ACTIVITY`, `SLEEPING_SPOT`, `QUIRKS`, `DATE_ADOPTED`. **New fields:** `ADOPTION_SOURCE`, `HOMECOMING_MEMORY` (free-text), `FAMILY_MEMBERS` (see table). **New toggles:** `OCCASION`, `LIFE_STAGE` (and `ADOPTION_SOURCE` doubles as a variant driver). A new wizard step ("How you found each other") collects the source/occasion/life-stage; the rest fold into the existing pet + memories steps.
- **Build effort: LOW.** New `lib/story/story7/{master-text,variants,merge,editable-fields}.ts`, a thin `lib/story/story-7.ts` definition, a catalog entry, a wizard-config entry, a `welcomeHomePdfFilename` helper in `lib/pdf/filename.ts`, and the three new wizard fields/toggles. No infra, no worker, no admin, no delivery, no Supabase, no new layout. Per the playbook's reuse guarantee, the entire order → pay → worker → approve → deliver loop serves this book with **zero** changes.

---

## Merge fields

| Field | Source | Example |
|-------|--------|---------|
| `[PET_NAME]` | Customer input | "Biscuit" |
| `[PET_NICKNAMES]` | Optional, up to 3 | "Biscuit-boy", "the gremlin" |
| `[SPECIES]` | Dropdown | "dog" |
| `[SPECIES_DESCRIPTOR]` | Auto-mapped | "good boy", "sweet girl", "kitty", "bunny" |
| `[BREED_COLOR]` | Customer input | "scruffy terrier mix with one ear that won't stay down" |
| `[PRONOUN_SUBJECT]` | Dropdown | "he" / "she" / "they" |
| `[PRONOUN_OBJECT]` | Auto-mapped | "him" / "her" / "them" |
| `[PRONOUN_POSSESSIVE]` | Auto-mapped | "his" / "her" / "their" |
| `[OWNER_NAMES]` | Customer input | "Maria" or "Maria and James" or "the Rodriguez family" |
| `[CHILD_NAME]` | Optional customer input | "Leo" |
| `[FAMILY_MEMBERS]` | **New** — optional; humans + pets already in the home | "Maria, James, and the cat Pepper" |
| `[FAVORITE_ACTIVITY]` | Customer input | "stealing socks and parading them around the kitchen" |
| `[SLEEPING_SPOT]` | Customer input | "in the crook of the couch by the window" |
| `[QUIRKS]` | Free-text, 1–3 short phrases | "the head-tilt when you say 'walk'; the sigh before sleep" |
| `[DATE_ADOPTED]` | Optional | "March 2026" or "Spring 2026" |
| `[HOMECOMING_MEMORY]` | **New** — optional free-text, 1–2 sentences | "He shook the whole car ride and then fell asleep on Leo's lap before we hit the driveway." |

**New merge fields introduced by this product:**

| Field | Why it's new |
|-------|--------------|
| `[ADOPTION_SOURCE]` | No prior title needed *where the pet came from*. Drives the origin page + toggle. |
| `[HOMECOMING_MEMORY]` | The free-text heart of the "drive home / first night" pages — the customer's actual first-day moment. |
| `[FAMILY_MEMBERS]` | Lets "becoming family" name the real household (and any pets already there) instead of a generic "us". |

**Special-case toggles** (collected via a short follow-up step at checkout):

- `[OCCASION]`: **new-arrival** (default) / **gotcha-day-anniversary** — anniversary re-frames the opener and closing to "[N] years ago today…" and the present-tense "you're still ours". Requires a derived `[YEARS_HOME]` (computed from `[DATE_ADOPTED]`, or asked directly) when set to anniversary.
- `[ADOPTION_SOURCE]`: **shelter** / **rescue** / **breeder** / **found-as-stray** / **other** — adjusts the origin page ("the day we found each other"), with a warm *"whoever had you before, thank you"* line for shelter/rescue/stray (echoing Story 3's handling).
- `[LIFE_STAGE]`: **puppy-kitten** (default-ish, young) / **adult** / **senior-adoption** — senior-adoption adds a tender "you waited a long time for a home" beat; puppy-kitten leans into smallness/newness; adult is neutral.

---

## Story arc (why this structure works)

A homecoming book has a natural, satisfying shape — it's a love story with a beginning:

1. **Establish the "before."** The house *before* the pet — quieter, a little incomplete. This makes the arrival land. (You can't celebrate a beginning without an empty chair to fill.)
2. **The choosing.** The day they found each other — the origin moment, warmed by the adoption-source variant. This is the emotional hinge: *out of everyone, it was you.*
3. **The journey home.** The drive — small, vivid, scared-then-safe. The first physical crossing into "ours."
4. **The first night.** The threshold of belonging — unfamiliar, then settling. Often the customer's most-remembered moment.
5. **Learning each other.** The quirks — the specifics that turn "a pet" into "*our* pet." This is where the uploaded-photo likeness and the customer's `[QUIRKS]` do the heavy lifting.
6. **Becoming family.** The rituals, the favorite activity, the household closing around them.
7. **End on belonging, not on cuteness.** The last full page is a promise — *this is your home now, and it always will be* — which is exactly the line a gotcha-day buyer wants to reread every year.

The story should take **3–5 minutes** to read aloud. Designed to be reread on every anniversary.

---

## Page-by-page master text

> **Notation:** Text in regular type is the published wording. *Italic notes* are for the ghostwriter/designer. Default copy below is the **new-arrival** occasion; the **gotcha-day-anniversary** variants are given inline and summarized in the variants section. Tense default is **past** for the origin/journey pages and **present** for the belonging/closing pages; the anniversary toggle shifts the opener and closing to "[N] years ago today…".

---

### COVER — `cover`

**Title (large, warm hand-lettered feel):**
Welcome Home, [PET_NAME]

**Subtitle (smaller):**
The story of the day you became ours

*Variant ([OCCASION] = gotcha-day-anniversary):* Subtitle becomes — "Happy Gotcha Day, [PET_NAME]" *(and the dated line on the dedication carries the years).*

*Illustration brief:* [PET_NAME] (a [BREED_COLOR] [SPECIES]) at the threshold of a warm, lived-in home — paws on the doormat, looking up and into the light, tail/ears in a happy, curious posture. Bright golden-morning palette (more upbeat and saturated than the memorial titles — this is a *beginning*, not a sunset). [OWNER_NAMES] or [CHILD_NAME] may be a soft, partial presence (a knee, a hand on the doorframe), but the pet is the subject and the hero. This is the "you're here now" image.

---

### PAGE 1 — Dedication — `dedication`

For [PET_NAME],
who found [PRONOUN_POSSESSIVE] way to us —
and made the house a home.

*Optional dated line (printed smaller, beneath, when [DATE_ADOPTED] provided):* Home since [DATE_ADOPTED].

*Variant ([OCCASION] = gotcha-day-anniversary):* "[YEARS_HOME] years home, and counting." *(Use only when [YEARS_HOME] is known; otherwise fall back to the dated line, or omit.)*

*Illustration brief:* Single soft portrait of [PET_NAME] alone, looking toward the reader, content. Gentle pastel watercolor border. The pet as they actually are — the likeness page, the reference anchor for the rest of the book.

---

### PAGE 2 — Before You Came — `narrative`

Before you came, the house was a little too quiet.

There was a spot by the door where nobody waited. A bowl that wasn't on the floor yet. A walk that nobody asked for.

We didn't know it then, but we were waiting for you.

*Illustration brief:* A warm but slightly empty interior — a cozy room with one telling absence: an empty dog bed, a bare hook where a leash will hang, a sunlit patch of floor with no one in it. No pet in this image (or only a faint hint — a collar on a table). Inviting, not sad — "ready to be filled." This is the only page [PET_NAME] is absent from, by design.

*Variant ([LIFE_STAGE] = senior-adoption):* Add a quiet beat — "And somewhere, you were waiting too. You had been waiting a long time."

*Variant ([SPECIES] = cat):* "A walk that nobody asked for" → "A windowsill with nobody sitting in it." *(swap the dog-specific image for a cat-true one.)*

---

### PAGE 3 — The Day We Found Each Other — `narrative`

Then came the day everything changed.

*[ADOPTION_SOURCE]-specific origin sentence — see variants below.*

And out of every [SPECIES] in the whole wide world, it was you. It was always going to be you.

*Illustration brief:* The choosing moment — [PET_NAME] meeting their people for the first time. At the shelter/rescue (a kennel door opening, a gentle first sniff), or arriving home (a carrier, a first look around). Warm, hopeful light. The pet curious or a little unsure — the "first hello" expression, not full joy yet (that builds across the book).

**[ADOPTION_SOURCE] variants (the origin sentence on this page):**

- **shelter:** "We went to the shelter not quite sure what we were looking for — and there you were, looking right back at us. Whoever cared for you before we met, thank you. We took it from there."
- **rescue:** "A rescue had been keeping you safe until the right family came along. That family turned out to be us. To everyone who looked after you before we did — thank you. We are so glad you held on."
- **breeder:** "We had been counting the days until we could meet you. And when we did — small, brand new, entirely yourself — there was no question. You were coming home with us."
- **found-as-stray:** "You found *us*, really. One day you simply appeared — a little lost, a little hungry, looking for somebody. To whoever fed you or kept you safe out there before we met — thank you. We decided that somebody would be us."
- **other:** "However you came to us — and it's a good story, the way you tell it — the ending is the same. You were ours, and we were yours."

*If `[HOMECOMING_MEMORY]` is sparse or blank, this page must still stand on its own — it does, because the origin sentence is template-driven. `[HOMECOMING_MEMORY]` is used on Pages 4–5, not here.*

---

### PAGE 4 — The Drive Home — `narrative`

Then we brought you home.

[HOMECOMING_MEMORY]

The whole way, one thing was true, even if you didn't know it yet: you were safe now. You were ours.

*Illustration brief:* The journey home — [PET_NAME] in a car (on a lap, in a carrier, nose to the window) or being carried up a front path. A small, intimate, in-between moment. Soft motion, warm afternoon light. If the customer's memory is car-specific, reflect it; otherwise a generic "carried home" image.

*Fallback for blank/sparse `[HOMECOMING_MEMORY]`:* "You were so small in such a big new world. Maybe you trembled a little. Maybe you fell asleep before we even got there. Either way, we kept one hand on you the whole way, so you'd know you weren't alone." *(Use this verbatim when the field is empty or under ~4 words.)*

*Variant ([LIFE_STAGE] = puppy-kitten):* lean younger — "You were so small you fit in the crook of an arm" works; keep the trembling/sleeping beat.

*Variant ([ADOPTION_SOURCE] = found-as-stray):* soften "we brought you home" → "we *took* you home — and you let us, which felt like a gift."

---

### PAGE 5 — The First Night — `narrative`

The first night was new for all of us.

Everything smelled different. Every sound was a question. You weren't sure where you fit yet.

So we showed you. We made you a place — [SLEEPING_SPOT] — soft and warm and yours. And little by little, the questions went quiet, and you slept.

*Illustration brief:* [PET_NAME] settling into [SLEEPING_SPOT] for the first time — low, soft lamp-light, cozy, the household quieting around them. Mirror the *warmth* of Story 1's "safe places" sleeping image, but here it's a *beginning* of safety, not a memory of it. This is many customers' most-remembered moment — make it tender.

*Variant ([LIFE_STAGE] = senior-adoption):* Add — "You had slept in a lot of places that weren't home. This one was. You seemed to know it." *(quietly devastating in the good way — flag for the copy review.)*

*Variant ([SPECIES] = cat):* allow the cat to *not* settle on cue — "You inspected every corner first, the way you do, and only then — on your own terms, as always — you slept."

---

### PAGE 6 — Learning Each Other — `narrative`

After that, we got to know you. And you, us.

We learned [QUIRKS].

We learned what made your tail go, and what made you hide, and the exact sound that meant *now, please, walk, now.* You learned us right back — our footsteps, our voices, the times of day that were yours.

That is how a [SPECIES] and a family become a [SPECIES] and *their* family: one small thing at a time.

*Illustration brief:* A warm everyday scene full of personality — [PET_NAME] mid-quirk (head-tilt, the zoomie, the parade with a stolen sock), the family laughing or watching. This is the "now they're a character, not a stranger" page. Bright, busy-but-cozy.

*Fallback for blank/sparse `[QUIRKS]`:* "We learned the way you tilt your head when you're thinking. The way you greet us like we've been gone for years, even when it's been an hour. The small, particular things that are only yours." *(Use verbatim when the field is empty.)*

*Variant ([CHILD_NAME] provided):* Add — "[CHILD_NAME] learned you fastest of all."

---

### PAGE 7 — Now You're Ours — `narrative`

And now? Now you're just part of it.

Your favorite thing in the world is [FAVORITE_ACTIVITY]. Your spot is [SLEEPING_SPOT]. Your people are [OWNER_NAMES]. Your home is here.

The house isn't quiet anymore. It's better.

*Illustration brief:* [PET_NAME] doing [FAVORITE_ACTIVITY], full of joy and belonging — the "peak happy" image of the book, brightest palette. The family present or implied. This is the visual payoff of the empty-house page: the spot by the door has somebody in it now.

*Variant ([FAMILY_MEMBERS] provided):* second sentence becomes — "Your people are [FAMILY_MEMBERS]. Your home is here." *(names the real household, including pets already there.)*

*Variant ([OCCASION] = gotcha-day-anniversary):* "And now, [YEARS_HOME] years on, you're just part of it — like you were always here." *(present-tense, anniversary framing.)*

---

### PAGE 8 — You Belong Here — `narrative` *(the love-beat)*

Here is the truest thing in this whole book.

You are not a guest. You are not "the new [SPECIES]." You are family — all the way through, no trial period, no taking-back.

You belong here. You belong to us, and we belong to you, and that is simply how it is now.

*Illustration brief:* The emotional anchor image — quiet and a little dreamlike (the "love stays" energy of Story 1's love page, but pointed forward, not back). [PET_NAME] close against their person — a hand on the head, the pet leaning in, full trust. Soft glow, warm. This should be the single strongest, most frame-able illustration in the book.

*Variant ([CHILD_NAME] provided):* "You belong to us" → "You belong to us — to [OWNER_NAMES], and most of all, some days, to [CHILD_NAME]."

---

### PAGE 9 — Closing — `closing`

So welcome home, [PET_NAME].

You were worth the wait. You were worth the empty bowl and the quiet house and all the days before you came.

This is your home now, [PET_NAME]. It always will be.

*Variant ([OCCASION] = gotcha-day-anniversary):* "So happy Gotcha Day, [PET_NAME]. [YEARS_HOME] years ago today, you came home — and you never stopped being exactly where you belong. This is your home, [PET_NAME]. It always will be."

*Illustration brief:* The closing image — [PET_NAME] settled and content in the heart of the home, warm golden light, the family near. Should rhyme with the cover (same pet, same warmth) but feel *settled* where the cover felt *arriving* — the journey complete. End on belonging, glowing, hopeful.

---

### BACK COVER — Our First Year (Memory Page) — `back-cover`

*Layout:* Space for the family to fill in by hand or print. Editable fields in the PDF, exactly like Story 1's back cover.

**Suggested prompt printed at top of page:**
"The story of [PET_NAME]'s first days with us"

*Optional template lines:*
- The day [PET_NAME] came home: ___________
- Where [PET_NAME] slept the first night: ___________
- The first thing [PET_NAME] ever stole / destroyed / charmed: ___________
- The moment we knew [PET_NAME] was really ours: ___________

*Variant ([OCCASION] = gotcha-day-anniversary):* swap the prompt to — "A new memory from this year with [PET_NAME]" with one ruled block, so the page can be added to each anniversary.

*Illustration brief:* Soft, cheerful border around the writing space — paw prints, a little house, a sprig of something green. Should not compete with the handwritten content. Brighter than Story 1's memory-page border (this is a happy keepsake).

---

## Variants quick reference

### Occasion ([OCCASION])
- **new-arrival** (default) — past tense origin, present-tense belonging. Cover subtitle "the day you became ours."
- **gotcha-day-anniversary** — opener + closing reframed to "[YEARS_HOME] years ago today…"; cover subtitle "Happy Gotcha Day"; dedication carries "[YEARS_HOME] years home"; back cover becomes an add-each-year block. Requires `[YEARS_HOME]` (derive from `[DATE_ADOPTED]` or ask directly).

### Adoption source ([ADOPTION_SOURCE]) — drives Page 3's origin sentence
- **shelter** / **rescue** / **found-as-stray** — each includes the warm *"whoever had you before, thank you"* line (echoing Story 3).
- **breeder** — the "counting the days to meet you" framing; no thank-you-to-the-past line.
- **other** — the source-agnostic "however you came to us" framing.

### Life stage ([LIFE_STAGE])
- **puppy-kitten** — lean into smallness/newness on Pages 4–5.
- **adult** — neutral; master text as written.
- **senior-adoption** — adds the "you waited a long time for a home" beat on Page 2 and the "a lot of places that weren't home" beat on Page 5. The most emotionally loaded variant — review carefully.

### Species (voice tweaks, mostly Pages 2 / 5 / 6)
- dog / cat / rabbit / bird / other — swap species-untrue images (the "walk nobody asked for", the "settle on cue" beat) for species-true ones. Default text is dog-calibrated; `[SPECIES]`/`[SPECIES_DESCRIPTOR]` carry the rest.

### Child ([CHILD_NAME] optional)
- When provided, adds the [CHILD_NAME] beats on Pages 6 and 8. When absent, those lines are omitted cleanly (no dangling reference).

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] All merge fields filled — no `[PET_NAME]` (or any `[FIELD]`) left literal anywhere
- [ ] Pronouns consistent across all pages
- [ ] Pet species, breed, color match across all illustrations (the #1 likeness bug)
- [ ] `[HOMECOMING_MEMORY]` text is grammatically clean — fix typos in the customer's free-text without changing meaning; apply the Page-4 fallback if blank/sparse
- [ ] `[QUIRKS]` reads as a clean sentence on Page 6; apply the fallback if blank
- [ ] Occasion variant applied (anniversary reframes cover / dedication / opener / closing / back cover; `[YEARS_HOME]` present if anniversary)
- [ ] Adoption-source variant applied to Page 3 (correct origin sentence + thank-you line only for shelter/rescue/stray)
- [ ] Life-stage variant applied (senior-adoption beats on Pages 2 & 5)
- [ ] `[CHILD_NAME]` beats present only if a child name was given; omitted cleanly otherwise
- [ ] No memorial / loss language has leaked in from sibling templates (this is a happy book)
- [ ] Read aloud start to finish — does it flow, and land on belonging?
- [ ] Final PDF is 8.5" × 11", at least 300 DPI
- [ ] File named: `Welcome-Home-[PET_NAME].pdf`
- [ ] Dedication reads correctly with the dated / anniversary line

---

## Quality bar / what to avoid

**Never:**
- Use "fur baby" (banned across the catalog)
- Use clichés: "forever home" as filler, "wagging their way into our hearts", "purrfect", "pawsome", "meant to be" used lazily, "a match made in heaven"
- Use emojis or icons in the text
- Let any grief / memorial language leak in — no "rainbow bridge", no "watching over", no "gone too soon". This is the *opposite* book. Sibling templates share merge fields, not tone.
- Promise things the family can't control ("you'll be best friends forever", "you'll never be sad again")
- Make the "before you came" page actually sad — it's *anticipation*, not loss. The empty house is hopeful.
- Talk down to the reader — readable aloud to a child, but never babyish or sing-song
- Reference a date, source, or detail the customer didn't provide (omit cleanly instead)
- Over-sentimentalize. The emotion comes from the *specifics* (the trembling car ride, the stolen sock), not from adjectives stacked on adjectives.

**Always:**
- Lead with the specific — the customer's `[HOMECOMING_MEMORY]` and `[QUIRKS]` are what make it *their* pet's book
- Use the pet's name often
- Keep the warmth earned and grounded — like a real family telling the best story they have
- Honor the adoption source with dignity (especially the "thank you to whoever had them before" line)
- End on **belonging** — the last full page is a promise the family can reread every gotcha day
- Keep the empty-house "before" → full-house "after" payoff intact; it's the spine of the arc

---

## Illustration & typography style guide

This is the **brightest, most upbeat** book in the catalog. It shares the Quietly Kept warmth, but tilts the dial toward joy.

- **Style options offered to customer:** soft watercolor (default), gentle storybook (cleaner lines), pencil sketch (for a quieter feel) — same three as Story 1, so the engine/style system is untouched.
- **Palette:** warm and **brighter** than the memorial titles — golden *morning* light rather than golden-hour dusk; saturated but soft; greens and warm yellows welcome. Still **no harsh contrasts, no pure black, no primary-color clipart brightness.** Think "first sunny morning in a new home," not "sunset goodbye."
- **Pet consistency (the differentiator):** same breed markings, eye color, coat, and body posture across every page — generated from the single uploaded photo and locked to a reference image before any page art. This is the #1 quality issue and the entire value prop; an origin-story book lives or dies on "that's *exactly* our pet."
- **Emotional progression in the art:** the pet's expression should *build* — curious/unsure on Page 3 (the meeting), settling on Pages 4–5, fully joyful and belonging by Pages 7–8. Don't paint full happiness on the first-hello page; let the book earn it.
- **Human / child rendering:** keep faces slightly stylized / 3/4 view / partial (a hand, a knee, from behind) — avoids uncanny-valley and lets any family see themselves. The pet is always the hero of the frame.
- **Avoid:** photographic realism, harsh studio lighting, anything that reads as stock clipart or a greeting card, and any visual melancholy (this is not a memorial).

**Typography:** identical system to Story 1 / the existing books — Fraunces (display/titles), Lora (body), warm cream paper, never pure white. No new fonts. The cover hand-lettering should feel a touch more playful/bouncy than the memorial covers, achievable within the existing Fraunces `opsz`/`SOFT` axes — no new asset needed.

---

## Customer-facing description (for product page)

> A personalized ~10-page storybook celebrating the day your pet came home. *Welcome Home* tells your pet's origin story — the empty house before, the day you found each other, the drive home, the first night, and all the small ways they became family — illustrated from a single photo of your *actual* pet, kept looking like themselves on every page.
>
> Perfect for a brand-new arrival, an adoption gift, or your pet's annual **Gotcha Day**. Delivered as a print-quality PDF, lovingly hand-finished within 24–48 hours. Customized with your pet's name, how you found each other, your first-day memory, and the quirks that make them yours.
>
> Because every pet deserves the story of the best day — the day they finally came home.

---

## Pricing

| Tier | Price | Notes |
|------|-------|-------|
| **PDF (recommended)** | **$25–29** | In line with I See Me! ($29.99) and below Hooray Heroes / Petventures ($44.99–46.99); our likeness-from-photo justifies the upper end. **Recommend launching at $29**, testing $25 if conversion lags. |

The catalog `priceUsd` placeholder should be set to the PM-confirmed number (suggest `2900` = $29) and must match the Lemon Squeezy variant price. The recurring **annual gotcha-day** repurchase is what makes even the lower end of this range attractive lifetime-value-wise — confirm the final number with the PM before checkout wiring (playbook Step 4/5).

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where I'd most welcome an editor's pass:

1. **The "before you came" page (Page 2)** — the hardest tonal tightrope in the book. It must feel like *anticipation*, not *absence/loss*. If it reads even slightly melancholy, the whole emotional engine inverts. Read it cold and check.
2. **Senior-adoption variant (Pages 2 & 5)** — "you waited a long time for a home" is the most affecting beat in the book and the easiest to overplay. Verify it lands as tender, not pitying.
3. **The adoption-source origin sentences (Page 3)** — five of them; make sure they're tonally consistent and that the shelter/rescue/stray "thank you to whoever had you before" line is warm, not guilt-inducing.
4. **The fallbacks** — the Page-4 (`[HOMECOMING_MEMORY]`) and Page-6 (`[QUIRKS]`) blank-input fallbacks have to be strong enough to carry the page when the customer leaves the field empty. They're written to; pressure-test them aloud.
5. **The gotcha-day-anniversary toggle** — confirm the reframed opener/closing read naturally for *every* `[YEARS_HOME]` value (including "1 year"/"1 years" — singular/plural handling), and that the back-cover "add each year" version actually invites annual reuse.
6. **The closing line** — "This is your home now, [PET_NAME]. It always will be." is the most-reread line (it's the gotcha-day payoff). Is it the right note, or too plain? It's deliberately plain — verify that's a strength.

**Total ghostwriter / editor budget guidance:** $100–150 for a warmth-and-flow polish. Lower than the grief titles — no specialist required, just a good copy editor with a feel for earned warmth.
