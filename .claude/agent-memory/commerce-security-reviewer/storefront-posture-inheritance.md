---
name: storefront-posture-inheritance
description: Why adding a new public product (Story 4, PR-22) inherits the proven order-intake security posture for free — the structural invariants that close spend-guard / IDOR / status-injection at the type+route level, and the recipe to re-verify a future product
metadata:
  type: project
---

A new sellable product (a new `storyType` + catalog entry + `Story*Fields` form
component + `Story*Session` widening) inherits the proven Story-1/2 commerce
security posture **without touching the trust boundary**, because the boundary is
structural, not per-product. Verified on Story 4 (PR-22) and again on Story 5
(PR-24) — both ran the recipe below fully green with zero findings, so the
inheritance is now twice-confirmed. (PR-24 specifics: `/api/order/route.ts` diff
empty; `NewOrderInput` still excludes status/pdfKey; `draftToSessionStory5` builds
fresh field-by-field; `lib/ai/story5-prompts` in `FORBIDDEN_LOCAL`; the two
`public/samples/story-5-letter-to/*.jpg` carried only the same clean 76-byte Exif
stub + 56-byte empty 8BIM IPTC stub.)

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
