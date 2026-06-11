// Lemon Squeezy (Merchant of Record) integration — the PURE, unit-testable surface
// of commerce PR-06. Webhook signature verification + payload parsing live here;
// the actual network call to create a checkout is a thin server-only helper at the
// bottom (it does IO, so it can't be in the pure section that tests without mocks).
//
// Why pure-first: the signature check is the security spine of the payment flow —
// it must be exhaustively unit-tested (valid / invalid / missing / tampered /
// wrong-length) without spinning up a route or mocking a network. So everything
// that operates on already-in-hand bytes/objects is a pure function with no IO.
//
// Confirmed against the live Lemon Squeezy API (June 2026):
//   - Webhook signature: header `X-Signature`, an HMAC-SHA256 hex digest of the
//     RAW request body keyed with the webhook signing secret, compared in constant
//     time. (docs.lemonsqueezy.com/help/webhooks/signing-requests)
//   - Webhook payload (JSON:API): `meta.event_name` (e.g. "order_created"),
//     `meta.custom_data` (our `{ orderId }`, in `meta` — NOT in `data`),
//     `meta.test_mode` (bool), and `data.id` = the Lemon Squeezy order id, with
//     `data.type === "orders"`. (docs.lemonsqueezy.com/help/webhooks/example-payloads)
//   - Checkout: `POST https://api.lemonsqueezy.com/v1/checkouts`, JSON:API body
//     with `attributes.checkout_data.custom` (round-trips into `meta.custom_data`),
//     `relationships.store`/`relationships.variant`; the hosted URL comes back at
//     `data.attributes.url`. (docs.lemonsqueezy.com/api/checkouts/create-checkout)

import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Pure — webhook signature verification (no IO, no env read, no mocks to test)
// ---------------------------------------------------------------------------

/**
 * The header Lemon Squeezy sends the signature in. Header names are
 * case-insensitive; this is the canonical spelling for logs/docs.
 */
export const LS_SIGNATURE_HEADER = "X-Signature";

/**
 * Verify a Lemon Squeezy webhook signature. Computes `HMAC-SHA256(rawBody, secret)`
 * as a hex digest and compares it against the `X-Signature` header value in
 * constant time (`crypto.timingSafeEqual`).
 *
 * SECURITY-CRITICAL — this is the only thing that makes a webhook trustworthy. It
 * must run on the RAW request body bytes (the exact string LS signed); re-parsing
 * and re-serializing the JSON would change the bytes and break the HMAC.
 *
 * Returns `false` (never throws) for a missing/empty signature, a non-hex signature,
 * a length mismatch (`timingSafeEqual` requires equal-length buffers, so we guard
 * the length first to avoid the throw it does on unequal lengths), or any mismatch.
 * A missing/empty `secret` also returns `false` — an unconfigured webhook rejects
 * everything rather than accepting unsigned traffic.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");

  // timingSafeEqual throws on unequal-length buffers; a length mismatch is already
  // a definitive "no match", so short-circuit it without leaking timing on the
  // common (equal-length) path.
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ---------------------------------------------------------------------------
// Pure — verified-payload parsing (input = already-parsed object)
// ---------------------------------------------------------------------------

/**
 * The minimal shape we read off a verified Lemon Squeezy webhook. We only touch
 * the fields the order flow needs — the event name, our own `orderId` round-tripped
 * through checkout custom data, and the LS order id — and treat everything else as
 * opaque. `unknown`-typed accessors below narrow defensively (the payload is
 * external input even after the signature passes).
 */
export interface LemonSqueezyWebhook {
  meta?: {
    event_name?: unknown;
    test_mode?: unknown;
    custom_data?: unknown;
  };
  data?: {
    id?: unknown;
    type?: unknown;
  };
}

/**
 * Lemon Squeezy order events we act on: a paid order. LS sends `order_created`
 * when an order is placed (and, for digital products, payment has succeeded);
 * `order_paid` exists in some configurations too. We treat either as "this order
 * is paid" — both are idempotent through the same transition path, so handling
 * both is safe even if a store is configured to send both.
 */
export const PAID_ORDER_EVENTS = ["order_created", "order_paid"] as const;
export type PaidOrderEvent = (typeof PAID_ORDER_EVENTS)[number];

/** Extract `meta.event_name` as a string, or `null` if absent/non-string. */
export function getEventName(payload: LemonSqueezyWebhook): string | null {
  const name = payload.meta?.event_name;
  return typeof name === "string" ? name : null;
}

