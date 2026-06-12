# Story 9 Master Template — "[PET_NAME] and the New Baby"

> **Product:** Family-transition keepsake — personalized PDF storybook celebrating the family pet as the original "first child" and big sibling to a new baby
> **Length:** 8-10 pages (cover + dedication + 7-8 illustrated story pages + back cover)
> **Purpose:** Warmly prepare and honor the family pet through the arrival of a new baby — reassuring the pet's place, never framing the baby as a replacement
> **Status:** Working v1 draft — spec for build
> **Last updated:** June 12, 2026

---

## Where this sits in the catalog

This is the **family-transition keepsake** — the warm, non-memorial title in the new set. Where Story 1 helps a child grieve and Story 2 lets an owner cry, Story 9 is the happy-occasion book: it marks the moment a household grows by celebrating the animal who was there first. It works as a gift to expecting parents, a keepsake for the family's own shelf, or a gentle, read-aloud reassurance to the pet itself.

**Honest positioning: this is a niche test, not a flagship.** It is ranked **#7** in the new set and carries the **weakest market evidence** of any title we're considering (see the next section). We build it because it is **cheap** — it reuses the Story-1 narrative layout set verbatim, so it is authoring-only, no new render work — and because the underlying "preparing the pet for the baby" anxiety is real and widely felt. Treat it as a **low-cost fast-follow to validate demand**, not a primary bet. If it sells, it earns more investment; if it doesn't, we've spent almost nothing learning that.

---

## Market rationale & demand evidence

**Be honest: this is the weakest-evidenced concept in the new set.** No named direct competitor for a "pet welcomes the new baby" personalized book surfaced in the research — there is no Etsy listing, no Shopify shop, and no print-on-demand title we could point to and say "people are already buying exactly this." The demand case is **category-level and inferential**, not direct.

What it does rest on:

1. **The personalized-pet-book category is broadly validated.** This is the same well-proven category that Stories 1-3 sit in:
   - Etsy returns **1,000+ results** for "personalized dog book" — a live, transacting market: https://www.etsy.com/market/personalized_dog_book
   - **Hooray Heroes** reports **3.5M+ personalizations** across its personalized-book line, including a dedicated dog book: https://hoorayheroes.com/personalized-book/dog-book
   - **I See Me!** sells *"If My Dog Could Talk"* personalized at **$29.99**, anchoring the price point: https://www.iseeme.com/en-us/if-my-dog-could-talk-personalized-book.html
2. **The real-life concern is documented and emotionally live.** "How do I prepare my dog/cat for the baby?" is a perennial pet-behavior and new-parent topic — there is a steady stream of trainer/vet content addressing the exact anxiety this book speaks to. A keepsake that reframes that anxiety ("the pet isn't being replaced — they're becoming the big sibling") is a plausible emotional fit, even though no one has yet productized it as a book.

**The gap is the risk and the opportunity.** No named competitor means no proof of demand — but also no incumbent. Because the build is near-free (authoring-only on top of the Story-1 layout), it's a sensible **#7-ranked probe**: ship it, list it, and let a small amount of real traffic tell us whether the inferred demand is real. **Do not over-invest ahead of that signal.**

---

## Pipeline fit & build notes

This book is deliberately the **lowest-effort title** in the new set. Per [new-book-playbook.md](../new-book-playbook.md), the work is almost entirely **Step 1 (author the text)** + **Step 2 (register)** + **Step 4 (catalog)**; Step 3 (layout/CSS) is **skipped**.

