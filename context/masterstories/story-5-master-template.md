# Story 5 Master Template — "A Letter to [PET_NAME]"

> **Product:** Adult keepsake — personalized PDF letter, frameable. The owner's letter *to* the pet who died.
> **Length:** 6 pages (1 cover + 5 letter pages)
> **Purpose:** A guided letter the grieving owner writes *to* their pet — the things they never got to say, the thank-you, the apology, the last good day, what they're keeping. The "say the thing you didn't get to say" product.
> **Status:** Working v1 draft — spec for build
> **Last updated:** 2026-06-12

---

## Where this sits in the catalog

Story 5 is the **inverse of Story 2**, and its natural companion.

| | Story 2 — *A Letter from [PET_NAME]* | Story 5 — *A Letter to [PET_NAME]* |
|---|--------------------------------------|-------------------------------------|
| Who writes | The pet, from wherever it is now | **The owner**, here, still grieving |
| Who is addressed | The owner, by name | **The pet**, by name |
| Voice | First-person pet ("I noticed everything") | **Second-person owner** ("You always knew") |
| Emotional job | *Be forgiven / be reassured* | **Say what went unsaid / make peace** |
| Buyer intent | Need to feel close to them again | Need to **finish the conversation** |

Story 2 hands the bereaved owner a gift from their pet. Story 5 hands them a **pen** — a structured, dignified way to write back. The two are a deliberate pair, and the sales line is **"one from them, one from you."** Many customers who buy one will want both; the bundle is the upsell (see *Pricing*). The form, typography, and print spec are identical to Story 2 so a framed pair matches on a wall or a shelf.

---

## Market rationale & demand evidence

**Bereaved pet owners already pay money to write letters to their dead pets — as a grief ritual, guided, on a schedule.** This product productizes a ritual that has demonstrated paid demand.

- **Lap of Love** — the national in-home pet hospice and euthanasia network — sells a paid grief offering called **"From My Heart To Yours: A Letter Writing Workshop"**: a **3-week, $65** facilitated program built entirely around writing letters to a pet who has died. People do not pay $65 over three weeks for something they don't need; the unmet need is *structure and permission* to write the letter, which is exactly what our merge-field scaffold provides — for a one-time $29 and a keepsake at the end, not a Zoom call. Source: <https://www.lapoflove.com/pet-loss-support-resources>
- **Etsy "pet memorial book"** returns **1,000+ active listings** — a saturated, validated category for printed/PDF pet keepsakes. Source: <https://www.etsy.com/market/pet_memorial_book>. Story 5 differentiates inside that category on (a) the *owner-voice letter* angle, which the breed-picker / fill-in-blank competitors don't offer, and (b) our **pet-likeness-from-one-photo** illustration, which they can't match.

**Ranking: #2 of the new concepts** (revenue ÷ build effort). Build effort is **very low** — it reuses Story 2's exact layout primitives and illustration shape, so it's almost pure authoring (see *Pipeline fit & build notes*). Revenue is high because it both stands alone *and* increases Story 2's order value as a companion bundle — the rare new title that lifts an existing one instead of competing with it.

---

## Pipeline fit & build notes

This product is intentionally chosen to be the **cheapest possible new title** under the
[new-book playbook](../new-book-playbook.md): it is authoring-only.

**Layout — zero new `PageLayout` primitives.** Reuses Story 2's `letter-cover` (cover) and
`letter` (the 5 body pages) exactly. **Skip playbook Step 3 entirely** — the `renderPage`
switch, `lib/pdf/styles.css`, and `app/globals.css` already render both. No screen↔PDF parity
work, no new geometry token. The only screen-vs-print risk is the one Story 2 already solved.

**Illustration — 2 slots, same shape as Story 2.**
- `letter-cover` — cover portrait of the pet (uses the uploaded photo as reference → watercolor, pet-likeness-from-one-photo, our differentiator).
- One belief/scene wash on the *where-you-are-now* page (Page 5), keyed by `BELIEF_FRAME` — the same prompt family as Story 2's belief wash (a figure-free landscape/object), generated **without** the pet reference.

**Wizard fields — mostly reused, two genuinely new.**

