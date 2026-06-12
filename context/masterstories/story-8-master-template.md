# Story 8 Master Template — "The Amazing Adventures of [PET_NAME]"

> **Product:** Joyful kids' adventure picture book — the family pet is the HERO of a fun quest shared with the child
> **Length:** ~12 illustrated pages (cover + adventure scenes + closing + back cover)
> **Purpose:** A playful, read-aloud adventure starring the child's *actual* pet — a "save the day" romp, not a memorial. A keepsake that makes a kid feel their dog is a legend.
> **Status:** Working v1 draft — spec for build
> **Last updated:** 2026-06-12

---

## How to use this document

This is the master text. Every paid order generates a PDF by substituting the merge fields below into the page-by-page text on this template, choosing the customer's `[ADVENTURE_THEME]` arc, applying the `[HERO_COUNT]` and age-bracket variants, and rendering the illustration set with the pet as the hero across every scene.

The writing here is a complete v1 draft for the default worked theme — **The Backyard Mystery**. Two or three alternate themes are sketched in the "Other adventure themes" subsection; they reskin the *same* arc skeleton, so authoring a second theme is a copy task, not a structural one.

**Read the "Pipeline fit & build notes" section before estimating this book.** Unlike Stories 1–3, the gating risk on Story 8 is not the writing — it is whether the AI keeps the pet looking like the *same animal* across many action poses. Budget the prototype time there first.

---

## Where this sits in the catalog

This is **Story 8 — ranked #5**, and it sits in a very specific spot: the **biggest, most-competed non-memorial category** in personalized pet books, and **the most playful book Quietly Kept makes**. Where Stories 1–3 are grief and keepsake products, Story 8 is pure joy — a gift a parent buys *because the kid will be delighted*, not because anyone is grieving.

Be honest about the trade: **it has the highest market demand of all our non-memorial concepts AND the highest build effort AND the highest technical risk.** The demand is real (see *Market rationale* below) and the price point is healthy ($32–35). But the thing that makes the product worth buying — "this is YOUR actual dog, having an adventure" — is exactly the thing the AI pipeline is worst at holding across many dynamic scenes. **Do not greenlight this as a lightweight authoring branch.** It is a real build, and the cost is in the illustration engine, not the page templates.

---

## Market rationale & demand evidence

The personalized-kids'-adventure-starring-the-pet category is the largest and most validated non-memorial segment we can enter. The competitors prove the demand — and, crucially, prove our differentiator.

