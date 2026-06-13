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

## Dev-process & tooling

- 2026-06-13 — Feature 27: Lean the Context System — `feature/lean-context-system` (8acefc3, merge 8ce2183) — docs-only, zero-loss: tiered the history into a lean index + `context/history/` archive (39 files, byte-identical), trimmed `CLAUDE.md` `@`-loads to 5 live docs, pointed test-restating prose at its tests, added the `context/debt.md` ledger → [archive](history/2026-06-13-lean-context-system.md)
