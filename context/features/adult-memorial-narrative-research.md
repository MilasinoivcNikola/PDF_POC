# Research Spec: An adult-facing, pet-only narrative memorial title (no child)

> **Type:** Research / discovery spec — this is the **precursor** to a full implementation
> spec, not an implementation plan. Its job is to define everything that must be decided and
> checked before we can write the real PR-level spec(s) and author the book. **No code, no
> branch** until the open questions below are answered and a full spec is approved.
> **Status:** Open for research.

## The idea (hypothesis)

A **narrative illustrated memorial storybook for an adult who has lost a pet, with no child
as a character** — the pet alone on every page, in an owner's (or gentle third-person) voice.
The illustrations are 100% pet-only (Approach A, photo-anchored), so the "will it look like
MY pet?" promise carries the whole book.

This came out of the 2026-06-17 discussion on whether Story 1 / Story 8 could render
"just the pet." Story 8's answer was a toggle fix (see
[story8-pet-solo-illustrations.md](../fixes/story8-pet-solo-illustrations.md)). Story 1's
answer is: the child is **structural** (see *Key findings* below), so a pet-only version is
not a toggle or a stripped Story 1 — it is **a new title**. This spec scopes the research for
that new title.

## Why — the catalog gap

| | **Narrative storybook** | **Letter** |
|--|--|--|
| **Living / celebration** | Story 6 *While You're Still Here* (no child); Story 7 *Welcome Home*; Story 8 *Amazing Adventures* | Story 4 *If Your Pet Could Talk* |
| **Loss / memorial** | **Story 1 *Saying Goodbye* — requires a CHILD** ← only narrative memorial | Story 2 *A Letter from Your Pet*; Story 5 *A Letter to Your Pet* |