- **No new `PageLayout`.** Every page maps to an **existing Story-1 layout value** — `cover`, `dedication`, `narrative`, `love`, `closing`, `back-cover`. The `renderPage` switch and both stylesheets already handle these, so there is **no new render code and no screen↔PDF parity work**. (We do not use `truth` — that's Story 1's death page and has no place here.) The `love` layout is reused for the "love grows, it doesn't divide" beat — its centered, hero-line treatment is exactly right for that page.
- **Illustration slots: exactly 7.** The illustrated scenes are: `cover`, `page-2` (you were here first), `page-3` (our days together), `page-4` (something is changing), `page-5` (the big sibling), `page-6` (meeting / the bond), `page-7` (love grows). The `dedication` page (page-1), the `closing` page (page-8), and the `back-cover` are **writing/treatment pages, not generated scenes** — same split as Story 1, where the cover + narrative pages are anchored art and the dedication/back-cover are not. The catalog's `illustrationCount` is **DERIVED** from `illustrationSlots.length` (= 7) — never hardcode it.
- **Only the PET is photo-anchored.** Same rule as Story 1's child handling: the pet is locked to the uploaded photo (Approach A reference illustration → consistent across all pages), and **the baby/child and any adult figures are rendered generically/stylized** (soft, 3/4 or from-behind, no specific face). This avoids uncanny-valley problems, sidesteps the impossibility of generating a not-yet-born baby's likeness, and keeps the focus where our differentiator is: *the pet that is actually theirs.* The baby is a warm, abstract presence — a bundle, a small hand, a silhouette — not a portrait.
- **Wizard fields — mostly reused, three new.** Reuses `PET_NAME`, `PET_NICKNAMES`, `SPECIES`, `SPECIES_DESCRIPTOR`, `BREED_COLOR`, `PRONOUN_*`, `OWNER_NAMES`, `FAVORITE_ACTIVITY`, `SLEEPING_SPOT`, `QUIRKS`, and the `OTHER_PETS_IN_HOME` toggle. **New:** `BABY_NAME` (optional — degrades to "the new baby" when expecting/unknown), `BABY_STATUS` (expecting/arrived toggle), and `BABY_ARRIVAL` (optional free-text, e.g. "this spring"). If we reuse Story-1's `Pet` input group plus a small `BabyDetails` group, the draft→session delta is tiny.
- **Build effort = low.** Per the playbook this is a **quick test branch** (`feature/book-new-baby`): namespaced text modules under `lib/story/story9/`, a thin `lib/story/story-9.ts` `StoryDefinition`, a `bookPdfFilename` helper in `lib/pdf/filename.ts` (`[PET_NAME]-and-the-New-Baby.pdf`), a `WIZARD_CONFIG` entry, a catalog `buildProduct(...)`, and the standing guards. No worker/admin/Supabase/delivery changes — the reuse guarantee holds.

---

## Merge fields

| Field | Source | Example |
|-------|--------|---------|
| `[PET_NAME]` | Customer input | "Biscuit" |
| `[PET_NICKNAMES]` | Optional, up to 3 | "Biscuit-boy", "the goblin" |
| `[SPECIES]` | Dropdown | "dog" |
| `[SPECIES_DESCRIPTOR]` | Auto-mapped | "good boy", "sweet girl", "kitty", "bunny" |
| `[BREED_COLOR]` | Customer input | "golden retriever with one floppy ear" |
| `[PRONOUN_SUBJECT]` | Dropdown | "he" / "she" / "they" |
| `[PRONOUN_OBJECT]` | Auto-mapped | "him" / "her" / "them" |
| `[PRONOUN_POSSESSIVE]` | Auto-mapped | "his" / "her" / "their" |
| `[OWNER_NAMES]` | Customer input | "Maria and James" / "Mom and Dad" |
| `[FAVORITE_ACTIVITY]` | Customer input | "chasing tennis balls in the backyard" |
| `[SLEEPING_SPOT]` | Customer input | "at the foot of the bed" |
| `[QUIRKS]` | Free text, 1-2 sentences | "the way you tilt your head when the doorbell rings" |
| **`[BABY_NAME]`** | **New — optional** | "Noah" *(degrades to "the new baby" when expecting/unknown)* |
| **`[BABY_STATUS]`** | **New — toggle** | "expecting" / "arrived" |
| **`[BABY_ARRIVAL]`** | **New — optional free-text** | "this spring" / "in March" |

**Special-case toggles** (collected via short follow-up question at checkout):
- `[BABY_STATUS]`: **expecting** (default) / **arrived** — switches the whole book between the "preparing the pet, baby still abstract" framing and the "celebrating the bond, baby named" framing
- `[OTHER_PETS_IN_HOME]`: yes / no — adds a gentle line acknowledging the other pets are adjusting too
- Species voice tweaks (dog / cat / rabbit / bird / other) on the rituals and big-sibling pages

