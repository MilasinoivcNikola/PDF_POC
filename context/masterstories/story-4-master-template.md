# Story 4 Master Template — "If [PET_NAME] Could Talk"

> **Product:** Adult keepsake — personalized PDF letter in a *living* pet's voice, frameable
> **Length:** 6 pages (1 cover + 5 letter pages)
> **Purpose:** A warm, funny, present-tense letter written from the pet's perspective to the person they love most — what they'd say if they had the words. The "make me smile, then make me cry a little" product. The celebration twin of Story 2.
> **Status:** Working v1 draft — spec for build
> **Last updated:** 2026-06-12

---

## Where this sits in the catalog

Story 4 is the **living/celebration twin of Story 2** ("A Letter from [PET_NAME]"). Same reverent typeset form — a letter you frame and keep — but the pet is **alive**, and the letter is told in the present tense: the joy, the quirks, the daily ridiculous love, written as if the pet got one afternoon of words and spent it telling you the truth about how good this is.

Where Story 2 is a grief product bought in the hardest week of someone's life, Story 4 is bought on a good day — a birthday, a "gotcha day," a Valentine, a just-because. It is the cheerful front door to the same emotional house.

| | Story 2 (A Letter from) | Story 4 (If [PET_NAME] Could Talk) |
|---|---|---|
| Pet | Has **died** | **Alive** (default) |
| Tense | Past, valedictory | **Present**, ongoing |
| Buyer mood | Grieving | Celebrating |
| Trigger | A death | A birthday / gotcha day / gift |
| Form | Typeset framed letter | **Same** typeset framed letter |
| Engine | Story 2's letter engine | **Story 2's letter engine, near-wholesale** |

Crucially, because the market leader sells *one* book that flips between living and memorial use via a single tense toggle, Story 4 carries a **`[LIVING_OR_MEMORIAL]`** toggle (default = **living**). Check the memorial box and the letter is rewritten in past tense for a grieving buyer — so this one product captures both audiences. The default and primary use is **celebration of a living pet**.

---

## Market rationale & demand evidence

This concept is **ranked #1 of the new candidates** on revenue ÷ build effort: it has the strongest market evidence *and* the lowest build cost (it reuses Story 2's letter layout and imagery shape almost wholesale — authoring-only; see *Pipeline fit & build notes*). The demand is proven by incumbents already charging premium prices for a strictly weaker version of it.

**The evidence:**

- **I See Me! — "If My Dog Could Talk"**, sold at **$29.99**, is a dog's-perspective celebration book and the clearest direct precedent for this concept. Critically, it ships **one** book that serves both living and memorial buyers via a tense toggle — their own copy reads: *"If your dog has passed away, check the box and the story will be written in the past tense."* That single product decision (one SKU, two audiences) is the design we are copying. — <https://www.iseeme.com/en-us/if-my-dog-could-talk-personalized-book.html>
- **Hooray Heroes — "Your Goodest Pup"**, a bond-focused personalized dog book, sells **printed at $46.99**, and the company reports **3.5M+ personalizations since 2018** — evidence that the personalized-pet-book category sustains high prices and real volume. — <https://hoorayheroes.com/personalized-book/dog-book>
- **Etsy** returns **1,000+ results** for "personalized dog book," confirming a deep, active long-tail of buyers searching for exactly this gift. — <https://www.etsy.com/market/personalized_dog_book>

**Why we win.** Every incumbent personalizes with a **breed picker or a pre-made art style** — the "dog" in the book is a generic golden retriever, not *your* dog. Our moat is **pet likeness from one uploaded photo**: the watercolor on the cover is recognizably the actual animal sitting next to the buyer. For a product whose entire emotional promise is "this is *us*," that is the difference between a nice gift and a sob. We charge less than the printed incumbents ($27–29 PDF vs. their $29.99–$46.99) and deliver the one thing they can't.

---

## Pipeline fit & build notes

This book follows [new-book-playbook.md](../new-book-playbook.md) and is **the lowest-effort new title in the catalog to date** — authoring-only, no new infrastructure, no new page layout.

**Layout — zero new primitives.** Story 4 reuses Story 2's two layout values exactly:

- Cover → **`letter-cover`**
- All five body pages → **`letter`**

