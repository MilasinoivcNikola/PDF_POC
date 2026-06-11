import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

import type { Order, OrderStatus } from "@/lib/order/types";

// The Lemon Squeezy webhook is the ONLY trusted "paid" signal, so its route logic
// is security-critical: signature verification gates everything, and idempotency
// guarantees a retried/duplicated delivery produces exactly one transition. These
// tests assert that logic with the store MOCKED at the lib boundary (getOrder /
// setOrderLsId / updateOrderStatus) — no Supabase, no network. The signature is
// real (HMAC-SHA256-hex via node:crypto, the same scheme the route verifies), so a
// "valid" request is signed the way LS would and the rejection cases genuinely fail
// the check.

const getOrderMock = vi.fn();
const setOrderLsIdMock = vi.fn();
const updateOrderStatusMock = vi.fn();

vi.mock("@/lib/order/store", () => ({
  getOrder: (id: string) => getOrderMock(id),
  setOrderLsId: (id: string, lsId: string) => setOrderLsIdMock(id, lsId),
  updateOrderStatus: (id: string, to: OrderStatus) =>
    updateOrderStatusMock(id, to),
}));

const { POST } = await import("./route");

const SECRET = "test-webhook-secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = SECRET;
  setOrderLsIdMock.mockResolvedValue(undefined);
  updateOrderStatusMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sign(rawBody: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/** Build a POST Request with a (by default valid) X-Signature for its body. */
function webhookRequest(
  payload: unknown,
  opts: { signature?: string | null; secret?: string } = {},
): Request {
  const rawBody = JSON.stringify(payload);
  const headers = new Headers({ "content-type": "application/json" });
  const sig =
    opts.signature !== undefined
      ? opts.signature
      : sign(rawBody, opts.secret ?? SECRET);
  if (sig !== null) {
    headers.set("X-Signature", sig);
  }
  return new Request("https://example.com/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

function paidPayload(orderId = "order-abc", lsOrderId = "999001") {
  return {
    meta: { event_name: "order_created", custom_data: { orderId } },
    data: { id: lsOrderId, type: "orders" },
  };
}

function orderAt(status: OrderStatus, id = "order-abc"): Order {
  return {
    id,
    productId: "story-1-book",
    storyType: "story-1",
    status,
    customerEmail: "a@b.com",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputs: {} as any,
    photoKey: `${id}/photo`,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// Happy path — a fresh pending_payment order moves to queued exactly once
// ---------------------------------------------------------------------------

describe("valid signed order_created", () => {
  it("moves a pending_payment order pending → paid → queued and sets lsOrderId", async () => {
    getOrderMock.mockResolvedValue(orderAt("pending_payment"));

    const res = await POST(webhookRequest(paidPayload("order-abc", "999001")));

    expect(res.status).toBe(200);
    expect(setOrderLsIdMock).toHaveBeenCalledExactlyOnceWith("order-abc", "999001");
    expect(updateOrderStatusMock).toHaveBeenCalledTimes(2);
    expect(updateOrderStatusMock).toHaveBeenNthCalledWith(1, "order-abc", "paid");
    expect(updateOrderStatusMock).toHaveBeenNthCalledWith(2, "order-abc", "queued");
  });

  it("advances the order WITHOUT a blank ls_order_id when LS sent no order id", async () => {
    // Defensive: a paid event with no `data.id`. We must NOT persist a blank
    // ls_order_id (`setOrderLsId` is skipped), but the order still advances to queued
    // — status drives off the row, not this field.
    getOrderMock.mockResolvedValue(orderAt("pending_payment"));
    const payload = {
      meta: { event_name: "order_created", custom_data: { orderId: "order-abc" } },
      data: { type: "orders" }, // no `id`
    };

    const res = await POST(webhookRequest(payload));

    expect(res.status).toBe(200);
    expect(setOrderLsIdMock).not.toHaveBeenCalled();
    expect(updateOrderStatusMock).toHaveBeenNthCalledWith(1, "order-abc", "paid");
    expect(updateOrderStatusMock).toHaveBeenNthCalledWith(2, "order-abc", "queued");
  });

  it("also handles the order_paid event name", async () => {
    getOrderMock.mockResolvedValue(orderAt("pending_payment"));
    const payload = {
      meta: { event_name: "order_paid", custom_data: { orderId: "order-abc" } },
      data: { id: "999001", type: "orders" },
    };

    const res = await POST(webhookRequest(payload));

    expect(res.status).toBe(200);
    expect(updateOrderStatusMock).toHaveBeenLastCalledWith("order-abc", "queued");
  });
});

// ---------------------------------------------------------------------------
// Idempotency — a duplicate / already-advanced order is a no-op
// ---------------------------------------------------------------------------

describe("idempotency", () => {
  it("is a no-op (no transition) when the order is already queued", async () => {
    getOrderMock.mockResolvedValue(orderAt("queued"));

    const res = await POST(webhookRequest(paidPayload()));

    expect(res.status).toBe(200);
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
    expect(setOrderLsIdMock).not.toHaveBeenCalled();
  });

  it("resumes a partial-failure order left at paid (only the queued step runs)", async () => {
    getOrderMock.mockResolvedValue(orderAt("paid"));

    const res = await POST(webhookRequest(paidPayload()));

    expect(res.status).toBe(200);
    // No re-transition into `paid`; only the remaining paid → queued step fires.
    expect(updateOrderStatusMock).toHaveBeenCalledExactlyOnceWith(
      "order-abc",
      "queued",
    );
  });

  it("does not resurrect a voided order (refunded/cancelled/failed → no-op)", async () => {
    for (const status of ["refunded", "cancelled", "failed"] as OrderStatus[]) {
      vi.clearAllMocks();
      getOrderMock.mockResolvedValue(orderAt(status));
      const res = await POST(webhookRequest(paidPayload()));
      expect(res.status).toBe(200);
      expect(updateOrderStatusMock).not.toHaveBeenCalled();
    }
  });

  it("is a no-op for every in-pipeline / done status past queued (generating … delivered)", async () => {
    // The spec calls these out explicitly: a paid webhook arriving when the order
    // is already mid-pipeline or done must NOT transition (which would throw an
    // IllegalTransitionError, e.g. delivered → paid) — it returns a quiet 200 and
    // touches neither status nor lsOrderId.
    for (const status of [
      "generating",
      "awaiting_review",
      "approved",
      "delivered",
    ] as OrderStatus[]) {
      vi.clearAllMocks();
      getOrderMock.mockResolvedValue(orderAt(status));
      const res = await POST(webhookRequest(paidPayload()));
      expect(res.status).toBe(200);
      expect(updateOrderStatusMock).not.toHaveBeenCalled();
      expect(setOrderLsIdMock).not.toHaveBeenCalled();
    }
  });

  it("processes two identical deliveries as one transition", async () => {
    // First delivery: pending → moves it. Second delivery: order is now queued → no-op.
    getOrderMock
      .mockResolvedValueOnce(orderAt("pending_payment"))
      .mockResolvedValueOnce(orderAt("queued"));

    const req1 = webhookRequest(paidPayload());
    const req2 = webhookRequest(paidPayload());
    await POST(req1);
    await POST(req2);

    // Exactly the one fresh transition pair, never a second illegal attempt.
    expect(updateOrderStatusMock).toHaveBeenCalledTimes(2);
    expect(updateOrderStatusMock).toHaveBeenNthCalledWith(1, "order-abc", "paid");
    expect(updateOrderStatusMock).toHaveBeenNthCalledWith(2, "order-abc", "queued");
  });
});

// ---------------------------------------------------------------------------
// Signature rejection — BEFORE any store call
// ---------------------------------------------------------------------------

describe("signature rejection", () => {
  it("rejects an unsigned request (no X-Signature) with 401, no store read", async () => {
    const res = await POST(webhookRequest(paidPayload(), { signature: null }));
    expect(res.status).toBe(401);
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a wrong signature (wrong secret) with 401, no store read", async () => {
    const res = await POST(
      webhookRequest(paidPayload(), { secret: "attacker-secret" }),
    );
    expect(res.status).toBe(401);
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered body (valid sig over a different body) with 401", async () => {
    // Sign the original body, then send a different body with that signature.
    const original = JSON.stringify(paidPayload());
    const tampered = JSON.stringify(paidPayload("order-EVIL"));
    const req = new Request("https://example.com/api/webhooks/lemonsqueezy", {
      method: "POST",
      headers: { "X-Signature": sign(original) },
      body: tampered,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the webhook secret is not configured (rejects, no store read)", async () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const res = await POST(webhookRequest(paidPayload()));
    expect(res.status).toBe(500);
    expect(getOrderMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unknown event / unresolvable order — safe 200, no transition
// ---------------------------------------------------------------------------

describe("non-paid and unresolvable cases", () => {
  it("ignores an unknown event type with 200 and no store read", async () => {
    const payload = {
      meta: { event_name: "subscription_created", custom_data: { orderId: "x" } },
      data: { id: "1" },
    };
    const res = await POST(webhookRequest(payload));
    expect(res.status).toBe(200);
    expect(getOrderMock).not.toHaveBeenCalled();
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("ignores a refund event safely (200, no transition)", async () => {
    const payload = {
      meta: { event_name: "order_refunded", custom_data: { orderId: "order-abc" } },
      data: { id: "1" },
    };
    const res = await POST(webhookRequest(payload));
    expect(res.status).toBe(200);
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("returns 200 (no 500) when custom_data has no orderId", async () => {
    const payload = {
      meta: { event_name: "order_created", custom_data: {} },
      data: { id: "1" },
    };
    const res = await POST(webhookRequest(payload));
    expect(res.status).toBe(200);
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("returns 200 cleanly for a malformed orderId (no 500 leak, no store read)", async () => {
    const payload = {
      meta: {
        event_name: "order_created",
        custom_data: { orderId: "../../etc/passwd" },
      },
      data: { id: "1" },
    };
    const res = await POST(webhookRequest(payload));
    expect(res.status).toBe(200);
    // The unsafe id is rejected by isSafeOrderId before any store call.
    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it("returns 200 when the order id is unknown (not found)", async () => {
    getOrderMock.mockResolvedValue(null);
    const res = await POST(webhookRequest(paidPayload("order-unknown")));
    expect(res.status).toBe(200);
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid JSON body (signed) with 400", async () => {
    const rawBody = "not json{";
    const req = new Request("https://example.com/api/webhooks/lemonsqueezy", {
      method: "POST",
      headers: { "X-Signature": sign(rawBody) },
      body: rawBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(getOrderMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Transient store failure → 500 (LS retries; idempotency makes the retry safe)
// ---------------------------------------------------------------------------

describe("transient failure", () => {
  it("returns 500 when a transition write fails", async () => {
    getOrderMock.mockResolvedValue(orderAt("pending_payment"));
    updateOrderStatusMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(webhookRequest(paidPayload()));
    expect(res.status).toBe(500);
  });

  it("returns 500 (LS will retry) when setOrderLsId fails before the transition", async () => {
    // setOrderLsId is the first write in the act phase; if it throws, the handler
    // must surface a 500 so LS retries — and must NOT have advanced the status
    // (the idempotency guard makes the retry a safe resume from pending_payment).
    getOrderMock.mockResolvedValue(orderAt("pending_payment"));
    setOrderLsIdMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(webhookRequest(paidPayload()));
    expect(res.status).toBe(500);
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });
});
