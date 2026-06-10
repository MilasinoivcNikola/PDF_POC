import { describe, it, expect, vi, beforeEach } from "vitest";

import type { StorySession, Story2Session } from "@/lib/session/types";
import type { Order } from "@/lib/order/types";

// The public /api/order boundary is the highest-value commerce surface so far: it
// creates a pending_payment order from an untrusted form post. Each rejection
// branch (bad email, missing/invalid inputs, every missing required field,
// missing/empty/oversized/wrong-type photo, unknown/mismatched product, bad form
// data) is asserted on the house JSON shape ({ ok:false, error: snake_case }) +
// HTTP status, and the happy path asserts BOTH side effects fire with the right
// args (putPhoto with the photo bytes/type, createOrder with the assembled inputs
// + email + the explicit id so photoKey === photoKeyFor(id)).
//
// The Supabase-backed helpers are MOCKED at the lib boundary (putPhoto /
// createOrder), so NO network call is made and NO order is written — the same
// idiom as the session route test mocking @/lib/session/disk. The pure validators
// (draft gate, email, photo branches) stay real: they are what's under test.

const putPhotoMock = vi.fn();
const createOrderMock = vi.fn();

vi.mock("@/lib/supabase/storage", () => ({
  putPhoto: (orderId: string, body: Buffer, contentType?: string) =>
    putPhotoMock(orderId, body, contentType),
}));

vi.mock("@/lib/order/store", () => ({
  createOrder: (input: unknown) => createOrderMock(input),
}));

// Import the route AFTER the mocks are registered.
const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A 1×1 transparent PNG, as bytes — a valid non-empty image payload. */
const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c6360000002000154a24f8d0000000049454e44ae426082",
  "hex",
);

function photoFile(
  bytes: Buffer = PNG_BYTES,
  type = "image/png",
  name = "otis.png",
): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

/** A complete, valid Story-1 session payload (mirrors draftToSession output). */
function validStory1Inputs(): StorySession {
  return {
    id: "session-id-abc123",
    createdAt: "2026-06-10T09:00:00.000Z",
    status: "generating",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "rescue mutt with floppy ears",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "otis.png",
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
    images: [],
  };
}

/** A complete, valid Story-2 session payload. */
function validStory2Inputs(): Story2Session {
  return {
    id: "story2-id-xyz789",
    createdAt: "2026-06-10T09:00:00.000Z",
    status: "generating",
    storyType: "story-2",
    pet: {
      name: "Murphy",
      species: "dog",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "murphy.png",
    },
    owner: { names: "Sarah", relationship: "single" },
    memories: {
      quirks: "the way you tilted your head",
      favoriteRitual: "our walk before coffee",
      favoriteSpots: "the spot by the back door",
    },
    toggles: {
      deathType: "peaceful",
      beliefFrame: "rainbow-bridge",
      giftFor: "self",
      newPet: "no",
    },
    images: [],
  };
}

interface FormOptions {
  productId?: string | null;
  email?: string | null;
  inputs?: unknown;
  /** When `false`, no photo part is appended; otherwise the given/default File. */
  photo?: File | false;
}

/** Build a multipart order request, overriding any part. */
function orderRequest(opts: FormOptions = {}): Request {
  const form = new FormData();
  if (opts.productId !== null) {
    form.append("productId", opts.productId ?? "story-1-book");
  }
  if (opts.email !== null) {
    form.append("email", opts.email ?? "sarah@example.com");
  }
  if (opts.inputs !== null) {
    const inputs = "inputs" in opts ? opts.inputs : validStory1Inputs();
    if (typeof inputs === "string") {
      form.append("inputs", inputs);
    } else {
      form.append("inputs", JSON.stringify(inputs));
    }
  }
  if (opts.photo !== false) {
    form.append("photo", opts.photo ?? photoFile());
  }
  return new Request("http://localhost/api/order", {
    method: "POST",
    body: form,
  });
}

const sampleOrder: Order = {
  id: "order-created-id",
  productId: "story-1-book",
  storyType: "story-1",
  status: "pending_payment",
  customerEmail: "sarah@example.com",
  inputs: validStory1Inputs(),
  photoKey: "order-created-id/photo",
  createdAt: "2026-06-10T09:00:00.000Z",
  updatedAt: "2026-06-10T09:00:00.000Z",
};

beforeEach(() => {
  putPhotoMock.mockReset();
  createOrderMock.mockReset();
  putPhotoMock.mockResolvedValue("order-created-id/photo");
  createOrderMock.mockResolvedValue(sampleOrder);
});

// ---------------------------------------------------------------------------
// Validation branches (no side effects)
// ---------------------------------------------------------------------------

