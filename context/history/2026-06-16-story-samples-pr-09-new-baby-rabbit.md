## 2026-06-16 — Story Samples PR-09: "Your Pet and the New Baby" (Rabbit) Sample Set + closing-page cover-medallion fix

`feature/story-samples-09` — the catalog's **first rabbit sample**, and the last of
the story-samples series to give a title its first real storefront art: replaced
Story 9's empty gallery (`sampleImages: []`, placeholder-paw since Public-Refresh PR-3)
with the full **7-illustration** new-baby book at the locked mixed `PRODUCTION_QUALITY`
tier (HIGH `baby-cover` + 6 MEDIUM interiors `baby-page-2..7` + LOW reference, ~$0.65
paid run) + a slim 10-leaf downloadable `preview.pdf` + wired
`story-9-newbaby.previewPdf` (sampleImages 0→7), via the PR-0 harness + the committed
`uploads/sample-photos/rabbit.jpg`.

### What landed

- **Fixture — `fixtures/sample-story9-rabbit.json`** — a complete `Story9Session`
  (`id: "sample-story9-rabbit"`): "Clementine," a sandy-orange rabbit with a cream chest
  and muzzle, tall upright ears, and a rounded fluffy body (a strong photo anchor),
  owner "Bennett" (couple), baby "Theo," `babyStatus: "arrived"` + `otherPetsInHome:
  "no"` (the PM-chosen warmest/most-complete path — the named-baby copy renders, not the
  "the new baby" degradation). `resolveStory9`-validated: **zero surviving `[FIELD]`**,
  quality bar honored (joyful, no memorial language). The `sleepingSpot` was deliberately
  phrased as a bare noun phrase ("the soft hay corner beneath the window") to dodge a
  latent bird/rabbit Page-3 grammar bug (see debt).
- **Paid run + capture** — `npm run proto:sample fixtures/sample-story9-rabbit.json`:
  confirmed Story-9 self-selects **Approach A** (the wiring fix from
  `feature/story9-illustration-wiring` is live — 7 `baby-*` slots generated, **NOT** the
  old Story-1 `page-*` fallthrough), the rabbit held strongly on-model across all 7 scenes
  (incl. a mid-air binky pose), baby + adults drawn faceless per engine policy. Captured to
  `public/samples/story-9-newbaby/` as `baby-cover.jpg` + `baby-page-2..7.jpg` (7 web JPGs,
  ~0.3 MB each) + slim `preview.pdf`.
- **Catalog — `lib/catalog/products.ts`** — `story-9-newbaby.sampleImages` `[]` → the 7
  slot-named paths; added `previewPdf: "/samples/story-9-newbaby/preview.pdf"`. The
  existing `displayTitle: "Your Pet and the New Baby"` override left untouched.
- **Tests — `lib/catalog/products.test.ts`** — Story 9 added to the `WITH_PREVIEW` set;
  the `sampleImages: []` assertion replaced with the 7-file `toEqual` + `toHaveLength(7)` +
  a `previewPdf` assertion.

### Folded-in fix (PM-caught during QA): Story 9's closing page leaked the placeholder

Story 9's closing page (page 8, `baby-page-8`, `closing` layout) rendered the generic
`PlaceholderPet` face — it is **not** one of the 7 illustration slots (which end at
`baby-page-7`), so it fell through to the placeholder. This is the exact class of bug
PR-07 fixed for Story 7's `welcome-closing`, and the Story-9 master text even briefs that
page to "echo the cover but feel fuller and more settled." Applied the established
cover-medallion pattern, byte-safe for every other title:

- **`lib/pdf/pages.tsx`** — added `"baby-page-8"` to `CLOSING_COVER_FALLBACK_PAGE_IDS`
  (was `["welcome-closing"]`). The whole mechanism (cover-src threading via
  `StoryPages → renderPage → ClosingPage`, the `closing__art--circle` vignette, the
  print + screen CSS) already existed — this one allow-list entry routes Story 9's
  slot-less closing to the cover art circled. Comments updated to name `baby-page-8`.
- **New `lib/pdf/template.story9.test.tsx`** (mirrors `template.story7.test.tsx`) — locks
  the cover-medallion render given a cover src, the no-cover placeholder degradation (the
  text-only `render:test` path), own-src precedence, and the 10-section structure.
- **Re-rendered the sample `preview.pdf`** ($0 — `sips` downscale + `renderStoryPdf` from
  the on-disk `generated/sample-story9-rabbit/` PNGs, **no paid API call**); `pdftoppm`
  confirmed page 8 now shows the rabbit cover medallion above "— end —", not the grey
  placeholder. The 7 gallery JPGs are unchanged (the closing isn't one of them).
- Byte-identity held: Story 1's `page-12` (own art), Story 7's `welcome-closing`, and all
  other products' closings unchanged (the 6 `template*.test.tsx` suites pass).

### Reuse guarantee + verification

Data + one allow-list entry + one test; no engine/registry/route/worker/Supabase/delivery
change. PII: the shipped JPGs carry no camera/GPS/owner Exif (AI-generated + `sips`-resized,
same as every prior sample set). Review: code-reviewer **PASS**, context-auditor **DRIFT
FOUND → resolved on-branch** (paid the "Story-9 samples missing" debt row, added the Page-3
grammar + Page-4-brief rows, broadened the Stories-7+9 closing-reuse row, updated the
`CLOSING_COVER_FALLBACK_PAGE_IDS` coding-standards passage); no commerce-security (static
catalog data only). QA 6/6 PASS (`●` SSG, 7-tile gallery, PDF 200, no 404s, $27 / "Your Pet
and the New Baby"). `npm run test:run` **1998 passed**, `npm run build` clean.

Unblocks: completes the storefront sample coverage for the family-transition title. With
Story 9 sampled, the only remaining sample gap closes (all 8 titles now carry real art).
