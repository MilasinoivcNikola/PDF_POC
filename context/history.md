# Project History

A running log of completed features, in order. **Tiered (feature 27):** this file is
the lean index — one line per entry. The full multi-paragraph write-up for each entry
lives verbatim in [`context/history/`](./history/) (`YYYY-MM-DD-slug.md`) and is loaded
on demand via the `→` link. **Adding an entry** (`/feature complete`): write the full
write-up to a new file under `context/history/`, then append one index line here under
the right milestone. Durable deferrals from the work go in [`context/debt.md`](./debt.md),
not buried in the write-up.

---

## Milestone 1 — Story 1 PDF foundation

- 2026-06-07 — Project Scaffolding & Design System — `feature/scaffolding` (68e8a7f) — Next.js 15 + Tailwind app, *Quietly Kept* design system ported, full directory skeleton + 501 stub routes → [archive](history/2026-06-07-project-scaffolding-and-design-system.md)
- 2026-06-07 — Session Types & Storage — `feature/session-types` (e667d2c) — the shared Story-1 data contract (`StoryDraft`/`StorySession`), pure mappers, localStorage + disk persistence → [archive](history/2026-06-07-session-types-and-storage.md)
- 2026-06-07 — Story Master Text, Merge & Variants — `feature/story-master-text` (57f5458) — pure `resolveStory(session)`: master text as data + merge engine + age/death/belief variants, no surviving `[FIELD]` → [archive](history/2026-06-07-story-master-text-merge-and-variants.md)
- 2026-06-07 — PDF Template & Print CSS — `feature/pdf-template` (1fc9e0e) — `renderStoryHtml`: self-contained 14-page print HTML, base64-embedded fonts, print CSS → [archive](history/2026-06-07-pdf-template-and-print-css.md)
- 2026-06-08 — Fix: Page 2 / Page 9 story-merge grammar — `fix/story-merge-grammar` (7c70724) — two merge-layer grammar bugs (gerund "can chasing", doubled "eyes") fixed before completing feature 05 → [archive](history/2026-06-08-fix-page-2-page-9-story-merge-grammar.md)
- 2026-06-08 — Puppeteer PDF Renderer & CLI — `feature/pdf-renderer` (31f1f48) — `renderStoryPdf` via headless Chrome + the `render:test` CLI → real PDF bytes — **completes Milestone 1** → [archive](history/2026-06-08-puppeteer-pdf-renderer-and-cli.md)

## Milestone 2 — AI reference illustration

- 2026-06-08 — OpenAI Client & Reference Illustration — `feature/ai-reference-illustration` (27d9161) — `gpt-image-2` integration + `generateReferenceIllustration` (photo → stylized reference of the same animal) — **completes Milestone 2** → [archive](history/2026-06-08-openai-client-and-reference-illustration.md)

## Milestone 3 — Scene pipeline

- 2026-06-08 — Scene Pipeline & Pet Consistency — `feature/scene-pipeline` (cf180c8) — full photo→14-illustration→PDF pipeline, pet consistency (Approaches A/B/C), caching, retry/concurrency — **the "wow", completes Milestone 3** → [archive](history/2026-06-08-scene-pipeline-and-pet-consistency.md)

## Milestone 4 — Wizard

- 2026-06-08 — Wizard UI — `feature/wizard-ui` (f335e16) — six-step browser wizard, Context+localStorage, required-7 gate, writes a complete `StorySession` to disk → [archive](history/2026-06-08-wizard-ui.md)
- 2026-06-08 — Generation Progress & Orchestration API — `feature/generation-progress` (b59011e) — Generate→pipeline wiring, disk-polling progress screen, TOCTOU idempotency guard — **completes Milestone 4** → [archive](history/2026-06-08-generation-progress-and-orchestration-api.md)

## Milestone 5 — Preview & download

- 2026-06-08 — In-Browser Preview & PDF Download — `feature/preview-and-download` (446d960) — in-browser book + streamed print-quality PDF + per-page repaint, one shared `pages.tsx` — **completes Milestone 5** → [archive](history/2026-06-08-in-browser-preview-and-pdf-download.md)

## Milestone 6 — Polish & iteration