**Auto-mapping notes:**
- `[BABY_NAME]` is **required to degrade gracefully.** When `[BABY_STATUS]` = expecting OR `[BABY_NAME]` is blank, every reference resolves to **"the new baby"** (lowercase, no article doubling). When `[BABY_STATUS]` = arrived AND `[BABY_NAME]` is provided, the name is used. **No literal `[BABY_NAME]` may ever survive into output.**
- `[SPECIES_DESCRIPTOR]` is reused exactly as Story 1 maps it (good boy / sweet girl / kitty / bunny / friend) and also drives the "big [SPECIES_DESCRIPTOR]" / "big sibling" phrasing on Page 5.

---

## Story arc (why this structure works)

The arc is built to do one emotional job: **reassure, then celebrate.** It must land the message that love multiplies and never divides — the pet's place is not at risk.

1. **The pet's place is secure** (Pages 2-3) — establish, before any change is mentioned, that the pet is the original family, deeply loved, woven into the home's daily rhythm. The reader (and the pet) must feel settled and safe first.
2. **A change is coming** (Page 4) — introduce the baby gently and as *good news*, never as a threat. Name the truth (things will be a little different) without alarm.
3. **The pet is promoted, not displaced** (Page 5) — reframe the change as an elevation: the pet becomes the big sibling, the one who was here first, the experienced one. This is the pivot the whole book turns on.
4. **The bond** (Page 6) — the pet and baby together (real, if arrived; anticipated, if expecting). The warmth of two small creatures in one home.
5. **Love multiplies** (Page 7) — the thesis, stated plainly: a bigger family is more love, not less of the pet's share. The `love` layout's hero beat.
6. **There's room for everyone** (Page 8) — close on security and belonging, echoing the opening so the book feels whole.

The book should take 3-5 minutes to read aloud and be re-readable — once before the baby comes, again after.

---

## Page-by-page master text

> **Notation:** Text in regular type is the published wording. *Italic notes* are for the ghostwriter/designer. Default tone below is the warm, read-aloud Quietly Kept voice. Variants for `[BABY_STATUS]`, `[OTHER_PETS_IN_HOME]`, and species follow each page.

---

### COVER — `cover`

**Title (large, hand-lettered feel):**
[PET_NAME] and the New Baby

**Subtitle (smaller):**
A story for the [OWNER_NAMES] family

*Illustration brief:* [PET_NAME] (a [BREED_COLOR] [SPECIES]) in warm afternoon light, sitting proudly and contentedly in a cozy home — a soft hint of a nursery or a small baby presence nearby (a mobile, a folded blanket, a bassinet shape), but the **pet is the subject and the hero of the image.** Gentle, happy, settled body language — not anxious. Soft golden palette. This is the "all is well, and growing" image.

*Variant ([BABY_STATUS] = arrived, [BABY_NAME] provided):* Subtitle reads "A story for [BABY_NAME] and [PET_NAME]." The art may include the abstract baby presence beside the pet.

---

### PAGE 1 — Dedication — `dedication`

For [PET_NAME],
who was here first,
and is loved just as much as ever.

*Illustration brief:* Single soft portrait of [PET_NAME] alone, looking gently toward the reader, with a pastel watercolor border. The pet looks the way the family knows them — present, themselves, at ease.

*Variant ([BABY_STATUS] = arrived, [BABY_NAME] provided):*
For [PET_NAME] and [BABY_NAME] —
the big [SPECIES_DESCRIPTOR] and the little one,
at the very beginning of everything.

---

### PAGE 2 — You Were Here First — `narrative`

Before the new baby, there was you.

In this home full of love, [PET_NAME] was the very first — the first to be waited for, the first to be welcomed, the first to make this house a family.

[PET_NAME] knew every corner. The warm spot by the window. The sound of the right car in the driveway. The exact moment someone needed a friend.

This was your home first, [PET_NAME]. It still is.

