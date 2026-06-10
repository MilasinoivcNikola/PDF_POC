import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase Storage helpers. The pure surface — the key builders photoKeyFor /
// pdfKeyFor — validates the order id with isSafeOrderId BEFORE building a key, so
// an unsafe id can never point a put/get at an object outside the order's prefix.
// The IO helpers (putPhoto / getPhoto / putPdf / signedPdfUrl) talk to Supabase
// Storage; the client is MOCKED (vi.mock of @/lib/supabase/server) so NO network
// call is made, following the repo's `openai`/`fs` mocking idiom. The crux assertion
// for the IO helpers is that an unsafe id is rejected before any client call.

// A chainable storage stub: getSupabaseAdmin().storage.from(bucket).{upload,
// download,createSignedUrl}. Each terminal call returns a queued result.
type Result = { data: unknown; error: { message: string } | null };

function makeClient() {
  const results: { upload: Result[]; download: Result[]; sign: Result[] } = {
    upload: [],
    download: [],
    sign: [],
  };
  // `...args: unknown[]` so `.mock.calls[i]` is `unknown[]` (indexable for our
  // assertions) rather than the zero-length tuple a no-arg `vi.fn` infers.
  const bucket = {
    upload: vi.fn(async (..._args: unknown[]) =>
      results.upload.shift() ?? { data: {}, error: null },
    ),
    download: vi.fn(async (..._args: unknown[]) =>
      results.download.shift() ?? { data: null, error: null },
    ),
    createSignedUrl: vi.fn(async (..._args: unknown[]) =>
      results.sign.shift() ?? { data: null, error: null },
    ),
  };
  return {
    storage: { from: vi.fn((..._args: unknown[]) => bucket) },
    _bucket: bucket,
    _results: results,
  };
}

let client = makeClient();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => client,
}));

// Import AFTER the mock is registered.
const {
  PHOTOS_BUCKET,
  PDFS_BUCKET,
  photoKeyFor,
  pdfKeyFor,
  putPhoto,
  getPhoto,
  putPdf,
  signedPdfUrl,
} = await import("./storage");

beforeEach(() => {
  client = makeClient();
});

// ---------------------------------------------------------------------------
// Key builders (pure) — validate the id, then shape the object key
// ---------------------------------------------------------------------------

describe("photoKeyFor / pdfKeyFor", () => {
  it("builds the photo key from a safe id", () => {
    expect(photoKeyFor("order-1")).toBe("order-1/photo");
  });

  it("builds the pdf key from a safe id", () => {
    expect(pdfKeyFor("order-1")).toBe("order-1.pdf");
  });

  it("accepts a real createSessionId()-shaped id", () => {
    const id = "a1b2c3d4-0000-1111-2222-333344445555";
    expect(photoKeyFor(id)).toBe(`${id}/photo`);
    expect(pdfKeyFor(id)).toBe(`${id}.pdf`);
  });

  it("rejects a traversal id before building a key", () => {
    expect(() => photoKeyFor("../../etc/passwd")).toThrow(/invalid order id/i);
    expect(() => pdfKeyFor("../../etc/passwd")).toThrow(/invalid order id/i);
  });

  it("rejects a slash, empty, and over-length id", () => {
    expect(() => photoKeyFor("a/b")).toThrow(/invalid order id/i);
    expect(() => pdfKeyFor("")).toThrow(/invalid order id/i);
    expect(() => photoKeyFor("a".repeat(201))).toThrow(/invalid order id/i);
  });

  it("exposes the two private bucket names", () => {
    expect(PHOTOS_BUCKET).toBe("order-photos");
    expect(PDFS_BUCKET).toBe("order-pdfs");
  });
});

// ---------------------------------------------------------------------------
// putPhoto
// ---------------------------------------------------------------------------