- 2026-06-08 — Typography & Layout Pass — `feature/typography-pass` (7b483b8) — print-quality drop-cap / petal-divider / keepsake-frame pass, screen↔PDF parity, exactly 14 pages held → [archive](history/2026-06-08-typography-and-layout-pass.md)
- 2026-06-08 — Inline Preview Text Editing — `feature/preview-text-edit` (890d064) — edit your own free-text/names on the preview → re-merge → re-render ($0), Option A → [archive](history/2026-06-08-inline-preview-text-editing.md)
- 2026-06-09 — Preview ↔ PDF Image Parity & True-Scale Preview — `fix/preview-pdf-image-parity` (5caf5ed) — five CSS fixes: PDF crop parity + a true-scale (zoom) WYSIWYG preview → [archive](history/2026-06-09-preview-pdf-image-parity-and-true-scale-preview.md)
- 2026-06-09 — Input Photo Downscale — `feature/input-photo-downscale` (10c3873) — cap the uploaded photo ≤1024px client-side (canvas), cheaper references, no new dependency → [archive](history/2026-06-09-input-photo-downscale.md)
- 2026-06-09 — Switch Scene Generation to Low Tier — `feature/low-tier-images` (ba3b24b) — scene default Medium→Low; QA verdict: keep Low (~10× cheaper, indistinguishable) → [archive](history/2026-06-09-switch-scene-generation-to-low-tier.md)

## Milestone 7 — Story 2 ("A Letter from [PET_NAME]")

- 2026-06-09 — Multi-Story Engine Generalization — `feature/multi-story-engine` (1f6841c) — Phase 0 keystone: product-agnostic registry + `storyType` + `layout` dispatch, Story-1 byte-identical → [archive](history/2026-06-09-multi-story-engine-generalization.md)
- 2026-06-09 — Story 2: Master Text, Merge & Variants — `feature/story2-text` (04335dc) — `resolveStory2`: the 6-page first-person-pet letter text engine + all variant dimensions → [archive](history/2026-06-09-story-2-master-text-merge-and-variants.md)
- 2026-06-09 — Story 2: Letter PDF Template & Print CSS — `feature/story2-letter-template` (3b25d75) — 6-page letter PDF + new `letter` layout + print CSS, "white space is the design" → [archive](history/2026-06-09-story-2-letter-pdf-template-and-print-css.md)
- 2026-06-09 — Story 2: Premium Imagery — `feature/story2-imagery` (97318ae) — Story 2's 2 Premium images (cover portrait + figure-free belief wash), registry-driven orchestration → [archive](history/2026-06-09-story-2-premium-imagery-cover-portrait-belief-wash.md)
- 2026-06-09 — Story 2: Wizard Inputs & Landing Story Picker — `feature/story2-wizard` (86ee171) — landing story picker + the Story-2 wizard, product-aware chrome, Story-1 unchanged → [archive](history/2026-06-09-story-2-wizard-inputs-and-landing-story-picker.md)
- 2026-06-10 — Story 2: In-Browser Preview & PDF Download — `feature/story2-preview-download` (2162185) — Story-2 single-column preview + `Letter-from-[PET_NAME].pdf` — **completes Story 2** → [archive](history/2026-06-10-story-2-in-browser-preview-and-pdf-download.md)

## Commerce build (PRs 01–10)

