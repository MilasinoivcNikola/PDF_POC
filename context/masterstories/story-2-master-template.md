# Story 2 Master Template — "A Letter from [PET_NAME]"

> **Product:** Adult keepsake — personalized PDF letter, frameable
> **Length:** 6 pages (1 cover + 5 letter pages)
> **Purpose:** A letter written from the pet's perspective at the Rainbow Bridge, delivered to the grieving owner. The "make me cry" product.
> **Status:** Working v1 draft — to be refined by a copy editor and a grief counselor before launch
> **Last updated:** June 6, 2026

---

## How this product is different from Story 1

| Dimension | Story 1 (Saying Goodbye) | Story 2 (A Letter) |
|-----------|--------------------------|---------------------|
| Audience | Child (4-12) | Adult owner |
| Use | Read aloud to help a child grieve | Read once and cry; then frame and keep |
| Voice | Third-person narrator | First-person — the pet "speaking" |
| Tone | Gentle, instructive, age-appropriate | Literary, intimate, emotionally direct |
| Format | Illustrated picture book | Typeset letter, designed to be framed |
| Buyer intent | Practical (need a tool tonight) | Emotional (need to feel close to them again) |
| Buyer type | Often parent of grieving child | Often the primary owner; also common sympathy gift |

This is the **emotional flagship** of the catalog. Where Story 1 wins on usefulness, Story 2 wins on feeling. Reviews on Story 2 should read "I sobbed for an hour and then I framed it." If they don't, the writing isn't doing its job.

---

## How to use this document

This is the master text. Each order substitutes the merge fields below into the page-by-page text, applies the relevant variants (relationship type, death type, belief frame, species), and generates a typeset PDF designed for printing on 8.5" × 11" matte cardstock at home or at a print shop.

Typography matters more here than in Story 1. The letter must feel like something that belongs in a frame. Recommended typesetting in InDesign with a refined serif (Cormorant Garamond, Lora, or EB Garamond) — never Comic Sans or anything cute. The form is reverent.

**Hire a copy editor and a grief counselor to review** before launch. Sample budget: $150-250 total. This product has a much higher writing bar than Story 1 — every sentence has to earn its place.

---

## Merge fields

| Field | Source | Example |
|-------|--------|---------|
| `[PET_NAME]` | Customer input | "Murphy" |
| `[PET_NICKNAMES]` | Optional, up to 3 | "Murph", "Mr. Murph", "the worst dog" |
| `[SPECIES]` | Dropdown | "dog" |
| `[BREED]` | Customer input | "rescue mutt with the lopsided grin" |
| `[OWNER_NAMES]` | Customer input | "Sarah" or "Sarah and David" or "Mom" |
| `[RELATIONSHIP_TYPE]` | Dropdown: single / couple / family | Drives second-person addressing |
| `[FAVORITE_SPOTS]` | Customer input — 1-3 spots | "the spot by the back door where the sun hit at 4pm" |
| `[QUIRKS]` | Free text, 1-3 sentences | "the way you tilted your head when I said your name" |
| `[FAVORITE_RITUAL]` | Customer input | "our walk before coffee, every morning" |
| `[DATE_ADOPTED]` | Optional | "March 2014" or "Spring 2014" |
| `[DATE_PASSED]` | Optional | "October 2025" |
| `[PRONOUN_FIRST]` | Pet self-reference | "I" (always) |
| `[OWNER_PRONOUN]` | Auto from relationship type | "you" |

**Special-case toggles** (collected via short follow-up question at checkout):
- `[DEATH_TYPE]`: peaceful / illness / sudden / euthanasia — adjusts Page 4
- `[BELIEF_FRAME]`: rainbow-bridge (default) / heaven / secular — adjusts Page 5
- `[GIFT_FOR]`: self / friend — adjusts cover wording if gift
- `[NEW_PET]`: yes / no — adjusts Page 6 closing

---

## The voice — read this before writing anything

The single hardest thing about this product is the voice. The pet has to sound like a pet who somehow gained words — not a human pretending to be a pet, and not a Hallmark card.

**The pet's voice should:**
- Be simple. Pets are not philosophical. Short sentences, direct.
- Notice small physical things — smells, sounds, the back of a knee, the weight of a hand
- Have warm humor where appropriate ("I knew about the cookies you didn't share")
- Acknowledge imperfections honestly (the chewed shoe, the accident on the rug, the bark at nothing)
- Be matter-of-fact about death, not dramatic
- Express love through specifics, never through abstractions
- Sound a little wiser than they were in life, but not preachy
- Never instruct the owner. Permit, don't prescribe.