No new `PageLayout` value, no `renderPage` case, no new CSS, no screen↔PDF parity work. Step 3 of the playbook ("Layout / CSS") is **skipped entirely**. The existing-book byte-identity guard is trivially satisfied because no shared renderer or stylesheet is touched.

**Illustration slots — 2, same shape as Story 2.** Premium imagery only:

- `letter-cover` — a cover portrait of the pet (uses the uploaded photo as reference)
- `letter-page-4` — one watercolor scene/joy wash for the "I love this about us" beat (a soft, figureless or single-subject scene — sunlit floor, the spot by the door, a tennis ball mid-bounce)

Both default to **Low** tier. A full Story-4 book is ~$0.012 to generate (2 images), well under the per-book budget.

**Wizard fields — almost entirely reused from Story 2.** Reused as-is: `PET_NAME`, `PET_NICKNAMES`, `SPECIES`, `BREED`, `OWNER_NAMES`, `RELATIONSHIP_TYPE`, `QUIRKS`, `FAVORITE_RITUAL`, `FAVORITE_SPOTS`. Reused from Story 1's set: `FAVORITE_ACTIVITY`. **One genuinely new field:** `[LIVING_OR_MEMORIAL]` (toggle, default `living`). One **renamed** optional pair vs. Story 2: instead of `DATE_ADOPTED`/`DATE_PASSED`, this book uses `[DATE_ADOPTED]` alone (a "together since" line on the cover) — present only in the living path. (`DATE_PASSED` is reintroduced only when `[LIVING_OR_MEMORIAL] = memorial`.) Toggles: `[GIFT_FOR]` (self / friend), and the **memorial-only** `[DEATH_TYPE]` / `[BELIEF_FRAME]` which lie dormant in the default living path.

**The build-shape decision: separate registry entry vs. a toggle on Story 2.** Because Story 4 *is* Story 2 with the tense flipped, it could be implemented as a `[LIVING_OR_MEMORIAL]` variant **on Story 2's existing registry entry** rather than a new `storyType`. Trade-off: a toggle-on-Story-2 is the least code but conflates two products that need **separate storefront listings, separate prices, and separate marketing** (a grief buyer and a birthday buyer must never see each other's product page). **Recommendation: a separate registry entry** (`storyType: "story-4"`, `productId: "story-4-talk"`) that *internally shares* Story 2's page-resolution helpers where the past-tense path overlaps — so we get two clean products on the storefront while still reusing the engine. This keeps catalog, pricing, samples, and copy independent at near-zero extra cost.

**Net build effort:** author `lib/story/story4/{master-text,variants,merge,editable-fields}.ts` + `lib/story/story-4.ts` + a `talkPdfFilename` in `lib/pdf/filename.ts` + the catalog/registry/wizard-config/types deltas + 2 Low samples. No worker, admin, delivery, Supabase, or state-machine change (the reuse guarantee holds).

---

## Merge fields

| Field | Source | Example |
|-------|--------|---------|
| `[PET_NAME]` | Customer input | "Biscuit" |
| `[PET_NICKNAMES]` | Optional, up to 3 | "Biscy", "the gremlin", "sir" |
| `[SPECIES]` | Dropdown | "dog" |
| `[BREED]` | Customer input | "rescue mutt with the lopsided grin" |
| `[OWNER_NAMES]` | Customer input | "Sarah" or "Sarah and David" or "the whole house" |
| `[RELATIONSHIP_TYPE]` | Dropdown: single / couple / family | Drives second-person addressing |
| `[FAVORITE_SPOTS]` | Customer input — 1-3 spots | "the spot by the back door where the sun lands at 4pm" |
| `[QUIRKS]` | Free text, 1-3 sentences | "the way I lose my mind when you pick up the leash" |
| `[FAVORITE_RITUAL]` | Customer input | "our walk before coffee, every single morning" |
| `[FAVORITE_ACTIVITY]` | Customer input | "stealing one sock and running a victory lap" |
| `[DATE_ADOPTED]` | Optional (living path) | "March 2023" or "Spring 2023" |
| `[PRONOUN_FIRST]` | Pet self-reference | "I" (always) |
| `[OWNER_PRONOUN]` | Auto from relationship type | "you" / "you both" |

**Special-case toggles** (collected via short follow-up question at checkout):