describe("putPhoto", () => {
  it("uploads to the photos bucket under the order's key and returns it", async () => {
    client._results.upload.push({ data: {}, error: null });
    const body = Buffer.from([1, 2, 3]);

    const key = await putPhoto("order-1", body, "image/jpeg");

    expect(key).toBe("order-1/photo");
    expect(client.storage.from).toHaveBeenCalledWith(PHOTOS_BUCKET);
    const [uploadKey, uploadBody, opts] = client._bucket.upload.mock.calls[0];
    expect(uploadKey).toBe("order-1/photo");
    expect(uploadBody).toBe(body);
    expect(opts).toEqual({ contentType: "image/jpeg", upsert: true });
  });

  it("defaults the content type when not given", async () => {
    client._results.upload.push({ data: {}, error: null });
    await putPhoto("order-1", Buffer.from([0]));
    expect(client._bucket.upload.mock.calls[0][2]).toEqual({
      contentType: "application/octet-stream",
      upsert: true,
    });
  });

  it("rejects an unsafe id before any client call", async () => {
    await expect(putPhoto("../evil", Buffer.from([0]))).rejects.toThrow(
      /invalid order id/i,
    );
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("throws a readable error when the upload fails", async () => {
    client._results.upload.push({ data: null, error: { message: "quota" } });
    await expect(putPhoto("order-1", Buffer.from([0]))).rejects.toThrow(
      /failed to upload photo for order order-1: quota/i,
    );
  });
});

// ---------------------------------------------------------------------------
// getPhoto
// ---------------------------------------------------------------------------

describe("getPhoto", () => {
  it("downloads the photo and returns it as a Buffer", async () => {
    const bytes = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    // Supabase download() returns a Blob-like with arrayBuffer(). Build a clean,
    // standalone ArrayBuffer of exactly these bytes (a Node Buffer can be a view
    // into a larger pooled ArrayBuffer, so `.buffer` is not safe to hand back).
    const ab = new Uint8Array(bytes).buffer;
    client._results.download.push({
      data: { arrayBuffer: async () => ab },
      error: null,
    });

    const out = await getPhoto("order-1");

    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out.equals(bytes)).toBe(true);
    expect(client.storage.from).toHaveBeenCalledWith(PHOTOS_BUCKET);
    expect(client._bucket.download).toHaveBeenCalledWith("order-1/photo");
  });

  it("rejects an unsafe id before any client call", async () => {
    await expect(getPhoto("a/b")).rejects.toThrow(/invalid order id/i);
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("throws when the download errors or returns no data", async () => {
    client._results.download.push({ data: null, error: { message: "missing" } });
    await expect(getPhoto("order-1")).rejects.toThrow(
      /failed to download photo for order order-1: missing/i,
    );
  });
});

// ---------------------------------------------------------------------------
// putPdf
// ---------------------------------------------------------------------------

describe("putPdf", () => {
  it("uploads to the pdfs bucket as application/pdf and returns the key", async () => {
    client._results.upload.push({ data: {}, error: null });
    const body = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

    const key = await putPdf("order-1", body);

    expect(key).toBe("order-1.pdf");
    expect(client.storage.from).toHaveBeenCalledWith(PDFS_BUCKET);
    const [uploadKey, uploadBody, opts] = client._bucket.upload.mock.calls[0];
    expect(uploadKey).toBe("order-1.pdf");
    expect(uploadBody).toBe(body);
    expect(opts).toEqual({ contentType: "application/pdf", upsert: true });
  });

  it("rejects an unsafe id before any client call", async () => {
    await expect(putPdf("../evil", Buffer.from([0]))).rejects.toThrow(
      /invalid order id/i,
    );
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("throws a readable error when the upload fails", async () => {
    client._results.upload.push({ data: null, error: { message: "boom" } });
    await expect(putPdf("order-1", Buffer.from([0]))).rejects.toThrow(
      /failed to upload pdf for order order-1: boom/i,
    );
  });
});

// ---------------------------------------------------------------------------
// signedPdfUrl
// ---------------------------------------------------------------------------

describe("signedPdfUrl", () => {
  it("signs the PDF key and returns the signed URL with the default TTL", async () => {
    client._results.sign.push({
      data: { signedUrl: "https://signed.example/pdf?token=x" },
      error: null,
    });

    const url = await signedPdfUrl("order-1");

    expect(url).toBe("https://signed.example/pdf?token=x");
    expect(client.storage.from).toHaveBeenCalledWith(PDFS_BUCKET);
    const [signKey, ttl] = client._bucket.createSignedUrl.mock.calls[0];
    expect(signKey).toBe("order-1.pdf");
    expect(ttl).toBe(60 * 60); // one hour default
  });

  it("passes through an explicit expiry", async () => {
    client._results.sign.push({
      data: { signedUrl: "https://signed.example/pdf" },
      error: null,
    });
    await signedPdfUrl("order-1", 120);
    expect(client._bucket.createSignedUrl.mock.calls[0][1]).toBe(120);
  });

  it("rejects an unsafe id before any client call", async () => {
    await expect(signedPdfUrl("..")).rejects.toThrow(/invalid order id/i);
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("throws when signing errors or returns no data", async () => {
    client._results.sign.push({ data: null, error: { message: "denied" } });
    await expect(signedPdfUrl("order-1")).rejects.toThrow(
      /failed to sign pdf url for order order-1: denied/i,
    );
  });
});
