---
name: cost-tier-rule-canonical
description: The LOW-default cost-tier rule is now nuanced (mixed-tier production policy); two doc spots restate it and drift independently
metadata:
  type: project
---

The AI cost-tier rule changed from "LOW for everything (dev AND real book runs)"
to a **two-part rule** (feature `mixed-tier-illustration-quality`, branch
`feature/mixed-tier-quality`, 2026-06-15):

1. **LOW is the *engine default*** — for dev/prototype iteration and bare
   `generateAllIllustrations(session)` calls (and sample generation).
2. **Real production book runs use the locked MIXED policy** — `PRODUCTION_QUALITY`
   in `lib/ai/generate.ts`: hero slots (`heroSlots`, default = title's own cover
   `illustrationSlots[0]`) → HIGH, interiors → MEDIUM, reference → LOW. ~$1/book
   (vs ~$3 all-HIGH). Passed explicitly by the worker (`lib/order/worker.ts`) and
   the operator repaint route. Per-page tier = pure `qualityForPage()`.

**Why this matters for audits:** the phrase "LOW is the default for real book runs"
is now WRONG. The rule is restated in **multiple doc spots that drift independently**:
- `coding-standards.md` AI-illustration section (the canonical owner — updated in-branch).
- `new-book-playbook.md` Step 6 "Samples" (~L273) — said "Low is the default cost tier
  **for real book runs**". On a mixed-tier audit this was stale: LOW is right for *samples*,
  wrong for *real book runs* (those go through the worker w/ PRODUCTION_QUALITY).

**Update (PR-0 `feature/story-samples-foundation`, 2026-06-15): storefront SAMPLES
moved from LOW → mixed `PRODUCTION_QUALITY`.** The new "ship the full storefront sample
set" path (shared `scripts/sample-run.ts` + `sample-capture.ts`, `proto:sample`) generates
each title's example book at the SAME `PRODUCTION_QUALITY` the worker ships, so samples
match what a customer receives. This makes the OLD Step-6 "Samples" block (~L271-279,
"Low is the default cost tier **for sample generation** … ~$0.07/book … deliberately
separate from this LOW sample path") **internally contradict** the new PRODUCTION_QUALITY
sample block 20 lines below it. So Step 6 now has THREE tier stories side-by-side: (1) old
LOW-sample intro, (2) new PRODUCTION_QUALITY standard path, (3) old uniform-HIGH
`previewPdf` exception. Future-dev-misleading — flag the LOW-sample wording as superseded.

Also stale: `coding-standards.md` lib/catalog blurb (~L154-155) calls `previewPdf` a
"deliberate one-time **HIGH-tier** run (Story 1 only today)". The new standard gives EVERY
title a `previewPdf` from a one-time MIXED run, not HIGH. Still literally true *today*
(PR-0 wires nothing), but misleads once per-story PRs (02–09) land.

**How to apply:** on any AI-tier OR sample branch, grep both `coding-standards.md` AND
`new-book-playbook.md` (Step 6) for "real book run" / "default cost tier" / "sample
generation" / "HIGH-tier run" wording and check it distinguishes engine-default (LOW),
sample/production policy (mixed PRODUCTION_QUALITY), and the legacy uniform-HIGH previewPdf
exception. The `heroSlots` default is the title's OWN cover (`illustrationSlots[0]`, e.g.
`letter-cover`), NOT a literal `["cover"]` — an early draft said `["cover"]`; that wording
is stale if it survives. See [[canonical-doc-map]] and [[product-contract-field-additions]].