**The pet's voice should NOT:**
- Quote anything ("As they say, grief is the price of love…") — no quotations
- Use big philosophical words ("transcendence," "essence," "eternal")
- Promise things the writing can't deliver ("I'll be waiting for you")
- Sound like a Hallmark card ("rainbow bridge over a meadow of forever")
- Lecture the owner on how to grieve
- Apologize for being "just a dog/cat" — but can acknowledge the love was real

The benchmark to aim for: the writing of Mary Oliver's dog poems. Plainspoken, specific, warm, true. If a sentence sounds like it could be on a sympathy card from a drugstore, cut it.

---

## Page-by-page master text

> Default voice below assumes a dog speaking. Species variants for cat, rabbit, bird, horse, and small mammal follow each page. Default `[RELATIONSHIP_TYPE]` is single owner; couple/family variants noted.

---

### PAGE 1 — Cover / Title

**Title (large, classical serif, centered):**
A Letter from [PET_NAME]

**Subtitle (smaller, italic):**
for [OWNER_NAMES]

*Optional, smaller still, at bottom of page:*
[DATE_ADOPTED] — [DATE_PASSED]

*Illustration brief:* A single understated element. Options offered to customer:
1. A simple watercolor paw print
2. A soft silhouette of the pet, looking back
3. A blank space with only the title (most elegant; recommended for framers)

The cover should look like the cover of a book of poems, not a children's product. White space is the design.

---

### PAGE 2 — Opening

Dear [OWNER_NAMES],

If I could have held a pen, this is the letter I would have written you.

I didn't have words while I was with you. I had something better — eyes that knew when you were sad, ears that heard your car before anyone else's, and a heart that was always, always pointed at you.

But now I have something like words. And there are things I want you to know.

*Illustration brief:* None on this page, OR a very small ornamental element in the corner — a leaf, a curl. The text is the design.

*Variant for [RELATIONSHIP_TYPE] = couple ("Sarah and David"):*
"Dear Sarah and David,
If I could have held a pen, this is the letter I would have written you both.
I didn't have words while I was with you. I had something better — eyes that knew which of you needed me on any given day, ears that heard both cars before anyone else's, and a heart that was always, always pointed at you both."

*Variant for [GIFT_FOR] = friend (sympathy gift context):*
The letter is still written *to* the bereaved owner; the gift-giver's name appears only on a small inscription at the bottom of the dedication card (separate page, not printed in the letter). The pet's letter is always to the owner.

*Variant for [SPECIES] = cat:*
"…I had something better — eyes that knew when you were sad, the kind of stillness that said I knew you were there, and a heart that was always, always pointed at you (even when I pretended otherwise)."

---

### PAGE 3 — Gratitude (the "I noticed" page)

I want you to know that I noticed everything.

I noticed when you came home tired and sat on the floor with me instead of changing your clothes. I noticed when you talked to me in your real voice — the one nobody else got to hear. I noticed [QUIRKS].

I noticed [FAVORITE_RITUAL]. That was the best part of every day. Both of ours.

I want you to know that I was happy. Not just fine. Not just okay. Happy — the kind that runs in circles for no reason and doesn't need explaining. You gave me that. That was you.

*Illustration brief:* Optional small element — a hand-drawn line drawing of the pet doing one specific thing from the ritual. Sketch style, not full color. Should feel like a margin doodle, not a feature illustration. Best version may have no illustration at all.

*Species variant — cat:* "the kind of happy that loaf-shapes in a sunbeam and decides nothing else needs to happen today."

*Species variant — rabbit/small mammal:* "the kind of happy that binkies across the floor for no reason at all."

*Species variant — bird:* "the kind of happy that sings when nobody asked."

*Species variant — horse:* "the kind of happy that runs the fence line and then comes back to you."

*If [QUIRKS] is blank or shallow:* fall back to "the way you always saved a bite for me, even when you said you wouldn't. The way you used my full name when you were pretending to be mad. The way your hand found my head without looking."

---

### PAGE 4 — The Goodbye (the "I know" page)

I know how it ended.

I know what it cost you. I know you wondered, in the dark hours after, whether there was something you missed. Whether there was something you could have done differently.

There wasn't.

I was loved every day of my life. I was warm, and full, and safe, and known. There is nothing more any of us can ask for.

*Variant for [DEATH_TYPE] = euthanasia:*
"I know what it cost you to make the choice you made for me. I know you carried it home alone in your chest, and you carry it still. But I want to tell you: it was the kindest thing anyone has ever done for me. You loved me enough to let me go, when staying would have meant hurting. That is the bravest love there is."

*Variant for [DEATH_TYPE] = sudden:*
"I know we didn't get the goodbye we wanted. I know it happened too fast, and you keep replaying the last morning, looking for something you missed. Stop. There was nothing. The last thing I felt was being loved. That's enough. That's everything."

