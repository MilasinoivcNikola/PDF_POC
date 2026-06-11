---
name: new-book-playbook-pr10
description: PR-10 added context/new-book-playbook.md — the canonical file-path recipe for adding a sellable book; what it owns and the citations that must stay current
metadata:
  type: project
---

`context/new-book-playbook.md` (commerce PR-10, Phase 5 recurring) is now the canonical,
repo-checked recipe for adding a new sellable book. The roadmap's Phase 5 bullet links to it.

**Why:** the multi-product refactor (features 14–19) made the engine product-agnostic and the
commerce loop (PRs 01–09) reused by id; PR-10 formalizes the "add a title = mostly authoring"
recipe so a future branch follows it instead of re-deriving it. It does NOT author a real book.

**How to apply when auditing a future new-book branch:** the playbook is the recipe; judge the
branch's actual file moves against it. The playbook's value is its citations — re-verify these
live if a refactor touched them (they were all accurate as of 2026-06-11):
- Registry: `lib/story/registry.ts` (`StoryDefinition` = resolve/illustrationSlots/pdfFilename/
  wizard/editable; `getStory`; `REGISTRY` is `Partial<Record<StoryType, StoryDefinition>>`).
- Filename builders live in `lib/pdf/filename.ts` (`storyPdfFilename`/`letterPdfFilename`),
  re-exported by `render.ts` — kept out of render.ts so the registry stays puppeteer-free.
- Catalog: `lib/catalog/products.ts` `buildProduct`/`buildCatalog`; `illustrationCount` DERIVED
  from `getStory(storyType).illustrationSlots.length`; `PLACEHOLDER_STORY_n_PRICE_USD`. Price
  helper `formatPriceUsd` in `lib/catalog/price.ts`.
- Wizard: `lib/story/wizard-config.ts` (`WizardConfig`/`getWizardConfig`/`WIZARD_CONFIG`/
  `STORY_n_STEPS`). `WIZARD_CONFIG` is `Record<StoryType, WizardConfig>` — a new type needs the entry.
- Scene identity: `lib/story/scenes.ts` (`SCENE_PAGE_IDS`/`SceneId`), NEVER `lib/ai/*` (public
  boundary guard bans lib/ai/* outright). Story-2 declares `LETTER_SCENE_PAGE_IDS` in story-2.ts.
- Merge primitives: `lib/story/merge.ts` `clean`/`substitute(text,values,missing)`/`MergeError`/
  `PageLayout`. `renderPage` switch in `lib/pdf/pages.tsx` is EXHAUSTIVE over PageLayout, NO default.
- Env var: `LEMONSQUEEZY_VARIANT_<PRODUCT_ID>` = productId.toUpperCase().replace(/-/g,"_")
  (matches `variantEnvName` in app/(public)/api/checkout/route.ts).
- Byte-identity verify: `npm run render:test fixtures/otis.json`; compare length + a
  timestamp-normalized SHA (Chrome stamps per-render /CreationDate + /ModDate — the only differing bytes).

See [[canonical-doc-map]]. The playbook restates coding-standards' Low-default cost rule + the
three-tier deploy-surface boundary verbatim — consistent, not drift.