- **Reused as-is** (data already collected for Story 2 / Story 1): `PET_NAME`, `PET_NICKNAMES`, `SPECIES`, `BREED`, `OWNER_NAMES`, `RELATIONSHIP_TYPE`, `QUIRKS`, `FAVORITE_RITUAL`, `FAVORITE_SPOTS`, `DATE_ADOPTED`, `DATE_PASSED`, and the toggles `DEATH_TYPE`, `BELIEF_FRAME`.
- **New** (introduced by this product — list them explicitly so the build wires them):
  - `LAST_GOOD_DAY` — free text, 1–3 sentences. The owner's chosen "last good memory" of the pet. Optional → has a fallback.
  - `WHAT_I_KEEP` — free text, 1–3 short items. The thing(s) the owner is keeping (the collar on the hook, the dent in the couch, the route of the morning walk). Optional → has a fallback.
- **Dropped vs Story 2:** `GIFT_FOR` (a letter *to* the pet is never a sympathy gift to a third party) and `NEW_PET` (the owner's letter doesn't resolve on the "new animal" beat the way the pet's does). Omit them from this book's session/draft shape.

**Build effort: very low.** Per the playbook this is Step 1 (author `lib/story/story5/*`), Step 1a (`Story5PageId` union), Step 2 (registry + `storyType: "story-5"`, reuse `Pet`/`Owner`/letter-memory input groups + a small `Story5Toggles`, add the two new fields), Step 4 (catalog entry, `letterToPdfFilename` → `Letter-to-[PET_NAME].pdf`), Step 5 (LS variant), Step 6 (Low-tier samples). No worker, admin, Supabase, delivery, or state-machine change — the reuse guarantee holds.

**Main product risk: cannibalizing Story 2.** Mitigate in copy and merchandising — present Story 5 as a **companion**, never an alternative. The storefront should cross-link the two and surface the bundle; the order confirmation for either should offer the other at a reduced combined price. Sold as a pair, Story 5 grows the basket; sold as a substitute, it just moves the same revenue around.

---

## Merge fields

| Field | Source | Example | Required? |
|-------|--------|---------|-----------|
| `[PET_NAME]` | Customer input | "Murphy" | **Required** |
| `[PET_NICKNAMES]` | Optional, up to 3 | "Murph", "Mr. Murph", "the worst dog" | Optional — omit line if blank |
| `[SPECIES]` | Dropdown | "dog" | **Required** |
| `[BREED]` | Customer input | "rescue mutt with the lopsided grin" | **Required** |
| `[OWNER_NAMES]` | Customer input | "Sarah" or "Sarah and David" | **Required** |
| `[RELATIONSHIP_TYPE]` | Dropdown: single / couple / family | Drives "I" vs "we" | **Required** (defaults single) |
| `[QUIRKS]` | Free text, 1–3 sentences | "the way you tilted your head when I said your name" | Optional — stock fallback |
| `[FAVORITE_RITUAL]` | Customer input | "our walk before coffee, every morning" | **Required** |
| `[FAVORITE_SPOTS]` | Customer input — 1–3 spots | "the spot by the back door where the sun hit at 4pm" | **Required** |
| `[LAST_GOOD_DAY]` | **New** — free text, 1–3 sentences | "the last good Saturday, when you stole half my toast and slept in the sun all afternoon" | Optional — fallback |
| `[WHAT_I_KEEP]` | **New** — free text, 1–3 items | "your collar on the hook, the dent you left in the couch" | Optional — fallback |
| `[DATE_ADOPTED]` | Optional | "March 2014" | Optional — date line only if BOTH dates present |
| `[DATE_PASSED]` | Optional | "October 2025" | Optional — date line only if BOTH dates present |
| `[OWNER_PRONOUN]` | Auto from relationship type | "I" / "we" | Auto |

**Special-case toggles** (collected via short follow-up question at checkout):
- `[DEATH_TYPE]`: peaceful / illness / sudden / euthanasia — adjusts Page 4 (the apology / "it wasn't your fault" page)
- `[BELIEF_FRAME]`: rainbow-bridge (default) / heaven / secular — adjusts Page 5 (where you are / what I keep)

> **Auto-mapping note:** `[OWNER_PRONOUN]` resolves from `[RELATIONSHIP_TYPE]` — single → "I", couple/family → "we". The page text below is written in the **single ("I")** default; the couple/family variant text is given per page where the first-person reference appears, so this is composed from variant *text*, not a naive find-replace (the same approach Story 2 uses for its couple variant).

---

## The voice — read this before writing anything

Story 5 is the **owner's own voice**, writing to a pet who can no longer hear them — and knowing it. This is harder than it sounds, because the easy version is mawkish. The owner is not performing grief for an audience; they are saying a true thing, in a quiet room, to a name.

**The owner's voice should:**
- Be plainspoken and specific. The love lives in the details the customer gave us — the 4pm sun, the toast, the head-tilt — not in adjectives.
- Use short sentences in the hardest moments (the goodbye, the apology). Let a little more air in on the grateful ones.
- Address the pet directly and warmly — "you," always. Second person is the whole form.
- Be honest about the hard parts: the guilt, the empty hook, the half-second of forgetting they're gone.
- Sound like a real adult who is sad, not like a greeting card. If a line could be machine-stitched on a throw pillow, cut it.
- Be matter-of-fact about death. The word is **"died."**

**The owner's voice should NOT:**
- Use "passed away," "went to sleep," "lost," "crossed the rainbow bridge," "now an angel," or "fur baby." These are banned (see *Quality bar*).
- Promise to "see you again" beyond exactly what the chosen `[BELIEF_FRAME]` permits — and never on the secular frame.
- Quote songs, poems, or scripture.
- Get philosophical or use big words ("essence," "eternal," "transcendence"). The owner is grieving, not lecturing.
- Apologize for *having* an animal, or call the relationship "just a pet."
- Resolve the grief too neatly. The honest ending is "I will carry you," not "and now I'm at peace."

The benchmark, as in Story 2, is **Mary Oliver's dog poems**: plainspoken, specific, warm, true. If a sentence couldn't sit on a bedside table next to *Dog Songs*, rewrite it.

---

## Page-by-page master text

> Default voice below is the **single owner ("I")**. Couple/family ("we") variants are noted per page where the first person appears. Default `[DEATH_TYPE]` is peaceful; default `[BELIEF_FRAME]` is rainbow-bridge.

---

### PAGE 1 — Cover / Title

**Title (large, classical serif, centered):**
A Letter to [PET_NAME]

**Subtitle (smaller, italic):**
from [OWNER_NAMES]

*Optional, smaller still, at bottom of page (only if BOTH dates provided):*
[DATE_ADOPTED] — [DATE_PASSED]

*Illustration brief (`letter-cover` slot):* A single watercolor portrait of [PET_NAME] (a [BREED] [SPECIES]), looking gently toward the reader — generated from the uploaded photo so it reads as *this* animal, not a stand-in. Soft, warm palette; lots of white space around it. The cover should look like the cover of a book of poems, not a product. The portrait should feel like a photograph the owner kept on the mantel — present, alive, themselves.

*Variant for [RELATIONSHIP_TYPE] = couple/family:* subtitle still reads "from [OWNER_NAMES]" (the customer supplies the joined names, e.g. "Sarah and David"). No other change.

---

### PAGE 2 — Opening (the "things I never said" page)

Dear [PET_NAME],

There are things I never said to you. Not because I didn't feel them — I felt all of them, every day — but because you were a [SPECIES], and I thought we had more time, and some things you only learn to say once it's too late to be heard.

So I'm saying them now. To you. Wherever the saying lands.

You died. I keep having to write that down to believe it. The house is the wrong kind of quiet, and my hands keep reaching for things that aren't there anymore — the leash, the door, the warm weight of you.

But you were here. You were so completely here. And before anything else, I want you to know I noticed.

*Illustration brief:* None on this page, OR a very small ornamental element in a corner (a leaf, a curl). The text is the design — let the white space hold the opening.

*Variant for [RELATIONSHIP_TYPE] = couple/family:* "There are things we never said to you… we felt all of them… we thought we had more time… So we're saying them now. … and our hands keep reaching for things that aren't there anymore … But you were here. … we want you to know we noticed."

*Variant for [SPECIES] = cat:* keep as written; the line "I thought we had more time" lands the same. (No cat-specific rewrite needed on this page.)

---

### PAGE 3 — Gratitude (the "thank you for" page)

So, thank you.

Thank you for [FAVORITE_RITUAL]. It was the best part of the day, and I didn't always say so, and I'm saying so now: it was the best part of the day.

Thank you for [QUIRKS]. I would give anything to see it one more time.

Thank you for the small ordinary things that I thought would last forever — for being at the door, for [FAVORITE_SPOTS], for the sound you made that meant you were happy. You made an ordinary life feel like enough. That was you. That was your whole quiet gift.

And thank you for [LAST_GOOD_DAY].

You were a good [SPECIES]. The best one. Mine.

*Illustration brief:* Optional small margin element — a single hand-drawn line of the pet doing one specific thing from the ritual, sketch style, not full color. Best version may have no illustration at all. Let Page 5's wash be the only painted body page.

*Fallback if [QUIRKS] is blank or shallow:* replace the "[QUIRKS]" sentence with — "Thank you for the way you found me without looking, the way you knew which days were the hard ones, the way your name fit you so exactly. I would give anything to see any of it one more time."

*Fallback if [LAST_GOOD_DAY] is blank:* replace the "And thank you for [LAST_GOOD_DAY]." line with — "And thank you for the last good ordinary day, the one I didn't know to memorize." The page must never print a dangling "And thank you for ." fragment.

*Variant for [RELATIONSHIP_TYPE] = couple/family:* "we didn't always say so… we're saying so now… we would give anything… I thought would last forever → we thought would last forever… You made our ordinary life feel like enough… The best one. Ours."

*Species fallback for the "happy sound" clause:*
- cat: "the sound you made that meant the world was, for now, acceptable."
- rabbit/small mammal: "the way you went loose and easy when you finally trusted the room."
- bird: "the song you sang when nobody asked you to."

---

### PAGE 4 — The Confession (the "I'm sorry / it wasn't your fault" page) *(the hard page)*

There is something I have to say, and it's the hardest part of this letter.

I'm sorry.

Not for anything you did — you never did anything wrong, not really, not the chewed shoe or the bark at nothing or the mud you tracked across the whole clean floor. I'd take all of it back a thousand times if it meant one more ordinary morning with you.

I'm sorry for the times I was too busy. The walks I cut short. The nights I was tired and you waited anyway. You forgave me for all of it before I even asked — that was the kind of heart you had. I'm asking now, out loud, so you can hear it: I'm sorry.

And here is the other thing, the one I need you to know more than anything: **it wasn't your fault, and it wasn't mine.** You did not let me down. I did not let you down. We just ran out of time, the way everyone does in the end. What we had was good. What we had was whole.

*Variant for [DEATH_TYPE] = euthanasia:*
"There is something I have to say, and it's the hardest part of this letter.
I made a choice for you at the end. I have carried it every day since — the question of whether it was too soon, or not soon enough, whether I should have done something differently. I need to put it down now, and I need you to help me.
It was the kindest thing I have ever done, and the hardest. I chose it *because* I loved you — because staying would have meant hurting, and I could not let you hurt. Letting you go was not me giving up on you. It was the last act of love I had left to give. You were not alone. You were held, and warm, and known, right to the end. **It wasn't your fault, and it wasn't mine.** It was just love, doing the bravest thing love can do."

*Variant for [DEATH_TYPE] = sudden:*
"There is something I have to say, and it's the hardest part of this letter.
I didn't get to say goodbye. It happened too fast, and I keep going back over the last morning, looking for the thing I missed, the sign I should have seen. I have to stop. There was nothing. You were not afraid for long, and the last thing in your world was that you were loved.
I'm sorry I didn't get to hold you longer at the end. I'm sorry the goodbye got taken from us. But **it wasn't your fault, and it wasn't mine.** Some endings don't give us the chance to be ready. What we had before it was real, and good, and ours, and nothing about how it ended can reach back and take that."

*Variant for [DEATH_TYPE] = illness:*
"There is something I have to say, and it's the hardest part of this letter.
Those last months were long, for both of us — the medicine, the watching, the counting of good days against bad ones. I'm sorry you had to go through any of it. I'm sorry for the moments I got it wrong because I was frightened and tired.
But I stayed. I want you to know that what I hope you felt, through all of it, was not the illness — it was me, right there, choosing to stay through the hard part. **It wasn't your fault, and it wasn't mine.** Your body wore out. That is the only thing that happened. It is not a failure. It is just the price of having gotten to love you at all."

*Illustration brief:* None on this page. The white space is the point — the reader needs the room to feel this one. (This is the apology page; it must never carry a decorative image.)

*Variant for [RELATIONSHIP_TYPE] = couple/family:* shift first person to "we" throughout, but keep the apology personal and direct ("we're sorry… we're asking now… we did not let you down"). On the euthanasia variant, keep "We made a choice for you at the end. We have carried it…" — the absolution must read as shared, not assigned to one person.

---

### PAGE 5 — Where You Are / What I Keep

*Default variant ([BELIEF_FRAME] = rainbow-bridge):*

So where are you now?

I like to think there's a *somewhere* — a sunlit field where your body isn't tired anymore, where you run the way you did when you were young and the day was new. I hope there is always [FAVORITE_SPOTS] there. I hope the sun is always at 4pm.

And here, with me, I'm keeping [WHAT_I_KEEP]. I'm keeping the route of [FAVORITE_RITUAL]. I'm keeping your name, which I will say out loud, because names are meant to be said.

*Variant ([BELIEF_FRAME] = heaven):*

So where are you now?

I believe you are somewhere good — somewhere your body isn't tired anymore, where the sun is warm on your back and there is always [FAVORITE_SPOTS]. I believe you are at peace, and I believe, when it is my time, there is a room there with you in it.

And here, until then, I'm keeping [WHAT_I_KEEP]. I'm keeping the route of [FAVORITE_RITUAL]. I'm keeping your name, which I will say out loud, because names are meant to be said.

*Variant ([BELIEF_FRAME] = secular):*

So where are you now?

You're not anywhere now. Not the way you were. I won't pretend otherwise, even here — you'd have known if I were pretending.

But here is the strange and true thing: you are in [FAVORITE_SPOTS], because that's where I feel you. You're in the half-second before I remember. You're in the dent in the couch, the worn place on the floor, the route of [FAVORITE_RITUAL] that my feet still want to walk. I'm keeping [WHAT_I_KEEP]. I'm keeping all of it. You are where I keep you, and I am going to keep you well.

*Illustration brief (belief wash slot — Page 5):* A soft, abstract watercolor wash — **no animal, no figure, no people**, same family as Story 2's belief wash, generated **without** the pet photo reference. For rainbow-bridge/heaven: a sunlit meadow or warm landscape, gentle light. For secular: a single quiet object that holds presence — a leash on a hook, an empty bed by a window, a worn patch on a floor. Feathered into the cream paper, sitting below the prose; never a full-bleed photo.

*Fallback if [WHAT_I_KEEP] is blank:* drop the "[WHAT_I_KEEP]" clause and lean on the always-present ritual/spots — "I'm keeping the route of [FAVORITE_RITUAL]. I'm keeping the quiet shape of [FAVORITE_SPOTS]. I'm keeping your name…". The page must never print an empty "I'm keeping ." fragment.

*Variant for [RELATIONSHIP_TYPE] = couple/family:* "we like to think… we believe… we're keeping… your name, which we will say out loud."

---

### PAGE 6 — Closing (the "I will carry you" page)

Here is what I want you to know, if any of it reaches you.

You were loved. Not a little. Not in the ordinary way people love the ordinary things in their lives — you were loved the whole way down, every day you were here, including the last one.

I don't know how to be in this house without you yet. I'm learning. Some days I do alright and some days I don't, and on the days I don't, I'm going to do the thing you'd want: I'm going to go outside, and notice the things you taught me to notice — the grass after rain, the light in the late afternoon, the dog two houses down who barks at nothing. I'm going to say your name to people who will listen. I'm going to keep you in the telling.

I will carry you. I will carry you everywhere, for the rest of my life, and it will not be a weight. It will be the opposite of a weight.

Thank you for being mine.

With all my love, always,
**[OWNER_NAMES]**

*Optional, very small, centered below the signature (only if BOTH dates provided):*
*[DATE_ADOPTED] — [DATE_PASSED]*

*Optional, smaller italic below the signature (only if provided):*
*for [PET_NAME] — [PET_NICKNAMES]*

*Illustration brief:* Below the signature, a single small watercolor paw print (offered dog/cat/rabbit/bird-foot variants), or a simple hand-drawn flourish. Optional — the cleanest version is signature alone. No belief wash here; Page 5 carries the only painted body image.

*Variant for [RELATIONSHIP_TYPE] = couple/family:* "we want you to know… you were loved the whole way down… we don't know how to be in this house without you yet. We're learning… we're going to go outside… We will carry you. We will carry you everywhere… Thank you for being ours. With all our love, always, [OWNER_NAMES]."

---

## Variants quick reference

### Relationship type (drives first person throughout)
- **single** (default) — "I" / "me" / "mine"; "Thank you for being mine."
- **couple** — "we" / "us" / "ours"; absolution on Page 4 reads as shared.
- **family** — "we" / "ours"; rarely chosen, but supported. If the family includes a grieving child, consider redirecting to Story 1.

### Death type (Page 4 — the confession/apology page)
- **peaceful** (default) — minimal "I made a choice" framing; the apology is for ordinary missed moments, then "it wasn't your fault, and it wasn't mine."
- **illness** — acknowledge the caretaking burden; absolve; "Your body wore out. That is the only thing that happened."
- **sudden** — address the stolen goodbye directly; absolve the replaying-the-last-morning guilt.
- **euthanasia** — directly absolve the choice; name it as the bravest act of love; "It wasn't your fault, and it wasn't mine."

### Belief frame (Page 5 — where you are / what I keep)
- **rainbow-bridge** (default) — soft, secular-spiritual; a sunlit field, no afterlife claims beyond "I like to think."
- **heaven** — explicitly religious; room for reunion ("when it is my time, there is a room there with you in it").
- **secular** — no afterlife claim; comfort comes from memory, presence, and "what I keep." Never promise reunion on this frame.

### Species (light voice tweaks on Page 3's "happy sound" clause)
- dog (default) / cat / rabbit / small mammal / bird / other — `other` falls back to the species-neutral default line.

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] All merge fields filled — no `[PET_NAME]` or any `[FIELD]` left literal anywhere
- [ ] First person consistent with `[RELATIONSHIP_TYPE]` across all pages ("I" vs "we" never mixed)
- [ ] Death-type variant applied to Page 4 — and it **absolves the owner** (read it as the owner would)
- [ ] Belief-frame variant applied to Page 5; no reunion promise on the secular frame
- [ ] `[FAVORITE_RITUAL]` and `[FAVORITE_SPOTS]` read naturally where they appear (Pages 3 & 5)
- [ ] `[QUIRKS]`, `[LAST_GOOD_DAY]`, `[WHAT_I_KEEP]` fallbacks fire cleanly when input is blank — no dangling fragments
- [ ] Date line on cover and Page 6 appears **only if both dates provided**; never a one-sided dash
- [ ] Customer free-text grammatically cleaned (fix typos, never change meaning)
- [ ] The word "died" appears; none of the banned euphemisms do (grep the output)
- [ ] Read aloud, start to finish — does it sound like one real person speaking to a name?
- [ ] Cover portrait recognizably matches the uploaded photo (pet-likeness check)
- [ ] Final PDF is 8.5" × 11" portrait, 300 DPI, ≥1.25" margins for framing, cream (not pure white) paper
- [ ] Each page can stand alone if framed individually
- [ ] File named: `Letter-to-[PET_NAME].pdf`

