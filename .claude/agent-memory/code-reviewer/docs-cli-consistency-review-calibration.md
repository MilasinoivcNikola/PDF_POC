---
name: docs-cli-consistency-review-calibration
description: fix/docs-and-cli-consistency (3 low debt rows) — how to verify a docs-about-code PR; the inputs-union partition technique; --env-file-if-exists placement
metadata:
  type: feedback
---

`fix/docs-and-cli-consistency` (3 low debt rows: inputs-union playbook gap +
illustration-prototype-exception playbook gap + engine-CLI env-loading divergence):
clean **PASS**. Docs-only + a one-line package.json change, no runtime logic.

**Why / how to apply — the load-bearing technique for a "docs that describe the code" PR
is to verify the docs against the actual code, not to read the docs for plausibility.**

- **Partition-completeness grep is the decisive check for a "unions you must widen" doc.**
  Part A claimed exactly two order/disk unions an author MUST hand-edit (`Order.inputs` in
  `lib/order/types.ts`, `AnySession` in `lib/session/disk.ts`) vs three covered by Step-2
  registration wiring (`registry.ts` `AnyEditableSession`, `draft.ts` `draftToSession*`,
  `api/session/route.ts` dispatch) vs one derived (`OrderRow.inputs = Order["inputs"]`,
  auto-follows). Verified by `grep -rln "Story9Session" lib app` then counting `| Story9Session`
  union-member lines per file — the set of files with real union members must equal the doc's
  enumerated set with nothing left over. It did: no fourth hand-edit union omitted; `OrderRow.inputs`
  has 0 union-member lines (genuinely derived); `lib/session/types.ts` defines the session types,
  not a union. This grep-the-partition move is reusable for any "list of N places to touch" doc.

- **`--env-file-if-exists=.env.local` placement (Part C):** the byte-identical form vs the
  `proto:*` scripts is `tsx --env-file-if-exists=.env.local --tsconfig scripts/tsconfig.json <script>`
  — flag goes BEFORE `--tsconfig`. Node 22 built-in (intro 20.12/21.7), no dep; no-ops when file
  absent; does NOT override already-set process.env (exported shell env wins). `proto:favicon`
  deliberately omits it (pure rasterizer, no API key) — not an inconsistency. The cited foot-gun
  ("OPENAI_API_KEY is not set") is real: `lib/ai/client.ts:43`, reached transitively by process-orders.

- **Doc-convention calibration:** the PR left stale-ish masterstory wording
  (`story-8-master-template.md:61` "the playbook's lightweight path does not have" the prototype
  phase) UNEDITED on purpose — keep dated specs/masterstories as the historical record. Feature 30's
  spec line 4 had claimed the playbook "names" the exception when it didn't; Part B closes that real
  bidirectional inconsistency by adding the subsection. Don't flag the un-edited masterstory line as
  drift — editing dated records is the wrong move here.

- **debt.md row-removal integrity:** verify via `git diff | grep -c "^-| "` == expected count (3 here,
  1:1 with the three parts) + a grep that the removed row titles no longer appear + table line-count
  stays contiguous. Blank lines in debt.md are header-prose separators, not table breaks.
