## 2026-06-15 — Story Samples PR-08: "The Amazing Adventures of Your Pet" (Corgi) Sample Set

The catalog's **first Approach-B sample set** — Story 8 is the only book that generates via
the sequential accumulating-reference stack rather than parallel Approach A/C, so this was
the slowest run of the series. It held. Branch `feature/story-samples-08`, a clean data-only
replay of the PR-02/04/05/06/07 sample-set pattern with **no folded-in template fix** (Story 8
reuses Story-1 layouts that the prior PRs already hardened).

### The sample set

Replaced Story 8's empty gallery (`sampleImages: []`, degrading to the placeholder-paw block
since Public-Refresh PR-3) with the **full 10-illustration** adventure sample at the locked
mixed `PRODUCTION_QUALITY` tier (HIGH `adventure-cover` + 9 MEDIUM interiors + LOW reference,
≈ $0.86 one-time paid run) + a slim downloadable `preview.pdf`, via the PR-0 harness
(`scripts/sample-run.ts` → `sample-capture.ts`) and the committed
`uploads/sample-photos/dog-corgi.jpg`.

- **Fixture** `fixtures/sample-story8-dog.json` (`id: "sample-story8-dog"`) — **Pickle**, a
  tricolor Pembroke Welsh corgi (red/white/black saddle, white blaze, big upright ears, short
  "loaf" silhouette — a shape that reads instantly across dynamic action poses, deliberately
  distinct from the Story-1 boxer and the Story-5 senior dog). Modeled on
  `fixtures/amazing-adventures-biscuit.json` but with fresh wholesome adventure copy (superpower
  "the Great Round-Up", herding-rooted activity/quirks, sidekick "Maple", `childName: "Nora"`,
  nicknames "Pickle-pie, the Loaf"); toggles `adventureTheme: "backyard-mystery"` /
  `heroCount: "pet-plus"` / `childAgeBracket: "6-8"`. Under `pet-plus`, `childName` is required —
  set in the fixture (the wizard gates it at generate). `resolveStory8`-validated: 13 pages,
  **zero surviving `[FIELD]`**, quality bar honored. Two pre-spend fixture tweaks: dropped the
  leading "a" from `breedColor` (avoids a doubled article) and tightened `superpower` to a bare
  noun phrase (used inline as a noun on the clue page).
- **Consistency verdict: HOLDS** — the catalog's hardest consistency case (10 dynamic action
  poses) passed under Approach B with no re-pick. The tricolor corgi is unmistakably the same
  animal in every pose; the child + bandana stay consistent; the highest-drift money shot
  (`adventure-climax`) rendered as a clean 3/4 *side* leap with full profile and no
  foreshortening, exactly as the masterstory briefs.
- **Capture** — `public/samples/story-8-adventure/` now holds exactly 10 JPGs named by **real
  slot id** (`adventure-cover` + `adventure-ordinary … adventure-celebration`, matching
  `ADVENTURE_SCENE_PAGE_IDS` 1:1 in book order) + `preview.pdf` (13 pages, ~5.6 MB slim — pages
  10/11 reuse art per the engine, but the preview still renders all 13). The two reuse-page
  dupes the capture script emits (`adventure-home`←celebration, `adventure-closing`←cover) were
  removed from the gallery, matching the prior sets' "real slot ids only" convention.
- **Catalog** `lib/catalog/products.ts` — `story-8-adventure.sampleImages` grows `[]` → 10 (real
  slot ids in book order) + `previewPdf: "/samples/story-8-adventure/preview.pdf"`, matching the
  `story-7-welcome` shape. **Test** `lib/catalog/products.test.ts` — flipped the PR-3 `[]` pin to
  a 10-item `toEqual` set + `toHaveLength(10)` + a `previewPdf` assertion, `story-8-adventure`
  added to the `WITH_PREVIEW` map.

### Engine note (no change required)

Story 8's generation is fully wired (`lib/ai/generate.ts` dispatch → `generateStory8Illustrations`,
all 10 adventure slots in `manifestToImageMap`), so the committed `preview.pdf` is a genuine
Approach-B book — **not** the Story-1 fallthrough that still latently afflicts Story 9 (debt row).
This sample run is also the catalog's **first real live Story-8 generation**, which confirmed
Approach B self-selects by `storyType` with no engine edit.

### Docs

`context/debt.md` — **removed** the resolved "Story-8 storefront samples missing" row (paid in
full by this PR); **narrowed** the "Story 8 cost floor" row to the still-open Low-vs-Medium climax
comparison (the live-B-self-selection half is now confirmed by this run, climax floored to MEDIUM
via `atLeastMedium()`). The `previewPdf`/`sampleImages` conventions in `coding-standards.md` +
`new-book-playbook.md` are title-agnostic and needed no edit.

### Review / QA

code-reviewer **PASS** (paths ≡ slots ≡ disk 1:1, catalog stays pure/client-safe, fixture resolves
clean with `childName` set, tests match the data); context-auditor **DRIFT FOUND** → resolved in-PR
(the two `debt.md` rows above); no commerce-security (non-commerce diff); qa-verifier **4/4 PASS**
($0, static-asset render: 10-tile gallery, PDF 200 `application/pdf`, no 404s, card off the
placeholder paw). `npm run test:run` 1977 pass · `npm run build` passes (`/books/story-8-adventure`
stays `●` SSG). QA aside: localhost:3000 was occupied by an unrelated project; QA ran against the
real Dearbound app on :3001.