describe("POST /api/order — validation", () => {
  it("rejects a missing product with 400 missing_product", async () => {
    const res = await POST(orderRequest({ productId: null }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_product",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown product with 404 unknown_product", async () => {
    const res = await POST(orderRequest({ productId: "no-such-book" }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unknown_product",
    });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed email with 400 invalid_email", async () => {
    const res = await POST(orderRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_email",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a missing email with 400 invalid_email", async () => {
    const res = await POST(orderRequest({ email: null }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_email",
    });
  });

  it("rejects missing inputs with 400 missing_inputs", async () => {
    const res = await POST(orderRequest({ inputs: null }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_inputs",
    });
  });

  it("rejects unparseable inputs JSON with 400 invalid_inputs", async () => {
    const res = await POST(orderRequest({ inputs: "{not json" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_inputs",
    });
  });

  it("rejects a product/inputs storyType mismatch with 400 product_mismatch", async () => {
    // A story-2 product with story-1-shaped inputs (no storyType → story-1).
    const res = await POST(
      orderRequest({ productId: "story-2-letter", inputs: validStory1Inputs() }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "product_mismatch",
    });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a missing required field with the matching missing_* code (Story 1)", async () => {
    const inputs = validStory1Inputs();
    inputs.child.name = "   ";
    const res = await POST(orderRequest({ inputs }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_child_name",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a blank pet name with missing_pet_name", async () => {
    const inputs = validStory1Inputs();
    inputs.pet.name = "";
    const res = await POST(orderRequest({ inputs }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_pet_name",
    });
  });

  it("rejects a missing required field for Story 2 (missing_owner_names)", async () => {
    const inputs = validStory2Inputs();
    inputs.owner.names = "";
    const res = await POST(
      orderRequest({ productId: "story-2-letter", inputs }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_owner_names",
    });
  });
});

// ---------------------------------------------------------------------------
// Photo validation branches (no order written)
// ---------------------------------------------------------------------------

describe("POST /api/order — photo validation", () => {
  it("rejects a missing photo with 400 missing_photo", async () => {
    const res = await POST(orderRequest({ photo: false }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported photo type with 415 unsupported_type", async () => {
    const res = await POST(
      orderRequest({ photo: photoFile(PNG_BYTES, "image/gif", "x.gif") }),
    );
    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unsupported_type",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
  });

  it("rejects an empty photo with 400 empty_file", async () => {
    const empty = new File([new Uint8Array(0)], "empty.png", {
      type: "image/png",
    });
    const res = await POST(orderRequest({ photo: empty }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "empty_file",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized photo with 413 file_too_large", async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    const res = await POST(orderRequest({ photo: big }));
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "file_too_large",
    });
    expect(putPhotoMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Form-data parse failure
// ---------------------------------------------------------------------------

describe("POST /api/order — bad form data", () => {
  it("rejects a body that isn't multipart form data with 400 invalid_form_data", async () => {
    const req = new Request("http://localhost/api/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nope: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_form_data",
    });
  });
});

// ---------------------------------------------------------------------------
// Storage / order-create failures
// ---------------------------------------------------------------------------

describe("POST /api/order — write failures", () => {
  it("returns 500 photo_upload_failed when the photo upload throws", async () => {
    putPhotoMock.mockRejectedValueOnce(new Error("quota"));
    const res = await POST(orderRequest());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "photo_upload_failed",
    });
    // The order must NOT be created if the photo didn't land.
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("returns 500 order_create_failed when createOrder throws", async () => {
    createOrderMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(orderRequest());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "order_create_failed",
    });
  });
});

// ---------------------------------------------------------------------------
// Happy path — both side effects fire with the right args
// ---------------------------------------------------------------------------

describe("POST /api/order — happy path", () => {
  it("uploads the photo and creates a pending_payment order, returning { ok, orderId }", async () => {
    const res = await POST(orderRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      orderId: "order-created-id",
    });

    // Photo uploaded once, with the bytes + the file's content type, keyed at the
    // order id the route minted.
    expect(putPhotoMock).toHaveBeenCalledTimes(1);
    const [photoId, body, contentType] = putPhotoMock.mock.calls[0];
    expect(typeof photoId).toBe("string");
    expect(photoId.length).toBeGreaterThan(0);
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(contentType).toBe("image/png");

    // Order created once, with the SAME id (Decision B: photoKey keyed at the id),
    // the catalog product/storyType, the email, the assembled inputs, and the
    // photoKey putPhoto returned.
    expect(createOrderMock).toHaveBeenCalledTimes(1);
    const input = createOrderMock.mock.calls[0][0] as {
      id: string;
      productId: string;
      storyType: string;
      customerEmail: string;
      photoKey: string;
      inputs: StorySession;
    };
    expect(input.id).toBe(photoId);
    expect(input.productId).toBe("story-1-book");
    expect(input.storyType).toBe("story-1");
    expect(input.customerEmail).toBe("sarah@example.com");
    expect(input.photoKey).toBe("order-created-id/photo");
    expect(input.inputs.pet.name).toBe("Otis");
    expect(input.inputs.child.name).toBe("Emma");
  });

  it("trims the email before persisting", async () => {
    await POST(orderRequest({ email: "  sarah@example.com  " }));
    const input = createOrderMock.mock.calls[0][0] as { customerEmail: string };
    expect(input.customerEmail).toBe("sarah@example.com");
  });

  it("creates a Story-2 order from a story-2 product + inputs", async () => {
    createOrderMock.mockResolvedValueOnce({
      ...sampleOrder,
      id: "order-2-id",
      productId: "story-2-letter",
      storyType: "story-2",
    });
    const res = await POST(
      orderRequest({
        productId: "story-2-letter",
        inputs: validStory2Inputs(),
      }),
    );
    expect(res.status).toBe(200);
    const input = createOrderMock.mock.calls[0][0] as {
      storyType: string;
      inputs: Story2Session;
    };
    expect(input.storyType).toBe("story-2");
    expect(input.inputs.owner.names).toBe("Sarah");
  });
});
