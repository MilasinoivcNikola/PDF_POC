import { describe, it, expect, vi, beforeEach } from "vitest";
import { join } from "node:path";
import { access } from "node:fs/promises";

import { isSafeSessionId } from "@/lib/ai/paths";
import type { StorySession } from "@/lib/session/types";

// The /api/session boundary is the high-value surface: a malformed body, an
// unsafe id (it becomes the filename), and each of the seven missing required
// fields (pet name, child name, photo, breedColor, favoriteActivity,
// sleepingSpot, favoriteMemory) are all rejected before anything is written.
// Every error branch is asserted on the house JSON shape
// ({ ok:false, error: snake_case }) + HTTP status.
//
// The disk write is MOCKED (vi.mock of @/lib/session/disk) so NO ./sessions/*.json
// is ever created by this suite — we assert writeSession is/ isn't called and with
// what. isSafeSessionId stays real: it is the pure path guard under test.

const writeSessionMock = vi.fn();

vi.mock("@/lib/session/disk", () => ({
  writeSession: (session: StorySession) => writeSessionMock(session),
}));

// Import the route AFTER the mock is registered.
const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A POST Request whose body is the given JSON (request.json() parses it). */
function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A complete, valid finalized session payload. */
function validSession(id = "session-id-abc123"): StorySession {
  return {
    id,
    createdAt: "2026-06-08T09:00:00.000Z",
    status: "generating",
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
    images: [],
  };
}

beforeEach(() => {
  writeSessionMock.mockReset();
  writeSessionMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Validation branches (no write)
// ---------------------------------------------------------------------------

describe("POST /api/session — validation", () => {
  it("rejects an unparseable JSON body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_json",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a primitive body (a bare number) with 400 invalid_session", async () => {
    // typeof 42 !== "object", so this hits the invalid_session guard directly.
    const res = await POST(jsonRequest(42));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a JSON array body — array is a non-null object, so it falls through to the id check (invalid_session_id)", async () => {
    // typeof [] === "object" and it isn't null, so the route accepts it past the
    // invalid_session guard; the array has no `.id`, so the next guard rejects it.
    const res = await POST(jsonRequest([1, 2, 3]));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a null body with 400 invalid_session", async () => {
    const res = await POST(jsonRequest(null));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing id with 400 invalid_session_id", async () => {
    const body = validSession();
    const { id: _omit, ...withoutId } = body;
    void _omit;
    const res = await POST(jsonRequest(withoutId));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects an empty-string id with 400 invalid_session_id", async () => {
    const res = await POST(jsonRequest({ ...validSession(), id: "   " }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id and writes nothing under ./sessions/", async () => {
    const malicious = "../../../tmp/evil";
    // Sanity: this id really would be unsafe.
    expect(isSafeSessionId(malicious)).toBe(false);

    const res = await POST(jsonRequest({ ...validSession(), id: malicious }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });

    // The disk layer was never invoked, so nothing could be written anywhere.
    expect(writeSessionMock).not.toHaveBeenCalled();

    // And the traversal target does not exist (resolved off the same cwd the
    // disk layer would join against).
    const evilTarget = join(process.cwd(), "tmp", "evil.json");
    await expect(access(evilTarget)).rejects.toThrow();
  });

  it("rejects an id with a path separator with 400 invalid_session_id", async () => {
    const res = await POST(jsonRequest({ ...validSession(), id: "a/b" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing pet name with 400 missing_pet_name", async () => {
    const body = validSession();
    body.pet.name = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_pet_name",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing child name with 400 missing_child_name", async () => {
    const body = validSession();
    body.child.name = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_child_name",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing photo with 400 missing_photo", async () => {
    const body = validSession();
    body.pet.photo = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing pet description with 400 missing_breed_color", async () => {
    const body = validSession();
    body.pet.breedColor = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_breed_color",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite activity with 400 missing_favorite_activity", async () => {
    const body = validSession();
    body.memories.favoriteActivity = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_activity",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing sleeping spot with 400 missing_sleeping_spot", async () => {
    const body = validSession();
    body.memories.sleepingSpot = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_sleeping_spot",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite memory with 400 missing_favorite_memory", async () => {
    const body = validSession();
    body.memories.favoriteMemory = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_memory",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Write-failure branch (disk layer throws)
// ---------------------------------------------------------------------------

describe("POST /api/session — write failure", () => {
  it("returns 500 write_failed when the disk write throws", async () => {
    writeSessionMock.mockRejectedValueOnce(new Error("disk full"));
    const res = await POST(jsonRequest(validSession()));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "write_failed",
    });
  });
});

// ---------------------------------------------------------------------------
// Happy path (mocked write — no real file)
// ---------------------------------------------------------------------------

describe("POST /api/session — happy path", () => {
  it("writes the session and returns { ok:true, id }", async () => {
    const body = validSession("good-session-id");
    const res = await POST(jsonRequest(body));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "good-session-id",
    });

    // The session was handed to the disk layer exactly once, with the payload.
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls[0][0]).toMatchObject({
      id: "good-session-id",
      pet: { name: "Otis", photo: "uploads/sess/photo.jpg" },
      child: { name: "Emma" },
    });
  });
});
