# Story 6 Master Template — "While You're Still Here, [PET_NAME]"

> **Product:** Living-tribute keepsake — personalized PDF book made *before* a pet dies, for a senior pet or one with a hard/terminal diagnosis
> **Length:** 8 illustrated pages (cover + 6 inner pages + back cover)
> **Purpose:** Celebrate a pet *while the owner can still hold the book* — honor the bond and the season of life with gratitude, gently acknowledging the time ahead without burying the pet early
> **Status:** Working v1 draft — spec for build
> **Last updated:** 2026-06-12

---

## Where this sits in the catalog

Every other product in the catalog is written *after* the pet has died. This one is written *before*.

Story 6 is the **living tribute** — a keepsake an owner makes for a pet who is still here: the 13-year-old dog slowing down on the stairs, the cat curled smaller than she used to be, the pet who just came home from the vet with a diagnosis the owner is still absorbing. It is the bridge between celebration and memorial. The whole emotional job is to say *you are here, and I am paying attention, right now* — not *I am preparing to lose you*.

It serves **anticipatory grief**: the love and fear that arrive in the room before the loss does. The owner is not bereaved yet. They are something harder to name — grateful and frightened at once. The book lets them put the gratitude somewhere.

**The later memorial path (build this in from day one).** Because the order is captured as structured input, the *same* book can be re-rendered later — when the pet does die — as a finished memorial, by flipping the existing death-type and belief-frame toggles the catalog already carries. The customer story is powerful and quiet: *we already made the book; now we finish it.* No re-purchase of the inputs, no re-upload of the photo, no starting over in the worst week of their life. (See [Variants quick reference](#variants-quick-reference) and [Pipeline fit & build notes](#pipeline-fit--build-notes).)

---

## Market rationale & demand evidence

**Ranked #3 in the catalog research — the biggest market-expanding concept, and the least competed lane found.**

Every "pet loss" product on the market sells to the small pool of owners whose pet *has just died*. Story 6 sells to the enormous pool of owners whose pet is *still alive but aging or diagnosed* — a pool larger by orders of magnitude, reached earlier, at the exact moment the feeling first lands. Almost no one sells a keepsake into this moment. The grief-care field, however, already treats it as a real, named, paid category:

- **Lap of Love** — the largest in-home veterinary hospice and euthanasia network in the US — treats **anticipatory grief** as a named, paid service line: dedicated specialty support groups (**$15/session**) and an explicit definition of the experience: *"Anticipatory grief occurs prior to actually losing your pet… fear, guilt, anxiety, frustration."* ([lapoflove.com/pet-loss-support-resources](https://www.lapoflove.com/pet-loss-support-resources))
- **dvm360** — a clinical publication for veterinary practitioners — runs practitioner education on recognizing and supporting **anticipatory grief in pet owners**, framing it as a normal, addressable part of end-of-life care that clinics encounter constantly. ([dvm360.com/view/understanding-anticipatory-grief-in-pet-owners](https://www.dvm360.com/view/understanding-anticipatory-grief-in-pet-owners))

The signal: clinicians and hospice providers already *name* this audience, *charge* for supporting them, and *route* them to resources — but the resources are sessions and support groups, not a keepsake the owner gets to keep. That is the gap. Our pet-likeness-from-one-photo (vs. competitors' generic breed pickers) is the differentiator that makes a living tribute feel like *this* animal, not a stock dog.

**Strategic read:** highest market-expansion potential in the catalog (living pets ≫ just-died pets), lowest direct competition, and a built-in second sale (the memorial re-render) that arrives later for free.

---

## Pipeline fit & build notes

Per [new-book-playbook.md](../new-book-playbook.md), this is an **authoring-mostly, low–medium build**. It reuses the Story-1 narrative layout set; the work is text, wizard fields, and prompt copy — not plumbing.

**Layouts — no new `PageLayout` needed.** Reuses the existing Story-1 primitives only:

| Story 6 page | Reused layout |
|--------------|---------------|
| Cover | `cover` |
| Page 1 — dedication | `dedication` |
| Page 2 — who you are to me | `narrative` |
| Page 3 — our ordinary days | `narrative` |
| Page 4 — the things only you do | `narrative` |
| Page 5 — what this season is | `love` |
| Page 6 — you are here now | `love` |
| Back cover — a page to keep | `back-cover` |

> **Do NOT reuse the `truth` (death) layout in the default living path.** The whole point is that this book does not contain a death page. The `truth` layout enters only via the later memorial re-render (below), which converts this order into the Story-1 / memorial treatment through the existing toggles — it is never part of the living tribute itself.

**Illustration slots — 7** (cover portrait + 6 scene illustrations, one per inner page; the back cover is a writing page with a decorative border, not a generated scene — same rule as Story 1, where `back-cover` is excluded). State this exact count in the registry's `illustrationSlots` and let the catalog's `illustrationCount` derive from it (never hardcode). At Low tier, 7 images ≈ $0.04–0.05 per book.

**Slot list (book order):** `cover`, `page-2`, `page-3`, `page-4`, `page-5`, `page-6` — plus the cover portrait counts as the cover slot, so the seven generated images are: cover portrait + pages 2–6 (five scenes) + the dedication portrait on page 1. (Page 1 reuses the Story-1 dedication single-portrait treatment, which *is* an illustrated slot in Story 1; keep that here.)

**Wizard fields.** Mostly reused from existing books (see [Merge fields](#merge-fields)). New fields are few:
- `AGE_OR_STAGE` (e.g. "13 years young", "a grand old senior", "almost fifteen") — drives the season-of-life framing on Pages 5/6.
- `STILL_LOVES` — what the pet *still* loves to do *now* (present tense; distinct from a past favorite). Carries Page 3.
- `TRANSITION_FRAME` toggle (default `still-here` / optional `road-ahead`) — see Variants.

**Build effort:** low–medium. Author `lib/story/story6/{master-text,variants,merge,editable-fields}.ts`, a thin `lib/story/story-6.ts` `StoryDefinition`, a `tributePdfFilename()` in `lib/pdf/filename.ts`, a `STORY_6_STEPS` wizard config, the `StoryType`/`Story6PageId` additions, the catalog entry, the LS variant env var, and Low-tier samples. **No new `PageLayout`, no new renderer case, no CSS** (Playbook Step 3 is skipped). All existing books stay byte-identical.

**The memorial re-render path (wire it in, don't defer it).** Story 6's session shape should carry the same death-type / belief-frame toggle *fields* the memorial books use, defaulted to "not yet / living". When the owner returns after the pet dies, the order re-resolves through the memorial registry entry (or a `memorialOf` flag that swaps `resolve` to the Story-1 treatment) using the already-captured inputs + photo. Reuse, not rebuild: see [The reuse guarantee](../new-book-playbook.md#the-reuse-guarantee) — it all flows by id.

---

## Merge fields

Reuse existing field names wherever the data already exists; new fields are marked **NEW**.

| Field | Source | Example |
|-------|--------|---------|
| `[PET_NAME]` | Customer input | "Biscuit" |
| `[PET_NICKNAMES]` | Optional, up to 3 | "Biscuit", "Bis", "the old man" |
| `[SPECIES]` | Dropdown | "dog" |
| `[SPECIES_DESCRIPTOR]` | Auto-mapped | "good boy", "sweet girl", "kitty", "bunny" |
| `[BREED_COLOR]` | Customer input | "a golden retriever gone soft and silver at the muzzle" |
| `[PRONOUN_SUBJECT]` | Dropdown | "he" / "she" / "they" |
| `[PRONOUN_OBJECT]` | Auto-mapped | "him" / "her" / "them" |
| `[PRONOUN_POSSESSIVE]` | Auto-mapped | "his" / "her" / "their" |
| `[OWNER_NAMES]` | Customer input | "Sarah" or "Sarah and David" |
| `[AGE_OR_STAGE]` | **NEW** — input | "13 years young", "a grand old senior" |
| `[QUIRKS]` | Customer input, 1–3 sentences | "the way you sigh like a person when you lie down" |
| `[STILL_LOVES]` | **NEW** — input, present tense | "still waits at the window every afternoon at four" |
| `[FAVORITE_ACTIVITY]` | Customer input | "the slow morning walk we still take, just shorter now" |
| `[FAVORITE_RITUAL]` | Customer input | "the cup of coffee I drink with my hand on your back" |
| `[SLEEPING_SPOT]` | Customer input | "the warm square of sun by the back door" |
| `[FAVORITE_SPOTS]` | Customer input — 1–3 | "the back step at four o'clock, where the light is" |
| `[DATE_ADOPTED]` | Optional | "Spring 2013" |
| `[OWNER_MESSAGE]` | **NEW** — Optional free-text | A line the owner wants to say to the pet, printed on the dedication |

**Special-case toggles** (collected via a short, gently-worded follow-up):
- `[TRANSITION_FRAME]`: **NEW** — `still-here` (default) / `road-ahead` — sets the register of Page 5. Default celebrates the present and never looks past it; `road-ahead` adds a single, plain, forward-looking sentence for owners holding a terminal diagnosis. **Even in `road-ahead`, the dominant register is gratitude for a life still being lived.**
- `[SPECIES]` voice tweaks — small adjustments to Pages 3/4 (cat stillness, rabbit binky, bird song).
- `[OTHER_PETS_IN_HOME]`: yes / no — optionally adds a line on Page 4.

**Memorial-conversion fields (carried, dormant in the living book):**
- `[DEATH_TYPE]`, `[BELIEF_FRAME]` — present in the session but unused while the book is a living tribute; activated only by the later memorial re-render.

---

## Story arc (why this structure works for a living tribute)

The arc is built to celebrate a present bond, honor the season of life honestly, and end on gratitude and presence — **not** on loss.

1. **Name the present, in present tense** (Cover, Page 1). The first thing the book establishes is that the pet *is here*. The tense never drifts to the past.
2. **Say what they are to you, now** (Page 2). Before anything tender about time, anchor the bond as a living fact.
3. **Hold the ordinary days** (Page 3). Anticipatory grief sharpens the small things — the four-o'clock window, the shorter walk. The book honors exactly those.
4. **Catalog the irreplaceable specifics** (Page 4). The quirks that make *this* animal this animal. This is where the likeness-from-photo and the customer's own words do their work.
5. **Name the season — gently, plainly, gratefully** (Page 5). This is the page that distinguishes the product. It acknowledges that time is precious *because* it is finite, without saying the pet is leaving. Gratitude carries it; the future is touched only in the `road-ahead` variant, and only once.
6. **Return to presence** (Page 6). Pull back from the season to the room: *you are here now, and so am I.* Love as a present-tense fact, not a future loss.
7. **Give the owner a page to keep** (Back cover). A place to write — the ritual that turns a keepsake into a practice. The owner can add to it while the pet is still here, and after.

The book should take 4–5 minutes to read aloud and should feel, on the last page, like the owner has *spent time with their pet on purpose* — which is exactly the thing anticipatory grief asks for and rarely gets.

---

## Page-by-page master text

> **Notation:** Regular type is published wording. *Italic notes* are for the ghostwriter/designer. Default voice is the adult, restrained Quietly Kept register (closer to Story 2 than to Story 1) — but this is a **narrative book**, not a letter; the narrator speaks *to* and *about* the pet, present tense throughout. Default tone assumes `[TRANSITION_FRAME] = still-here`.

---

### COVER

**Title (large, hand-lettered serif feel):**
While You're Still Here, [PET_NAME]

**Subtitle (smaller, italic):**
A book for the time we have

*Illustration brief:* [PET_NAME] (a [BREED_COLOR] [SPECIES]) in warm late-afternoon light, settled and at ease — looking toward the viewer with the soft, unhurried gaze of an older animal who is exactly where they want to be. Golden hour, cream-warm palette, watercolor. This is a *celebration* portrait, not a goodbye portrait: the pet should look content and present, not frail and not sad. Render the actual pet from the uploaded photo — coat, markings, the grey at the muzzle if it's there. The grey is allowed; the sadness is not.

---

### PAGE 1 — Dedication

For [PET_NAME],
who is here.

*Optional:* [OWNER_MESSAGE] *(if the owner provided a line, printed below in a smaller, distinct typeface)*

— [OWNER_NAMES]

*Illustration brief:* Single quiet portrait of [PET_NAME] alone, soft watercolor wash border (the Story-1 dedication treatment). The pet as they are right now — themselves, present, looking softly toward the reader. Same likeness as the cover, calmer composition.

*Variant ([OWNER_MESSAGE] = blank):* Drop the optional line and the em dash entirely; the dedication stands on the two opening lines and "— [OWNER_NAMES]".

---

### PAGE 2 — Who You Are to Me

This is [PET_NAME].

[PET_NAME] is a [BREED_COLOR], and [PRONOUN_SUBJECT] is [AGE_OR_STAGE].

[PRONOUN_SUBJECT] is not a thing that happened to me. [PRONOUN_SUBJECT] is part of how my days are shaped — the first sound in the morning, the weight against the couch in the evening, the reason I look up from what I'm doing.

I want to say it plainly, while I can say it to your face: you are one of the best things in my life.

*Illustration brief:* [PET_NAME] in the home, in a lived-in everyday scene — by the couch, in a doorway, beside the owner's chair. Warm interior light. Body language settled and familiar. The owner may be present only as a hand, a knee, the edge of a sleeve — keep the focus on the pet (and keep human faces out of frame or 3/4, per the style guide).

*Species variant — cat:* "…the quiet that says you know I'm in the room. The weight that arrives on the bed at exactly the wrong hour and is forgiven every time."

*Variant ([AGE_OR_STAGE] reads very senior, 15+):* append — "You have been with me a long time. Long enough that I can't quite remember the shape of the house before you. I don't want to."

---

### PAGE 3 — Our Ordinary Days

Here is the truth about us: most of it is small.

[FAVORITE_RITUAL]. [STILL_LOVES]. [FAVORITE_ACTIVITY] — slower now than it used to be, and somehow better for it.

I used to think the big days were the ones that counted. The trips, the firsts, the photographs. But it's the ordinary days I'd keep, if I could only keep some. The four o'clock light. Your breathing in the next room. The way the day has a shape because you're in it.

*Illustration brief:* The pet mid-ritual — at the window, on the walk, in the favorite spot named in [STILL_LOVES] / [FAVORITE_SPOTS]. Golden hour, gentle, full of ordinary life. Not action-packed; *present.* This is the "we are still doing this together" image.

*Species variant — rabbit/small mammal:* "…the binky across the floor that's a little lower to the ground these days, and still the funniest thing I see all week."

*Species variant — bird:* "…the song that starts when the light hits the cage, that I would not trade for silence in any house."

*Variant ([STILL_LOVES] = blank):* fall back to "the things you still love — the sun, the sound of the leash, the half-second before you realize it's me at the door."

---

### PAGE 4 — The Things Only You Do

No one else in the world does the things you do.

[QUIRKS]

I notice them more now. The small, specific, ridiculous, entirely-yours things. I used to let them pass without looking. I look now. I am paying attention, on purpose, to exactly who you are.

*Illustration brief:* A close, character-forward portrait or small two-scene composition capturing the pet *being themselves* — the head tilt, the sigh-flop, the particular way they sit. This is the page where the likeness matters most; render the customer's actual pet doing a recognizably-theirs thing. Warm, intimate, slightly closer crop than the other pages.

*Variant ([QUIRKS] = blank or thin):* fall back to "the sounds you make when you settle. The way you find the one warm spot in any room. The look you give me that means more than most of what people say to me all day."

*Variant ([OTHER_PETS_IN_HOME] = yes):* append — "The others in this house know you too. They'll feel the shape of you in the room for a long time. So will I."

---

### PAGE 5 — What This Season Is *(the tender page)*

You're in the gentle part of a long life now. [AGE_OR_STAGE], and slower, and softer at the edges.

I'm not going to pretend I don't notice. But I'm also not going to spend the time we have being afraid of the time we don't.

So this is what I'm choosing instead: to be glad. Glad it was you. Glad it's still you. Glad of every ordinary afternoon that we get to have, for as long as we get to have them.

*Illustration brief:* The most emotionally weighted image after the cover. [PET_NAME] in soft, late, golden light — resting, content, at ease in a favorite spot. This is the `love` layout's hero treatment: warm, slightly dreamlike, *peaceful in a living way* (not the still, eyes-closed "rest" of the memorial books — this pet is awake, breathing, here). Keep it earthly and warm, never elegiac.

*Variant ([TRANSITION_FRAME] = road-ahead):* replace the final paragraph with —
"I know the road ahead is shorter than the one behind us. I'm not going to look away from that. But I'm not going to live there, either. The road still has us on it today. So today, I'm choosing to be glad — glad it was you, glad it's still you, glad of every ordinary afternoon we get, for as long as we get them."
*(This is the only place in the book the future is named. Name it plainly and once. Do not use "passing," "putting to sleep," "losing you," or any euphemism. Do not name death itself on this page in the living book — the road-ahead frame acknowledges finitude without burying the pet.)*

*Variant ([AGE_OR_STAGE] reads not-old-but-diagnosed, e.g. a younger pet with a hard diagnosis):* soften the opener to "You came to a hard turn earlier than either of us expected. [AGE_OR_STAGE], and facing something neither of us chose." Keep the gratitude paragraph unchanged; the celebration register does not bend.

---

### PAGE 6 — You Are Here Now

Here is the most important thing in this whole book.

You are here. Right now, as I write this and as you read it, [PET_NAME] is in this house, in this life, in this exact afternoon.

That's not a small thing. That's the whole thing.

*Illustration brief:* Pull the focus back to the present and the pair. [PET_NAME] beside the owner (owner as silhouette / hand / from behind), both settled into a warm, ordinary, *now* moment — the couch, the back step, the spot by the window. Symbolic but grounded. This is the book's resolution: not love that will survive a loss, but love that is happening, in present tense, today. Strongest warmth of the book.

*Closing line of section (always):*
And I am right here with you.

---

### BACK COVER — A Page to Keep

*Layout:* The Story-1 `back-cover` treatment — a soft-bordered writing space. An editable / printable field the owner can fill by hand or in a PDF editor, now and later.

**Suggested prompt printed at top:**
"A place to write the things about [PET_NAME] I don't want to forget"

*Optional template lines:*
- What [PET_NAME] still loves most: ___________
- The sound I'd know anywhere: ___________
- A small thing [PRONOUN_SUBJECT] did today: ___________
- What I want to remember about this season: ___________

*Illustration brief:* A gentle decorative border only (paw prints, a leaf, a watercolor wash) — quiet enough not to compete with handwriting. No generated scene here.

*Memorial-path note (printed nowhere; for production only):* this same back-cover field is where, after the pet dies, the owner may add a final line. When the order is re-rendered as a memorial, the writing space persists.

---

## Variants quick reference

### Transition frame (the defining toggle)
- **still-here** (default) — celebrate the present; the book never looks past today. Page 5 ends on gratitude with no mention of the future.
- **road-ahead** — for owners holding a terminal/hard diagnosis. Adds a single plain, forward-looking sentence on Page 5 acknowledging that time is finite — *without* euphemism and *without* naming death in the living book. Gratitude still dominates; the future is touched once and never returned to.

### Age or stage
- **Senior (default)** — master text as written.
- **Very senior (15+)** — Page 2 appends the "long enough that I can't remember the house before you" line.
- **Younger pet, hard diagnosis** — Page 5 opener softens to "a hard turn earlier than either of us expected"; the gratitude register is unchanged.

### Species (voice tweaks on Pages 2–4)
- dog (default) / cat / rabbit / small mammal / bird / other. Cat = stillness; rabbit = the lower binky; bird = the song. Keep the tweaks light; the voice is one owner speaking, not a costume.

### Other pets in home
- **yes** — Page 4 appends the "the others in this house know you too" line.
- **no** — omit it.

### Memorial conversion (the second life of this order)
When the pet dies, the same captured order can be re-rendered as a memorial:
- The dormant `[DEATH_TYPE]` and `[BELIEF_FRAME]` toggles activate.
- `resolve` swaps to the memorial treatment (Story-1-style, including the `truth` death page and a closing that honors the loss), reusing the **same photo, pet details, quirks, and rituals already on file**.
- The owner does not re-enter anything. The path is *"we already made the book; now we finish it."*
- This is the only context in which the `truth` (death) layout ever appears for a Story-6 order. It is never part of the living tribute.

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] All merge fields filled — no `[PET_NAME]` or any `[FIELD]` left literal anywhere
- [ ] **Tense is present throughout** — no sentence has slipped into the past tense or spoken of the pet as gone (the single most important check for this product)
- [ ] Pronouns consistent across all pages
- [ ] Species, breed, color, and the grey-at-the-muzzle markings match across all illustrations and the uploaded photo
- [ ] `[TRANSITION_FRAME]` variant applied to Page 5 correctly; if `road-ahead`, the future is named once, plainly, with no euphemism
- [ ] `[AGE_OR_STAGE]` and species variants applied
- [ ] Page 4 quirks read as clean sentences (fix typos in customer free-text without changing meaning)
- [ ] No death page in the living book (the `truth` layout must NOT be present unless this is a memorial re-render)
- [ ] Read aloud start to finish — does it feel like *celebrating a pet who is here*, never like *pre-grieving*?
- [ ] Final PDF is 8.5" × 11", at least 300 DPI, on cream/warm paper
- [ ] File named: `While-Youre-Still-Here-[PET_NAME].pdf`
- [ ] Memorial-conversion fields (`[DEATH_TYPE]`, `[BELIEF_FRAME]`) captured and stored, even though dormant

---

## Quality bar / what to avoid

**The one rule above all others: celebrate, never pre-bury.** Every sentence must read as written *to a pet who is alive*. If a line would make the owner feel they have already started saying goodbye, cut it. The book is for the time they still have, not the time they're about to lose.

**Never:**
- Drift into the past tense, or speak of the pet as gone — this book is present tense, always
- Use "passed away," "put to sleep," "lost," "crossing over," "rainbow bridge," "going to a better place," or "watching over you"
- Use "fur baby"
- Frame the book as preparation for loss, a goodbye, or a "last chance" — it is a celebration of presence
- Name death in the living path (the `road-ahead` variant acknowledges that time is finite; it does not announce the pet's death)
- Promise the pet will "always be with" the owner in a way that overpromises an afterlife
- Quote songs, poems, or scripture; use emojis or icons in the text
- Make the illustrations frail, clinical, or elegiac — the pet is content and present, grey allowed, sadness not
- Tell the owner how to feel ("don't be afraid," "be grateful") as an instruction — *model* gratitude in the narrator's voice instead

**Always:**
- Stay in present tense
- Honor the small, ordinary, still-happening things — anticipatory grief lives there
- Use the pet's name and the customer's specific quirks/rituals — specificity is what makes a living tribute feel like *this* animal
- Let gratitude carry the emotional weight, especially on Pages 5–6
- End on presence — "you are here now," not "you will be missed"
- Treat the owner as someone choosing to spend time with their pet on purpose, and give them a book that honors that choice

---

## Illustration & typography style guide

For an adult keepsake the owner will hold while their pet is still beside them — and may frame or reread for years.

- **Style options offered:** soft watercolor (default), gentle storybook, pencil sketch. Watercolor is strongly recommended here — it reads as tender without reading as sad.
- **Palette:** warm pastels, **golden-hour light throughout**, cream and amber and dusty rose, no harsh contrasts, no pure black, no clinical white.
- **Mood:** content, present, unhurried. An older animal at ease in a favorite spot. The grey muzzle, the cloudier eye, the slower posture are welcome — they are part of who the pet *is now* — but the overall feeling is warmth and life, never frailty or farewell.
- **Pet consistency (the differentiator):** same breed markings, eye color, body posture, and the actual signs of age across every page. Lock a reference illustration from the uploaded photo before generating any page art — our likeness-from-one-photo is the whole reason this beats a competitor's breed picker. The owner must look at the book and see *their* animal, this week, not a stock senior dog.
- **Owner rendering:** keep any human presence to a hand, a knee, a silhouette, or 3/4 / from-behind — never a detailed face. The book belongs to the pet.
- **Avoid:** photographic realism, bright primary colors, anything clipart-like, and any composition that reads as a memorial (no candles, no urns, no "rest in peace" iconography, no eyes-closed lifeless poses).

**Typography (adult-keepsake register, reusing the house fonts):**
- Body: Lora, 12–13pt, generous leading (~1.6–1.7) — restrained, literary.
- Display / cover / hero lines: Fraunces (the house display face), italic on the cover title.
- Paper: cream / off-white (`--paper`, never pure white).
- No page numbers on the inner pages beyond the house default; ornament kept minimal. The form is reverent but warm.

---

## Customer-facing description (for product page)

> An 8-page personalized keepsake for a pet who is still with you — a senior companion, or one facing a hard diagnosis. *While You're Still Here* celebrates your pet and your bond in the present tense, while you can still hold the book beside them.
>
> Illustrated from a photo of your actual pet — their real coat, their real grey muzzle, their real face — in soft watercolor across every page. Customized with your pet's name, the ordinary rituals that are only yours, and the small things only they do.
>
> Written gently, honestly, and with love — for the time you have, not the time you're afraid of losing. Delivered as a print-ready PDF, lovingly hand-finished, within 24–48 hours.
>
> *And if the day comes when you need it to, this same book can be finished as a memorial — your pet's photo and story already kept safe, so you never have to start over.*

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Standard** | **$32–35** | Full 8-page illustrated living-tribute PDF, pet illustrated from your photo, all customization |
| Later add-on | (TBD with PM) | Memorial re-render of the same order when the pet dies |

**Recommendation: $32–35 PDF.** This is priced at the top of the catalog's PDF band, justified by: the highest emotional weight of any product, a genuinely differentiated and almost-uncontested concept, the photo-likeness differentiator, and the built-in second-sale (memorial re-render) that raises lifetime value. Confirm the exact number with the PM before configuring the Lemon Squeezy variant; the catalog `priceUsd` (cents) and the LS variant price must agree.

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where I'd most welcome a specialist's edit:

1. **The whole tonal tightrope** — **a grief counselor with anticipatory-grief experience should verify that this book celebrates without pre-grieving.** This is the single highest-stakes review in the catalog: the failure mode is a book that makes a frightened owner feel they have started saying goodbye. Read every page asking "does this honor a *living* pet, or mourn one early?" Lap of Love and dvm360 (cited above) are the right framing; their practitioners would be ideal reviewers.
2. **Page 5 (what this season is)** — the defining page. Does the `still-here` default truly never look past today? Does the `road-ahead` variant name finitude *once*, plainly, without euphemism and without burying the pet? This page is where the product lives or dies.
3. **Present tense discipline** — read the whole book aloud listening only for tense. A single past-tense slip ("she loved") breaks the entire premise. Flag any sentence that could be misread as past.
4. **The road-ahead frame** — for owners with a terminal diagnosis, is one forward-looking sentence the right dose? Too little may feel like denial; too much tips into the memorial register the product is explicitly avoiding.
5. **The memorial-conversion copy** — is "we already made the book; now we finish it" the right way to surface this, or does mentioning it at all (even softly, in the product description) intrude on the celebration? Consider whether it belongs only in post-purchase / follow-up, not on the sales page.
6. **Fallback lines** — Pages 3 and 4 lean on `[STILL_LOVES]` and `[QUIRKS]`. The fallbacks must carry the page when input is sparse. Are they strong enough?

**Total ghostwriter + reviewer budget guidance:** $250–400. The anticipatory-grief review is non-negotiable; budget for a counselor's hour specifically on the celebrate-vs-pre-grieve question.