*Variant for [DEATH_TYPE] = illness (long):*
"I know how hard those last months were on you — the medicine, the watching, the worrying. I want you to know that what I felt was not the pain. What I felt was you, beside me, choosing to stay through the hard part. That is what I will remember."

*Variant for [DEATH_TYPE] = peaceful (old age, gentle):*
"I had a long, good life. The end was as soft as you could have made it. There is nothing about it that needs forgiving."

*Illustration brief:* None on this page. The white space is the point. The reader needs the room to feel this one.

---

### PAGE 5 — Where I Am Now

*Default variant ([BELIEF_FRAME] = rainbow-bridge):*

Wherever I am now — and there is a *now*, somewhere — I am not tired. I am not hurting. My body moves the way it did when I was three years old. The sun feels good on my back. Somewhere there is always [FAVORITE_SPOTS].

I think of you the way I always did. Constantly, and without complication.

*Variant ([BELIEF_FRAME] = heaven):*

Wherever I am now, I am not tired. I am not hurting. The body that wore out at the end is not the body I have here. The sun feels good. Somewhere there is always [FAVORITE_SPOTS]. And whatever heaven turns out to be, it has a room for me — and someday, when it's time, a room beside me for you.

*Variant ([BELIEF_FRAME] = secular):*

I'm not anywhere now. Not the way I used to be.

But here is the strange and true thing: I am in [FAVORITE_SPOTS], because that's where you'll feel me. I am in the sound the leash made on the hook. I am in the half-second before you remember I'm not there to greet you. I am in the way your hand still goes to the spot on the couch.

I am where you keep me. That is more than enough.

*Illustration brief:* Optional, minimal. For rainbow-bridge/heaven variants — a soft watercolor wash of a meadow or sunlit landscape, abstract, no figure. For secular — a single watercolor object that represents the pet's presence (a leash hook, a blanket, an empty bed by a window).

---

### PAGE 6 — Closing

So here is what I want for you.

Be sad. Be sad for exactly as long as you need to be. Don't let anyone tell you I was "just a [SPECIES]." They didn't know me, and they didn't know us.

But then, when you're ready — and only when you're ready — be happy again. Laugh at something stupid. Eat something good. Take a walk and notice the things I used to notice with you. The smell of grass after rain. The way the light moves in the late afternoon. The dog two houses down who barks at nothing.

*Variant for [NEW_PET] = yes (toggle for customers who plan to / have already adopted again):*
"And if, one day, you let another animal sleep in [FAVORITE_SPOTS] — that's okay too. I left my warmth there for them. There's room. Loving them won't replace me. It can't. It just means your heart is doing exactly what it was built to do."

*Default ending (always included):*

I loved you. I always did. I always will, as much as a [SPECIES] can love — which, it turns out, is a lot.

Yours, always,
**[PET_NAME]**
*([PET_NICKNAMES] — if provided, in smaller italic)*

*Illustration brief:* Below the signature, a single small paw print in watercolor (offered in 3 styles: dog/cat-shaped, rabbit-shaped, bird-foot). Optional: a hand-drawn signature flourish.

If [DATE_ADOPTED] and [DATE_PASSED] are provided, they appear here, very small, centered below the signature:
*[DATE_ADOPTED] — [DATE_PASSED]*

---

## Variants quick reference

### Relationship type
- **single:** "Dear [NAME]," — second-person singular throughout
- **couple:** "Dear [NAME_1] and [NAME_2]," — adjust collective pronouns ("you both")
- **family:** "Dear [FAMILY_NAME] family," — handle the children carefully; this variant is rarely chosen but should exist. May be better redirected to Story 1.

### Death type
- **peaceful** (old age, expected) — default tone, minimal "I know" framing
- **illness** (long decline) — acknowledge the caretaking burden
- **sudden** — address the no-goodbye trauma directly
- **euthanasia** — directly absolve, name the courage of the choice

### Belief frame
- **rainbow-bridge** (default) — soft, secular-spiritual
- **heaven** — explicitly religious, room for reunion
- **secular** — no afterlife claims; comfort comes from memory and presence

### Species (voice tweaks on Pages 3 and 6)
- dog / cat / rabbit / bird / horse / small mammal / reptile / other

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] All merge fields filled — no `[PET_NAME]` left literal anywhere
- [ ] Pronouns and relationship type consistent across all pages
- [ ] Species voice variants applied on Pages 3 and 6
- [ ] Death-type variant applied to Page 4
- [ ] Belief-frame variant applied to Page 5
- [ ] [QUIRKS] integrated cleanly into Page 3 — does it scan as a sentence?
- [ ] [FAVORITE_SPOTS] appears in Page 5 and Page 6 — does it sound natural?
- [ ] Customer's free-text inputs are grammatically cleaned (fix typos, never change meaning)
- [ ] Read aloud — does each page sound like a person (and a pet) speaking?
- [ ] Final PDF is 8.5" × 11" portrait, 300 DPI, with at least 1" margins for framing
- [ ] Typography is the chosen serif — never sans-serif, never Comic Sans, never cute
- [ ] Each page can stand alone if framed individually
- [ ] File named: `Letter-from-[PET_NAME].pdf`

