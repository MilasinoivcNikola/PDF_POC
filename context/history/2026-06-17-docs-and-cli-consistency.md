## 2026-06-17 — Fix: Docs & CLI consistency housekeeping (playbook gaps + engine-CLI env-loading)

**Branch:** `fix/docs-and-cli-consistency` (ffd54ff, merge b6bc1f4) · **Spec:** `context/fixes/docs-and-cli-consistency.md` · Tier-3, docs + tooling (handled on the main thread — no Craft-Area specialist applies).

### What this paid down

Three **low**-severity `context/debt.md` rows, bundled because all three are "keep our own
conventions consistent" chores. Docs-only plus a one-line `package.json` change — **no
product behavior change**, PDFs/tests/build all untouched in substance.

- *"Playbook doc gap — inputs unions."*
- *"Playbook lacks the 'illustration-prototype exception' it's cited as having."*
- *"Engine-CLI env-loading divergence."*

### Part A — Playbook gap: the inputs unions a sellable book must widen

`context/new-book-playbook.md` gained a new **Step 2a — widen the input-type unions (sellable
plumbing)**. Adding the next title's `Story<N>Session` shape means several unions must carry
it; most are touched by the Step-2 registration wiring, but **two order/disk-layer unions sit
outside the registry seam and are easy to miss** — leave one out and the title resolves and
renders locally but can't be stored as an order:

- **`Order.inputs`** — the captured-wizard-inputs union in `lib/order/types.ts` (the `inputs:`
  field on the `Order` interface, plus the doc-comment union just above it). **The one that
  bites:** miss it and the order type can't hold the new book's inputs, so intake/checkout
  won't compile.
- **`AnySession`** — the product-agnostic disk-layer union in `lib/session/disk.ts`
  (`writeSession`/`readSession` round-trip it; the batch worker writes
  `./sessions/[orderId].json` through it).
- **`OrderRow.inputs`** — in `lib/order/store.ts`, typed `Order["inputs"]` (**derived**, not a
  separate literal), so it widens automatically once `Order.inputs` does. **No edit needed** —
  documented only so an author doesn't hunt for a union that isn't there. (This is more accurate
  than the spec's "three unions to widen" framing — it tells the truth about the derived one.)

A parenthetical notes the registry/draft/route unions (`lib/story/registry.ts`,
`draftToSession` in `lib/session/draft.ts`, the validation dispatch in
`app/(operator)/api/session/route.ts`) are already covered by the Step-2 registration/wizard
wiring above. The code-reviewer independently confirmed the partition is **provably complete**:
grepping `| Story9Session` member-lines across `lib/` + `app/` yields *exactly* the five union
sites the doc names — no sixth hand-edit union omitted.

### Part B — Playbook gap: the cited "illustration-prototype exception"

The Story-8 spec (`context/features/30-story8-prototype-gate.md:5`) and masterstory
(`story-8-master-template.md:25`,`:54`,`:61`) cited a prototype / go-no-go exception **section
in the playbook that did not exist there.** Harmless (no reader was misled into wrong work),
but the recipe didn't reflect how the Approach-B prototype actually fed forward into PR-A/PR-B.

Added **"The illustration-prototype exception (when the pet-consistency approach is unproven)"**
under *Before you start*: when a title needs a pet-consistency strategy the pipeline has never
validated (the first use of a new Approach, or a markedly harder consistency case), **do not
greenlight it as a lightweight authoring branch** — run a **deletable go/no-go prototype gate as
a PR-0, before any authoring PR**. Build only enough to answer "does the pet stay on-model across
the book's hardest scenes?"; the runner + contact sheet are throwaway, but the real per-scene
prompt module is authored for real so that **on GO** it carries forward verbatim into PR-A.
Cross-references feature 30 as the worked example (Story 8's first Approach-B book; its
`lib/ai/story8-prompts.ts` carried into PR-A while the B-loop runner was deleted).

**Citation reconciliation (deliberate):** rather than edit the dated spec/masterstory, the new
subsection was worded to **match their existing language** ("the exception the playbook names",
"do not greenlight as a lightweight authoring branch") — so reality now matches the citations and
they stop dangling, while the dated records stay as the historical record (the established
convention, consistent with prior renames). The context-auditor verified all four citations now
resolve accurately.

### Part C — Engine-CLI env-loading divergence

`proto:story8` (and the other `proto:*` scripts) auto-load `.env.local` via
`--env-file-if-exists=.env.local` (Node 22 built-in, no dep); the two older engine CLIs did not,
relying on ambient shell env — so `process:orders` (which transitively reaches
`lib/ai/client.ts:43`'s `OPENAI_API_KEY is not set` throw) was a foot-gun for the next operator.

`package.json` — backfilled the flag into `render:test` and `process:orders`, byte-identical to
the `proto:*` form (flag before `--tsconfig`). **Safe by design:** the flag no-ops when the file
is absent and Node **never** overrides a variable already present in `process.env` — an exported
shell env still wins; this only *adds* a fallback. No new env var (so `.env.local.example` and
`coding-standards.md` correctly needed no change — only the *load mechanism* changed, not the
vars). `proto:favicon` deliberately keeps omitting the flag (pure rasterizer, no key — not an
inconsistency).

### Verification

- `npm run test:run` → **2152 passed / 96 files**; `npm run build` → **clean**, route tiers
  unchanged (`○` Static / `●` SSG / `ƒ` Dynamic). Both re-run at the complete gate.
- **Part C smoke test ($0, no paid run, no secret echoed):** exercised the exact
  `--env-file-if-exists=.env.local` flag via `node` (Node 22.22.2) with `OPENAI_API_KEY` unset in
  the subshell — (A) the var loaded from `.env.local` → `true`; (B) an exported sentinel value
  still won (no override) → `true`; (C) a non-existent file no-op'd gracefully (no crash). Proves
  the mechanism backfilled into the two CLIs without spending.
- **Review — code-reviewer PASS** (no blocking issues, no nice-to-haves; verified every cited
  path/symbol against source, the `package.json` byte-match, and clean debt-row removal) +
  **context-auditor IN SYNC** (no drift; checked the citation reconciliation, the no-new-env-var
  claim, ledger convention, and the apparent Step-2a-vs-reuse-guarantee tension — confirmed a
  compile-time type widen, not a runtime/infra change, so the "zero changes to worker/Supabase/
  admin/delivery" guarantee holds). **Commerce-security reviewer not dispatched** (docs about the
  commerce surface + a CLI flag, no commerce *code* touched).
- `context/debt.md` — exactly 3 rows removed (1:1 with the parts), table contiguous.

### Carried forward

- None new. This fix closes a recurring documentation lag that three prior sellable-book PRs and
  the review agents' own memory had each re-flagged; the playbook now records the target state.
