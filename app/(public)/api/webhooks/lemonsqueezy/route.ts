// POST /api/webhooks/lemonsqueezy — the ONLY trusted "this order is paid" signal
// (commerce PR-06). Lemon Squeezy (Merchant of Record) calls this when a checkout
// is paid; on a verified paid-order event we move our order
// `pending_payment → paid → queued` and persist the LS order id. The worker (PR-07)
// takes it from `queued`. There is NO `pending_payment → generating` edge — this
// route never spends, it only reaches `queued`.
//
// PUBLIC SURFACE (runs on Vercel): NO assertOperator() — it must run on the
// always-on public host that takes/confirms payment. Same tier as PR-05's
// /api/order: it MAY hold the service-role Supabase key (to read/write the order
// row) but must NEVER import the engine (lib/ai/*, Puppeteer, local-disk session
// IO). The boundary test asserts this route's import closure is engine-free.
//
// SECURITY SPINE — the order of operations is load-bearing:
//   1. Read the RAW body with `request.text()` BEFORE any parse — re-serializing
//      via `request.json()` would change the bytes and break the HMAC.
//   2. Verify the HMAC-SHA256 `X-Signature` (constant-time) against
//      LEMONSQUEEZY_WEBHOOK_SECRET. Reject unsigned/tampered/mismatched BEFORE any
//      DB read or write. A bad/missing signature is a 401 with a bare body.
//   3. Only then parse + act. The redirect/confirmation page the customer sees is
//      NOT trusted — only this verified webhook advances the order.
//
// IDEMPOTENCY (LS retries on any non-2xx, and may double-deliver): read the order
// first. If it's already past `pending_payment` (already `paid`/`queued`/etc.),
// treat the webhook as a no-op SUCCESS (200) — do not re-transition (which would
// throw IllegalTransitionError). So a replayed webhook produces exactly one move.

import process from "node:process";
import { getOrder, setOrderLsId, updateOrderStatus } from "@/lib/order/store";
import { isSafeOrderId } from "@/lib/supabase/ids";
import {
  getCustomOrderId,
  getEventName,
  getLemonSqueezyOrderId,
  isPaidOrderEvent,
  verifyWebhookSignature,
  type LemonSqueezyWebhook,
} from "@/lib/order/lemonsqueezy";

/**
 * A bare-status response (no JSON body). Lemon Squeezy treats any 2xx as
 * "delivered" and retries non-2xx, so we return plain 200 on success/no-op and a
 * terse 4xx on a rejected request. Error bodies are non-leaky (a short string, no
 * internals) — an attacker probing the endpoint learns nothing.
 */
function status(text: string, code: number): Response {
  return new Response(text, { status: code });
}

export async function POST(request: Request): Promise<Response> {
  // --- 1. Raw body (BEFORE any parse) -------------------------------------
  const rawBody = await request.text();

  // --- 2. Verify the signature BEFORE any DB read/write -------------------
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    // Misconfigured deploy: refuse rather than accept unsigned traffic. 500
    // (server-side problem), not 401 — the request itself isn't the issue.
    return status("Webhook not configured", 500);
  }
  const signature = request.headers.get("x-signature");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return status("Invalid signature", 401);
  }

  // --- 3. Parse the verified body -----------------------------------------
  let payload: LemonSqueezyWebhook;
  try {
    payload = JSON.parse(rawBody) as LemonSqueezyWebhook;
  } catch {
    return status("Invalid payload", 400);
  }

  const eventName = getEventName(payload);

  // Unknown / unhandled event types: ignore safely with a 200 so LS doesn't retry
  // forever. We only act on paid-order events.
  if (!isPaidOrderEvent(eventName)) {
    return status("Ignored", 200);
  }

  // --- Resolve OUR order via the custom data we round-tripped through checkout
  const orderId = getCustomOrderId(payload);
  if (!orderId || !isSafeOrderId(orderId)) {
    // No usable order id in custom_data (or a malformed one). 200 so LS stops
    // retrying — a payload we can't tie to an order is not something a retry fixes.
    return status("No matching order", 200);
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch {
    // `getOrder` throws on a malformed id; the guard above should prevent this, but
    // handle it as a clean reject rather than a 500 leak.
    return status("No matching order", 200);
  }
  if (!order) {
    return status("No matching order", 200);
  }

  // --- Idempotency: advance only the steps still ahead of the order -------
  // The paid flow is pending_payment → paid → queued. A duplicate/retried webhook
  // for an order already at `queued` (or beyond) is a NO-OP success — we never
  // re-transition (which would throw IllegalTransitionError). A partial-failure
  // retry (left at `paid` because the queued write failed before) is resumed:
  // we drive forward from whatever the current status is, one legal step at a time.
  // Anything off the paid path entirely (refunded/cancelled/failed/etc.) is left
  // untouched — a paid webhook never resurrects a voided order.
  if (order.status !== "pending_payment" && order.status !== "paid") {
    return status("Already processed", 200);
  }

  // The LS order id from the verified payload. A real paid event always carries it;
  // if it's ever absent we SKIP the write rather than persist a blank `ls_order_id`
  // (the order still advances — status drives off the row, not this field).
  const lsOrderId = getLemonSqueezyOrderId(payload);

  try {
    // Persist the LS order id (harmless overwrite if a retry re-sets it). Skipped
    // when LS gave no id, so we never write an empty string.
    if (lsOrderId) {
      await setOrderLsId(orderId, lsOrderId);
    }
    // Advance step-by-step from the current status. updateOrderStatus
    // assertTransitions before every write, so an unexpected concurrent state is
    // rejected (caught below), never corrupted. The worker (PR-07) drains `queued`.
    if (order.status === "pending_payment") {
      await updateOrderStatus(orderId, "paid");
    }
    await updateOrderStatus(orderId, "queued");
  } catch {
    // A transient DB error (or a race that lost the status guard): return 500 so
    // LS retries — the guard above makes the retry a safe no-op / resume if part
    // of this already landed.
    return status("Processing failed", 500);
  }

  return status("OK", 200);
}
