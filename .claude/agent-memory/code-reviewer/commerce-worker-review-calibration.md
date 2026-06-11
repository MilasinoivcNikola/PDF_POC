---
name: commerce-worker-review-calibration
description: Cross-feature traps + deferral calibration for the PR-07 local batch worker (queued→awaiting_review generation)
metadata:
  type: project
---

Review calibration for the **local batch worker** (drains `queued` orders →
generates → `awaiting_review`/`failed`). Two non-obvious traps to check on this
and any later worker/retry path:

1. **Photo content-type trap (`.jpg` assumption) — FIXED & verified, do not
   re-flag as open.** The worker originally wrote the downloaded Supabase photo
   bytes to a hardcoded `photo.jpg`, then the engine derived the OpenAI MIME from
   the **`.jpg` extension** (`photoToFile` → `extensionToMime`). Intake accepts
   jpeg/png/webp and the client `downscaleImage` **only** re-encodes to JPEG above
   the ~1024px cap — so a small PNG/WebP reaches Supabase un-re-encoded and would
   ship PNG/WebP bytes labeled `image/jpeg`. **Real bug class.** The accepted fix
   (verified 2026-06-11): a pure `detectImageExtension(bytes)` sniffs magic numbers
   once in `processOrder` — JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP =
   `RIFF`(0-3) AND `WEBP`(8-11) (the dual check correctly rejects `RIFF…WAVE`
   audio), unknown/short → `"jpg"` fallback (length-guarded, no throw on empty) —
   and threads the `ext` to BOTH `writePhotoToScratch` and `buildEngineSession`, so
   the file on disk and the engine-resolved path can't disagree. **The correct
   shape: sniff at the worker, thread one ext to both path builders.**

2. **Retry is not a $0 cache hit.** The cache (`findCachedImage`) keys off
   `session.images`, and the worker builds the engine session from
   `order.inputs` (intake sets `images: []`). The manifest is persisted only to
   `./sessions/[id].json` (via `writeSession`), **never written back to
   `order.inputs`**. So a `failed → queued` retry regenerates the whole book at
   full cost — contradicting the "$0 re-run" goal. (A re-run of an *already
   succeeded* order is genuinely $0 because it's no longer `queued` and isn't
   picked up — distinguish the two "re-run" meanings.)

**Validated-as-intentional (do NOT re-flag):**
- The **cross-OS-process claim race** (`updateOrderStatus` is `UPDATE … WHERE
  id=?` with no `.eq("status","queued")`, so it's an app-level state assert, not a
  DB compare-and-swap). In-process claims are serialized by `ORDER_CONCURRENCY=1`;
  the roadmap runs this once/twice daily, not concurrently. Deferring the
  `.eq(...)` store change is **acceptable for this PR** (it's a store change
  outside scope, and the threat is out of model). Same TOCTOU-claim discipline as
  [[commerce-idempotency-pattern]], correctly applied.
- `IllegalTransitionError` on the claim → **skipped** (not failed, no generation);
  generic claim failure → re-thrown → counted failed but order **left `queued`**
  for natural retry. Both correct.

Related: [[commerce-idempotency-pattern]], [[commerce-webhook-review-calibration]].
