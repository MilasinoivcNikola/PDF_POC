## 2026-06-17 — Story Samples PR-01: "Saying Goodbye" (Pug) Sample Set — refresh Story 1 onto the standard harness

`feature/story-samples-01-pug` (a763348, merge d193aed) — replaced Story 1's
placeholder storefront sample (**Bo the boxer / Liam**, produced by the one-time
flagship full-res HIGH run) with a real example painted from the committed
`uploads/sample-photos/story-1.jpg` (a **fawn pug "Mango"** with a child "Maya"), and
**graduated Story 1 off the full-res-HIGH exception** onto the same standard mixed
`PRODUCTION_QUALITY` sample harness (`proto:sample` → `sample-capture`) the other 7
titles use — so the Story-1 sample now shows what a paying customer actually receives
(~$1/book) instead of a $3 all-HIGH outlier. The catalog supports one sample/example
per title, so this is a replacement (PM-locked, with the mixed-tier choice).

### What landed

- **Fixture — `fixtures/sample-story1-dog.json`** — a complete `StorySession`
  (`id: "sample-story1-dog"`): "Mango," a fawn pug with a black mask over the muzzle,
  deep velvety wrinkles, big dark round eyes, and a tightly curled tail (a strong photo
  anchor), child "Maya" (age 6-8), `favoriteActivity` "waddling beside you on slow
  evening walks around the park," a low-wall-by-the-park-fence `favoriteMemory` that
  mirrors the source photo, toggles natural / rainbow-bridge / no other pets. `photo`
  points at the tracked `uploads/sample-photos/story-1.jpg` (replaces the old gitignored
  boxer path `uploads/high-run-candidates/test-image.jpg`, so the sample is reproducible
  from a clean checkout — the PR-0 pattern). `resolveStory`-validated: **zero surviving
  `[FIELD]`**, quality bar honored ("died", never "passed away"; ends on love).

- **Worked example — `lib/catalog/book-questions.ts`** — Story-1 `exampleSummary`
  Bo→Mango and every `example` updated to the new fixture's values (pet/child/memories/
  toggles). These are **fixture-pinned** by `book-questions.test.ts`, so the Story-1 pin
  was repointed `fixtures/story1-high.json` → `fixtures/sample-story1-dog.json` and the
  129-test pin suite re-verifies each answer equals the fixture field byte-for-byte
  (incl. the deliberate comma — not em-dash — in the multi-line `favoriteMemory`).

- **Committed assets — `public/samples/story-1-book/`** — the paid run regenerated all
  14 images (1 LOW reference + cover/page-12 HIGH per `heroSlots` + 11 MEDIUM interiors,
  ≈ $1); `sample-capture` downscaled them to 13 web JPGs (`cover.jpg` + `page-1..12.jpg`)
  + a **slim 4.6 MB `preview.pdf`** (replacing the old ~31 MB full-res HIGH one) + the
  pug-and-girl `source-photo.jpg`. `products.ts` paths were unchanged (only the bytes
  behind them changed).

- **`package.json`** — removed the now-superseded `proto:story1-high` script (PM-chosen
  cleanup). The runner `scripts/story1-high-run.ts` + `fixtures/story1-high.json` are
  kept on disk as historical record (not deleted), now referenced by nothing live.

- **Docs** — `coding-standards.md` + `new-book-playbook.md` retired the "Story 1 carries
  a one-time full-res HIGH preview / `proto:story1-high`" exception in three passages
  (the context-auditor caught two playbook spots the first pass missed); all 8 titles now
  ship the standard slim mixed-tier sample with **no exception**.

### Verification

- Reference QA gate: the locked reference is an on-model fawn pug and the child did
  **not** leak in (the pet-only `buildReferencePrompt` held, as predicted for this
  child-in-photo input). Pet held on-model across reference → cover → page-7 (the
  gentle-truth page reads as peaceful rest on a cushion bed, not clinical) → page-12
  (the HIGH closing bookend); child stays stylized (¾ view, ponytail) per the master
  template.
- Review: **code-reviewer PASS** (code clean; doc-drift-only) + **context-auditor
  DRIFT-FOUND→resolved** (the two playbook passages + one stale in-code comment, all
  fixed in-branch). No commerce surface touched, so no commerce-security reviewer.
- 2152 tests green, `npm run build` clean (`/books/[productId]` stays `●` SSG).
- Live QA (qa-verifier, Playwright, $0): **7/7 PASS** + catalog sanity — pug gallery +
  working lightbox, `preview.pdf` 200 (4.6 MB application/pdf), the pug-and-girl source
  photo proof, neutral "answers behind the sample" framing reading Mango/Maya/pug, rose
  loss-tint, and the `/books` Story-1 card now shows the pug cover. No console errors,
  no 404s.

### Notes

- First entry of a notional "Story Samples PR-01" — Story 1 had been sampled separately
  via the flagship HIGH run (Milestone 17 opener); this brings it onto the shared PR-0
  harness alongside PR-02…09.
- The source photo uniquely contains a child as well as the pet; handled by the pet-only
  reference prompt + a QA gate. No durable deferral / debt from this work.