- **Wonderbly — "Your Amazing Dog" (dog-saves-the-day adventure):** a personalized kids' picture book starring the family dog, **$34.99**. Personalization is via a **44-breed / fur-color picker** plus up to **3 children's names** — it produces a *generic illustrated dog of the right breed*, **not the customer's actual pet from a photo.** That gap is our entire moat. (https://www.wonderbly.com/personalized-products/dog-save-the-day-book)
- **Petventures — pet-becomes-mayor / hero adventure:** **$44.99**, **143 reviews at ~85% five-star** — strong proof that families will pay a premium for an adventure that turns their pet into a protagonist. (https://petventuresbook.com/)
- **Etsy — "personalized dog book":** **1,000+ results**, a crowded long tail of made-to-order personalized dog books — evidence of broad, sustained demand across price points. (https://www.etsy.com/market/personalized_dog_book)

**The strategic read:** this is the **#5-ranked** concept by our scoring — *most* demand, *most* contested, *highest* effort. We do not win on price or on being first; the market is mature. **We win on likeness** — Wonderbly's breed-picker can never show *your* dog, and our one-photo → consistent-watercolor pipeline can. The product only earns its premium if that likeness genuinely holds. If it drifts, we are a worse, slower Wonderbly. So the differentiator and the technical risk are the same sentence.

---

## Pipeline fit & build notes

**Read this before scoping. This is the one concept where the illustration pipeline — not the writing — is the gating risk.**

### What's cheap here (page templates)

Story 8 reuses Story 1's existing `PageLayout` primitives almost entirely:

- **`cover`** — the hero cover.
- **`narrative`** — every adventure scene page (art slot + body text). This is the workhorse layout and it already exists.
- **`closing`** — the "home again, more loved" final spread.
- **`back-cover`** — the keepsake/about page.

There is **no need for a memorial-only layout** (`truth` / `love` / `dedication` are not used). So per `new-book-playbook.md` **Step 3, new `PageLayout` work is near-zero** — likely no new layout value at all, which means no `renderPage` switch case, no new print CSS, no new screen-CSS parity mirroring. Page ids are new literals (Step 1a), but they all map to existing layouts.

### What's expensive here (the illustration engine)

The build cost is entirely in illustration **count** and **consistency**:

- **Illustration slots: 10.** Target exactly **10 generated slots** — `cover` + **9 adventure scene pages** — declared as this book's `illustrationSlots` in its `StoryDefinition` (playbook Step 2). That is comparable to Story 1's 13, but every Story 8 slot is a *dynamic action pose*, which is harder per-image than Story 1's gentler scenes. (Pages with no generated art — e.g. a text-forward "call to adventure" beat or the back cover — are simply not in the slot list.)
- **This is more than a lightweight authoring branch.** Per `new-book-playbook.md`, most new titles are "mostly authoring." Story 8 is the exception: the standing guards (existing-book byte-identity, the public-boundary test, merge tests) all still apply, **plus** a real illustration-prototype phase that the playbook's lightweight path does not have. Treat it as a multi-feature milestone, not a one-evening reskin.

### The central technical challenge — pet likeness across ACTION poses

An adventure means the pet appears **running, leaping, "flying," sneaking, disguised, mid-discovery, triumphant** — many varied, dynamic poses. **This is exactly where AI pet-likeness drifts the most.** A pet sitting in golden light (Story 1) is easy to keep consistent; a pet mid-leap from a 3/4 rear angle in a pirate hat is where the model "forgets" the dog's real markings, ear shape, and eye color and quietly substitutes a generic animal. **If the dog stops looking like the dog, the product fails** — likeness is the whole moat.

**Recommendations (encode these in the orchestration + the illustration guide below):**

1. **Use Approach B (accumulating reference images), not the cheaper Approach A.** Approach A generates each scene independently from only the original photo + the locked reference illustration — fine for Story 1's calmer scenes, but it lets each action pose drift on its own. **Approach B feeds each *accepted* scene back in as an additional reference for the next generation**, so by mid-book the model has several in-style, in-character examples to anchor to. The 16-reference ceiling of `gpt-image-2` comfortably covers a 10-slot book. The extra cost/latency of B is the price of the moat; pay it here.
2. **Lock the reference illustration first**, exactly as Story 1 does, and never drop the original photo + that reference from the reference set even as accepted scenes accumulate.
3. **Keep poses 3/4-view; avoid extreme foreshortening.** A dog charging straight at the "camera," or a paw thrust toward the lens, foreshortens the face and body and is where likeness collapses. Brief every action scene as a **3/4 or side dynamic pose** — motion shown through stride, ears, tail, and environment, not through the camera being inside the action.
4. **Prototype the illustration set FIRST.** Before committing engineering time to wizard steps, catalog entry, or copy polish, run a real Approach-B prototype of all 10 slots on a single test pet and *look at it*. If likeness holds across the leaps and disguises, the product is buildable; if it doesn't, the whole concept is at risk and the copy is wasted effort. **The prototype is the go/no-go gate, not the final step.**

> **One-line build summary:** little new page-template work, high illustration-count + consistency work. The risk lives in `lib/ai/` (orchestration, reference accumulation, pose discipline), not in `lib/pdf/` (layouts) — the inverse of a normal new-book branch.

---

## Merge fields

Reuse existing field names wherever the data already exists (so the wizard and `lib/session/types.ts` mostly already cover it); new fields are introduced only where the adventure needs them.

| Field | Source | Reused? | Example |
|-------|--------|---------|---------|
| `[PET_NAME]` | Customer input | reused | "Biscuit" |
| `[PET_NICKNAMES]` | Optional, up to 3 | reused | "Biscey", "the goblin" |
| `[SPECIES]` | Dropdown | reused | "dog" |
| `[SPECIES_DESCRIPTOR]` | Auto-mapped | reused | "good boy", "sweet girl", "kitty", "bunny" |
| `[BREED_COLOR]` | Customer input | reused | "scruffy brown terrier with one white paw" |
| `[PRONOUN_SUBJECT]` | Dropdown | reused | "he" / "she" / "they" |
| `[PRONOUN_OBJECT]` | Auto-mapped | reused | "him" / "her" / "them" |
| `[PRONOUN_POSSESSIVE]` | Auto-mapped | reused | "his" / "her" / "their" |
| `[CHILD_NAME]` | Customer input | reused | "Emma" |
| `[CHILD_AGE_BRACKET]` | Dropdown: 3-5 / 6-8 / 9-12 | reused | Drives reading level |
| `[FAVORITE_ACTIVITY]` | Customer input | reused | "digging giant holes in the garden" |
| `[QUIRKS]` | Free text, 1-2 phrases | reused | "barks at the vacuum like it's a dragon" |
| `[SIDEKICK_NAME]` | Optional — a sibling or second pet | **NEW** | "Leo" (brother) / "Pepper" (the cat) |
| `[SUPERPOWER]` | Customer input — the pet's real quirk reframed as a special skill | **NEW** | "the World's Greatest Nose" / "Super-Sniffing" |

**New fields explained:**
- **`[SIDEKICK_NAME]`** — optional. When `[HERO_COUNT]` = pet-plus, this is the companion on the quest: a second child (sibling), or a second pet. If blank, the pet adventures with `[CHILD_NAME]` alone, or solo (see toggle). Never print a literal name the customer didn't provide — omit the sidekick cleanly.
- **`[SUPERPOWER]`** — the engine of the plot. We take the pet's *real* quirk or skill and frame it as the hero's special power. A dog that always finds the tennis ball becomes "the World's Greatest Nose"; a cat that gets into everything becomes "the Master of the Secret Passage." **Specificity is the charm** — the more the superpower is rooted in the customer's actual `[QUIRKS]` / `[FAVORITE_ACTIVITY]`, the more the book feels like *their* pet. If the customer leaves it blank, derive a fallback from `[FAVORITE_ACTIVITY]` / `[QUIRKS]` (see fallbacks per page); if those are also thin, default to a species-appropriate stock superpower (dog → "the Best Nose in the World"; cat → "the Quietest Paws"; rabbit → "the Fastest Hop"; bird → "the Sharpest Eyes").

**Special-case toggles** (collected via short follow-up question at checkout):
- `[ADVENTURE_THEME]`: **backyard-mystery (default)** / sea-voyage / space-rescue / enchanted-forest — selects which pre-authored adventure arc fills the page-by-page text.
- `[HERO_COUNT]`: **pet-plus (default)** = pet + child(ren) on the quest together / **pet-solo** = the pet is the lone hero, the child is the reader being told the tale.
- `[CHILD_AGE_BRACKET]`: 3-5 / 6-8 / 9-12 — tunes reading level (reuses Story 1's brackets).

---

## Story arc (the repeatable adventure skeleton)

Every `[ADVENTURE_THEME]` slots into the **same six-beat skeleton**. This is what lets one structure serve four (and eventually more) themes — only the *setting* and the *props* reskin; the beats and the page count stay fixed. The skeleton is the classic, kid-legible hero's-journey-lite:

1. **The ordinary day** — establish the pet, the home, the bond. (Pages: Cover, 1, 2)
2. **The call to adventure** — something needs solving; the quest begins. (Page 3)
3. **The pet's quirk becomes the key** — `[SUPERPOWER]` (rooted in the real `[QUIRKS]`) is the thing that cracks the problem. This is the heart of the book and the reason it feels like *their* pet. (Pages 4–6)
4. **The wobble** — a setback, a scary-but-not-too-scary moment, the hero almost stuck. (Page 7)
5. **The climax / save the day** — the pet leaps, sniffs, hops, or flies to victory. (Pages 8–9)
6. **Home again, more loved** — the celebration, the cozy ending, the pet asleep a hero. (Pages 10–11, back cover)

**Why it works for kids:** a clear problem, a hero whose strength is *their own weird quirk* (deeply affirming for a child who loves a weird pet), a moment of real jeopardy that resolves safely, and a warm landing. It reads aloud in **4–6 minutes** and is built to be read again.

---

## Page-by-page master text — worked example: **The Backyard Mystery** (default theme)

> **Notation:** Regular type is published wording. *Italic notes* are for the ghostwriter/designer. Default tone below is calibrated for **age 6-8**; 3-5 and 9-12 variants follow. Default `[HERO_COUNT]` = pet-plus (pet + child together). **After merge, no literal `[FIELD]` may survive** — every field is required or has an explicit fallback.
>
> **Worked theme:** *The Backyard Mystery* — something keeps going missing in the garden (socks off the line, the garden gnome, a shoe), and only [PET_NAME], with [PRONOUN_POSSESSIVE] [SUPERPOWER], can crack the case. (Cozy, low-stakes, universally relatable — the safest default and the easiest to keep on-model, since scenes stay in a familiar backyard.)

---

### COVER

**Title (large, hand-lettered, adventurous feel):**
The Amazing Adventures of [PET_NAME]

**Subtitle (smaller):**
The Backyard Mystery — starring [CHILD_NAME] and [PET_NAME]

*Illustration brief:* **HERO SHOT — this image sells the book.** [PET_NAME] (a [BREED_COLOR] [SPECIES]) front and center in a confident, heroic pose — maybe a tiny adventurer's bandana or a magnifying glass held in [PRONOUN_POSSESSIVE] mouth, [CHILD_NAME] grinning just behind [PRONOUN_OBJECT]. Bright, sunny backyard. **Pet must be in clear 3/4 view, face fully visible — this is the locked-likeness anchor for the whole book; the customer must instantly recognize their pet.** Warm watercolor, dynamic but readable. *This is the reference all later scenes accumulate from (Approach B) — get the markings, ear shape, and eye color exactly right here.*

---

### PAGE 1 — The Ordinary Day

In a cozy little house with a big green backyard, there lived a [SPECIES] named [PET_NAME].

[PET_NAME] was a [BREED_COLOR], and [PRONOUN_SUBJECT] was [CHILD_NAME]'s very best friend in the whole world.

Most days were perfectly ordinary. But [PET_NAME] was about to become a hero.

*Illustration brief:* [PET_NAME] and [CHILD_NAME] together in the backyard on a normal sunny morning — relaxed, happy, establishing the bond. 3/4 view of the pet. Calm scene (lets us nail likeness before the action starts).

---

### PAGE 2 — What Made [PET_NAME] Special

Now, [PET_NAME] had one truly amazing talent.

[PET_NAME] had [SUPERPOWER]. Whenever there was something to find, something hidden, or something that just wasn't *right* — [PET_NAME] always knew.

[CHILD_NAME] called [PRONOUN_OBJECT] "the greatest hero in the whole backyard." And today, that would matter very much.

*Illustration brief:* [PET_NAME] doing the thing that hints at [SUPERPOWER] — nose to the ground sniffing, ears up, intensely focused, comic and charming. Side or 3/4 view, full body, lots of energy through posture not camera angle. *Ghostwriter note: weave the real `[QUIRKS]` / `[FAVORITE_ACTIVITY]` into the superpower so it reads as this specific pet.*

*Fallback for blank `[SUPERPOWER]`:* derive from `[FAVORITE_ACTIVITY]` ("[PET_NAME] was the very best in the world at [FAVORITE_ACTIVITY]") or use the species stock superpower.

---

### PAGE 3 — The Call to Adventure

One morning, something was wrong.

"My favorite red sock is GONE!" said [CHILD_NAME]. "It was right here, and now it's vanished!"

[PET_NAME]'s ears went up. [PRONOUN_POSSESSIVE] nose went down. A mystery! And every great mystery needs a great hero.

"[PET_NAME]," said [CHILD_NAME], "we have a case to solve."

*Illustration brief:* The moment the quest begins — [CHILD_NAME] looking puzzled at an empty clothesline (or empty spot), [PET_NAME] suddenly alert, snapping into "detective" mode. The energy shifts here. Pet in 3/4 view, ears and posture signaling "on the case." *No generated art is strictly required if a text-forward beat is preferred, but a scene here strengthens the book — keep it in the 10-slot set.*

*Variant `[HERO_COUNT]` = pet-solo:* The child narrates as the reader, not a character: "Nobody else noticed. But [PET_NAME] did. [PET_NAME] always did." [PET_NAME] sets off alone.

---

### PAGE 4 — The First Clue (the quirk becomes the key)

[PET_NAME] put [PRONOUN_POSSESSIVE] amazing [SUPERPOWER] to work.

Sniff, sniff, SNIFF. Across the grass. Around the flowerpots. Past the wobbly fence.

And then — [PET_NAME] stopped. Right at the edge of the garden, where the dandelions grew tall, was a clue: a single thread of bright red wool.

"You found it!" cheered [CHILD_NAME]. "The trail starts HERE!"

*Illustration brief:* **Action pose — first real test of likeness in motion.** [PET_NAME] mid-investigation, nose down following a trail through the garden, body in a dynamic but grounded 3/4 stance. Show motion through stride and ears, **not** by pointing the pet at the camera. A tiny red thread visible. *Approach B: this scene, once accepted, becomes a reference for Pages 5–9.*

---

### PAGE 5 — Deeper Into the Mystery

The trail led [PET_NAME] and [CHILD_NAME] on a grand backyard expedition.

Under the bushy hedge (so dark and mysterious!). Over the old log bridge (so brave!). Around the bird bath, where a very suspicious squirrel watched them go.

[PET_NAME] never lost the trail. Not once. That's what made [PRONOUN_OBJECT] a hero.

*Illustration brief:* A traveling montage feel — [PET_NAME] leading the way through the "epic" backyard, [CHILD_NAME] following. Pet in a confident trotting 3/4 pose. Keep it whimsical (the everyday backyard rendered as a grand landscape). Watch likeness as the pose changes from the sniffing scenes.

*Variant `[HERO_COUNT]` = pet-plus with `[SIDEKICK_NAME]`:* "[PET_NAME], [CHILD_NAME], and [SIDEKICK_NAME] followed the trail together." (Insert the sidekick into the expedition party.)

---

### PAGE 6 — The Discovery

At last, the trail stopped at the tallest, leafiest corner of the garden.

And there — high up in the old oak tree — was a nest. A big, messy, cozy nest. And woven right into it, soft and warm, was [CHILD_NAME]'s favorite red sock!

"A bird took it!" gasped [CHILD_NAME]. "Mystery solved — by [PET_NAME], the greatest hero in the whole backyard!"

*Illustration brief:* The "aha!" reveal — [PET_NAME] looking up triumphantly at a nest in a tree, [CHILD_NAME] pointing in delight. Pet in a heroic upward-gazing 3/4 pose (head up, chest out). Warm, satisfying light.

---

### PAGE 7 — The Wobble (a little jeopardy)

But the adventure wasn't over yet.

The nest was very high. And the smallest baby bird had tumbled to a low branch and couldn't get back up. It cheeped a tiny, frightened cheep.

[CHILD_NAME] couldn't reach. The branch was too wobbly. For a moment, nobody knew what to do.

That's when [PET_NAME] took a deep breath.

*Illustration brief:* The tension beat — a tiny bird stuck on a low branch, [CHILD_NAME] reaching and failing, [PET_NAME] gathering [PRONOUN_POSSESSIVE] courage. Keep it gentle, never scary. Pet shown in a coiled, about-to-act 3/4 stance. *Scary-but-safe: the jeopardy is mild and resolves on the next page.*

---

### PAGE 8 — Save the Day (the climax)

With one MIGHTY, magnificent, never-before-seen leap —

[PET_NAME] sprang up onto the log, balanced like a champion, and gently — oh so gently — nudged the little bird back toward its branch until it hopped up safe and sound.

The baby bird cheeped a happy cheep. Its mother sang a thank-you song. And [PET_NAME] landed back on the grass like the hero [PRONOUN_SUBJECT] truly was.

*Illustration brief:* **THE money shot — the most dynamic image in the book.** [PET_NAME] mid-heroic-leap. **This is the single highest-drift-risk pose: keep it a 3/4 *side* leap (we see the full profile/silhouette, not a foreshortened lunge at the camera).** Motion lines, joyful energy, but the face and markings must stay perfectly on-model. *If any one scene needs a regenerate or a higher-quality tier, it's this one. Brief the pose explicitly to avoid foreshortening.*

*Variant `[CHILD_AGE_BRACKET]` = 3-5:* simplify to one clean action sentence — "With one big, brave jump, [PET_NAME] helped the baby bird back to its branch. Safe!"

---

### PAGE 9 — The Celebration

What a day!

[CHILD_NAME] got the favorite red sock back. The baby bird got home safe. And the whole backyard knew the truth:

[PET_NAME] wasn't *just* a [SPECIES_DESCRIPTOR]. [PET_NAME] was a HERO.

*Illustration brief:* Joyful celebration — [CHILD_NAME] hugging [PET_NAME], maybe a little homemade "hero" medal or a flower crown, the rescued bird family watching happily. Pet in a relaxed, beaming 3/4 view (back to a calm pose — easier to keep on-model for the resolution). Bright, golden, triumphant.

---

### PAGE 10 — Home Again, More Loved

That night, after the greatest adventure of all time, [PET_NAME] curled up next to [CHILD_NAME], tired and happy.

"You're my best friend," whispered [CHILD_NAME]. "And the bravest hero I know."

[PET_NAME] gave a sleepy, contented sigh. Tomorrow might be ordinary again. But tonight, [PRONOUN_SUBJECT] was a legend.

*Illustration brief:* Cozy closing scene — [PET_NAME] and [CHILD_NAME] snuggled together at the end of the day, warm lamplight, peaceful. Pet curled or resting in a soft 3/4 view. This mirrors the cover's warmth but quieter — the "home again" beat.

---

### PAGE 11 — Closing

[PET_NAME] the [SPECIES] —

best friend, brave heart, and the greatest hero the backyard has ever known.

The End… until the *next* amazing adventure.

*Illustration brief:* The closing image — [PET_NAME] and [CHILD_NAME] together, slightly farther back, a sunset-lit "happily ever after" framing. Echoes the cover. Pet in clear 3/4 view, confident and content. Leave room for the "until the next adventure" promise (sets up sequels / other themes as repeat purchases).

---

### BACK COVER — The Hero's Page

*Layout:* A playful "about the hero" page, part keepsake, part fun. Provided with editable fields in the PDF.

**Suggested prompt printed at top of page:**
"All about [PET_NAME], Backyard Hero"

*Optional template lines (fill-in):*
- [PET_NAME]'s real-life superpower: ___________
- The bravest thing [PET_NAME] ever did: ___________
- [PET_NAME]'s next adventure should be: ___________
- Hero rating: ⭐ ⭐ ⭐ ⭐ ⭐

*Illustration brief:* A fun "hero badge" or paw-print medal border around the writing space. Light, celebratory, doesn't compete with the handwritten content. *No generated pet scene needed here — decorative only; not in the 10-slot set.*

---

## Other adventure themes (same skeleton, reskinned)

Each alternate `[ADVENTURE_THEME]` reuses the **identical six-beat skeleton and 10-slot structure** — only the setting, props, and the *flavor* of the climax change. Authoring a new theme is filling the skeleton, not redesigning it.

### The Great Sea Voyage (`sea-voyage`)
- **Ordinary day → call:** A message in a bottle / a treasure map washes up; Captain [PET_NAME] must set sail.
- **Quirk becomes key:** `[SUPERPOWER]` reframed for the sea — "the Best Nose for Buried Treasure," "the Sharpest Eyes on the Seven Seas."
- **Wobble:** A storm / a stuck sailor (a marooned crab, a tangled gull).
- **Climax:** [PET_NAME] dives / leaps to the rescue and finds the treasure.
- **Home:** Sails home a celebrated captain.
- *Illustration note:* tiny captain's hat is fine, but **a hat/costume must never obscure the pet's face or head markings** — likeness first, costume second. Higher consistency risk than the backyard (more varied water/boat poses) — brief 3/4 side poses on deck.

### The Space Rescue (`space-rescue`)
- **Call:** A friendly little alien is lost / a star has gone out; Astronaut [PET_NAME] blasts off.
- **Quirk becomes key:** `[SUPERPOWER]` reframed cosmically — "Super-Sniffing across the galaxy," "the Fastest Paws in Zero Gravity."
- **Wobble:** Floating-away jeopardy, a dark asteroid field (gentle, never frightening).
- **Climax:** A weightless hero leap to catch the alien / relight the star.
- *Illustration note:* a bubble-helmet keeps the face fully visible (good — the face stays on-model); **but floating/zero-g poses tempt extreme foreshortening — explicitly brief side-on floating, not tumbling-at-camera.** This is the **highest-drift theme**; recommend it only once Approach-B consistency is proven on the backyard default.

### The Enchanted Forest (`enchanted-forest`)
- **Call:** The forest's magic is fading / a woodland friend needs help; brave [PET_NAME] ventures in.
- **Quirk becomes key:** `[SUPERPOWER]` as woodland magic — "the Nose that Finds Lost Things," "the Hop that Crosses Any River."
- **Wobble:** A thorny thicket / a grumpy troll-bridge (whimsical, not scary).
- **Climax:** [PET_NAME] finds the hidden glade / restores the magic.
- *Illustration note:* dappled forest light is lovely but busy — keep the pet brightly lit and in clear 3/4 view so it never gets lost in the foliage.

---

## Variants quick reference

### Adventure theme (`[ADVENTURE_THEME]`)
- **backyard-mystery** (default) — cozy, lowest jeopardy, **lowest illustration-consistency risk** (familiar setting, fewer extreme poses). The safe launch theme.
- **sea-voyage** — medium risk (boats, water, costume).
- **enchanted-forest** — medium risk (busy light).
- **space-rescue** — **highest risk** (zero-g poses, foreshortening temptation). Ship last.

### Hero count (`[HERO_COUNT]`)
- **pet-plus** (default) — pet + `[CHILD_NAME]` (+ optional `[SIDEKICK_NAME]`) adventure *together*; the child is a character.
- **pet-solo** — the pet is the lone hero; the child is the reader being told the legend. Reframes the call and expedition pages (the child narrates rather than joins).

### Age bracket (`[CHILD_AGE_BRACKET]`)
- **3-5** — shorter sentences, simpler climax, gentler wobble, bigger art / less text per page.
- **6-8** (default) — the master text above.
- **9-12** — longer sentences, slightly higher-stakes wobble, more wordplay and a wink of humor; can keep the full "until the next adventure" sequel hook.

---

## Production checklist (per order)

Before delivering any PDF, verify:

- [ ] **Pet still recognizable across ALL action scenes** — leap, sniff, expedition, climax all read as the SAME animal as the cover (same markings, ear shape, eye color, coat). **This is the #1 quality gate; a drifted hero is a failed book — regenerate any off-model scene before approval.**
- [ ] All merge fields filled — no `[PET_NAME]` / `[SUPERPOWER]` / `[SIDEKICK_NAME]` left literal anywhere
- [ ] `[SUPERPOWER]` is rooted in the customer's real `[QUIRKS]` / `[FAVORITE_ACTIVITY]` (or a clean fallback) — it should feel like *their* pet's actual talent
- [ ] Pronouns consistent across all pages
- [ ] Correct `[ADVENTURE_THEME]` arc applied; theme props consistent across scenes
- [ ] `[HERO_COUNT]` variant applied — child present/absent and `[SIDEKICK_NAME]` woven in (or cleanly omitted) consistently
- [ ] Age-bracket variant applied (reading level + climax simplicity)
- [ ] No costume/prop obscures the pet's face or head markings on any page
- [ ] Action poses are 3/4-view; no extreme foreshortening on the climax leap
- [ ] Reads aloud start to finish in 4–6 minutes — does the adventure flow and land joyfully?
- [ ] Tone stays joyful and warm — playful, never cheap or clipart-feeling
- [ ] Final PDF is 8.5" × 11", at least 300 DPI
- [ ] File named: `Amazing-Adventures-of-[PET_NAME].pdf`

---

## Quality bar / what to avoid

**Lead with the risk — consistency is the product:**
- **Never ship a book where the hero drifts.** If [PET_NAME] does not look like the same animal — and like the customer's *actual* pet — across every action scene, the core promise is broken. This outranks every writing note below. Regenerate (Approach B, accumulating references) until the hero holds, or hold the order.

**Never:**
- Use "fur baby"
- Use clichés or filler ("little did they know…", "and they all lived happily ever after" verbatim)
- Use emojis or icons in the body text (the back-cover star rating is the one decorative exception)
- Make the jeopardy genuinely frightening, sad, or perilous — the wobble must be mild and resolve safely (this is a joy product, not a thriller)
- Let a costume, hat, or prop hide the pet's face or markings
- Make the climax a foreshortened lunge-at-camera pose
- Invent a superpower untethered from the pet's real quirk when the customer gave us one — specificity is the whole charm
- Bright primary-color, clipart, or cartoon-flat rendering — stay watercolor

**Always:**
- Make the pet's *real* quirk the thing that saves the day (the customer should feel seen)
- Use the pet's name and the word "hero" generously — kids love a named hero
- Keep it readable aloud, fun, and re-readable
- Give every action scene a clear 3/4 dynamic pose with the face fully visible
- End on warmth and a sequel-hook ("until the next adventure") — leaves room for repeat purchase

---

## Illustration & typography style guide

This is the most important section of the spec — **for Story 8, the illustration discipline IS the product.** Expanded heavily.

### Pet consistency across action poses (the central craft problem)

- **Use Approach B — accumulating reference images.** Generate the cover/reference first; **feed each *accepted* scene back into the reference set for the next generation.** Do NOT use Approach A (independent scenes from the photo alone) for this book — independent generation lets each dynamic pose drift on its own, and an adventure is nothing but dynamic poses. The accumulating set keeps the model anchored to in-style, in-character examples as the action escalates.
- **Lock the reference, never drop the anchors.** The original uploaded photo **and** the locked reference illustration stay in the reference set for *every* scene, even as accepted scenes accumulate. `gpt-image-2` supports up to 16 references; a 10-slot book never approaches that ceiling, so there is no reason to drop the anchors.
- **Generation order matters.** Generate calm/establishing scenes early (cover, Pages 1–2, 9–11) to build a strong, on-model reference bank *before* attempting the hardest poses (the climax leap, Page 8). Save the highest-risk pose for last, when the most references are available to anchor it — and be ready to bump that single scene to a higher quality tier or regenerate it.
- **Poses: 3/4-view, side-on for action.** Show motion through stride, ears, tail, and the environment — **not** by aiming the pet at the camera. **Avoid extreme foreshortening** (a paw or muzzle thrust toward the lens): foreshortening is where the face distorts and likeness collapses. The climax leap must be a 3/4 *side* leap (full profile/silhouette visible).
- **Costumes second, likeness first.** Hats, bandanas, helmets, and props are welcome for theme flavor, but **must never obscure the face, eyes, ears, or signature markings.** A bubble-helmet (face fully visible) is ideal; a hat pulled over the eyes is forbidden.
- **Markings are the moat.** Brief every scene with the pet's specific breed markings, eye color, coat texture, and body proportions — these are the #1 thing that drifts and the #1 thing the customer checks against their real pet.

### Child & sidekick rendering
- Keep the child's (and human sidekick's) face slightly stylized / 3/4 view or from behind — avoids uncanny-valley and lets any child see themselves. A second-pet sidekick gets the same consistency care as the hero but is secondary; it does not need its own accumulating reference set.

### Style & palette
- **Style:** soft warm watercolor (the Quietly Kept house style) — but **dynamic**: looser, more energetic brushwork than the gentle Story-1 grief palette, with motion and brightness. Playful, never flat-cartoon or clipart.
- **Palette:** warm, sunny, saturated-but-soft; golden afternoon light; bright skies; no harsh contrasts, no pure black. Adventure energy without garish primary colors.
- **Composition:** generous, dynamic, full-bleed-feeling art slots on the `narrative` layout; the action should feel big even within the existing page template.

### Typography (reuses the house system)
- Same self-hosted font stack as Stories 1–3 (Fraunces display / Lora body) — no new fonts. Display titles can sit a touch larger and more energetic for the adventurous cover, but stay within the existing tokens. 8.5" × 11", ≥300 DPI, existing print-CSS geometry.

---

## Customer-facing description (for product page)

> Turn your pet into the hero of their very own adventure. **The Amazing Adventures of [PET_NAME]** is a joyful, personalized 12-page picture book where your *actual* pet — illustrated from a photo you upload — stars in a fun "save the day" quest alongside your child. Choose the adventure (a backyard mystery, a great sea voyage, a space rescue, an enchanted forest), tell us your pet's real-life quirk, and we'll make it their superpower.
>
> Unlike other personalized pet books that pick a generic breed from a list, every illustration is painted to look like *your* pet — same markings, same floppy ear, same goofy face. Delivered as a print-quality PDF, lovingly hand-finished within 24–48 hours.
>
> The gift for the kid who thinks their dog is already a legend. Because they're right.

---

## Pricing

| Tier | Price | Notes |
|------|-------|-------|
| **Story 8 PDF** | **$32–35** | Recommend **$34** to launch — comfortably under Petventures ($44.99), at/just above Wonderbly's $34.99, justified by the real-photo likeness Wonderbly can't offer. |

**Rationale:** the market supports it. Wonderbly's generic-breed adventure is $34.99; Petventures' is $44.99 with 143 reviews. Our differentiator (the customer's *actual* pet, not a breed-picker) is a premium feature, so pricing at the top of the $32–35 band is defensible — **but only if the likeness holds.** Set the catalog `priceUsd` and the Lemon Squeezy variant price to the same number (per `new-book-playbook.md` Step 4/5). Higher generation cost (Approach B = more reference-heavy calls per book) eats a little more margin than Story 1 — factor that in, but it's still well within a $34 price.

---

## Notes for the ghostwriter / reviewer

This draft is the starting point. Areas where I'd most welcome an edit:

1. **The superpower mechanic (Pages 2, 4–8)** — this is the soul of the book. Does the `[SUPERPOWER]`-from-real-`[QUIRKS]` reframe land as charming and specific, or does it read as generic? Pressure-test the fallback chain (blank superpower → derive from activity → species stock) so a thin customer input still produces a delightful, on-theme hero.
2. **The wobble (Page 7)** — is the jeopardy pitched right for a joy product? It must create a real "uh oh!" for a 6-year-old without tipping into scary or sad. Calibrate per age bracket.
3. **The climax leap (Page 8)** — the writing and the art both peak here. Confirm the copy gives the illustrator a clean, single, *side-on* action to render (not an ambiguous tangle that invites foreshortening).
4. **Theme parity** — read the three alternate themes against the backyard default. Do they all hit the six beats with equal warmth, or does one feel thinner? Author the sea-voyage theme to full v1 next, since it's the most-requested "adventure" flavor after a backyard romp.
5. **The sequel hook** — "until the next adventure" is deliberate (repeat purchase across themes). Does it feel like a warm promise or a sales tease? Tune the wording.
6. **`[HERO_COUNT]` = pet-solo** — read the whole book in solo mode. Does removing the child as a character still work, or does it lose warmth? Some buyers (gift-givers, single-pet households) will want it.

**Most important reviewer instruction:** before any copy polish, **prototype the 10-slot illustration set on a real test pet using Approach B and look at it.** If the hero drifts across the action scenes, this book is not shippable no matter how good the words are — the illustration prototype is the go/no-go gate for the whole concept.

**Total ghostwriter + illustration-prototype budget guidance:** $150–250 for copy polish across themes, **plus dedicated engineering/prototype time on the consistency pipeline** — which is the real cost of this book and should not be underestimated.