---

## Quality bar / what to avoid

**Never:**
- Use phrases like "crossed the rainbow bridge," "ran free in heaven," "now an angel watching over you" — clichéd and weakens the writing
- Make the pet sound like a 19th-century novelist ("Verily, I gaze upon thee from afar…")
- Make the pet apologize for being an animal
- Use the word "fur baby"
- End with the pet "watching over" the owner (overpromises; some grief counselors specifically warn against this)
- Quote songs, poems, or scripture
- Use emojis or icons in the text
- Reference specific dates the customer didn't provide
- Speculate on the pet's afterlife beyond what the belief frame specifies
- Be funny on Page 4 (the goodbye page is always still)

**Always:**
- Stay specific — the customer-input quirks are what make the letter feel real. If they're shallow, the writing will be shallow.
- Use short sentences in emotional moments. Long sentences in joyful ones.
- Leave white space. Don't fill every page.
- Honor the form — this is a letter, not a speech and not a poem.
- Sound like the pet had access to one moment of clarity, and used it well.

---

## Typography & layout guide

**Recommended typeface:** Cormorant Garamond (free, Google Fonts), 12-13pt body, 1.5 line spacing.
**Alternative:** Lora (Google), EB Garamond (Google), or for paid: Minion Pro.

**Page setup:**
- 8.5" × 11" portrait
- 1.25" margins (extra room for framing; standard mat openings work)
- Page numbers: none (this is a letter, not a manuscript)
- Header/footer: none on letter pages; small ornamental element on cover only

**Hierarchy:**
- "Dear [OWNER_NAMES]," — same size as body, no bold
- Body — 12-13pt
- Signature ("Yours, always,") — italic
- "[PET_NAME]" signature — same size as body, no bold, possibly with a small hand-drawn flourish
- Dates — 9-10pt, centered

**Color:**
- Black ink on cream or off-white background (never pure white — feels clinical)
- Optional: a single accent color in illustrations only (dusty rose, sage green, slate blue)

**Print specifications offered to customer:**
- Letter size for home printing
- A4 alternative for European customers
- 5" × 7" frame-ready version (text reflowed) as an optional add-on

---

## Customer-facing description (for product page)

> A 6-page personalized letter written from your pet's perspective at the Rainbow Bridge, addressed to you by name. Customized with your pet's quirks, favorite spots, and the rituals that were only yours.
>
> Delivered as a printable PDF within 5 minutes of your order. Designed to be printed on cardstock and framed. Many customers buy two — one for themselves, one for someone who needs it.
>
> Written with care by people who have been on the other side of this.

---

## Pricing reminder

| Tier | Price | Includes |
|------|-------|----------|
| **Basic** | $19 | Text customization only, minimal illustrations |
| **Premium** | $29 | Photo-based illustration of the pet on cover, watercolor wash on belief-frame page |
| **Add-on: Hardcover printed** | +$15-20 margin | Single hardcover folio, fulfilled via Gelato |
| **Add-on: 5×7 frame-ready** | +$5 | Additional sized version for small frames |

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where I'd most welcome specialist edits:

1. **Page 4 (the goodbye)** — the variants for euthanasia and sudden death are emotionally high-stakes. A grief counselor's review is non-negotiable here. Specifically check: does the language absolve the owner without sounding presumptuous about what they felt?

2. **Page 5 (where I am now)** — the secular variant is harder to write than the rainbow-bridge one because it can't lean on imagery. Does it land?

3. **Page 3 (gratitude)** — the writing here is only as good as the customer's `[QUIRKS]` input. The fallback line ("the way your hand found my head without looking") needs to be strong enough to carry the page when customer input is sparse. Consider providing 2-3 stock fallback sentences per species.

4. **Voice consistency** — read the whole letter aloud. Does it sound like one creature speaking? Or does it shift register between pages?

5. **The Mary Oliver test** — does any of this writing earn the right to sit beside Mary Oliver's "Dog Songs" on a bedside table? If not, cut and rewrite.

6. **Length on Page 6 (closing)** — currently this is the longest page. Could it be tightened? Or does the length match the emotional weight of the ending?

**Total ghostwriter + reviewer budget guidance:** $250-400. This is the product reviews will rest on. Spend.
