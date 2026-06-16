---
name: ai-honesty-copy-review-calibration
description: fix/ai-honesty-copy presentation-only copy reconciliation — the "human-paints" denylist grep that proves the goal, and the kept-on-purpose exceptions
metadata:
  type: project
---

The `fix/ai-honesty-copy-reconciliation` fix (2026-06-16) reconciled the public
site to one truthful story: AI paints **from your photo**, a person **finishes by
hand**. Clean PASS.

**Why:** the site contradicted itself — several pages said "painted by hand"
(implies a human artist) while the landing FAQ + /policies disclose AI. PM kept the
AI disclosure; the only false claim ("a human paints the art") was removed.

**How to apply (the load-bearing check for any future copy-honesty pass):** the
goal is verified by a denylist grep, not by reading the diff. Grep the public
surface (`app/(public)`, `components/site`, `lib/catalog`) for:
`by hand|hand-?painted|hand-?drawn|artist|paint.{0,15}by (a )?(human|person|hand)`.
The ONLY survivors that are allowed are the intentional human-*finish*/review
phrases — confirmed-kept-on-purpose, do not flag:
- "Finished by hand" / "finished by hand" (kicker, footer tagline, fact label)
- "By hand, in 24–48 hours" (book-detail fact-row VALUE, paired with label "Finished")
- "finish it by hand" (confirmation body)
- "lovingly hand-finished" (catalog `products.ts` descriptions — truthful, not in scope)
- "painted/paint ... from your photo", "every painting ... drawn from the photo",
  "we do the writing and the painting", "helps us paint the cover/scenes" — all neutral
  process language, all truthful. NOT a human-paints claim.
AI is disclosed only in `app/(public)/policies/page.tsx:42` ("illustrated with the
help of AI image generation") + the landing FAQ — intentionally the single place.

**Cross-feature trap for copy diffs:** `app/(public)/page.tsx` on this branch ALSO
carried a *pre-existing, unrelated* working-tree restyle by the PM (em-dashes `—`
swapped to commas/hyphens throughout the landing copy). It is NOT part of the fix —
do not score it against the branch. (One byproduct: `Yes - it really is them.` uses a
bare hyphen where an em/en-dash reads better — a PM-style choice, mention as an aside
at most, never a blocker.) When a copy fix shares a file with an in-flight PM restyle,
separate the two before flagging.
