import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Order } from "@/lib/order/types";
import type { StorySession } from "@/lib/session/types";

// The /api/admin/approve boundary (commerce PR-08) — the operator's approval gate.
// Its job: AUTH-gate, then for an `awaiting_review` order read the reviewed book
// from disk, render the final PDF (no generation — no spend), upload it, and move
// the order `awaiting_review → approved` while storing its pdfKey. Every external
// boundary is MOCKED so NO Supabase, NO Chrome, NO disk, NO network:
//   - @/lib/supabase/auth   → stubbed getOperatorUserId (the auth gate)
//   - @/lib/order/store     → stubbed getOrder / updateOrderStatus
//   - @/lib/supabase/storage → stubbed putPdf
//   - @/lib/session/disk    → stubbed readSession
//   - @/lib/ai/generate     → stubbed manifestToImageMap (no PNG reads)
//   - @/lib/pdf/render       → stubbed renderStoryPdf (no Puppeteer)
// isSafeOrderId, IllegalTransitionError, MergeError, and assertOperator stay REAL
// (the actual guards under test). DEPLOY_TARGET defaults to "operator", so
// assertOperator() passes — the public-build 404 is proven separately in
// lib/runtime/all-operator-routes-gate.test.ts.
//
// The crux on every rejection path: renderStoryPdf / putPdf / updateOrderStatus are
// NOT called — no spend, no upload, no state write on a bad request.

const getOperatorUserIdMock = vi.fn();
const getOrderMock = vi.fn();
const updateOrderStatusMock = vi.fn();
const putPdfMock = vi.fn();
const readSessionMock = vi.fn();
const manifestToImageMapMock = vi.fn();
const renderStoryPdfMock = vi.fn();

vi.mock("@/lib/supabase/auth", () => ({
  getOperatorUserId: () => getOperatorUserIdMock(),
}));

vi.mock("@/lib/order/store", () => ({
  getOrder: (id: string) => getOrderMock(id),
  updateOrderStatus: (id: string, to: string, options?: unknown) =>
    updateOrderStatusMock(id, to, options),
}));

vi.mock("@/lib/supabase/storage", () => ({
  putPdf: (id: string, body: Buffer) => putPdfMock(id, body),
}));

vi.mock("@/lib/session/disk", () => ({
  readSession: (id: string) => readSessionMock(id),
}));

vi.mock("@/lib/ai/generate", () => ({
  manifestToImageMap: (manifest: unknown) => manifestToImageMapMock(manifest),
}));

vi.mock("@/lib/pdf/render", () => ({
  renderStoryPdf: (session: StorySession, images: unknown) =>
    renderStoryPdfMock(session, images),
}));

// IllegalTransitionError + MergeError stay real so `instanceof` checks in the
// route behave exactly as in production.
const { IllegalTransitionError } = await import("@/lib/order/state");
const { MergeError } = await import("@/lib/story/merge");
const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function readySession(id = "order-abc"): StorySession {
  return {
    id,
    createdAt: "2026-06-08T09:00:00.000Z",
    status: "ready",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "rescue mutt with floppy ears",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/sess/photo.jpg",
    },
    child: { name: "Emma", ageBracket: "6-8" },
    memories: {
      favoriteActivity: "chasing tennis balls",
      sleepingSpot: "at the foot of the bed",
      favoriteMemory: "the lake day",
    },
    toggles: {
      deathType: "natural",
      beliefFrame: "rainbow-bridge",
      otherPetsInHome: "no",
    },
    images: [
      { page: "cover", path: "/abs/cover.png", promptHash: "p", referenceHash: "r" },
    ],
  };
}

function orderAt(status: Order["status"], id = "order-abc"): Order {
  return {
    id,
    productId: "story-1-book",
    storyType: "story-1",
    status,
    customerEmail: "buyer@example.com",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputs: {} as any,
    photoKey: `${id}/photo`,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  };
}

/** Assert no spend / upload / state write happened (the rejection invariant). */
function expectNoSideEffects() {
  expect(renderStoryPdfMock).not.toHaveBeenCalled();
  expect(putPdfMock).not.toHaveBeenCalled();
  expect(updateOrderStatusMock).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated operator. Each auth-rejection test overrides this.
  getOperatorUserIdMock.mockResolvedValue("operator-user-1");
  manifestToImageMapMock.mockResolvedValue({ cover: "data:image/png;base64,AAA" });
  renderStoryPdfMock.mockResolvedValue(Buffer.from("%PDF-1.4 approved book"));
  putPdfMock.mockResolvedValue("order-abc.pdf");
  updateOrderStatusMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Auth gate — the headline security property
// ---------------------------------------------------------------------------

describe("POST /api/admin/approve — auth gate", () => {
  it("401s an unauthenticated visitor before any read/render/upload", async () => {
    getOperatorUserIdMock.mockResolvedValue(null);

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unauthorized",
    });
    // The auth gate short-circuits before the body is even parsed/read.
    expect(getOrderMock).not.toHaveBeenCalled();
    expect(readSessionMock).not.toHaveBeenCalled();
    expectNoSideEffects();
  });
});