/** Whether `eventName` is one of the paid-order events we transition on. */
export function isPaidOrderEvent(eventName: string | null): eventName is PaidOrderEvent {
  return eventName !== null && (PAID_ORDER_EVENTS as readonly string[]).includes(eventName);
}

/**
 * Extract our own order id from `meta.custom_data.orderId` (the value we put into
 * `checkout_data.custom` when creating the checkout, which LS round-trips back into
 * `meta.custom_data`). Returns `null` if absent or not a non-empty string. The
 * caller still guards the id with `isSafeOrderId` before any storage/DB use.
 */
export function getCustomOrderId(payload: LemonSqueezyWebhook): string | null {
  const custom = payload.meta?.custom_data;
  if (typeof custom !== "object" || custom === null) {
    return null;
  }
  const orderId = (custom as Record<string, unknown>).orderId;
  return typeof orderId === "string" && orderId.length > 0 ? orderId : null;
}

/**
 * Extract the Lemon Squeezy order id from `data.id` (a string in JSON:API). This is
 * the external payment id we persist as `Order.lsOrderId`. Returns `null` if absent
 * or not a non-empty string.
 */
export function getLemonSqueezyOrderId(payload: LemonSqueezyWebhook): string | null {
  const id = payload.data?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Pure — checkout request body builder (no IO; the fetch is the thin helper below)
// ---------------------------------------------------------------------------

/** The Lemon Squeezy checkouts endpoint. */
export const LS_CHECKOUTS_URL = "https://api.lemonsqueezy.com/v1/checkouts";

/**
 * Build the JSON:API body for `POST /v1/checkouts`. PURE so the exact shape is
 * unit-testable without a network call.
 *
 * - `custom: { orderId }` is the load-bearing link: LS round-trips it back into the
 *   webhook's `meta.custom_data`, which is how the paid webhook finds our order.
 * - `redirect_url` sends the customer to our confirmation page after payment. That
 *   page grants nothing — only the verified webhook advances the order (the redirect
 *   is never trusted as proof of payment).
 * - Ids are numeric strings in env; LS accepts them as JSON:API resource ids.
 */
export function buildCheckoutBody(params: {
  storeId: string;
  variantId: string;
  orderId: string;
  email?: string;
  redirectUrl?: string;
}): Record<string, unknown> {
  return {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          ...(params.email ? { email: params.email } : {}),
          custom: { orderId: params.orderId },
        },
        ...(params.redirectUrl
          ? { product_options: { redirect_url: params.redirectUrl } }
          : {}),
      },
      relationships: {
        store: { data: { type: "stores", id: params.storeId } },
        variant: { data: { type: "variants", id: params.variantId } },
      },
    },
  };
}

/** Extract the hosted checkout URL from a create-checkout response body. */
export function getCheckoutUrl(responseBody: unknown): string | null {
  if (typeof responseBody !== "object" || responseBody === null) {
    return null;
  }
  const data = (responseBody as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const attributes = (data as Record<string, unknown>).attributes;
  if (typeof attributes !== "object" || attributes === null) {
    return null;
  }
  const url = (attributes as Record<string, unknown>).url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

// ---------------------------------------------------------------------------
// IO — create a hosted checkout (thin server-only wrapper; NOT pure)
// ---------------------------------------------------------------------------

/**
 * Create a Lemon Squeezy hosted checkout and return its URL. Does network IO with
 * the secret `LEMONSQUEEZY_API_KEY`, so it lives outside the pure section and is
 * verified by running the app, not by a unit test. The pure `buildCheckoutBody` /
 * `getCheckoutUrl` it uses ARE unit-tested.
 *
 * Throws on a non-2xx response or a missing URL so the caller can return a clean
 * house-shape error (never leaking the LS body to the client).
 */
export async function createCheckout(params: {
  apiKey: string;
  storeId: string;
  variantId: string;
  orderId: string;
  email?: string;
  redirectUrl?: string;
}): Promise<string> {
  const res = await fetch(LS_CHECKOUTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(
      buildCheckoutBody({
        storeId: params.storeId,
        variantId: params.variantId,
        orderId: params.orderId,
        email: params.email,
        redirectUrl: params.redirectUrl,
      }),
    ),
  });

  if (!res.ok) {
    throw new Error(`Lemon Squeezy checkout creation failed (HTTP ${res.status}).`);
  }

  const body: unknown = await res.json();
  const url = getCheckoutUrl(body);
  if (!url) {
    throw new Error("Lemon Squeezy checkout response had no URL.");
  }
  return url;
}
