# Debt Ledger

Durable deferrals — work consciously *not* done, with a trigger for when it becomes
blocking. The home for "carried forward / not a blocker" notes that used to be buried in
`history.md` write-ups (feature 27 seeded this from those).

**Convention (`/feature complete`, step 10):** when a feature defers something that
outlives the branch, add a row here — don't bury it in the history entry. Remove a row
when the debt is paid (note which feature paid it in that feature's history entry).

**Severity:** `high` = blocks public launch / legal / go-live · `medium` = real risk,
bounded by current usage · `low` = cleanup, cosmetic, or perf with headroom.

| Item | Area / files | Why deferred | Sev | Flips to blocking when |
|------|--------------|--------------|-----|------------------------|
| Privacy policy is a placeholder | `app/(public)/policies/page.tsx` | Real customer photo + email flow through to a charge; needs real legal copy | **high** | Before any real customer order — launch blocker |
| Lemon Squeezy store setup | LS dashboard + `.env.local` (`LEMONSQUEEZY_*`, all 5 variant ids) | No LS account provisioned; per-book manual-fulfilment products/variants, webhook endpoint, Serbian PayPal/bank payout all pending | **high** | Go-live / first live (test-mode) purchase |
| AI-honesty disclosure copy | `app/(public)/policies/page.tsx` (how-it's-made section) | Off-Etsy we're not bound by policy, but it's an ethics + marketing choice in a grief context; still a labelled placeholder | medium | Before public launch |
| Live Resend + LS test-mode runs | `app/(operator)/api/admin/approve/route.ts`, `app/(public)/api/webhooks/lemonsqueezy/route.ts` | No real provider keys in scope; the send (+ `approved→delivered`) and a live checkout→webhook are unit-tested with the provider mocked and the surrounding chain proven | medium | Go-live — one-time manual verify alongside LS setup |
| Grief-counselor copy review | `context/masterstories/*`, `lib/story/{story4,story5,story6}/{master-text,variants}.ts` | Dev-authored gap-fill copy (memorial / couple / non-dog / species variants) where the master templates gave only partial notes; the templates themselves call for a specialist review | medium | Before public launch / first bereaved customer |
| Reused-route operator-auth boundary | `app/(operator)/api/{preview,regenerate-illustration,update-text,render-pdf}/route.ts`, `components/preview/AdminBookReview.tsx` | Admin reuses engine routes gated only by `assertOperator()` (no session), shared with the non-authed wizard; a local party could spend (regenerate) or read PII (preview). Acceptable for single-operator localhost | medium | The moment the operator surface goes multi-user or network-exposed (fix = session-gated admin variants) |
| Worker two-process claim race | `lib/order/worker.ts`, `lib/order/store.ts` | The claim is app-level `assertTransition` + `UPDATE … WHERE id`, not a DB compare-and-swap; two concurrent worker processes could double-claim. Fine for a once/twice-daily single batch command | low | If generation becomes concurrent / daemon-triggered (fix = conditional `.eq("status","queued")` store update) |
| `failed → queued` retry re-spends the whole book | `lib/order/worker.ts` | The manifest lives only in `./sessions/[id].json`, not back in `order.inputs`, so a retry re-generates every page | low | If retries become frequent / costly (fix = feed the on-disk manifest back into the engine session) |
| `cleanOptional` / `appendOptionalLines` 4-way duplication | `lib/story/{story2,story4,story5,story6}/merge.ts` | Each story's merge module carries its own copy of the optional-line helpers; matches the per-module repo pattern, never actually exported | low | When the omission rule must change in one place, or a 5th story would copy it again |
| `STYLE_PHRASE` map copies | `lib/ai/{generate,prompts,story2-prompts,story4-prompts,story5-prompts}.ts` | `IllustrationStyle → phrase` map copied per prompt module (the established "kept in step" pattern) | low | If the style set changes and a copy is missed |
| Story-6 `love`-page unused image slots | `lib/pdf/pages.tsx` (`love` renderer), `lib/story/story-6.ts` | Pages 5 & 6 are illustration slots but the reused `love` renderer shows no `<img>`, so 2 of 7 generated scenes are never displayed (exact Story-1 page-10 parity) — paints 2 unused images | low | PM decides to trim the slots or surface the art |
| Download-meta hardcoded size string | `components/preview/BookPreview.tsx` | "8.5 × 11 inches" is hardcoded; correct for every current product | low | If an 8×8 / A4 / 5×7 size toggle is ever built |
| Playbook doc gap — inputs unions | `context/new-book-playbook.md` | Followed in code but undocumented: every *sellable* book widens three `inputs` unions (`Order.inputs` / `OrderRow.inputs` / `AnySession`). (Feature 28 documented the page-id-prefix convention + the `slots + 1` reference-anchor accounting + the mixed reference/figure-free dispatch; the inputs-union note remains.) | low | When the next book is added and an author misses one |
| Story-7 absent from `REFERENCE_ANCHOR_STORIES` | `app/(operator)/api/generate-illustrations/route.ts` | Story 7 is reference-anchored (generates `slots + 1 = 9` images) but isn't in the hand-maintained `REFERENCE_ANCHOR_STORIES` set, so the wizard progress bar would under-count by 1. Latent in feature 28 (PR-A): the book is non-creatable, so the wizard route never fires this branch | low | Feature 29 (PR-B) wires the Story-7 wizard — add `"story-7"` to the set then |
| Alternate print sizes (8×8 / A4 / 5×7) | `lib/pdf/styles.css` | Noted in the masterstories, never built — a feature, not a regression | low | When a customer/PM requires a non-Letter size |
| Warm Puppeteer browser pool | `lib/pdf/render.ts` | Each render cold-launches Chrome; fine at current volume | low | If render latency / throughput becomes a bottleneck |
| Stories 2 + 5 companion bundle | catalog / commerce | "One from them, one from you" as a combined-price SKU; deliberately out of scope (net-new multi-product commerce, breaks the by-id reuse guarantee) | low | PM decides to offer the bundle |