The empty cell is **narrative + memorial + no child**. An adult griever who wants an
illustrated *story* of their pet (not a letter, not a child's grief book) has no product
today. Target audience: childless owners, couples, single owners — a large share of pet-loss
buyers. This is the gap to validate.

## Key findings already established (so research doesn't re-litigate them)

- **Story 1's child is structural, not decorative.** `childName` is hard-required
  ([draft.ts](../../lib/session/draft.ts)); the child appears in ~10 of 12 text pages and ~6
  of 13 illustration briefs; the entire grief arc (pages 8–11) is *about the child's
  feelings*; the age-bracket variant system exists only to pitch language to the child's
  developmental stage. ⇒ Removing the child = wholesale master-text rewrite + new briefs +
  new validation + a dead age system. **Do not fork Story 1.**
- **Closest structural base = Story 6** *While You're Still Here* — already a child-free
  narrative storybook in an owner's voice, reusing Story 1's `cover`/`narrative`/`closing`
  layouts (+ the now-art-bearing `dedication`/`love` pages). A memorial version is, roughly,
  "Story 6 retold in past tense." That is the most efficient starting point to evaluate.
- **Stories 2 & 5 are letters**, not narratives — different format, so a narrative memorial
  does **not** duplicate them, but cannibalization must still be checked (they serve the same
  griever).
- Adding a sellable title is a **solved, repeatable process** — the
  [new-book-playbook.md](../new-book-playbook.md) is the file-path recipe (registry entry →
  text engine → imagery → wizard → storefront → intake), normally shipped as PR-A
  (text+registry+imagery) then PR-B (wizard+storefront+intake), exactly like Stories 6–9.

## Research questions — what must be checked before a full spec

### 1. Product & positioning (PM-owned)
- [ ] **Demand / market:** is there evidence adult grievers want a *narrative* memorial vs
      the existing letters? Competitor scan (the commerce-roadmap deep-research approach).
- [ ] **Cannibalization:** does this pull sales from Stories 1, 2, 5 — or grow the pie by
      serving the no-kids buyer Story 1 currently excludes?
- [ ] **Price band:** where in the $20–40 range (Story 1 = $29, the letters = $29, Story 6 =
      $32)? Memorial narrative likely top-of-band like Story 6.
- [ ] **Title / working name:** e.g. *"In Loving Memory of [PET]"*, *"The Story of [PET]"*,
      *"A Life Well Loved"* — needs PM + masterstory authoring.

### 2. Format & narrative design
- [ ] **Voice:** owner first-person ("you always…") vs gentle third-person ("[PET] loved…").
      Story 6 is owner-voiced present tense; decide the memorial voice/tense.
- [ ] **Reuse Story 6 beats (past tense) vs author fresh master text?** Evaluate a Story-6
      retelling against a purpose-written arc (a life remembered: who they were → the
      ordinary joys → the bond → the goodbye → what remains → love that doesn't end).
- [ ] **Page count** (Story 1 = 12, Story 6 = 8) and whether it carries a `dedication` /
      `love` / closing page.
- [ ] **Quality bar:** the non-negotiable product rules carry over — say **"died," never
      "passed away"**; end on love; no euphemism/filler (enforced by the merge/variant
      tests). Capture in the masterstory.

### 3. Variant dimensions (drives the text engine + wizard)
- [ ] Which apply: **death-type** and **belief-frame** (as in Stories 1/2/5) — yes, almost
      certainly. **Age bracket** — N/A (no child) → confirm it's dropped. **Species** voice
      + the `speciesNoun` "other"→"friend" rule. **Other pets at home?** Relationship
      (single/couple) like the letters? Enumerate the final dimension set.

### 4. Engine reuse & illustration plan (Craft Areas 1 & 2)
- [ ] **Layouts:** can it reuse Story 1's `cover`/`narrative`/`closing` (+ `dedication`/`love`
      via the existing per-story page-id allow-lists) like Stories 6/8/9, leaving **all
      existing PDFs byte-identical**? Confirm no new `PageLayout`.
- [ ] **Illustration slots:** all **pet-only**, Approach A (photo-anchored), one per
      narrative beat; pick the `heroSlots` (cover HIGH, +1 emotional bookend?) for the locked
      mixed `PRODUCTION_QUALITY`. Derive `illustrationCount` from `illustrationSlots`.
- [ ] **Closing-page treatment:** reuse the cover-medallion fallback
      (`CLOSING_COVER_FALLBACK_PAGE_IDS`) or a real closing slot? (Story 7/9 pattern.)

### 5. Wizard & intake (Craft Area 3)
- [ ] New `/create` step set or reuse pet + memories + tone steps (no child step). Required
      fields (pet name, photo, species, + the memorial specifics) — no `childName`.
- [ ] **Playbook Step 2a:** widen the order/disk `inputs` unions (`Order.inputs`,
      `AnySession`) + the registry/draft/route partition — the 5-site wiring the playbook
      lists. Note it now so the future author doesn't miss it.

### 6. Commerce wiring
- [ ] New `Product` entry: `audience: "loss"`, price, placeholder LS variant, `displayTitle`
      if needed.
- [ ] **Sample set:** pick the species (a not-yet-used breed for visual variety vs the
      Story-1 pug / Story-5 senior dog), commit a `uploads/sample-photos/` photo, author the
      fixture, run the standard mixed-tier `proto:sample` → `sample-capture` to produce web
      JPGs + slim `preview.pdf` + `source-photo.jpg`, wire `sampleImages`/`previewPdf`/
      `sourcePhoto`. Budget the paid run (~$0.65–1, like the other samples).
- [ ] `book-questions.ts` entry (questionnaire + fixture-pinned worked example) for the
      book-detail prep section.

### 7. Risks / open decisions
- [ ] Tone risk: a pet-only memorial narrative must not read like a downgraded Story 1 or a
      prose Story 5 — it needs its own reason to exist (the *illustrated life story*).
- [ ] Does it want an optional **child mention** (dedication only) without the child as a
      character — or strictly no child at all? (Decide; affects fields.)
- [ ] Confirm it doesn't muddy the storefront's two-worlds split or the Story 2↔5 companion
      framing.

## Deliverable of this research

When the above are answered, produce the full implementation spec(s) — most likely split as:
- **PR-A:** master text + variants + registry registration + pet-only Approach-A imagery
  (engine produces a correct PDF from the new session; not yet sellable).
- **PR-B:** wizard step(s) + storefront card + order intake (creatable + sellable).

…following the [new-book-playbook.md](../new-book-playbook.md) and the Story 6–9 milestones
as the worked precedent.

## References
- [new-book-playbook.md](../new-book-playbook.md) — the file-path recipe.
- [commerce-roadmap.md](../commerce-roadmap.md) — Phase 5 "build more books"; pricing band.
- `context/masterstories/story-6-master-template.md` — closest structural base to evaluate.
- Story 6 history entry — the "living tribute, narrative, no child" build to mirror.
- [story8-pet-solo-illustrations.md](../fixes/story8-pet-solo-illustrations.md) — the sibling
  "pet-only" decision that stayed a toggle (contrast: why this one is a new title instead).
