import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Order } from "@/lib/order/types";
import type { StorySession } from "@/lib/session/types";

// The public /api/download/[token] route resolves a delivery token into a
// short-lived SIGNED PDF URL. The store + Storage signing are MOCKED at the lib
// boundary (no network, no order touched) — same idiom as the order-route test. The
// pure token validator and the registry filename stay real (they're the logic the
// route relies on). The security property under test: a valid token → a signed URL;
// any invalid/expired/no-PDF case → the SAME soft `invalid_or_expired` body (no
// enumeration), and the raw storage URL is never returned (only the signed one).

const getOrderByDeliveryTokenMock = vi.fn();
const signedPdfUrlMock = vi.fn();

vi.mock("@/lib/order/store", () => ({
  getOrderByDeliveryToken: (token: string) => getOrderByDeliveryTokenMock(token),
}));

vi.mock("@/lib/supabase/storage", () => ({
  signedPdfUrl: (orderId: string, ttl?: number, downloadName?: string) =>
    signedPdfUrlMock(orderId, ttl, downloadName),
}));

const { GET } = await import("./route");

/** A well-formed 43-char base64url token. */
const VALID_TOKEN = "a".repeat(43);
const SIGNED_URL = "https://proj.supabase.co/storage/signed?token=xyz";

function sampleInputs(): StorySession {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    createdAt: "2026-06-11T00:00:00.000Z",
    status: "generating",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "brown rescue mutt",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/abc/photo.jpg",
    },
    child: { name: "Emma", ageBracket: "6-8" },
    memories: {
      favoriteActivity: "chasing tennis balls",
      sleepingSpot: "at the foot of the bed",
      favoriteMemory: "the day at the lake",
    },
    toggles: {
      deathType: "natural",
      beliefFrame: "rainbow-bridge",
      otherPetsInHome: "no",
    },
    images: [],
  };
}

function deliveredOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    productId: "story-1-book",
    storyType: "story-1",
    status: "delivered",
    customerEmail: "buyer@example.com",
    inputs: sampleInputs(),
    photoKey: "order-1/photo",
    pdfKey: "order-1.pdf",
    deliveryToken: VALID_TOKEN,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  };
}

/** Call GET with a Next dynamic-route params Promise. */
function callGet(token: string): Promise<Response> {
  return GET(new Request("http://localhost/api/download/x"), {
    params: Promise.resolve({ token }),
  });
}

beforeEach(() => {
  getOrderByDeliveryTokenMock.mockReset();
  signedPdfUrlMock.mockReset();
});

describe("GET /api/download/[token]", () => {
  it("returns a signed URL + the correct filename for a valid token", async () => {
    getOrderByDeliveryTokenMock.mockResolvedValue(deliveredOrder());
    signedPdfUrlMock.mockResolvedValue(SIGNED_URL);

    const res = await callGet(VALID_TOKEN);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.downloadUrl).toBe(SIGNED_URL);
    // Product-agnostic filename via the registry (Story 1 → Saying-Goodbye).
    expect(body.filename).toBe("Saying-Goodbye-to-Otis.pdf");
    expect(body.petName).toBe("Otis");
    // The signing call set the Content-Disposition download filename.
    expect(signedPdfUrlMock).toHaveBeenCalledWith(
      "order-1",
      expect.any(Number),
      "Saying-Goodbye-to-Otis.pdf",
    );
  });

  it("uses the Story-2 filename for a letter order", async () => {
    getOrderByDeliveryTokenMock.mockResolvedValue(
      deliveredOrder({ storyType: "story-2", productId: "story-2-letter" }),
    );
    signedPdfUrlMock.mockResolvedValue(SIGNED_URL);

    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.filename).toBe("Letter-from-Otis.pdf");
  });

  it("rejects a malformed token with the soft body and NO DB hit (no enumeration)", async () => {
    const res = await callGet("../../etc/passwd");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "invalid_or_expired" });
    expect(getOrderByDeliveryTokenMock).not.toHaveBeenCalled();
  });

  it("returns the SAME soft body when the token has no matching order", async () => {
    getOrderByDeliveryTokenMock.mockResolvedValue(null);
    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "invalid_or_expired" });
    expect(signedPdfUrlMock).not.toHaveBeenCalled();
  });

  it("returns the SAME soft body when the order has no PDF yet (no signal)", async () => {
    const order = deliveredOrder();
    delete order.pdfKey;
    getOrderByDeliveryTokenMock.mockResolvedValue(order);

    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    // Identical to the no-match case — a caller can't tell "no PDF" from "no order".
    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "invalid_or_expired" });
    expect(signedPdfUrlMock).not.toHaveBeenCalled();
  });

  it("returns a BYTE-IDENTICAL response for malformed, unknown, and no-PDF tokens (no enumeration)", async () => {
    // The security-critical invariant, asserted explicitly across all three soft-
    // fail paths AT ONCE: a malformed token, a well-formed-but-unknown token, and a
    // found-but-no-PDF order must be INDISTINGUISHABLE in both status and body, so a
    // caller can never tell "never existed" from "expired / not ready yet".

    // (a) malformed token — rejected before any DB hit.
    const malformedRes = await callGet("../../etc/passwd");
    const malformedBody = await malformedRes.json();

    // (b) well-formed token, no matching order.
    getOrderByDeliveryTokenMock.mockResolvedValue(null);
    const unknownRes = await callGet(VALID_TOKEN);
    const unknownBody = await unknownRes.json();

    // (c) found order, but no rendered PDF yet.
    const noPdfOrder = deliveredOrder();
    delete noPdfOrder.pdfKey;
    getOrderByDeliveryTokenMock.mockResolvedValue(noPdfOrder);
    const noPdfRes = await callGet(VALID_TOKEN);
    const noPdfBody = await noPdfRes.json();

    // All three statuses identical…
    expect(malformedRes.status).toBe(404);
    expect(unknownRes.status).toBe(noPdfRes.status);
    expect(unknownRes.status).toBe(malformedRes.status);
    // …and all three bodies identical (no field, no message, distinguishes them).
    expect(unknownBody).toEqual(malformedBody);
    expect(noPdfBody).toEqual(malformedBody);
    expect(malformedBody).toEqual({ ok: false, error: "invalid_or_expired" });
  });

  it("never returns a permanent/raw storage URL — only the signed URL the helper mints", async () => {
    getOrderByDeliveryTokenMock.mockResolvedValue(deliveredOrder());
    signedPdfUrlMock.mockResolvedValue(SIGNED_URL);
    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    // The only URL surfaced is the one from signedPdfUrl; pdfKey is never returned.
    expect(body.downloadUrl).toBe(SIGNED_URL);
    expect(JSON.stringify(body)).not.toContain("order-1.pdf");
  });

  it("returns a 500 lookup_failed when the store lookup throws", async () => {
    getOrderByDeliveryTokenMock.mockRejectedValue(new Error("db down"));
    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "lookup_failed" });
  });

  it("returns a 500 sign_failed when signing throws", async () => {
    getOrderByDeliveryTokenMock.mockResolvedValue(deliveredOrder());
    signedPdfUrlMock.mockRejectedValue(new Error("sign error"));
    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "sign_failed" });
  });

  it("never echoes the customer email in any response body", async () => {
    getOrderByDeliveryTokenMock.mockResolvedValue(deliveredOrder());
    signedPdfUrlMock.mockResolvedValue(SIGNED_URL);
    const res = await callGet(VALID_TOKEN);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("buyer@example.com");
  });
});
