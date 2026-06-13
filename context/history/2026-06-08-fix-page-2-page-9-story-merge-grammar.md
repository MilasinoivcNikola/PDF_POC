## 2026-06-08 — Fix: Page 2 / Page 9 story-merge grammar

**Branch:** `fix/story-merge-grammar` → `main` (`7c70724`, merge `ec0a2e5`) · Craft Area 1 (pdf-render-specialist)

Side-fix off `main`, surfaced during feature-05 QA (the Otis fixture rendered two ungrammatical sentences; both live in the feature-03 merge layer, not the renderer). Done before completing feature 05 so `main` never carries the bug.

- **Page 9** — `favoriteActivity` is stored as a gerund ("chasing tennis balls in the backyard"); the template's `Where {petName} can {favoriteActivity} …` produced "can **chasing**". Reworded to `Where {petName} is free to spend {pronounPossessive} days {favoriteActivity}.` — grammatical with any "-ing" activity, and drops the now-redundant "for as long as … wants" tail. (PM chose this phrasing.)
- **Page 2** — the template hard-coded `…, with eyes that always knew …`, which doubled when `breedColor` ended in "eyes" ("brown eyes, with eyes"). Split into a standalone sentence `And {pronounSubject} always knew, somehow, when you needed a friend.` that carries no literal "eyes", so it composes with any customer description. Otis fixture `breedColor` also tidied to a compact appearance phrase (PM chose "both").
- `context/masterstories/story-1-master-template.md` kept in sync (source of truth). `variants.test.ts` had **encoded the buggy Page-9 output as expected** — corrected, plus a `not.toContain("can chasing")` guard and two new Page-2 robustness regressions in `merge.test.ts`.

**Gates:** `npm run build` ✓ (17 routes) · `npm run test:run` ✓ (102 tests, +2). No new deps; pure copy/data + test changes.

