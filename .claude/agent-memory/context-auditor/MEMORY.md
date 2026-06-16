# context-auditor — project memory

_Index of saved memories (one line each: `- [Title](file.md) — hook`)._

- [Canonical doc map](canonical-doc-map.md) — which standing doc owns which decision; roadmap supersedes plan's "out of scope" lines
- [Deploy-surface & secrets lag](deploy-surface-secrets-lag.md) — recurring drift: boundary text + secrets/env note lag each new public API route + new secret
- [Supabase Auth (PR-08)](supabase-auth-pr08.md) — admin auth gate built; settled supersessions + the 3 doc lags (deferred-decision line, @supabase/ssr dep, lib/supabase/ map)
- [Deferred decisions blocking PRs](deferred-decisions-blocking-prs.md) — refund/remake, AI-honesty, pricing keyed to a blocking PR; check whether the named PR actually settled it (PR-09: still placeholder)
- [New-book playbook (PR-10)](new-book-playbook-pr10.md) — context/new-book-playbook.md is the canonical add-a-book recipe; the citations to re-verify on a future new-book branch
- [Shared-layout reuse touches the renderer](letter-layout-reuse-renderer-touch.md) — reusing letter/dedication/love legitimately edits pages-story2.tsx OR pages.tsx via a per-story page-id allow-list (3x now); "reuse = no renderer touch" wording stale
- [Byte-identity template-test list lag](byte-identity-template-test-list-lag.md) — coding-standards ~L259 hard-lists only template.test + story2; story4/story6 tests exist → enumeration stale; art-allow-list convention also unrecorded
- [Masterstory slot-id / art-shape lag](masterstory-slot-id-lag.md) — a book's template guesses slot ids (`letter-*`) + offers "figureless"; the registry (`talk-*`) + spec (reference-anchored) win — bites on the imagery PR
- [Playbook undocumented conventions](playbook-undocumented-conventions.md) — page-id prefix + Story-1-shape `slots+1` reference-anchor accounting followed in code (S4/5/6) but not in new-book-playbook.md
- [Playbook Order.inputs union omission](playbook-order-inputs-union-omission.md) — every sellable book widens 3 inputs-unions (PR-22/24/26); reuse-guarantee omits it; nice-to-have not blocking
- [Milestone-completion CLAUDE.md @-load cleanup](milestone-completion-claudemd-load-cleanup.md) — the sellable PR-B that completes a story → CLAUDE.md's "Remove on milestone completion" masterstory @-load is now due (on-merge, step 10)
- [Playbook prototype-exception lag](playbook-prototype-exception-lag.md) — Story 8 spec + masterstory cite an "illustration-prototype exception" in new-book-playbook.md that the playbook doesn't actually contain; +env-file-if-exists is built-in (not a dep)
- [CLAUDE.md masterstory @-load lag](claudemd-masterstory-load-lag.md) — recurring: CLAUDE.md masterstory list + in-progress @-load convention lags each new story PR-A (Story 8 had zero CLAUDE.md mention)
- [Story 9 spec vs masterstory](story9-new-baby-spec-vs-masterstory.md) — New Baby build = 9 leaves & dropped `closing` layout (folded into Page-7 `love`); template still says "8-10 pages"/`closing` — stale, update template
- [components/ dir enumeration lag](components-dir-enumeration-lag.md) — coding-standards ~L59 hard-lists shared-UI subdirs `{wizard,preview}`; new `components/<area>/` (e.g. site) makes the list stale; brand single-source lives only in lib/brand.ts comment, not docs
- [Catalog sampleImages may be empty](catalog-sampleimages-empty-allowed.md) — a Product can ship sampleImages [] (card → placeholder); no doc asserts non-empty so emptying isn't drift; card kicker stays page-local, not in products.ts
- [Debt-ledger deferral recording](debt-ledger-deferral-recording.md) — recurring: a spec that says "note in debt.md if still wanted" must add the row in-branch; grep debt.md and flag the omission (update doc, not code)
- [Rate-limit figure drift](rate-limit-figure-drift.md) — "~5 image-input/min" is stale (real Tier-2 = 20/min); commerce-roadmap.md:29 still says ~5/min (low-pri, illustrative not binding); grep 5/min on AI-throughput branches
- [Product contract field additions](product-contract-field-additions.md) — new optional Product field (previewPdf/audience/displayTitle) lags playbook Step-4 list (real) + coding-standards lib/catalog blurb (nice-to-have); one-time HIGH sample run ≠ cost-tier violation
- [Cost-tier rule now two-part](cost-tier-rule-canonical.md) — LOW=engine default, real book runs=mixed PRODUCTION_QUALITY; "LOW for real book runs" wording drifts in playbook Step-6 too, not just coding-standards; heroSlots default = title's own cover not literal ["cover"]
- [previewPdf series-backfill lag](previewpdf-series-backfill-lag.md) — each story-samples-NN PR adds previewPdf to one title; playbook Step-4 bullet "only story-1-book carries one" goes stale incrementally (coding-standards L152-158 already title-agnostic = fine)
- [Sample-fixture text workarounds](sample-fixture-text-workarounds.md) — samples PR shapes fixture text to dodge a latent template-grammar bug instead of fixing it → debt-log the latent bug (Story-9 "settles in at" double-prep on bird/rabbit)
