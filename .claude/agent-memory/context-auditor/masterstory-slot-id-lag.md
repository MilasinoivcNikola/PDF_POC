---
name: masterstory-slot-id-lag
description: A masterstory template's illustration-slot ids (and "figureless" art options) lag the registry/spec once a book is actually built — the imagery PR is where it bites
metadata:
  type: feedback
---

A `masterstories/story-N-master-template.md` is written **before** the book is built, so its
"Pipeline fit & build notes" + per-page illustration briefs cite **provisional slot ids** and
**provisional art shapes** that the real build supersedes. Two recurring drifts surface on the
**imagery PR** (the first PR that actually keys generation off the slot ids):

1. **Slot-id naming.** The template guesses the slots reuse the *layout's* prefix
   (e.g. Story 4's template said the illustration slots were `letter-cover` / `letter-page-4`,
   borrowing Story 2's `letter` layout names). But the **text/registry PR** (PR-20 for Story 4)
   deliberately gives each product **distinct slot ids** (`talk-cover` / `talk-page-4`) so slots
   never collide across products in the shared manifest/`manifestToImageMap` union. Note the
   template often *conflates* layout-id and slot-id on the cover line ("`letter-cover` layout;
   `letter-cover` illustration slot") — the **layout** half is right, the **slot** half is stale.
   Canonical source once built = the registry (`lib/story/story-N.ts` `*_SCENE_PAGE_IDS` /
   `illustrationSlots`), NOT the template.

2. **Art shape.** The template offers options ("single subject **or figureless** joy wash");
   the **PM decision recorded in the feature spec** locks one (Story 4 page-4 = **reference-anchored**,
   pet appears, photo passed → `generateSceneIllustration`/`images.edit`, NOT the figure-free
   `generateImageFromPrompt` path Story 2's belief wash used). Once locked, the template's "or
   figureless" line now misleads anyone using it as the imagery brief.

**Why this matters:** these aren't introduced by the imagery branch — they're pre-existing
template staleness the text/registry PR left unaddressed — but the imagery PR is where they
become *actively misleading* (it's the first consumer of the slot ids + art decision). Per
coding-standards' same-PR rule, the right fix is **update the template** (3–4 line touches:
the two Pipeline-fit slot bullets, the two per-page illustration-brief slot citations, and the
"or figureless" → reference-anchored wording), not change the code.

**How to apply:** on any future book's **imagery** branch, diff the template's slot-id /
art-shape language against the registry's actual `*_SCENE_PAGE_IDS` and the spec's PM decision.
Expect lag; cite the exact template lines. The registry + feature spec win (newest decision).
See [[canonical-doc-map]] (masterstories own *wording/quality bars*, but the registry owns
*slot identity*), [[new-book-playbook-pr10]], [[letter-layout-reuse-renderer-touch]].