- 2026-06-10 — Commerce PR-01: Order Model & Supabase Data Layer — `feature/order-model-supabase` (a6a9969) — `Order` + 10-state machine + server-only Supabase data layer (the data spine) → [archive](history/2026-06-10-commerce-pr-01-order-model-and-supabase-data-layer.md)
- 2026-06-10 — Commerce PR-02: Product Catalog & Pricing — `feature/product-catalog` (337ccf0) — registry→sellable `Product` catalog, pure/client-safe, registry-derived `illustrationCount` → [archive](history/2026-06-10-commerce-pr-02-product-catalog-and-pricing.md)
- 2026-06-10 — Commerce PR-03: Public/Operator Split + Env Gate — `feature/public-operator-split` (dfe79e8) — public/operator route groups + `DEPLOY_TARGET` gate + boundary test (the security spine) → [archive](history/2026-06-10-commerce-pr-03-public-operator-split-env-gate.md)
- 2026-06-10 — Commerce PR-04: Public Storefront — `feature/storefront` (8fa8fe2) — public marketing + `/books` catalog + order stub + policies; `lib/story/scenes.ts` extraction → [archive](history/2026-06-10-commerce-pr-04-public-storefront.md)
- 2026-06-11 — Commerce PR-05: Order Intake + Photo Upload — `feature/order-intake` (67aa6bb) — first public write: order form → `pending_payment` order + photo to Supabase, no charge/gen → [archive](history/2026-06-11-commerce-pr-05-order-intake-photo-upload.md)
- 2026-06-11 — Commerce PR-06: Lemon Squeezy Checkout + Signed Webhook — `feature/lemonsqueezy-checkout` (93c87a2) — checkout + signed idempotent webhook → `pending_payment→paid→queued`, paid-only spend → [archive](history/2026-06-11-commerce-pr-06-lemon-squeezy-checkout-signed-webhook.md)
- 2026-06-11 — Commerce PR-07: Local Batch Worker — `feature/order-worker` (b6e3fb1) — `npm run process:orders` drains `queued` → engine → `awaiting_review` (the automation moat) → [archive](history/2026-06-11-commerce-pr-07-local-batch-worker.md)
- 2026-06-11 — Commerce PR-08: Admin Review & Approval — `feature/admin-review` (5540b7a) — auth-gated review/repaint/Approve → final PDF (first auth in the codebase: Supabase Auth) → [archive](history/2026-06-11-commerce-pr-08-admin-review-and-approval-auth-gated.md)
- 2026-06-11 — Commerce PR-09: Delivery via Resend — `feature/delivery-resend` (1dc0ea4) — Approve → delivery token + Resend email → public token download page — **closes the MVP loop** → [archive](history/2026-06-11-commerce-pr-09-delivery-via-resend-closes-the-mvp-loop.md)
- 2026-06-11 — Commerce PR-10: New-Book Product Playbook — `feature/new-book-playbook` (2e3d450) — docs-only: the formalized file-path recipe for adding a sellable book — **commerce build complete** → [archive](history/2026-06-11-commerce-pr-10-new-book-product-playbook-recipe-formalized.md)

## Milestone 8 — Story 4 ("If [PET_NAME] Could Talk")

- 2026-06-12 — Story 4 (PR-20): Text, Two-Tense Engine & Registration — `feature/story4-text` — the living/memorial two-tense text engine + full registry entry, first book on the playbook recipe → [archive](history/2026-06-12-story-4-pr-20-text-two-tense-engine-and-registration.md)
- 2026-06-12 — Story 4 (PR-21): Premium Imagery — `feature/story4-imagery` — Story 4's 2 Premium images, both photo-anchored (cover portrait + pet-in-scene page 4) → [archive](history/2026-06-12-story-4-pr-21-premium-imagery-cover-portrait-pet-in-scene-page-4.md)
- 2026-06-12 — Story 4 (PR-22): Wizard, Storefront & Order Intake — `feature/story4-wizard` (d558178) — creatable + sellable, the `livingOrMemorial` conditional reveal — **completes Story 4** → [archive](history/2026-06-12-story-4-pr-22-wizard-storefront-and-order-intake-creatable-sellable.md)

## Milestone 9 — Story 5 ("A Letter to [PET_NAME]")

- 2026-06-12 — Story 5 (PR-23): Text, Registration & Premium Imagery — `feature/story5-text` (c407bcd) — the owner→pet companion of Story 2: text engine + registration + its 2 Premium images → [archive](history/2026-06-12-story-5-pr-23-text-registration-and-premium-imagery.md)
- 2026-06-12 — Story 5 (PR-24): Wizard, Storefront & Order Intake — `feature/story5-wizard` (63d64b3) — creatable + sellable, merchandised as Story 2's companion (no bundle SKU) — **completes Story 5** → [archive](history/2026-06-12-story-5-pr-24-wizard-storefront-and-order-intake-creatable-sellable.md)

## Milestone 10 — Story 6 ("While You're Still Here, [PET_NAME]")

- 2026-06-13 — Story 6 (PR-25): Living-Tribute Text, Registration & Imagery — `feature/story6-text` (6f0cb2a) — present-tense 8-page living tribute (Story-1 narrative shape) + registration + 8 reference-anchored images → [archive](history/2026-06-13-story-6-pr-25-living-tribute-text-registration-and-imagery.md)
- 2026-06-13 — Story 6 (PR-26): Wizard, Storefront & Order Intake — `feature/story6-wizard` (022da44) — creatable + sellable, the first narrative-spread storefront book — **completes Story 6** → [archive](history/2026-06-13-story-6-pr-26-wizard-storefront-and-order-intake-creatable-sellable.md)

## Milestone 11 — Story 7 ("Welcome Home, [PET_NAME]'s Gotcha Day")

