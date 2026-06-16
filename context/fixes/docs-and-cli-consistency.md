# Fix: Docs & CLI consistency housekeeping (playbook gaps + engine-CLI env-loading)

> Pays down three **low**-severity housekeeping rows (`context/debt.md`): the two
> *"Playbook doc gap"* rows and *"Engine-CLI env-loading divergence"*. Docs-only plus a
> one-line `package.json` change; no product behavior change. Tier-3. Bundled because all
> three are "keep our own conventions consistent" chores.

---

## Part A — Playbook gap: the three `inputs` unions a sellable book must widen

### Problem
`context/new-book-playbook.md` documents most of the new-book recipe but omits one step
that is **followed in code yet undocumented**: every *sellable* book widens three `inputs`
unions — `Order.inputs`, `OrderRow.inputs`, and `AnySession`. An author adding the next
title can miss one. (Feature 28 already documented the page-id-prefix convention, the
`slots + 1` reference-anchor accounting, and the mixed reference/figure-free dispatch —
only the inputs-union note remains.)

### Edit
- `context/new-book-playbook.md` — add a step (in the "make it sellable" / order-intake
  section) listing the three unions to widen, with their file locations:
  `lib/order/types.ts` (`Order.inputs`), the `OrderRow.inputs` shape (Supabase row type),
  and `AnySession` (the session union). Grep `AnySession` + `Order.inputs` first to cite
  exact paths.

---

## Part B — Playbook gap: the cited "illustration-prototype exception" doesn't exist

### Problem
The Story-8 spec and masterstory cite a prototype / go-no-go exception **section in the
playbook that isn't there**:
- `context/features/30-story8-prototype-gate.md:5`
- `context/masterstories/story-8-master-template.md:25` and `:54`

Harmless today (no reader is misled into wrong work), but the recipe doesn't reflect how
the Approach-B prototype actually fed forward into PR-A/PR-B.

### Edit
- `context/new-book-playbook.md` — add the missing "illustration-prototype exception"
  subsection: when a new title's pet-consistency approach is unproven (e.g. Approach B's
  first use), run a **deletable** go/no-go prototype gate first (the
  `scripts/story8-prototype.ts` pattern), and only on GO does its real prompt module carry
  forward into PR-A. Cross-reference feature 30 as the worked example.
- Optionally reconcile the two citations if their section names don't match the heading
  you add (keep the masterstory/spec wording as the dated record if they diverge —
  consistent with how prior renames were handled).

---

## Part C — Engine-CLI env-loading divergence

### Problem
`proto:story8` (and the other `proto:*` scripts) auto-load `.env.local` via
`--env-file-if-exists=.env.local` (Node 22 built-in, no dep). The two older engine CLIs do
**not** and rely on ambient shell env:
- `package.json:9` — `render:test`
- `package.json:10` — `process:orders`

`process:orders` would hit `OPENAI_API_KEY is not set` if run without exported env — a
foot-gun for the next operator.

### Edit
- `package.json` — backfill `--env-file-if-exists=.env.local` into the `render:test` and
  `process:orders` scripts, matching the `proto:*` form:
  ```
  "render:test":   "tsx --env-file-if-exists=.env.local --tsconfig scripts/tsconfig.json scripts/render-test.ts",
  "process:orders":"tsx --env-file-if-exists=.env.local --tsconfig scripts/tsconfig.json scripts/process-orders.ts",
  ```
- **Safe by design:** `--env-file-if-exists` no-ops when the file is absent, and Node does
  **not** override variables already present in `process.env` — so an exported shell env
  still wins; this only *adds* a fallback. Keep `.env.local.example` as the documented
  source of the vars (unchanged).

---

## Verification

- `npm run build` + `npm run test:run` pass (Parts A/B are docs; Part C is a script flag
  with no runtime code change).
- Part C smoke test: in a shell with **no** `OPENAI_API_KEY` exported but a valid
  `.env.local` present, `npm run render:test` no longer fails with "is not set". (Do **not**
  run a paid generation — `render:test` against a cached/fixture session is enough to prove
  env loads; or just confirm the var is read.)
- Remove the three paid debt rows once landed; note the resolution in the history entry.

## Out of scope

- Any change to what the CLIs *do* — this only changes how `render:test` / `process:orders`
  discover env.
- The broader new-book-playbook content (only the two named gaps are in scope).