---

## Quality bar / what to avoid

**Never:**
- Use "passed away," "went to sleep," "lost," "went away," "crossed the rainbow bridge," "ran free in heaven," "now an angel watching over me/us," or any "watching over" construction
- Use the words "fur baby"
- Have the owner promise to "see you again" beyond what the `[BELIEF_FRAME]` specifies — and **never** on the secular frame
- Quote songs, poems, or scripture
- Use emojis or icons in the text
- Let the apology page (Page 4) carry blame — its job is to *lift* blame, not assign it
- Reference dates the customer didn't provide
- Resolve the grief too neatly ("and now I am at peace") — the honest ending is "I will carry you"
- Be decorative on Page 4 (the confession page is always still — no illustration)
- Make the owner call the relationship "just a [SPECIES]"

**Always:**
- Use the word "died" plainly, once, early (Page 2)
- Stay specific — the customer's ritual, spots, quirks, and kept things are what make it real; the fallbacks must be strong enough to carry a sparse order
- Use short sentences in the hardest moments; let the grateful page breathe
- Address the pet directly — "you," every page
- End on carrying the pet forward, not on closure
- Leave white space. Don't fill every page. Honor the form: this is a letter, not a speech and not a poem.

---

## Typography & layout guide

Identical to Story 2 — the two are a matched pair and should print to the same spec so a framed set agrees on a wall.

