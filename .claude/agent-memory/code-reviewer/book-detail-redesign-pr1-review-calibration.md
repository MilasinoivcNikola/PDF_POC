---
name: book-detail-redesign-pr1-review-calibration
description: PR-1 content-foundation (book-questions.ts + sourcePhoto + source-photo assets) review — clean PASS; load-bearing checks and refuted concerns
metadata:
  type: feedback
---

Book-Detail Redesign PR-1 ("Content Foundation") review landed a clean PASS. The
PR ships `lib/catalog/book-questions.ts` (pure data), `Product.sourcePhoto?`, 8
committed `public/samples/<id>/source-photo.jpg`, a `sample-capture.ts` step, docs.

**Why:** durable judgment calls so this class of pure-data/asset PR doesn't get
re-litigated.

**How to apply:**

- **The load-bearing check is the anti-tautology of the fixture-pinning test.** Verify
  it by (a) the test reading the real fixture JSON via `readPath`/`loadFixture` and
  `expect(example).toBe(fixtureValue)` — NOT comparing literals to literals — and (b)
  a one-shot mutation (corrupt one `example`, confirm exactly that pin fails). Both held.
  The test also self-guards via `toBeTypeOf("string")` on both sides, so a wrong/missing
  fixture field path surfaces as a failure, not a silent pass.

- **`session.pet.photo` (not the spec's `session.photo`) is CORRECT** — sessions are
  `StorySession` and every fixture carries `pet.photo` (relative `uploads/...` path).
  The skip-if-absent (`existsSync` on cwd-resolved path) is sound. Don't flag the deviation.

- **Client-safety via in-test closure walk (not wiring into surface.boundary.test.ts)
  is ADEQUATE here** — `book-questions.ts` has ZERO imports (pure literals), so its
  closure is itself; nothing it *could* leak. It's dead code (no public page imports it
  yet), so the shared boundary test legitimately wouldn't walk it, and adding it to
  `PUBLIC_ENTRIES` would be wrong (that list is page entries). The in-test walk mirrors
  the boundary test's logic and future-proofs against a later bad import. Don't demand
  it be moved into surface.boundary.test.ts.

- Coverage tests are complete: product→entry, no-orphans, groups/items non-empty,
  every entry has a FIXTURE_PINS map, sourcePhoto-set + asset-on-disk. Scope was clean
  (zero app/components/css touched). Assets are real ~1000px-long-edge JPEGs (~1MB total).