- 2026-06-13 — Story 7 (PR-A): Text, Variants, Registration & Imagery — `feature/story7-text` (c20fbd1, merge 377df21) — the catalog's first joyful, non-memorial book: 6-dimension text engine + registration + mixed reference/figure-free imagery (9 images); engine produces a correct Welcome Home PDF from a `Story7Session`, not yet sellable (PR-B/feature 29) → [archive](history/2026-06-13-story-7-pr-a-text-registration-and-imagery.md)
- 2026-06-14 — Story 7 (PR-B): Wizard, Storefront & Order Intake — `feature/story7-wizard` (0e9bcd2, merge 28d4fb0) — creatable (5-step `/create` wizard, new `homecoming` step + conditional `yearsHome` reveal) + sellable ($29 storefront card, largest public order form), the catalog's first joyful landing card — **completes Story 7** → [archive](history/2026-06-14-story-7-pr-b-wizard-storefront-and-order-intake.md)

## Milestone 12 — Story 8 ("The Amazing Adventures of [PET_NAME]")

- 2026-06-14 — Story 8 (PR-0): Approach-B Illustration Prototype (go/no-go gate) — `feature/story8-prototype` (5e91147, merge 9fb1253) — **GO**: the deletable gate proving the test pet stays on-model across 10 dynamic action poses under Approach B (net-new orchestration — only Story-1 ran it before); real `lib/ai/story8-prompts.ts` (10 Backyard-Mystery slots + pose discipline, carries into PR-A) + throwaway risk-ordered B-loop runner + contact sheet; no text/registry/wizard/PDF/commerce touch. Cost floor = climax at Medium. → proceed to PR-A (Feature 31) → [archive](history/2026-06-14-story-8-pr-0-approach-b-illustration-prototype-gate.md)
- 2026-06-14 — Story 8 (PR-A): Text, Variants, Registration & Approach-B Imagery — `feature/story8-text` (fe556ae, merge 85d39cc) — the engine produces a correct Adventure PDF from a `Story8Session` (13 pages, 10 slots): namespaced text engine (`[SUPERPOWER]` fallback chain + conditional `childName` + theme/hero-count/age/species/sidekick variants), registration, and the catalog's first **Approach-B** book — `generateStory8Illustrations` self-selects B, calm→action→climax-last-at-Medium, pages 10/11 reuse art ($0); Step 3 skipped (reuses Story-1 layouts → all existing PDFs byte-identical); not yet sellable (PR-B) → [archive](history/2026-06-14-story-8-pr-a-text-registry-and-imagery.md)
- 2026-06-14 — Story 8 (PR-B): Wizard, Storefront & Order Intake — `feature/story8-wizard` (0f536d2, merge 06d5e5b) — creatable (5-step `/create` wizard, new `adventure` step + two conditional reveals: `childName` required only under `pet-plus`, `sidekick` pet-plus-only) + sellable ($34 storefront card, the catalog's most playful landing card, narrative order form), reuse guarantee held (worker/admin/delivery/state-machine untouched, orders by id); review-caught wizard dead-end fixed by gating `childName` at generate not step 3 — **completes Story 8 / Milestone 12** → [archive](history/2026-06-14-story-8-pr-b-wizard-storefront-and-order-intake.md)

## Milestone 13 — Story 9 ("[PET_NAME] and the New Baby")

- 2026-06-14 — Story 9 (PR-A): Text, Variants, Registration & Approach-A Imagery — `feature/story9-text` (0cf6a51, merge 69f468b) — the catalog's family-transition keepsake: the engine produces a correct 10-leaf "New Baby" PDF from a `Story9Session` (10 pages, 7 slots): namespaced text engine (`babyStatus` expecting↔arrived primary toggle + species voice + other-pets lines; `[BABY_NAME]`→"the new baby" degradation), registration, and Approach-A imagery (pet photo-anchored, baby/adults faceless, low tier); reuses Story-1 layouts (Step 3 skipped → all existing PDFs byte-identical), review restored the dropped Page-8 `closing`; not yet sellable (PR-B) → [archive](history/2026-06-14-story-9-pr-a-text-registration-and-imagery.md)
- 2026-06-14 — Story 9 (PR-B): Wizard, Storefront & Order Intake — `feature/story9-wizard` (7213bd8, merge 19d183a) — creatable (5-step `/create` wizard, new `baby` step + `babyStatus`/`otherPetsInHome` toggles on tone; `babyName` gated at generate not the step → expecting/blank-name completes, degrades to "the new baby", no dead-end) + sellable ($27 storefront card, derived `illustrationCount`=7, intake via the existing public route); reuse guarantee held (no engine/worker/admin/Supabase/delivery/state-machine change, orders by id); QA-caught fix: living-pet intro copy for the reused pet step on Stories 8 + 9 (memorial default now only on Story 1 + letters) — **completes Story 9 / Milestone 13** → [archive](history/2026-06-14-story-9-pr-b-wizard-storefront-and-order-intake.md)

## Milestone 14 — Brand rename (Dearbound)

- 2026-06-15 — Rename the brand to Dearbound — `feature/rename-dearbound` (f1fd117, merge 1eaf042) — branding string rename only ("Quietly Kept" → **Dearbound**, dearbound.com): new `lib/brand.ts` `BRAND` single-source across ~16 pages + `<title>` suffixes, new tagline ("custom illustrated books starring your pet"), softened catalog/nav label ("The keepsakes" → "The books"), email/PDF-fallback/live-docs/masterstories rebranded; "keepsake" kept as a product descriptor (D2), history + superseded specs left as the dated record (D3, prior brand Quietly Kept); guard test fails on any surviving "Quietly Kept" (mutation-verified). No behavior/layout/pricing change, PDFs byte-identical → [archive](history/2026-06-15-rename-brand-to-dearbound.md)

## Milestone 15 — Public-pages refresh

- 2026-06-15 — Public Refresh PR-1: Catalog Data Foundation — `feature/public-refresh-catalog-data` — data + pure helpers only, zero visible change: added `audience: "living" | "loss"` + optional `displayTitle?` to the `Product` contract, classified all 8 titles (5 living / 3 loss — the deliberate Story-6 "While You're Still Here" → living reclassification, partition-test-pinned), added `getProductsByAudience` / `productDisplayTitle` selectors; module stays pure/client-safe; new-book-playbook updated for the now-required `audience` field — unblocks PR-2/3/4 → [archive](history/2026-06-15-public-refresh-pr-1-catalog-data-foundation.md)
- 2026-06-15 — Public Refresh PR-2: Shared Chrome + Landing — `feature/public-refresh-chrome-landing` — extracted client-safe `components/site/SiteHeader`/`SiteFooter` (nav cluster + 3-column `footer-rich`) and swapped **all** public pages onto them (bodies unchanged); rewrote the landing into hero → two-worlds (gold living / rose loss) → how-it-works, all counts catalog-derived (kills "Six keepsakes"); new `TAGLINE` constant; deleted the old chooser/TOC + `page.module.css`; order page keeps its own checkout header (deliberate) → [archive](history/2026-06-15-public-refresh-pr-2-shared-chrome-and-landing.md)
- 2026-06-15 — Public Refresh PR-3: Catalog (`/books`) — `feature/public-refresh-catalog-page` — split the single 8-title grid into two anchored sections (`#living` "To celebrate them" gold / `#loss` "To remember them" rose), driven by PR-1's `getProductsByAudience` (5 living first / 3 loss), derived count chips; richer cards (kicker + `productDisplayTitle` + price + count); count line derived from `illustrationCount` ("N illustrations") except the page-framed Story 1 ("12 pages"), via a page-local `CARD_COPY` lookup (kept out of pure `products.ts`); placeholder paw art for the sample-less Story 8/9 + emptied their dead `sampleImages` paths (404 fix, tests relaxed to `[]`); stays `○` Static, boundary unchanged; new-book-playbook gained a "samples optional/backfillable" note → [archive](history/2026-06-15-public-refresh-pr-3-catalog-page.md)
- 2026-06-15 — Public Refresh PR-4: Book Detail + Policies + Download — `feature/public-refresh-detail-pages` — final PR of the refresh, presentation only: rebuilt the three remaining page bodies. Detail page gets `productDisplayTitle` titles, audience tint (gold living / rose loss on eyebrow+tagline), the PR-3 placeholder-paw gallery fallback for sample-less Story 8/9, and the explicit Story 2 ↔ 5 `companionId` callout (both directions verified, link text → `productDisplayTitle`); policies gained `#how-its-made`/`#refunds-and-remakes`/`#privacy` anchors (terms verbatim) with the shared SiteFooter now pointing at them; download untouched (PR-2 already refreshed it). Tiers held (`●` SSG detail / `○` Static policies / `ƒ` Dynamic download), boundary test unchanged; per-book "inside the book" TOC deferred to `debt.md`; QA 6/6 — **completes Milestone 15** → [archive](history/2026-06-15-public-refresh-pr-4-detail-policies-download.md)

## Milestone 16 — Engine tuning

- 2026-06-15 — Env-Tunable Scene Generation Concurrency — `feature/ai-concurrency-env` (8c2ac22, merge daf8974) — make the parallel Approach-A/C scene cap configurable via the `AI_SCENE_CONCURRENCY` env var instead of the hardcoded `DEFAULT_CONCURRENCY = 3` (sized against the superseded ~5/min ceiling; Tier 2's verified `gpt-image` limit is 20 images/min): new pure `resolveSceneConcurrency(env)` in `lib/ai/retry.ts` — fallback to the unchanged `DEFAULT_CONCURRENCY` on missing/invalid/`<1`, floor fractional, clamp at `MAX_SCENE_CONCURRENCY = 16` — wired to all 6 Approach-A/C `mapWithConcurrency` call sites (Story 1/9 shared + 2/4/5/6/7); Approach B (sequential, Story 8) + `withRetry` backoff + the worker's `ORDER_CONCURRENCY` untouched; non-secret operator-surface-only config (documented in `.env.local.example` + `coding-standards.md`); review fixed a `tsc` param-type defect + the stale `~5/min` roadmap figure. No paid run, 1934 tests green → [archive](history/2026-06-15-env-tunable-scene-concurrency.md)
- 2026-06-15 — Mixed-Tier Illustration Quality (HIGH hero slots + MEDIUM interiors) — `feature/mixed-tier-quality` (47594e8, merge 19f1e23) — lock **production** book generation to a mixed quality policy (hero pages HIGH, interiors MEDIUM, reference LOW; ~$1/book vs ~$3 all-HIGH), LOW stays the engine default for dev: new optional `heroSlots?` on `StoryDefinition` + `heroSlotsFor()` (defaults to the title's own cover `illustrationSlots[0]`, whatever its id — review-caught universal-cover fix vs the spec's literal `["cover"]`; Story 1 → cover+`page-12`), pure `qualityForPage()` + shared `PRODUCTION_QUALITY` constant in `lib/ai/generate.ts` wired at all 7 per-story sites (back-compat: unset hero tier → today's uniform behavior), worker + operator repaint route pass the same constant so a repainted hero comes back HIGH; Story 8's climax-at-MEDIUM folded into the general `atLeastMedium()` floor (dev output byte-identical); registry stays pure/client-safe (boundary test green); code+security review PASS, one context-audit drift fixed; no paid run, ships on the existing `-MIXED.pdf` proof, 1951 tests green → [archive](history/2026-06-15-mixed-tier-illustration-quality.md)

## Milestone 17 — Storefront sample assets

- 2026-06-15 — Story 1 HIGH-Fidelity Sample Set + Preview PDF — `feature/story1-high-sample-preview` (4cf90ed, merge a236448) — one-time paid HIGH-tier Story 1 run (14 images, ~$3, Approach A, default concurrency, 14 fresh cache misses) captured as durable static storefront assets: 13 web JPGs (cover + page-1..page-12, `sips`, no new dep) replacing the old 3 low-tier samples + a full-book `preview.pdf`, under `public/samples/story-1-book/`; new optional `previewPdf?: string` on the pure/client-safe `Product` contract drives a conditional "See the full book (PDF)" link on the detail page (stays `●` SSG, link correctly absent on titles without one); throwaway `scripts/story1-high-run.ts` + `proto:story1-high` harness (Bo the boxer fixture, quality bar honored, `uploads/` photo-prefix form), kept like `story8-prototype.ts`; pet held on-model at HIGH; docs note `previewPdf` as the deliberate one-time hero exception (not an engine-default change); PM kept the full-res ~31 MB PDF; review + QA PASS, 1938 tests green → [archive](history/2026-06-15-story-1-high-sample-set-and-preview-pdf.md)

## Dev-process & tooling

- 2026-06-13 — Feature 27: Lean the Context System — `feature/lean-context-system` (8acefc3, merge 8ce2183) — docs-only, zero-loss: tiered the history into a lean index + `context/history/` archive (39 files, byte-identical), trimmed `CLAUDE.md` `@`-loads to 5 live docs, pointed test-restating prose at its tests, added the `context/debt.md` ledger → [archive](history/2026-06-13-lean-context-system.md)
