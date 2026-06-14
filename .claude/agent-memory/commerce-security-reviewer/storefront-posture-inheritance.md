---
name: storefront-posture-inheritance
description: Why adding a new public product (Story 4/5/6, PR-22/24/26) inherits the proven order-intake security posture for free — the structural invariants that close spend-guard / IDOR / status-injection at the type+route level, and the recipe to re-verify a future product
metadata:
  type: project
---

A new sellable product (a new `storyType` + catalog entry + `Story*Fields` form
component + `Story*Session` widening) inherits the proven Story-1/2 commerce
security posture **without touching the trust boundary**, because the boundary is
structural, not per-product. Verified on Story 4 (PR-22), Story 5 (PR-24), and
again on Story 6 (PR-26) — all ran the recipe below fully green with zero findings,
so the inheritance is now thrice-confirmed.

**Story 8 PR-B (feature 32, 2026-06-14) — NOW creatable + sellable:** PASS, zero
findings — the inheritance holds a 4th time (Story 8 is the first Approach-B book to
go sellable). Recipe ran fully green: `/api/order/route.ts` + `lib/order/types.ts` +
state.ts + store.ts + worker.ts + lib/supabase/ + migrations ALL empty diff (entire
trust boundary untouched); no `inputs.status` lifecycle read; catalog adds story-8 via
the same `buildProduct` factory (no `lsVariantId` → server-resolved, price 3400
placeholder); env var `LEMONSQUEEZY_VARIANT_STORY_8_ADVENTURE` non-secret/server-side/
not NEXT_PUBLIC; OrderForm Story8Fields branch is pure draft form (no fetch/price/
variant/status); `draftToSessionStory8` builds fresh field-by-field + hard-codes
`storyType:"story-8"` + trims + drops blanks (never spreads client blob); conditional
childName-under-pet-plus enforced identically in draft gate + operator `validateStory8`
(operator route, assertOperator intact, isSafeSessionId guard). story-8.ts references
lib/ai only in COMMENTS (no import) → public chain engine-free; boundary+catalog+draft
316 tests green; full suite 1756 green; tsc clean. generate-illustrations route change
is operator-only progress-count math (story-8 added to REFERENCE_ANCHOR_STORIES, slots+1
=11) — no spend/auth bearing. RESIDUAL (hardening, unchanged from PR-A, NOT a leak):
`lib/ai/story8-prompts` still NOT in FORBIDDEN_LOCAL (only story6/story7 are) — nothing
public reaches it (grep + green boundary test confirm), but the drift-guard for the new
prompt module was never added. NOTE: two `public/samples/story-8-adventure/*.jpg`
referenced by the catalog are NOT present yet (manual op per spec) — functional gap
(broken storefront img), not security.