*Illustration brief:* [PET_NAME] settled comfortably in the heart of the home — curled in a favorite spot, or greeting the family at the door. Warm interior light. The pet is centered and at ease, the unmistakable resident of this place.

*Variant ([SPECIES] = cat):* "...the first to claim the warm spot by the window, the first to decide which lap was best, the first to make this house a home on [PRONOUN_POSSESSIVE] own quiet terms."

*Variant ([OTHER_PETS_IN_HOME] = yes):* Add — "And whatever other small ones share this home, they know it too: [PET_NAME] was here at the start of it all."

---

### PAGE 3 — Our Days Together — `narrative`

Every day, you and your family have a rhythm all your own.

[PET_NAME]'s favorite thing in the world is [FAVORITE_ACTIVITY].

And [OWNER_NAMES] love [PRONOUN_OBJECT] for it — even [QUIRKS].

When the day winds down, [PET_NAME] curls up [SLEEPING_SPOT], where it is warm and safe and exactly where [PRONOUN_SUBJECT] belongs.

*Illustration brief:* [PET_NAME] doing [FAVORITE_ACTIVITY], full of life and joy — the "peak happy" image of the book. Bright, warm palette. Keep the focus on the pet; family figures, if present, are generic and in soft background.

*Variant if [QUIRKS] is blank or thin:* fall back to "even the funny little habits that are [PET_NAME]'s alone — the way [PRONOUN_SUBJECT] greets the morning, the small weight of [PRONOUN_OBJECT] against your side."

*Variant ([SPECIES] = bird):* adapt "curls up" → "settles in" for the sleeping line; keep [SLEEPING_SPOT].

---

### PAGE 4 — Something Is Changing — `narrative`

Lately, something in the house has been changing.

There are new smells. New sounds. A small room being made ready, with soft things and quiet colors. The grown-ups talk in gentle, excited voices.

[PET_NAME] has noticed. Of course [PET_NAME] has — [PRONOUN_SUBJECT] notices everything.

Here is the good news, the happy news: a new baby is coming to join the family.

*Illustration brief:* [PET_NAME] curiously, calmly investigating a gentle sign of preparation — sniffing a folded baby blanket, watching a mobile turn, sitting in the doorway of a half-ready nursery. The pet is **interested and calm, not worried.** Soft nursery-adjacent palette. The baby is not present yet (expecting framing).

*Variant ([BABY_STATUS] = arrived):*
"For a while, something in the house was changing. New smells, new sounds, a small room made ready.
And then, one day, the new baby arrived. [BABY_NAME] came home to the family — and to [PET_NAME], who had been waiting all along."

*Variant ([BABY_ARRIVAL] provided, expecting):* append to the last line — "...a new baby is coming to join the family, [BABY_ARRIVAL]."

*Variant ([OTHER_PETS_IN_HOME] = yes):* Add — "The other pets have noticed too. You can all wonder about it together."

---

### PAGE 5 — You're Going to Be a Big Sibling — `narrative`

So here is something important for [PET_NAME] to know.

When the new baby comes, [PET_NAME] will not be any less loved. Not for one single moment.

[PET_NAME] is going to be a **big sibling**. The one who was here first. The one who knows the home best. The gentle, patient one the baby will learn to love right back.

You are not being replaced, [PET_NAME]. You are being promoted.

