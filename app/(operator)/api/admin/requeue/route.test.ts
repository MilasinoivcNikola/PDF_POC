import { describe, it, expect, vi, beforeEach } from "vitest";

// The /api/admin/requeue boundary (commerce PR-08) — the operator's retry action
// for a `failed` order. Its job: AUTH-gate, validate the id, then move
// `failed → queued` via the store (the worker re-drains queued orders). NO
// generation happens here — it is a pure status nudge. External boundaries MOCKED:
//   - @/lib/supabase/auth → stubbed getOperatorUserId (the auth gate)
//   - @/lib/order/store   → stubbed updateOrderStatus
// isSafeOrderId + IllegalTransitionError stay REAL. DEPLOY_TARGET defaults to
// "operator" so assertOperator() passes (the public-build 404 is proven in
// lib/runtime/all-operator-routes-gate.test.ts).
//
// The crux on every rejection path: updateOrderStatus is NOT called — no write.

const getOperatorUserIdMock = vi.fn();
const updateOrderStatusMock = vi.fn();

vi.mock("@/lib/supabase/auth", () => ({
  getOperatorUserId: () => getOperatorUserIdMock(),
}));

vi.mock("@/lib/order/store", () => ({
  updateOrderStatus: (id: string, to: string) => updateOrderStatusMock(id, to),
}));

const { IllegalTransitionError } = await import("@/lib/order/state");
const { POST } = await import("./route");

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/requeue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getOperatorUserIdMock.mockResolvedValue("operator-user-1");
  updateOrderStatusMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------------

describe("POST /api/admin/requeue — auth gate", () => {
  it("401s an unauthenticated visitor before any write", async () => {
    getOperatorUserIdMock.mockResolvedValue(null);

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("POST /api/admin/requeue — validation", () => {
  it("rejects an unparseable body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/admin/requeue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("rejects a missing orderId with 400 invalid_order_id", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_order_id",
    });
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal orderId via isSafeOrderId and never writes", async () => {
    const res = await POST(jsonRequest({ orderId: "../../etc/passwd" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_order_id",
    });
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path + store-driven outcomes
// ---------------------------------------------------------------------------

describe("POST /api/admin/requeue — outcomes", () => {
  it("moves failed → queued on the happy path", async () => {
    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, status: "queued" });
    expect(updateOrderStatusMock).toHaveBeenCalledExactlyOnceWith(
      "order-abc",
      "queued",
    );
  });

  it("returns 409 illegal_transition for a non-failed order (the store rejects the move)", async () => {
    // The store reads the order, asserts `failed → queued`, and throws on a
    // non-`failed` order (e.g. already queued, or delivered) BEFORE any write.
    updateOrderStatusMock.mockRejectedValue(
      new IllegalTransitionError("queued", "queued"),
    );

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "illegal_transition",
    });
  });

  it("404s order_not_found when the store reports a missing order", async () => {
    updateOrderStatusMock.mockRejectedValue(new Error("Order not found: order-abc"));

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "order_not_found",
    });
  });

  it("returns 500 requeue_failed on a generic store error", async () => {
    updateOrderStatusMock.mockRejectedValue(new Error("db down"));

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "requeue_failed",
    });
  });
});