**Story 8 PR-A (feature 31, 2026-06-14) — authoring + NEW engine imagery, NOT yet
creatable/sellable (PR-B):** PASS. Same posture as Story-7 PR-A below. Commerce
surface touched: `Order.inputs` widened with `Story8Session` (additive; `NewOrderInput`
still excludes status/pdfKey), `OrderRow.inputs` re-pointed at `Order["inputs"]`,
`createOrder` still hard-codes `pending_payment`. state.ts/migration/`/api/order`
untouched (empty diff). draft.ts `isStory8Draft` added to `isStory1Draft` negation
chain + both `missingRequiredFieldsForDraft`/`draftToSessionForDraft` THROW
"not yet creatable (wired in PR-B)" — fail-closed, no secret in the string. NEW engine
work `generateStory8Illustrations`/`regenerateStory8Slot` (lib/ai/generate.ts, Approach
B) reachable ONLY via operator routes (generate-illustrations, regenerate-illustration)
+ operator worker — grep-confirmed no public caller; reuses existing
`isSafeSessionId`+`resolveUnder(cwd,"uploads",…)` traversal guards; no PII/secret log.
Catalog has NO story-8 (grep-confirmed not sellable). story-8.ts/story8/* reference
lib/ai only in COMMENTS (no import) → public chain engine-free; boundary+draft+catalog
276 tests green. SAME drift-guard gap as Story-7 PR-A: `lib/ai/story8-prompts` NOT in
`FORBIDDEN_LOCAL` (only story7 is) — not a leak (nothing public reaches it, test green),
hardening to close in PR-B.

**Story 7 PR-A (feature 28, 2026-06-13) — authoring-ONLY, NOT yet creatable/sellable
(no wizard/storefront/order route; that's PR-B):** PASS. Commerce surface touched was
only the two type widenings (`lib/order/types.ts` + `lib/order/store.ts` admit
`Story7Session` in the `inputs` union — purely additive, `NewOrderInput` still
excludes status/pdfKey, `createOrder` still hard-codes `pending_payment`). `/api/order`
diff empty; state.ts/webhook/delivery/auth/RLS/migrations untouched; no new spend path
(generate.ts `case "story-7"` is engine/operator-only, never gates on a client status).
Two NOTABLE-but-OK Story-7 specifics: (1) the `lib/session/draft.ts` Story-7
dispatchers THROW "not wired until PR-B" — a closed half-door, not a half-open intake
path (fail-closed). (2) `lib/ai/story7-prompts` was NOT added to `FORBIDDEN_LOCAL` in
surface.boundary.test.ts — but NOT an actual leak: story-7.ts + the catalog/registry
public chain never import it (only generate.ts + its own test do), and all 230
boundary/draft/catalog tests pass green. It's a defense-in-depth drift-guard gap to
close in PR-B (when the wizard/storefront land), flagged as hardening, not blocking.
fixture `welcome-home-biscuit.json` is a synthetic `fixture-`-prefixed test session,
no real PII, no secrets. (PR-26 specifics: `/api/order/route.ts`
diff empty; `NewOrderInput` still excludes status/pdfKey; `createOrder` still
hard-codes `pending_payment`; `draftToSessionStory6` builds fresh field-by-field +
hard-codes `storyType:"story-6"`; `lib/ai/story6-prompts` already in
`FORBIDDEN_LOCAL`; the two `public/samples/story-6-tribute/*.jpg` carried only the
same clean Exif stub [single ExifIFD ptr → 3 benign tags: ColorSpace/PixelX/PixelY,
NO GPS/Make/Model/Owner/Serial/DateTime/Artist] + empty 8BIM IPTC stub. NOTE: Story
6 is the first NARRATIVE-SPREAD storefront product, so the `Order.inputs` widen
admits `Story6Session` and `BookPreview`'s `isLetter` EXCLUDES story-6 — both purely
type/presentation, no security bearing.)

**Why these hold by construction (re-confirm, don't assume, on the next product):**

- **`/api/order/route.ts` is the single public write and is product-agnostic.** It
  reads the order row's `storyType` from `product.storyType` (catalog, server-side),
  NOT from the client `inputs` blob, and rejects a `product_mismatch`. So a client
  can't make the row a different product than the URL/price. A new product needs NO
  change to this route — if the diff touches it, scrutinize hard.
- **Spend guard inherited:** `createOrder` hard-codes `status: "pending_payment"`;
  `NewOrderInput` (lib/order/types.ts) is a `Pick` that does NOT include `status` or
  `pdfKey`, so neither the route nor any caller can set them at creation — a
  client-supplied status/pdfKey is unrepresentable. Generation gates only on the
  **row** status `queued` (worker), reachable solely via the signed paid webhook
  (`paid → queued`) through `assertTransition`.
- **`inputs.status` is a red herring:** the assembled `Story*Session` carries
  `status: "generating"` (an engine-session field). Verified `grep`: NOTHING reads
  `order.inputs.status` to drive the lifecycle/generation. The order row status is
  the only authority. Don't flag the "generating" in the stored inputs.
- **Untrusted blob is reconstructed, not trusted:** the route re-runs
  `missingRequiredFieldsForDraft` + `draftToSessionForDraft` and stores the
  **assembled** session (built field-by-field from whitelisted draft groups), not
  the raw POST body. A new product's `draftToSession<Product>` must build a fresh
  object (not spread the client blob) — check this for each new assembler.
- **IDOR inherited:** order id is `createSessionId()` server-minted + `isSafeOrderId`
  guarded; photo keyed `order-photos/<id>/photo`; no lookup by guessable id (delivery
  is by opaque token via `getOrderByDeliveryToken`, identical-`null` no-enumeration).
- **Engine-free public graph inherited IF** the product module
  (`lib/story/story-<n>.ts`) keeps its `*_SCENE_PAGE_IDS` local and does NOT import
  `lib/ai/*` — that's what keeps the client-safe `catalog → registry → story-<n>`
  chain pure. The new product's prompt builder (`lib/ai/story<n>-prompts`) must be
  added to `FORBIDDEN_LOCAL` in surface.boundary.test.ts.

**Verification recipe for a new public product (all ran green for Story 4):**
1. `git diff main -- 'app/(public)/api/order/route.ts'` → expect EMPTY (route is
   product-agnostic). If non-empty, the product touched the trust boundary — review.
2. Confirm `lib/order/types.ts` `NewOrderInput` still excludes `status`/`pdfKey`.
3. `grep -rn 'inputs.status' lib/order app/(public)/api` → expect no lifecycle reads.
4. Confirm `lib/story/story-<n>.ts` imports NO `lib/ai/*`; confirm the new
   `lib/ai/story<n>-prompts` is in `FORBIDDEN_LOCAL`.
5. `npx vitest run lib/runtime/surface.boundary.test.ts lib/catalog/products.test.ts lib/session/draft.test.ts 'app/(public)/api/order/route.test.ts'`
   → boundary test is non-vacuous (has the "resolves a non-trivial closure" anchor
   on products.ts/registry.ts).
6. New `public/samples/<productId>/*.jpg`: decode APP1/Exif + APP13/Photoshop
   segments — `sips` leaves only an empty 74-byte TIFF stub + 54-byte 8BIM stub,
   NO GPS/camera/author/path. AI-generated art carries no camera PII. (Story-4
   samples were clean.)

See [[spend-guard-claim-pattern]] and [[operator-engine-boundary]].
