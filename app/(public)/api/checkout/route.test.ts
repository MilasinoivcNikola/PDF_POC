import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// POST /api/checkout creates a Lemon Squeezy hosted checkout for a pending order.
// It holds the secret LEMONSQUEEZY_API_KEY but never touches the DB or the engine.
// These tests assert the route's LOGIC with the LS network call MOCKED at the lib
// boundary (createCheckout) — no fetch, no live LS, no spend. The catalog is the
// real (pure, client-safe) module; env config is set/cleared per test.
//
// What matters here is the trust/validation boundary: a bad/unknown product or a
// missing variant env must fail cleanly in the house JSON shape BEFORE any LS call,
// and an LS error must not leak the upstream body.

const createCheckoutMock = vi.fn();

vi.mock("@/lib/order/lemonsqueezy", () => ({
  createCheckout: (params: unknown) => createCheckoutMock(params),
  // Re-export the constant the route does not import, kept minimal: the route only
  // pulls createCheckout from this module.
}));

const { POST } = await import("./route");

// A valid order id is the createSessionId() / isSafeOrderId() shape (UUID-ish).
const ORDER_ID = "11112222-3333-4444-5555-666677778888";

// Snapshot env we touch so each test starts from a known config.
const ENV_KEYS = [
  "LEMONSQUEEZY_API_KEY",
  "LEMONSQUEEZY_STORE_ID",
  "LEMONSQUEEZY_VARIANT_STORY_1_BOOK",
  "LEMONSQUEEZY_VARIANT_STORY_2_LETTER",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
  }
  // Default: fully configured for story-1-book so the happy path can run.
  process.env.LEMONSQUEEZY_API_KEY = "ls_api_key_test";
  process.env.LEMONSQUEEZY_STORE_ID = "5373";
  process.env.LEMONSQUEEZY_VARIANT_STORY_1_BOOK = "1346";
  process.env.LEMONSQUEEZY_VARIANT_STORY_2_LETTER = "1347";
  createCheckoutMock.mockResolvedValue("https://checkout.lemonsqueezy.com/abc");
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = savedEnv[k];
    }
  }
});

/** Build a POST Request with a JSON body for /api/checkout. */
function checkoutRequest(body: unknown, url = "https://shop.example.com/api/checkout"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Happy path — a configured product returns the hosted checkout URL
// ---------------------------------------------------------------------------

describe("successful checkout creation", () => {
  it("returns { ok: true, url } with the URL from createCheckout", async () => {
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      url: "https://checkout.lemonsqueezy.com/abc",
    });
    expect(createCheckoutMock).toHaveBeenCalledTimes(1);
  });

  it("passes the resolved env config + orderId + a confirmation redirect URL to createCheckout", async () => {
    await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));

    const params = createCheckoutMock.mock.calls[0][0] as Record<string, unknown>;
    expect(params.apiKey).toBe("ls_api_key_test");
    expect(params.storeId).toBe("5373");
    // The per-product variant env (LEMONSQUEEZY_VARIANT_STORY_1_BOOK) was resolved.
    expect(params.variantId).toBe("1346");
    expect(params.orderId).toBe(ORDER_ID);
    // The redirect URL is derived from the request origin → the confirmation page,
    // which grants nothing (only the webhook advances state).
    expect(params.redirectUrl).toBe(
      "https://shop.example.com/order/story-1-book/confirmation",
    );
  });

  it("resolves the variant from the SECOND product's own env var", async () => {
    await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-2-letter" }));

    const params = createCheckoutMock.mock.calls[0][0] as Record<string, unknown>;
    expect(params.variantId).toBe("1347");
    expect(params.redirectUrl).toBe(
      "https://shop.example.com/order/story-2-letter/confirmation",
    );
  });
});

// ---------------------------------------------------------------------------
// Input validation — house-shape error BEFORE any LS call
// ---------------------------------------------------------------------------

describe("input validation", () => {
  it("rejects an invalid JSON body with invalid_json and no LS call", async () => {
    const res = await POST(checkoutRequest("not json{"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_json" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rejects a non-object JSON body with invalid_request", async () => {
    const res = await POST(checkoutRequest(42));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_request" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rejects a missing orderId with invalid_order_id and no LS call", async () => {
    const res = await POST(checkoutRequest({ productId: "story-1-book" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_order_id" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rejects an unsafe orderId (traversal) with invalid_order_id, no LS call", async () => {
    const res = await POST(
      checkoutRequest({ orderId: "../../etc/passwd", productId: "story-1-book" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_order_id" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rejects a missing productId with missing_product (orderId already valid)", async () => {
    const res = await POST(checkoutRequest({ orderId: ORDER_ID }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing_product" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown productId with unknown_product (404), no LS call", async () => {
    const res = await POST(
      checkoutRequest({ orderId: ORDER_ID, productId: "story-99-novella" }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "unknown_product" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Env / config gaps — clean failure (the form's fallback depends on no crash)
// ---------------------------------------------------------------------------

describe("missing server config", () => {
  it("fails checkout_unavailable (503) when the variant env for the product is missing", async () => {
    delete process.env.LEMONSQUEEZY_VARIANT_STORY_1_BOOK;
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "checkout_unavailable" });
    // No LS call attempted with empty creds.
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("fails checkout_unavailable (503) when the API key is missing", async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "checkout_unavailable" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("fails checkout_unavailable (503) when the store id is missing", async () => {
    delete process.env.LEMONSQUEEZY_STORE_ID;
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "checkout_unavailable" });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("does not echo the missing variant env value in the error (no leak)", async () => {
    delete process.env.LEMONSQUEEZY_VARIANT_STORY_1_BOOK;
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));
    const json = (await res.json()) as { ok: boolean; error: string };
    // The error code is generic; nothing about which var or its (absent) value.
    expect(json.error).toBe("checkout_unavailable");
    expect(JSON.stringify(json)).not.toMatch(/LEMONSQUEEZY/);
  });
});

// ---------------------------------------------------------------------------
// LS failure — clean house-shape error, no upstream leak
// ---------------------------------------------------------------------------

describe("Lemon Squeezy failure", () => {
  it("fails checkout_failed (502) when createCheckout throws, with no upstream leak", async () => {
    createCheckoutMock.mockRejectedValueOnce(
      new Error("Lemon Squeezy checkout creation failed (HTTP 422). secret-ish body"),
    );
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));

    expect(res.status).toBe(502);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json).toEqual({ ok: false, error: "checkout_failed" });
    // The thrown error's message (which could carry upstream detail) is NOT leaked.
    expect(JSON.stringify(json)).not.toMatch(/HTTP 422/);
    expect(JSON.stringify(json)).not.toMatch(/secret-ish/);
  });

  it("fails checkout_failed (502) when createCheckout rejects (no URL in response)", async () => {
    createCheckoutMock.mockRejectedValueOnce(
      new Error("Lemon Squeezy checkout response had no URL."),
    );
    const res = await POST(checkoutRequest({ orderId: ORDER_ID, productId: "story-1-book" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "checkout_failed" });
  });
});