- `[LIVING_OR_MEMORIAL]`: **living** (default — present tense, celebration) / memorial (past tense, grief). **This is the headline toggle.**
- `[GIFT_FOR]`: self / friend — adjusts the dedication inscription if the letter is a gift
- `[DEATH_TYPE]` *(memorial path only)*: peaceful / illness / sudden / euthanasia — adjusts Page 5
- `[BELIEF_FRAME]` *(memorial path only)*: rainbow-bridge (default) / heaven / secular — adjusts the memorial closing
- `[DATE_PASSED]` *(memorial path only)*: optional second date for the cover

**Field-completeness rule (hard):** after merge, **no literal `[FIELD]` may survive** into output. Every field is either required or has an explicit fallback line below (see Page 3's `[QUIRKS]` fallbacks). Optional fields (`[PET_NICKNAMES]`, `[DATE_ADOPTED]`, `[DATE_PASSED]`) are **omitted cleanly** when blank — never printed as an empty line or a dangling dash.

---

## The voice — read this before writing anything

Story 4's voice is Story 2's voice **turned toward the light**. Same creature, same plainspoken specificity — but the pet is here, now, warm and alive, and a little astonished at its own good luck. The register is **present tense and joyful**, with real humor, and never sentimental for its own sake.

The benchmark is still Mary Oliver's dog poems — plainspoken, specific, true — but read the happy ones. If a sentence sounds like a greeting card, cut it.

**The pet's voice should:**

- Be simple and **present tense**. "I love. I notice. I wait by the door." Pets live in the now; the writing should too.
- Notice small physical things — the sound of the cereal bag, the back of a knee, the weight of a hand, the exact minute the sun hits the floor.
- Have **warm, real humor** — own the chewed shoe, the barking at nothing, the sock heist, the 5am wake-up. The comedy *is* the love.
- Express love through **specifics**, never abstractions. Not "you mean everything to me" — "you are the person who shares the last bite."
- Be matter-of-fact and unbothered. The pet is not anxious about anything; it is delighted.
- Sound a little wiser than it acts, but never preachy. **Permit, don't prescribe.**

**The pet's voice should NOT:**

- Quote anything — no songs, poems, or scripture.
- Use big words ("transcendence," "unconditional," "soulmate"). Pets don't talk like a wedding toast.
- Sound like a Hallmark card or an Instagram caption.
- Use the words "fur baby."
- Promise to be "watching over you" (this matters even in the living path — it's a banned construction across the catalog).
- Get mawkish. The reader should laugh on Page 3 and feel the floor drop a little on Page 5. Earn the second one with the first.
- Use emojis or icons in the text.

**Memorial-path note:** when `[LIVING_OR_MEMORIAL] = memorial`, the *humor and specificity stay* but the tense flips to past, and the grief rules apply absolutely: use the word **"died,"** never "passed away / went to sleep / lost / crossed the rainbow bridge"; never have the pet promise to be watching over the owner. The letter becomes "here is what I'd have said" instead of "here is what I'm saying."

---

## Page-by-page master text

> Default voice below is a **dog speaking, present tense, single owner.** Species variants for cat, rabbit, bird, horse, and small mammal follow the relevant pages. Couple/family addressing and the `[LIVING_OR_MEMORIAL]` past-tense rewrite are noted per page; the memorial rewrite is given in full for the two pages where the tense shift matters most (Pages 2 and 5).

---

### PAGE 1 — Cover / Title

**Title (large, classical serif, centered):**
If [PET_NAME] Could Talk

**Subtitle (smaller, italic):**
to [OWNER_NAMES]

*Optional, smaller still, at bottom of page (living path):*
together since [DATE_ADOPTED]

*Illustration brief:* A single watercolor portrait of the pet — recognizably *this* animal, from the uploaded photo — looking directly back at the reader, alert and happy, ears up, the way they look when you've just walked in. Warm, soft palette. This is the "hello, it's me" image. White space around it; the cover should read like a small book of poems, not a greeting card. (`letter-cover` layout; `letter-cover` illustration slot.)

*Variant for [GIFT_FOR] = friend:* The letter is still *to* the pet's owner. The gift-giver's name appears only as a small inscription on the dedication line, never in the title.

*Variant for [LIVING_OR_MEMORIAL] = memorial:* Title unchanged ("If [PET_NAME] Could Talk"). The optional bottom line becomes the two dates, centered, small: `[DATE_ADOPTED] — [DATE_PASSED]` (printed **only** if both dates are provided).

---

### PAGE 2 — Opening ("here is what I'd say")

Dear [OWNER_NAMES],

I don't have words. I have something better — a tail that tells you everything, ears that hear your car three houses away, and a heart that points at you like a compass.

But if I had words, just for one afternoon, this is the letter I'd write you.

Because there are things I want you to know. And I think you should hear them from me.

*Illustration brief:* None on this page, or a very small ornamental element in a corner — a leaf, a curl, a single watercolor paw print. The text is the design. White space.

*Variant for [RELATIONSHIP_TYPE] = couple ("Sarah and David"):*
"Dear Sarah and David,
I don't have words. I have something better — a tail that tells you both everything, ears that hear both your cars three houses away, and a heart that points at the two of you like a compass.
But if I had words, just for one afternoon, this is the letter I'd write you both."

*Variant for [SPECIES] = cat:*
"I don't have words. I have something better — a stillness that means *I know you're there*, a particular blink I save only for you, and a heart that points at you (even when I'm pretending to look out the window)."

*Variant for [SPECIES] = rabbit / small mammal:*
"I don't have words. I have something better — a nose that never stops, a thump that means *pay attention*, and a heart that points at you from the corner of the room."

*Variant for [SPECIES] = bird:*
"I don't have words — well. I have some of your words, and I use them at the wrong times on purpose. But I have something better: a head-tilt that means *yes, you*, and a heart that points at you all day long."

*Variant for [LIVING_OR_MEMORIAL] = memorial (full past-tense rewrite):*
"Dear [OWNER_NAMES],
I never had words. I had something better — a tail that told you everything, ears that heard your car three houses away, and a heart that pointed at you like a compass.
But if I'd had words, just for one afternoon, this is the letter I would have written you.
Because there are things I want you to know. And I think you should hear them from me."

---

### PAGE 3 — Gratitude / Quirks ("I love this about us")

Here is what I love about us. And I notice all of it.

I love [FAVORITE_RITUAL]. That's my favorite part of every day. I start waiting for it before it's time.

I love [QUIRKS]. I know you think I don't notice. I notice everything.

And I love that you came home tired and sat on the floor with me anyway, in your good clothes, because I was there and that was enough. You talk to me in your real voice — the one nobody else gets to hear. I keep all of it.

I'm not just fine. I'm not just okay. I'm *happy* — the kind that runs in circles for no reason and doesn't need explaining. You did that. That's you.

*Illustration brief:* Optional small margin element only — a quick line-drawing of the pet mid-ritual (leash in mouth, sat by the door, nose to a sunbeam). Sketch register, not a full scene. The best version of this page may carry no illustration at all. (No illustration slot consumed here.)

*Species variant — cat:* "...the kind of happy that loaf-shapes in a sunbeam and decides nothing else needs to happen today."

*Species variant — rabbit / small mammal:* "...the kind of happy that binkies across the floor for no reason at all."

*Species variant — bird:* "...the kind of happy that sings when nobody asked."

*Species variant — horse:* "...the kind of happy that runs the fence line and then comes back to you."

*If [QUIRKS] is blank or shallow, replace the second paragraph with this fallback:*
"I love that you always save me a bite, even when you say you won't. I love that you use my whole name when you're pretending to be mad. I love that your hand finds my head without you even looking. I notice everything."

*Variant for [LIVING_OR_MEMORIAL] = memorial:* Tense to past throughout ("Here is what I loved about us... I loved [FAVORITE_RITUAL]... You did that. That was you."). The fallback rewrites the same way.

---

### PAGE 4 — Daily Joy

People think the big days are the ones that matter. The beach, the birthday, the snow.

I'll tell you a secret: it's the ordinary ones. It's [FAVORITE_ACTIVITY]. It's the spot at [FAVORITE_SPOTS], where the sun lands and the whole world goes warm and I have nothing to do but be near you.

I don't need much. A walk. A window. The sound of you in the next room. You, coming back — you always come back, and I am amazed every single time.

That's the whole secret. The days don't have to be big. They just have to have you in them.

*Illustration brief:* A soft watercolor scene wash — the pet doing the favorite activity, or curled in the favorite spot with the late-afternoon light coming in. Single subject or figureless joy; warm, golden, gentle. This is the one full scene illustration in the book. (`letter-page-4` illustration slot.)

*Species variant — cat:* "...the spot at [FAVORITE_SPOTS], where the sun lands and I can watch you and pretend I'm watching something else."

*Variant for [LIVING_OR_MEMORIAL] = memorial:* Past tense ("It was [FAVORITE_ACTIVITY]. It was the spot at [FAVORITE_SPOTS]... You always came back, and I was amazed every single time. The days didn't have to be big. They just had to have you in them.").

---

### PAGE 5 — The truth about how I feel about you

So here's the truth, since I've got the words for once.

You are my favorite. Not my favorite *thing* — my favorite, full stop. The person I look for when I hear the door. The one I'd pick out of any crowd, any room, anywhere, with my eyes closed, by the sound of you breathing.

I know I'm not always easy. I bark at nothing. I steal the socks. I wake you up too early because I can't believe it's already a day with you in it.

But I want you to know: I'm not waiting for a better life than this one. This is the one I'd choose. You, and the spot by the door, and the ordinary good morning. I already have everything.

*Illustration brief:* None on this page. White space is the point — the reader needs room to feel this one. The whole page is the gut-punch; let it breathe.

*Variant for [RELATIONSHIP_TYPE] = couple:* "You are my favorites... The two of you, and the spot by the door, and the ordinary good morning."

*Variant for [LIVING_OR_MEMORIAL] = memorial (full past-tense rewrite):*
"So here's the truth, since I've got the words at last.
You were my favorite. Not my favorite *thing* — my favorite, full stop. The person I looked for when I heard the door. The one I'd have picked out of any crowd, anywhere, with my eyes closed, by the sound of you breathing.
I know I wasn't always easy. I barked at nothing. I stole the socks. I woke you up too early because I couldn't believe it was already a day with you in it.
But I want you to know: I wasn't waiting for a better life than the one we had. That was the one I'd have chosen. You, and the spot by the door, and the ordinary good morning. I had everything."

*Memorial-path death-type seam (a single added line after "I had everything," chosen by [DEATH_TYPE]):*
- *euthanasia:* "And the last choice you made for me was the kindest thing anyone ever did. You loved me enough to let me go. There is nothing to forgive."
- *sudden:* "We didn't get the goodbye we wanted. The last thing I felt was being loved. That was enough. That was everything."
- *illness:* "Those last hard months — what I felt wasn't the pain. What I felt was you, choosing to stay through it. That's what I kept."
- *peaceful:* "I had a long, good life, and a soft end. There's nothing about it that needs forgiving."

*Memorial-path closing frame (a final line by [BELIEF_FRAME], replacing the present-tense Page-6 default close — never use "crossed the rainbow bridge" / "watching over you"):*
- *rainbow-bridge:* "Wherever I am now, I'm not tired, and I'm not hurting, and the sun still lands on the floor at four o'clock."
- *heaven:* "Wherever I am now, there's a room for me, and the door is the kind I can hear you coming through."
- *secular:* "I'm not anywhere now, not the way I was. But I'm in the spot by the door, and the half-second before you remember. I'm where you keep me. That's more than enough."

---

### PAGE 6 — Closing / Signature

So go on. Have the good day. Eat the good thing. Take the long way home.

And when you walk back through that door — I'll be the one who acts like you've been gone a year. Every time. That's not me forgetting how long you were gone. That's me, telling you the only way I know how:

There you are. There you are. It's you.

I love you. I always do. As much as a [SPECIES] can love — which, it turns out, is an enormous amount.

Yours,
**[PET_NAME]**
*([PET_NICKNAMES] — if provided, in smaller italic)*

*Illustration brief:* Below the signature, a single small watercolor paw print (offered in dog/cat-shaped, rabbit-shaped, bird-foot styles). Optional: a small hand-drawn flourish after the name. No full scene here. (No illustration slot consumed; the paw print is a decorative SVG element, not a generated image.)

*Variant for [LIVING_OR_MEMORIAL] = memorial (past-tense rewrite of the body, keeping the signature):*
"So go on. Have the good day. Eat the good thing. Take the long way home — and notice the things I used to notice with you. The grass after rain. The light moving in the late afternoon. The dog two houses down, barking at nothing.
And when you miss me — be sad for exactly as long as you need to be. Then, when you're ready, and only then, be happy again. I'd want that. I always did.
I loved you. I always will, as much as a [SPECIES] can love — which, it turns out, was an enormous amount.
Yours,
**[PET_NAME]**"

*If [DATE_ADOPTED] is provided (living path), it appears here very small, centered below the signature:* `together since [DATE_ADOPTED]`. *In the memorial path, if both dates are provided:* `[DATE_ADOPTED] — [DATE_PASSED]`.

---

## Variants quick reference

### Living or memorial *(the headline toggle)*
- **living** (default) — present tense, celebration. Pages read as ongoing. No death-type or belief-frame fields collected.
- **memorial** — past tense throughout. The grief rules apply: "died," never the euphemisms; no "watching over you." Pulls in `[DEATH_TYPE]`, `[BELIEF_FRAME]`, and the optional `[DATE_PASSED]`.

### Relationship type
- **single:** "Dear [NAME]," — second-person singular throughout
- **couple:** "Dear [NAME_1] and [NAME_2]," — "you both," "my favorites"
- **family:** "Dear [FAMILY_NAME]," — collective address; used rarely. If the buyer wants a child-facing read, point them to Story 1.

### Gift for
- **self** (default) — no inscription
- **friend** — small dedication inscription from the gift-giver on the cover/dedication line; the letter itself stays addressed to the owner

### Species (voice tweaks on Pages 2, 3, 4)
- dog (default) / cat / rabbit / bird / horse / small mammal / other (falls back to a species-neutral phrasing — "the kind of happy that doesn't need a reason")

### Death type *(memorial path only — Page 5 seam line)*
- peaceful / illness / sudden / euthanasia

### Belief frame *(memorial path only — Page 5 closing frame)*
- rainbow-bridge (default) / heaven / secular

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] All merge fields filled — **no `[PET_NAME]` left literal anywhere**
- [ ] `[LIVING_OR_MEMORIAL]` applied correctly — tense is consistent on **every** page (living = present, memorial = past). This is the single most common bug for this product.
- [ ] Pronouns / relationship type consistent across all pages ("you" vs. "you both")
- [ ] Species voice variants applied on Pages 2, 3, and 4
- [ ] `[QUIRKS]` integrated cleanly into Page 3 — does it scan as a sentence? Fallback used if sparse.
- [ ] `[FAVORITE_SPOTS]` and `[FAVORITE_ACTIVITY]` read naturally on Page 4
- [ ] Memorial path only: death-type seam line + belief-frame closing applied on Page 5
- [ ] Optional fields omitted cleanly when blank — no empty line, no dangling dash (`[PET_NICKNAMES]`, `[DATE_ADOPTED]`, `[DATE_PASSED]`)
- [ ] Customer free-text grammatically cleaned (fix typos, never change meaning)
- [ ] Read aloud — does it sound like one creature speaking? Does Page 3 land a laugh and Page 5 land a lump in the throat?
- [ ] Cover portrait recognizably matches the uploaded pet; Page-4 scene is warm and on-style
- [ ] Final PDF is 8.5" × 11" portrait, 300 DPI, ≥1" margins for framing
- [ ] Typography is the chosen serif on cream paper — never sans-serif, never cute
- [ ] Each page can stand alone if framed individually
- [ ] File named: `If-[PET_NAME]-Could-Talk.pdf`

---

## Quality bar / what to avoid

**Never:**
- Use "passed away," "went to sleep," "lost," or "crossed the rainbow bridge" in the memorial path — use **"died"** (the present/living path simply doesn't mention death at all)
- Use the words "fur baby"
- Have the pet promise to be "watching over you" — banned in **both** paths
- Quote songs, poems, or scripture
- Make the pet sound like a 19th-century novelist or a wedding toast
- Make the pet apologize for being an animal
- Use emojis or icons in the text
- Reference a date the customer didn't provide
- Let the living path tip into sappiness — the humor on Page 3 is what earns Page 5; don't skip it
- Be funny on the memorial Page 5 death-type line (that one is always still)

**Always:**
- Stay specific — the customer's quirks and ritual are what make it real. Sparse input → use the fallback, never generic filler.
- Present tense in the default living path; past tense, consistently, in the memorial path
- Short sentences in the emotional moments; longer ones in the joyful ones
- Leave white space — don't fill every page
- Honor the form: a letter, not a speech and not a poem
- Sound like the pet had one afternoon of clarity, and spent it well

---

## Typography & layout guide

Identical to Story 2 — this is the same physical artifact, a framed letter.

**Recommended typeface:** Cormorant Garamond (free, Google Fonts), 12–13pt body, 1.5 line spacing. *In the built pipeline we self-host **Lora** for the body and **Fraunces** for the cover title — no new font dependency; matches Story 2's `letter` treatment exactly.*

**Page setup:**
- 8.5" × 11" portrait
- 1.25" margins (extra room for framing; standard mat openings work)
- Page numbers: **none** (this is a letter, not a manuscript)
- Header/footer: none on letter pages; a small ornamental element on the cover only

**Hierarchy:**
- "Dear [OWNER_NAMES]," — same size as body, no bold
- Body — 12–13pt
- Signature ("Yours,") — italic
- "[PET_NAME]" signature — same size as body, no bold, optional small flourish
- Dates — 9–10pt, centered

**Color:**
- Black ink on **cream / off-white** (never pure white — feels clinical). The built `letter-page` uses `--paper` #FBF7EE.
- Optional single accent in illustration only (dusty rose, sage, slate)

**Print specs offered to customer:**
- Letter size for home printing (default)
- A4 alternative for European customers
- 5" × 7" frame-ready version (text reflowed) as an optional add-on

---

## Customer-facing description (for product page)

> A 6-page personalized letter written in your pet's own voice — warm, funny, and true — addressed to you by name. The things they'd say if they had the words for one afternoon: what they love about you, the ordinary days they live for, and how they really feel when you walk back through the door.
>
> Illustrated with a watercolor portrait of *your* actual pet, painted from a photo you upload — not a generic breed picture. Delivered as a printable PDF, designed for cardstock and a frame. A gift for a birthday, a gotcha day, or no reason at all.
>
> *Has your pet died? There's a quiet option at checkout to have the letter written in the past tense, as a keepsake of them.*

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Story 4 — PDF** | **$27–29** | Full text customization + watercolor cover portrait from your photo + one scene illustration |
| Add-on: 5×7 frame-ready | +$5 | Reflowed version for small frames |
| Add-on: Hardcover printed folio | +$15–20 margin | Single printed keepsace, fulfilled via print partner |

**Recommendation: $29 PDF**, matching Story 2 and undercutting the printed incumbents (I See Me! at **$29.99**, Hooray Heroes at **$46.99**) while delivering real-photo likeness they don't offer — a stronger product at a lower price. Confirm the final number with the PM before wiring the Lemon Squeezy variant (the LS price and the catalog `priceUsd` must match — playbook Steps 4–5). Place a `PLACEHOLDER_STORY_4_PRICE_USD` in the catalog until then.

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where a specialist edit matters most:

1. **The two-tense engine.** The single biggest risk is a tense leak — a present-tense sentence surviving into a memorial letter, or vice versa. Read both full paths end to end. The unit tests (per the playbook's standing guards) must assert that the memorial path contains no present-tense "I am" / "I love" constructions on Pages 2/4/5 and that the living path never contains "died" or a past-tense valediction.
2. **The Page-3 → Page-5 emotional arc.** The product only works if the reader laughs first. If Page 3 isn't genuinely funny in a specific way, Page 5 won't land. The `[QUIRKS]` input carries this — pressure-test the fallback lines hard, because a meaningful share of orders will arrive with thin quirks.
3. **The Mary Oliver test (happy edition).** Does any of this earn a place beside a good dog poem, or does it read like a captioned reel? Cut anything that sounds like social copy.
4. **Voice consistency across species.** Read the cat and bird variants aloud against the dog default — does it still sound like *one* creature, or does the register slip?
5. **The memorial closing frames.** The secular belief-frame line is the hardest to write well (no afterlife imagery to lean on). Confirm it lands without cliché.
6. **GIFT_FOR inscription wording.** A gift letter must never read as if written *by* the gift-giver — the pet is always the author, the owner always the recipient. Verify the inscription placement keeps that boundary clean.

**Total ghostwriter + reviewer budget guidance:** $200–350. The living path is the primary revenue driver and the funnier, so spend most of it there; have a grief counselor sanity-check the memorial path's death-type and belief-frame lines (reuse Story 2's reviewer if possible — the rules are identical).