**Recommended typeface:** Cormorant Garamond (free, Google Fonts), 12–13pt body, 1.5 line spacing. (In-build we self-host **Lora** for the letter body and **Fraunces** for the cover title, per the existing `letter` layout — same as Story 2.)
**Alternatives:** Lora, EB Garamond.

**Page setup:**
- 8.5" × 11" portrait
- 1.25" margins (room for framing; standard mat openings work)
- Page numbers: **none** (this is a letter)
- Header/footer: none on letter pages; small ornamental element on the cover only

**Hierarchy:**
- "Dear [PET_NAME]," — same size as body, no bold
- Body — 12–13pt
- Sign-off ("With all my love, always,") — italic
- "[OWNER_NAMES]" signature — same size as body, no bold, optional hand-drawn flourish
- Dates / nickname line — 9–10pt, centered, italic

**Color:**
- Black ink on **cream / off-white** (never pure white — pure white reads clinical)
- A single accent color in illustrations only (dusty rose, sage, slate)

**Print specifications offered to customer:**
- Letter size for home printing
- A4 alternative for European customers
- 5" × 7" frame-ready version (text reflowed) as an optional add-on

---

## Customer-facing description (for product page)

> A 6-page personalized letter — written, this time, by *you*. A gentle, guided way to say the things you didn't get to say to [your pet]: the thank-you, the apology that lifts the weight, the last good day, and what you're keeping. We write the connective words with care; you supply the specifics that make it yours.
>
> The companion to *A Letter from [PET_NAME]* — one letter from them, one from you. Customized with your pet's name, your rituals, and your own words, and illustrated with a watercolor portrait painted from your photo.
>
> Delivered as a printable PDF, lovingly hand-finished and emailed within 24–48 hours. Designed to be printed on cardstock and framed. Written with care by people who have been on the other side of this.

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Story 5 — A Letter to [PET_NAME]** | **$29** (PDF) | Full text customization, watercolor cover portrait from your photo, belief-frame wash |
| **Companion bundle — Stories 2 + 5** | **~$49** (recommended; ~15% off vs. $58 separately) | *A Letter from [PET_NAME]* **and** *A Letter to [PET_NAME]* — "one from them, one from you," matching print spec |
| **Add-on: 5×7 frame-ready** | +$5 | Additional sized version for small frames |

