import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

import {
  buildCheckoutBody,
  getCheckoutUrl,
  getCustomOrderId,
  getEventName,
  getLemonSqueezyOrderId,
  isPaidOrderEvent,
  verifyWebhookSignature,
  type LemonSqueezyWebhook,
} from "./lemonsqueezy";

// The PURE Lemon Squeezy surface — signature verification (the security spine) and
// verified-payload parsing — unit-tested with no network and no mocks. The
// signature is computed with the SAME node:crypto HMAC-SHA256-hex the production
// helper uses, so a valid signature is generated the way LS would, and the tamper
// cases prove the check actually rejects.

const SECRET = "test-signing-secret";

/** Sign a raw body the way Lemon Squeezy does: HMAC-SHA256 hex of the raw bytes. */
function sign(rawBody: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ meta: { event_name: "order_created" } });

  it("accepts a valid signature over the raw body", () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    expect(verifyWebhookSignature(body, sign(body, "wrong-secret"), SECRET)).toBe(
      false,
    );
  });

  it("rejects when the body was tampered with after signing", () => {
    const signature = sign(body);
    const tampered = body.replace("order_created", "order_refunded");
    expect(verifyWebhookSignature(tampered, signature, SECRET)).toBe(false);
  });

  it("rejects a missing signature header (null)", () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
  });

  it("rejects a missing signature header (undefined)", () => {
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false);
  });

  it("rejects an empty signature header", () => {
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
  });

  it("rejects (without throwing) a wrong-length signature", () => {
    // timingSafeEqual throws on unequal-length buffers; the length guard must catch
    // it and return false rather than letting the throw escape.
    expect(() => verifyWebhookSignature(body, "abc123", SECRET)).not.toThrow();
    expect(verifyWebhookSignature(body, "abc123", SECRET)).toBe(false);
  });

  it("rejects when the secret is empty (unconfigured webhook accepts nothing)", () => {
    expect(verifyWebhookSignature(body, sign(body), "")).toBe(false);
  });

  it("rejects a same-length but different signature", () => {
    const valid = sign(body);
    // Flip one hex char to keep the length identical but the value different.
    const flipped =
      valid[0] === "a" ? "b" + valid.slice(1) : "a" + valid.slice(1);
    expect(verifyWebhookSignature(body, flipped, SECRET)).toBe(false);
  });

  it("rejects (without throwing) a same-length but non-hex / malformed signature", () => {
    const valid = sign(body); // 64 lowercase hex chars
    // Same byte-length as the real digest but full of non-hex chars. The compare is
    // byte-wise over the utf8 buffers (not a hex decode), so length matches and the
    // bytes simply differ — this must be a quiet `false`, never a throw.
    const malformed = "z".repeat(valid.length);
    expect(malformed.length).toBe(valid.length);
    expect(() => verifyWebhookSignature(body, malformed, SECRET)).not.toThrow();
    expect(verifyWebhookSignature(body, malformed, SECRET)).toBe(false);
  });

  it("is case-sensitive: an upper-cased (equal-length) hex digest does not match", () => {
    // LS sends a lowercase hex digest and the helper compares raw utf8 bytes, so an
    // upper-cased version of the correct digest is the same length but different
    // bytes → rejected. Pins the encoding contract (no case-folding).
    const valid = sign(body);
    const upper = valid.toUpperCase();
    expect(upper).not.toBe(valid); // a real digest has at least one a-f char
    expect(upper.length).toBe(valid.length);
    expect(verifyWebhookSignature(body, upper, SECRET)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// payload parsing
// ---------------------------------------------------------------------------

describe("payload parsing", () => {
  const fullPayload: LemonSqueezyWebhook = {
    meta: {
      event_name: "order_created",
      test_mode: true,
      custom_data: { orderId: "order-abc-123" },
    },
    data: { id: "999001", type: "orders" },
  };

  it("extracts meta.event_name", () => {
    expect(getEventName(fullPayload)).toBe("order_created");
  });

  it("returns null for a missing/non-string event_name", () => {
    expect(getEventName({})).toBeNull();
    expect(getEventName({ meta: {} })).toBeNull();
    expect(getEventName({ meta: { event_name: 42 } })).toBeNull();
  });

  it("recognizes paid-order events and rejects others", () => {
    expect(isPaidOrderEvent("order_created")).toBe(true);
    expect(isPaidOrderEvent("order_paid")).toBe(true);
    expect(isPaidOrderEvent("order_refunded")).toBe(false);
    expect(isPaidOrderEvent("subscription_created")).toBe(false);
    expect(isPaidOrderEvent(null)).toBe(false);
  });

  it("extracts our orderId from meta.custom_data", () => {
    expect(getCustomOrderId(fullPayload)).toBe("order-abc-123");
  });

  it("returns null when custom_data / orderId is absent or empty", () => {
    expect(getCustomOrderId({})).toBeNull();
    expect(getCustomOrderId({ meta: {} })).toBeNull();
    expect(getCustomOrderId({ meta: { custom_data: {} } })).toBeNull();
    expect(getCustomOrderId({ meta: { custom_data: { orderId: "" } } })).toBeNull();
    expect(
      getCustomOrderId({ meta: { custom_data: { orderId: 5 } } } as LemonSqueezyWebhook),
    ).toBeNull();
    // custom_data present but not an object
    expect(
      getCustomOrderId({ meta: { custom_data: "nope" } } as LemonSqueezyWebhook),
    ).toBeNull();
  });

  it("extracts the Lemon Squeezy order id from data.id", () => {
    expect(getLemonSqueezyOrderId(fullPayload)).toBe("999001");
  });

  it("returns null when data.id is absent or non-string", () => {
    expect(getLemonSqueezyOrderId({})).toBeNull();
    expect(getLemonSqueezyOrderId({ data: {} })).toBeNull();
    expect(
      getLemonSqueezyOrderId({ data: { id: 999 } } as LemonSqueezyWebhook),
    ).toBeNull();
    expect(getLemonSqueezyOrderId({ data: { id: "" } })).toBeNull();
  });

  it("never throws on a fully-empty or wholly-malformed payload (every parser)", () => {
    // After the signature passes, the body is still external input. None of the
    // pure parsers may throw on a missing/garbage shape — they return safe nulls so
    // the route turns them into a quiet 200, never a 500 stack leak.
    const empty = {} as LemonSqueezyWebhook;
    const junk = { meta: 7, data: "nope" } as unknown as LemonSqueezyWebhook;
    for (const p of [empty, junk]) {
      expect(() => getEventName(p)).not.toThrow();
      expect(() => getCustomOrderId(p)).not.toThrow();
      expect(() => getLemonSqueezyOrderId(p)).not.toThrow();
      expect(getEventName(p)).toBeNull();
      expect(getCustomOrderId(p)).toBeNull();
      expect(getLemonSqueezyOrderId(p)).toBeNull();
    }
  });

  it("reads data.id regardless of data.type (the helper does not gate on type)", () => {
    // Documents the actual contract: getLemonSqueezyOrderId only requires a
    // non-empty string id; it does not enforce data.type === "orders". The route's
    // safety comes from the signature + the paid-event check + isSafeOrderId, not
    // from a type assertion here. If type-gating is ever wanted, this test will flag
    // the behavior change.
    expect(
      getLemonSqueezyOrderId({ data: { id: "555", type: "subscriptions" } }),
    ).toBe("555");
    expect(getLemonSqueezyOrderId({ data: { id: "555" } })).toBe("555");
  });
});

// ---------------------------------------------------------------------------
// checkout body / response parsing
// ---------------------------------------------------------------------------

describe("buildCheckoutBody", () => {
  it("nests custom: { orderId } so it round-trips into meta.custom_data", () => {
    const body = buildCheckoutBody({
      storeId: "5373",
      variantId: "1346",
      orderId: "order-xyz",
    });
    const data = body.data as Record<string, unknown>;
    const attributes = data.attributes as Record<string, unknown>;
    const checkoutData = attributes.checkout_data as Record<string, unknown>;
    expect(data.type).toBe("checkouts");
    expect(checkoutData.custom).toEqual({ orderId: "order-xyz" });
  });

  it("sets the JSON:API store + variant relationships", () => {
    const body = buildCheckoutBody({
      storeId: "5373",
      variantId: "1346",
      orderId: "order-xyz",
    });
    const data = body.data as Record<string, unknown>;
    const relationships = data.relationships as Record<string, unknown>;
    expect(relationships.store).toEqual({
      data: { type: "stores", id: "5373" },
    });
    expect(relationships.variant).toEqual({
      data: { type: "variants", id: "1346" },
    });
  });

  it("includes email and redirect_url only when provided", () => {
    const withExtras = buildCheckoutBody({
      storeId: "1",
      variantId: "2",
      orderId: "o",
      email: "a@b.com",
      redirectUrl: "https://x/confirm",
    });
    const attrsWith = (withExtras.data as Record<string, unknown>)
      .attributes as Record<string, unknown>;
    expect((attrsWith.checkout_data as Record<string, unknown>).email).toBe(
      "a@b.com",
    );
    expect(
      (attrsWith.product_options as Record<string, unknown>).redirect_url,
    ).toBe("https://x/confirm");

    const without = buildCheckoutBody({ storeId: "1", variantId: "2", orderId: "o" });
    const attrsWithout = (without.data as Record<string, unknown>)
      .attributes as Record<string, unknown>;
    expect(
      (attrsWithout.checkout_data as Record<string, unknown>).email,
    ).toBeUndefined();
    expect(attrsWithout.product_options).toBeUndefined();
  });
});

describe("getCheckoutUrl", () => {
  it("reads data.attributes.url", () => {
    expect(
      getCheckoutUrl({ data: { attributes: { url: "https://checkout/abc" } } }),
    ).toBe("https://checkout/abc");
  });

  it("returns null for a malformed response", () => {
    expect(getCheckoutUrl(null)).toBeNull();
    expect(getCheckoutUrl({})).toBeNull();
    expect(getCheckoutUrl({ data: {} })).toBeNull();
    expect(getCheckoutUrl({ data: { attributes: {} } })).toBeNull();
    expect(getCheckoutUrl({ data: { attributes: { url: "" } } })).toBeNull();
  });
});