*Illustration brief:* [PET_NAME] standing or sitting tall and proud — a "big sibling" portrait — perhaps beside a small abstract baby presence (a bundle in a parent's generic arms, a bassinet) but with the pet clearly the steady, important figure. Warm, reassuring light. Body language: confident, gentle, dignified.

*Variant ([SPECIES_DESCRIPTOR] phrasing):* Where natural, use the descriptor — "a big [SPECIES_DESCRIPTOR]" — e.g. "the best big boy," "the sweetest big girl," "the kindest big kitty" — alongside "big sibling."

*Variant ([BABY_STATUS] = arrived, [BABY_NAME] provided):* "...the gentle, patient one [BABY_NAME] is already learning to love right back."

*Variant ([OTHER_PETS_IN_HOME] = yes):* Add — "And [PET_NAME] won't do it alone. Every one of the home's animals gets to be a big sibling too. The more, the merrier."

---

### PAGE 6 — The Bond — `narrative`

Soon there will be a small new person, and a [SPECIES] who loves [PRONOUN_OBJECT].

There will be quiet mornings with everyone home. A tiny hand reaching for soft fur. A warm body keeping watch beside the crib. The baby will learn the sound of [PET_NAME] before [PRONOUN_SUBJECT] learns much else at all.

Some of the very first happy things the baby ever knows will be [PET_NAME].

*Illustration brief:* The anticipated bond — [PET_NAME] resting gently near a bassinet or beside a generic, abstract baby (a small bundle, a tiny hand). Tender, calm, safe. The pet is attentive and soft, never crowding. Golden, peaceful light. **No specific baby face** — keep the baby stylized.

*Variant ([BABY_STATUS] = arrived):* shift to present/past tense and use the name —
"Now there is a small new person, and a [SPECIES] who loves [PRONOUN_OBJECT].
[BABY_NAME] reaches for [PET_NAME]'s soft fur. [PET_NAME] keeps gentle watch nearby. Some of the very first happy things [BABY_NAME] will ever know are already [PET_NAME]."

*Variant ([SPECIES] = cat):* "A warm, watchful presence at the edge of the room — close enough to belong, far enough to keep [PRONOUN_POSSESSIVE] dignity." (Cats supervise; they don't crowd.)

---

### PAGE 7 — Love Grows — `love`

Here is the most important thing of all.

When a family grows, the love grows with it.

There is not a smaller piece of love for [PET_NAME] now. There is more love in the whole house than there has ever been — and [PET_NAME] is right in the middle of it.

Love does not divide. It multiplies.

*Illustration brief:* The strongest, most symbolic image in the book — [PET_NAME] and the family (generic, abstract figures + the abstract baby) gathered warmly together, soft glow, slightly dreamlike. [PET_NAME] is the heart of the scene. This is the most-quoted page; make it the best illustration. *(The `love` layout centers a hero line — set "Love does not divide. It multiplies." as that line.)*

*Variant ([OTHER_PETS_IN_HOME] = yes):* Add a soft line — "Enough for the baby. Enough for [PET_NAME]. Enough for every furred and feathered one under this roof."

---

### PAGE 8 — Closing — `closing`

So don't worry, [PET_NAME].

You are the first. You are the big [SPECIES_DESCRIPTOR]. You are loved today, and you will be loved tomorrow, and you will be loved when the baby is grown and gone and grey.

There's room for everyone, [PET_NAME].
There always was.

*Illustration brief:* The closing image — [PET_NAME] and the whole growing family together in their happiest, warmest scene, golden light, slightly dreamlike to suggest a beginning rather than an ending. Should echo the cover but feel fuller and more settled. The pet is content and central.

*Variant ([BABY_STATUS] = arrived, [BABY_NAME] provided):* "You are loved today, [PET_NAME] — you and [BABY_NAME] both — and you will be loved for every day that comes after."

---

### BACK COVER — Memory Page — `back-cover`

*Layout:* Space for the family to write or print their own message — a keepsake page.

**Suggested prompt printed at top of page:**
"A place to remember the day our family grew"

*Optional template lines:*
- The day we told [PET_NAME] about the baby: ___________
- How [PET_NAME] reacted the first time: ___________
- [PET_NAME] and the baby's first quiet moment together: ___________
- One thing we never want to forget: ___________

*Illustration brief:* Soft border around the writing space — paw prints, a gentle leaf, a small nursery-soft motif. Should not compete with the handwritten content.

---

## Variants quick reference

### Baby status (the primary toggle)
- **expecting** (default) — baby is abstract and un-named throughout; `[BABY_NAME]` resolves to "the new baby"; Pages 4 and 6 use the "coming / will be" anticipatory framing; the book reads as reassurance *before* the arrival.
- **arrived** — `[BABY_NAME]` is used (if provided; else still "the new baby"); Pages 4 and 6 shift to "has arrived / now there is" present framing; the cover/dedication may name the baby; the book reads as celebration of the *existing* bond.

### Other pets in home
- **no** (default) — no extra lines.
- **yes** — adds a warm acknowledging line on Pages 2, 4, 5, and 7 that the home's other animals are part of the change and the welcome too. Never competitive — always "the more, the merrier."

### Species (voice tweaks)
- **dog** (default) — affectionate, eager, loyal register.
- **cat** — supervises rather than crowds; dignified, quietly devoted (Pages 2, 6).
- **rabbit / small mammal** — gentle, soft, "settles in" rather than "curls up."
- **bird** — adapt "curls up" → "settles in"; keep the watchful, present warmth.
- **other** — species-neutral phrasing; lean on "friend" for the descriptor.

### Baby name
- **provided + arrived** — name used on cover, dedication, Pages 4/5/6/8.
- **blank or expecting** — every reference degrades to "the new baby." Never a literal `[BABY_NAME]`, never a doubled article.

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] All merge fields filled — no `[PET_NAME]`, `[BABY_NAME]`, or any other `[FIELD]` left literal anywhere
- [ ] `[BABY_NAME]` degrades to "the new baby" cleanly when expecting/blank — no literal token, no doubled article ("a a", "the the")
- [ ] `[BABY_STATUS]` variant applied consistently across **every** page (cover, dedication, 4, 5, 6, 8) — no mix of "coming" and "arrived" framing in one book
- [ ] Pronouns consistent across all pages (most common bug)
- [ ] Pet species, breed, color match across all illustrations; **pet anchored to the photo, baby rendered generically** (no specific baby face anywhere)
- [ ] `[OTHER_PETS_IN_HOME]` variant applied if relevant
- [ ] Species voice tweaks applied (Pages 2, 6)
- [ ] [QUIRKS] integrated cleanly on Page 3 — does it scan as a sentence?
- [ ] Read aloud start to finish — does it land as reassuring and warm, never anxious?
- [ ] The baby is never framed as replacing or displacing the pet (the headline rule)
- [ ] Final PDF is 8.5" × 11", at least 300 DPI
- [ ] File named: `[PET_NAME]-and-the-New-Baby.pdf`
- [ ] Back-cover memory page renders correctly

---

## Quality bar / what to avoid

**Never:**
- **Frame the baby as replacing, displacing, or competing with the pet.** This is the single most important rule. No "you'll have to share," no "things won't be the same," no "the baby comes first now." The whole product fails if the pet's place feels threatened. Love **multiplies**; it never divides.
- Use the phrase "fur baby" (it muddles the very distinction the book celebrates — the pet is the *first* family member, a beloved animal in [PRONOUN_POSSESSIVE] own right, not a stand-in baby)
- Use clichés — "the more the merrier" is allowed once as a deliberate warm beat; avoid stacking greeting-card phrases otherwise
- Suggest the pet should be jealous, anxious, or "get used to less attention"
- Imply the pet will be loved *because* it helps with the baby (it is loved for itself, first)
- Use emojis or cutesy icons in the text
- Reference a baby name when expecting or when none was provided
- Make the new baby a specific, recognizable face in any illustration
- Use any memorial language — this is a happy, living, growing-family book (no "rainbow bridge," no "watching over," no goodbye)

**Always:**
- Establish the pet's security *before* the baby is mentioned (Pages 2-3 do the reassuring work)
- Use the pet's name often — it keeps the book about *them*
- Frame the change as a promotion (big sibling), not a loss
- Keep the baby a warm, abstract presence — a bundle, a small hand, a silhouette
- End on belonging and room-for-everyone, echoing the opening
- Keep it readable aloud — the family may read it *to the pet*, and certainly to each other

---

## Illustration & typography style guide

For visual consistency across the book and across orders:

- **Style options offered to customer:** soft watercolor (default), gentle storybook (cleaner lines), pencil sketch — same three as Story 1, sharing the reference-illustration pipeline.
- **Palette:** warm pastels **leaning nursery-adjacent** — soft creams, dusty rose, sage, gentle gold, the occasional powder blue or buttercup as a baby-soft accent. Golden-hour light. No harsh contrasts, no pure black, nothing clinical.
- **Pet consistency:** same breed markings, eye color, coat, and posture across **every** page — the #1 quality issue for AI illustrations. Lock the reference image of the pet before generating any page art (Approach A). **The pet is the only photo-anchored subject.**
- **Baby & adult rendering:** the baby is **generic and abstract** — a swaddled bundle, a tiny reaching hand, a soft silhouette in a bassinet — **never a specific or detailed face.** Adult/family figures are likewise stylized, 3/4 view or from behind, faces soft or unshown. This keeps the pet the hero, dodges uncanny-valley problems, lets any family see themselves, and makes an un-born baby renderable.
- **Mood:** calm, settled, warm, *anticipatory in the happy sense.* The pet should read as content and secure in every frame, including the "something is changing" page (curious, never anxious).
- **Avoid:** photographic realism, bright primary colors, clipart, any image where the pet looks worried, left out, or peripheral.
- **Typography:** inherits the Story-1 / Quietly Kept system unchanged (Fraunces display, Lora body) — no new fonts, no new layout CSS. 8.5" × 11", the shared `narrative` / `cover` / `love` / `closing` / `dedication` / `back-cover` treatments.

---

## Customer-facing description (for product page)

> An 8-to-10-page personalized storybook celebrating your pet as the original first family member — and the new baby's big sibling. Whether you're expecting or the baby has already arrived, this is a warm, reassuring keepsake that says what every pet parent wants their animal to know: *you are not being replaced. Our family is growing, and there's room for everyone.*
>
> Illustrated with your actual pet — drawn from a single photo you upload, so the [SPECIES] in the story looks like *yours*, not a generic breed pick — across every page. Customized with your pet's name, your family's name, and your daily rituals together.
>
> Delivered as a print-ready PDF, lovingly hand-finished within 24-48 hours. Read it to your pet before the baby comes, or keep it as the first chapter of your growing family's story.

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Standard** | **$27** | Full personalized PDF — 8-10 pages, pet illustrated from your photo across all 7 illustrated slots, all variants applied |

**Recommended price: $27 PDF.** This sits just under the I See Me! ($29.99) / category $29 anchor, reflecting its **niche, test-title status** (#7) — a gentle price to lower the bar on an unproven concept while staying in the validated personalized-pet-book range. Revisit upward toward $29 only if demand proves out. The LS variant's configured price must match the catalog `priceUsd` (2700 cents).

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where I'd most welcome a specialist's edit:

1. **The reassurance balance (Pages 4-5).** The book has to *name* the change honestly — pets do notice — without ever tipping into anxiety. Read Page 4 ("Something Is Changing") and Page 5 ("big sibling") aloud back to back: does it land as "good news, you're promoted," or does any sentence accidentally imply loss? This is the whole product; get it exactly right.
2. **The expecting vs. arrived split.** Verify both `[BABY_STATUS]` paths read as complete, natural books on their own — especially Page 6 (the bond), which carries the most tense-shifting. Neither version should feel like the other with words swapped in.
3. **"Fur baby" avoidance.** The product's premise is that the pet is the *first* family member and the baby is a *new* one — distinct, both loved. Make sure no phrasing collapses that distinction. Flag any line that reads as treating the pet as a baby substitute (which would undercut the whole reframe).
4. **Page 7 ("Love Grows") hero line.** "Love does not divide. It multiplies." is the thesis and the `love`-layout hero line. Is it the strongest possible phrasing, or is there a warmer one? It's the line people will quote.
5. **Species coverage.** The dog voice is the default and strongest. Pressure-test the cat (supervises, doesn't crowd) and the smaller-animal voices on Pages 2 and 6 — do they feel as warm, or do they read as the dog version lightly edited?
6. **Honest market caveat (for the PM, not the copy).** This is the #7 niche test with no named competitor. Keep ghostwriter spend proportional — a solid polish, not the Story-2-level grief-counselor investment. **Budget guidance: $100-150** for a copy polish; defer a heavier review until the title shows it sells.