**Recommendation:** price the standalone at **$29 PDF** — same as Story 2, since the form, illustration count, and fulfillment effort are identical. The real revenue lever is the **companion bundle**: present Stories 2 and 5 together everywhere, with a single combined price that beats buying both separately. The bundle is the reason this title earns its #2 ranking — it lifts Story 2's basket instead of competing with it. (Confirm the final standalone and bundle numbers with the PM before configuring the Lemon Squeezy variants; the LS price must match the catalog `priceUsd`.)

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where a specialist's edit matters most:

1. **Page 4 (the confession), euthanasia and sudden-death variants** — these are the highest-stakes paragraphs in the product, and the riskiest. A **grief counselor's review is non-negotiable here** (same bar as Story 2's Page 4). Specifically check: does the absolution land without sounding presumptuous about what the owner actually felt? Does "it wasn't your fault, and it wasn't mine" read as relief, or as a thing the owner isn't ready to accept? For euthanasia especially, verify the language does not accidentally re-open the "was it too soon / not soon enough" wound it's trying to close.
2. **Page 2 — the word "died."** It appears early and plainly by design (the grief-literature rule). Confirm it reads as honest rather than blunt in the owner's voice; adjust the surrounding sentences, never the word.
3. **Page 5, secular variant** — the hardest to write because it can't lean on afterlife imagery. Does "you are where I keep you, and I am going to keep you well" earn its place, or is it too neat? It must comfort without claiming anything the frame forbids.
4. **The fallbacks** — Page 3's `[QUIRKS]` fallback and Page 5's `[WHAT_I_KEEP]` fallback have to be strong enough to carry the page when the customer's input is sparse. Read each page *with the fallback substituted in* and judge it as a finished page, not a patch.
5. **Voice consistency** — read the whole letter aloud in the single ("I") and the couple ("we") variants. Does each sound like one consistent person (or couple) the whole way through? The "we" variant is where register tends to slip.
6. **The Mary Oliver test** — does this writing earn the right to sit beside *Dog Songs* on a bedside table? If a line doesn't, cut and rewrite.
7. **Cannibalization check (merchandising, not copy)** — confirm with the PM that the storefront presents Story 5 as a *companion* to Story 2, never an either/or, and that the bundle is surfaced at checkout and in both confirmation emails.

**Total ghostwriter + reviewer budget guidance:** $250–400, with the grief-counselor review on Page 4 as the non-negotiable line item. This product, like Story 2, rests on its writing — spend it.
