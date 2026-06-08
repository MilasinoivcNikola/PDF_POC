import { describe, it, expect, afterAll } from "vitest";
import { join } from "node:path";
import { rm, stat, readFile, access } from "node:fs/promises";

import { POST } from "./route";
import { isSafeSessionId } from "@/lib/ai/paths";

// The /api/upload boundary validation is the high-value surface: type, presence,
// emptiness, and size are all checked before anything is written. Each error
// branch is asserted on the JSON shape ({ ok:false, error: snake_case }) + HTTP
// status. The single happy-path test writes under ./uploads using its own
// throwaway sessionId and removes that dir afterward, so no artifact is left.

/** Build a multipart Request the route's `request.formData()` can parse. */
function uploadRequest(form: FormData): Request {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: form,
  });
}

// Fixed throwaway ids so the dirs the write tests create are deterministic to
// clean up — we only ever remove uploads/ subdirs keyed off these.
const BOUNDARY_SESSION_ID = "test-upload-boundary-cleanup";
const HAPPY_SESSION_ID = "test-upload-happy-cleanup";

afterAll(async () => {
  // Remove only the dirs this file created — never any other upload.
  await Promise.all(
    [HAPPY_SESSION_ID, BOUNDARY_SESSION_ID].map((id) =>
      rm(join(process.cwd(), "uploads", id), { recursive: true, force: true }),
    ),
  );
});

// ---------------------------------------------------------------------------
// Validation branches (no file written)
// ---------------------------------------------------------------------------

describe("POST /api/upload — validation", () => {
  it("rejects a request with no photo field", async () => {
    const res = await POST(uploadRequest(new FormData()));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
  });

  it("rejects a non-file 'photo' field (a plain string)", async () => {
    const form = new FormData();
    form.set("photo", "not-a-file");
    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
  });

  it("rejects an unsupported MIME type (text/plain)", async () => {
    const form = new FormData();
    form.set("photo", new File(["hello"], "note.txt", { type: "text/plain" }));
    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unsupported_type",
    });
  });

  it("rejects an unsupported image type (image/gif)", async () => {
    const form = new FormData();
    form.set("photo", new File(["GIF89a"], "anim.gif", { type: "image/gif" }));
    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "unsupported_type",
    });
  });

  it("rejects an empty (0-byte) file", async () => {
    const form = new FormData();
    form.set("photo", new File([], "empty.png", { type: "image/png" }));
    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "empty_file",
    });
  });

  it("rejects a file just over the 10 MB limit", async () => {
    const maxBytes = 10 * 1024 * 1024;
    // One byte over the boundary. A Blob reports `.size` without us holding the
    // full payload in a Node Buffer, and validation rejects before any read, so
    // this never writes to disk.
    const oversize = new Blob([new Uint8Array(maxBytes + 1)], {
      type: "image/jpeg",
    });
    const form = new FormData();
    form.set("photo", new File([oversize], "big.jpg", { type: "image/jpeg" }));
    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "file_too_large",
    });
  });

  it("accepts a file exactly at the 10 MB boundary (size > limit only)", async () => {
    // The check is `size > MAX_BYTES`, so exactly MAX_BYTES must pass validation.
    // We supply our own sessionId and clean its dir up in afterAll below.
    const maxBytes = 10 * 1024 * 1024;
    const atLimit = new Blob([new Uint8Array(maxBytes)], { type: "image/png" });
    const form = new FormData();
    form.set("photo", new File([atLimit], "edge.png", { type: "image/png" }));
    form.set("sessionId", BOUNDARY_SESSION_ID);

    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Happy path — writes under ./uploads, then cleans up its own dir.
// ---------------------------------------------------------------------------

describe("POST /api/upload — happy path", () => {
  it("saves a valid PNG and returns { ok, sessionId, path } pointing under ./uploads", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const form = new FormData();
    form.set("photo", new File([pngBytes], "otis.png", { type: "image/png" }));
    form.set("sessionId", HAPPY_SESSION_ID);

    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sessionId).toBe(HAPPY_SESSION_ID);
    expect(body.path).toBe(join("uploads", HAPPY_SESSION_ID, "photo.png"));

    // The file actually landed on disk with the original bytes.
    const absolute = join(process.cwd(), body.path);
    const written = await stat(absolute);
    expect(written.isFile()).toBe(true);
    const readBack = await readFile(absolute);
    expect(readBack.equals(pngBytes)).toBe(true);
  });

  it("mints a fresh sessionId when none is supplied", async () => {
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const form = new FormData();
    form.set("photo", new File([jpegBytes], "p.jpg", { type: "image/jpeg" }));

    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sessionId).toBeTypeOf("string");
    expect(body.sessionId.length).toBeGreaterThan(0);
    expect(body.path).toBe(join("uploads", body.sessionId, "photo.jpg"));

    // Clean up the minted dir immediately so nothing is left behind.
    await rm(join(process.cwd(), "uploads", body.sessionId), {
      recursive: true,
      force: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Path-traversal regression — a malicious sessionId must never escape ./uploads.
// The route guards the provided id with isSafeSessionId() and, on a bad value,
// silently falls back to a fresh safe id rather than writing to the attacker's
// target. We assert: a safe id is returned, the path stays under uploads/, and
// nothing was written at the traversal target outside the project root.
// ---------------------------------------------------------------------------

describe("POST /api/upload — path-traversal hardening", () => {
  it("ignores a malicious sessionId and writes only under ./uploads", async () => {
    // ../../../tmp/evil would, without the guard, escape ./uploads and write
    // photo.png into /tmp/evil/photo.png.
    const malicious = "../../../tmp/evil";
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const form = new FormData();
    form.set("photo", new File([pngBytes], "evil.png", { type: "image/png" }));
    form.set("sessionId", malicious);

    const res = await POST(uploadRequest(form));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // The route discarded the unsafe id for a fresh, allowlist-passing one.
    expect(body.sessionId).not.toBe(malicious);
    expect(isSafeSessionId(body.sessionId)).toBe(true);

    // The returned path is contained under uploads/, not the traversal target.
    expect(body.path).toBe(join("uploads", body.sessionId, "photo.png"));

    // No file landed at the would-be escape target (resolved off the cwd, the
    // same base the route joins against).
    const evilTarget = join(process.cwd(), malicious, "photo.png");
    await expect(access(evilTarget)).rejects.toThrow();

    // Clean up the safely-minted dir this test created.
    await rm(join(process.cwd(), "uploads", body.sessionId), {
      recursive: true,
      force: true,
    });
  });
});