// ---------------------------------------------------------------------------
// Validation — bad request never spends / writes
// ---------------------------------------------------------------------------

describe("POST /api/admin/approve — validation", () => {
  it("rejects an unparseable body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/admin/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
    expect(getOrderMock).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("rejects a missing orderId with 400 invalid_order_id", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_order_id",
    });
    expect(getOrderMock).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("rejects a path-traversal orderId via isSafeOrderId and never touches the store/disk", async () => {
    const res = await POST(jsonRequest({ orderId: "../../etc/passwd" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_order_id",
    });
    expect(getOrderMock).not.toHaveBeenCalled();
    expect(readSessionMock).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("404s when the order does not exist (no render/upload/write)", async () => {
    getOrderMock.mockResolvedValue(null);
    const res = await POST(jsonRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "order_not_found",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("rejects an order not in awaiting_review with 409 (no render/upload/write)", async () => {
    getOrderMock.mockResolvedValue(orderAt("generating"));
    const res = await POST(jsonRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "not_awaiting_review",
    });
    // It never even reads the session — the queue-state check is before disk.
    expect(readSessionMock).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("404s session_not_found when the reviewed book is missing on disk (no render/upload/write)", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    readSessionMock.mockResolvedValue(null);
    const res = await POST(jsonRequest({ orderId: "order-abc" }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
    expectNoSideEffects();
  });
});

// ---------------------------------------------------------------------------
// Happy path — render + upload + approve, all wired correctly
// ---------------------------------------------------------------------------

describe("POST /api/admin/approve — happy path", () => {
  it("renders the book, uploads the PDF, and approves with the pdfKey", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    const session = readySession();
    readSessionMock.mockResolvedValue(session);
    const pdfBytes = Buffer.from("%PDF-1.4 approved book");
    renderStoryPdfMock.mockResolvedValue(pdfBytes);
    putPdfMock.mockResolvedValue("order-abc.pdf");

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      status: "approved",
      pdfKey: "order-abc.pdf",
    });

    // The image map was built from the session manifest, then handed to the renderer.
    expect(manifestToImageMapMock).toHaveBeenCalledWith(session.images);
    expect(renderStoryPdfMock).toHaveBeenCalledTimes(1);
    expect(renderStoryPdfMock).toHaveBeenCalledWith(session, {
      cover: "data:image/png;base64,AAA",
    });

    // The rendered bytes were uploaded under the order id.
    expect(putPdfMock).toHaveBeenCalledTimes(1);
    expect(putPdfMock).toHaveBeenCalledWith("order-abc", pdfBytes);

    // The status flip carries the pdfKey returned by putPdf, in one guarded write.
    expect(updateOrderStatusMock).toHaveBeenCalledTimes(1);
    expect(updateOrderStatusMock).toHaveBeenCalledWith("order-abc", "approved", {
      pdfKey: "order-abc.pdf",
    });
  });
});

// ---------------------------------------------------------------------------
// Failure paths during the render → upload → approve chain
// ---------------------------------------------------------------------------

describe("POST /api/admin/approve — failure paths", () => {
  it("returns 422 story_incomplete when the render hits a MergeError (no upload/write)", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    readSessionMock.mockResolvedValue(readySession());
    renderStoryPdfMock.mockRejectedValue(new MergeError(["petName"]));

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "story_incomplete",
    });
    expect(putPdfMock).not.toHaveBeenCalled();
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("returns 500 render_failed when the renderer throws a generic error (no upload/write)", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    readSessionMock.mockResolvedValue(readySession());
    renderStoryPdfMock.mockRejectedValue(new Error("chrome crashed"));

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "render_failed",
    });
    expect(putPdfMock).not.toHaveBeenCalled();
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("returns 500 upload_failed when putPdf throws (no status write)", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    readSessionMock.mockResolvedValue(readySession());
    putPdfMock.mockRejectedValue(new Error("storage down"));

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "upload_failed",
    });
    // The PDF rendered (the spend already happened) but the status was NOT flipped.
    expect(renderStoryPdfMock).toHaveBeenCalledTimes(1);
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it("returns 409 illegal_transition when the status flip races (already moved)", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    readSessionMock.mockResolvedValue(readySession());
    updateOrderStatusMock.mockRejectedValue(
      new IllegalTransitionError("approved", "approved"),
    );

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "illegal_transition",
    });
  });

  it("returns 500 approve_failed when the status write throws a generic error", async () => {
    getOrderMock.mockResolvedValue(orderAt("awaiting_review"));
    readSessionMock.mockResolvedValue(readySession());
    updateOrderStatusMock.mockRejectedValue(new Error("db down"));

    const res = await POST(jsonRequest({ orderId: "order-abc" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "approve_failed",
    });
  });
});
