import { describe, it, expect, vi, beforeEach } from "vitest";

import { isSafeSessionId } from "@/lib/ai/paths";
import type { GeneratedImage, StorySession } from "@/lib/session/types";

// The /api/generate-illustrations boundary is the public surface. The internal
// helpers (readId, listDonePages, the GET status-inference) are NOT exported, so
// they're exercised THROUGH the POST/GET handlers — mirroring app/api/session/
// route.test.ts's style: mock the disk + AI layers, construct Request objects
// directly, assert on the house JSON shape + HTTP status.
//
// What's mocked (so NO real OpenAI call, NO spent credits, NO ./sessions or
// ./generated touched):
//   - @/lib/session/disk: readSession / writeSession
//   - @/lib/ai/generate: generateAllIllustrations (the pipeline)
//   - node:fs/promises: readdir (the disk-derived progress signal)
// isSafeSessionId stays REAL — it's the pure path guard under test.
//
// NOTE on shared state: the route keeps a module-level `jobs` Map that persists
// across POST/GET calls within this single test module. The stateful tests
// (error surfacing, idempotency) lean on that on purpose and use UNIQUE session
// ids per scenario so the map can't leak between cases.

const readSessionMock = vi.fn<(id: string) => Promise<StorySession | null>>();
const writeSessionMock = vi.fn<(session: StorySession) => Promise<void>>();
const generateAllIllustrationsMock =
  vi.fn<(session: StorySession) => Promise<GeneratedImage[]>>();
const readdirMock = vi.fn<(dir: string) => Promise<string[]>>();

vi.mock("@/lib/session/disk", () => ({
  readSession: (id: string) => readSessionMock(id),
  writeSession: (session: StorySession) => writeSessionMock(session),
}));

vi.mock("@/lib/ai/generate", () => ({
  generateAllIllustrations: (session: StorySession) =>
    generateAllIllustrationsMock(session),
}));

vi.mock("node:fs/promises", () => ({
  readdir: (dir: string) => readdirMock(dir),
}));

// Import the route AFTER the mocks are registered.
const { POST, GET } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The full image set a book produces: reference + 13 scene pages = 14. */
const TOTAL = 14;

/** A POST Request whose body is the given JSON. */
function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/generate-illustrations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A GET Request with `?id=` set to the given value (omitted if undefined). */
function getRequest(id?: string): Request {
  const url = new URL("http://localhost/api/generate-illustrations");
  if (id !== undefined) {
    url.searchParams.set("id", id);
  }
  return new Request(url, { method: "GET" });
}

/** A complete, valid finalized session (status defaults to "generating"). */
function session(
  id = "sess-abc123",
  status: StorySession["status"] = "generating",
): StorySession {
  return {
    id,
    createdAt: "2026-06-08T09:00:00.000Z",
    status,
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

/** A never-resolving promise so the fire-and-forget run never completes mid-test. */
function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

beforeEach(() => {
  readSessionMock.mockReset();
  writeSessionMock.mockReset();
  writeSessionMock.mockResolvedValue(undefined);
  generateAllIllustrationsMock.mockReset();
  // Default: the background run hangs (never resolves) so POST returns at once
  // and no unhandled resolution lands in a later test. Individual tests override.
  generateAllIllustrationsMock.mockReturnValue(neverResolves());
  readdirMock.mockReset();
  readdirMock.mockResolvedValue([]);
});

// ===========================================================================
// GET — poll progress (mock disk + session, no AI)
// ===========================================================================

describe("GET /api/generate-illustrations — validation", () => {
  it("rejects a missing id with 400 invalid_session_id", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id with 400 invalid_session_id", async () => {
    const malicious = "../../etc";
    expect(isSafeSessionId(malicious)).toBe(false);

    const res = await GET(getRequest(malicious));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("returns 404 session_not_found when the session is missing", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await GET(getRequest("sess-missing"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
  });
});

describe("GET /api/generate-illustrations — disk-derived progress", () => {
  it("counts only .png entries, strips .png for donePages, total is 14", async () => {
    readSessionMock.mockResolvedValue(session("sess-progress"));
    readdirMock.mockResolvedValue([
      "reference.png",
      "cover.png",
      "page-1.png",
      "notes.txt", // ignored — not a PNG
    ]);

    const res = await GET(getRequest("sess-progress"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.done).toBe(3);
    expect(body.total).toBe(TOTAL);
    expect(body.donePages).toEqual(["reference", "cover", "page-1"]);
    // Not ready (3 < 14, no live job, session not "ready") ⇒ still generating.
    expect(body.status).toBe("generating");
  });

  it("treats readdir throwing (ENOENT / dir missing) as done:0, never throws", async () => {
    readSessionMock.mockResolvedValue(session("sess-enoent"));
    readdirMock.mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const res = await GET(getRequest("sess-enoent"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.done).toBe(0);
    expect(body.donePages).toEqual([]);
    expect(body.total).toBe(TOTAL);
    expect(body.status).toBe("generating");
  });
});

describe("GET /api/generate-illustrations — status inference (no live job)", () => {
  it("reports ready when the session is already marked ready", async () => {
    readSessionMock.mockResolvedValue(session("sess-sready", "ready"));
    readdirMock.mockResolvedValue(["reference.png"]); // disk incomplete…

    const res = await GET(getRequest("sess-sready"));
    const body = await res.json();
    // …but session.status === "ready" wins.
    expect(body.status).toBe("ready");
    expect(body.done).toBe(1);
  });

  it("reports ready when the disk set is complete even if the session isn't ready", async () => {
    readSessionMock.mockResolvedValue(session("sess-diskfull", "generating"));
    // A full set of 14 PNGs on disk (server-restart / cache-hit resume path).
    const full = [
      "reference",
      "cover",
      "page-1",
      "page-2",
      "page-3",
      "page-4",
      "page-5",
      "page-6",
      "page-7",
      "page-8",
      "page-9",
      "page-10",
      "page-11",
      "page-12",
    ].map((s) => `${s}.png`);
    readdirMock.mockResolvedValue(full);

    const res = await GET(getRequest("sess-diskfull"));
    const body = await res.json();
    expect(body.done).toBe(TOTAL);
    expect(body.status).toBe("ready");
  });

  it("reports generating when not ready and the disk set is incomplete", async () => {
    readSessionMock.mockResolvedValue(session("sess-partial", "generating"));
    readdirMock.mockResolvedValue(["reference.png", "cover.png"]);

    const res = await GET(getRequest("sess-partial"));
    const body = await res.json();
    expect(body.done).toBe(2);
    expect(body.status).toBe("generating");
  });

  it("includes no `error` key on a healthy poll", async () => {
    readSessionMock.mockResolvedValue(session("sess-noerror"));
    readdirMock.mockResolvedValue([]);
    const res = await GET(getRequest("sess-noerror"));
    const body = await res.json();
    expect(body).not.toHaveProperty("error");
  });
});

// ===========================================================================
// POST — kick off a run (mock disk + AI)
// ===========================================================================

describe("POST /api/generate-illustrations — body / id validation", () => {
  it("rejects a non-JSON body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/generate-illustrations", {
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
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("accepts an `{ id }` body and starts a run", async () => {
    readSessionMock.mockResolvedValue(session("sess-byid"));
    const res = await POST(postRequest({ id: "sess-byid" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      status: "generating",
      total: TOTAL,
    });
    expect(generateAllIllustrationsMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a `{ sessionId }` body and starts a run", async () => {
    readSessionMock.mockResolvedValue(session("sess-bysessionid"));
    const res = await POST(postRequest({ sessionId: "sess-bysessionid" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      status: "generating",
      total: TOTAL,
    });
    expect(generateAllIllustrationsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a body with neither id nor sessionId with 400 invalid_session_id", async () => {
    const res = await POST(postRequest({ foo: "bar" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a non-string id with 400 invalid_session_id", async () => {
    const res = await POST(postRequest({ id: 42 }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
  });

  it("rejects an unsafe (traversal) id with 400 invalid_session_id", async () => {
    const malicious = "../../../tmp/evil";
    expect(isSafeSessionId(malicious)).toBe(false);
    const res = await POST(postRequest({ id: malicious }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
    expect(generateAllIllustrationsMock).not.toHaveBeenCalled();
  });

  it("returns 404 session_not_found when the session is missing", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await POST(postRequest({ id: "sess-gone" }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
    expect(generateAllIllustrationsMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate-illustrations — happy path", () => {
  it("persists status:generating, kicks off generation, returns 200", async () => {
    readSessionMock.mockResolvedValue(session("sess-happy", "draft"));
    const res = await POST(postRequest({ id: "sess-happy" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      status: "generating",
      total: TOTAL,
    });

    // The session was persisted with status flipped to "generating" BEFORE the run.
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls[0][0]).toMatchObject({
      id: "sess-happy",
      status: "generating",
    });

    // The pipeline was invoked exactly once (mocked never-resolving ⇒ no real run).
    expect(generateAllIllustrationsMock).toHaveBeenCalledTimes(1);
    expect(generateAllIllustrationsMock.mock.calls[0][0]).toMatchObject({
      id: "sess-happy",
      status: "generating",
    });
  });
});

describe("POST /api/generate-illustrations — write failure", () => {
  it("returns 500 write_failed when the disk write throws, and starts no run", async () => {
    readSessionMock.mockResolvedValue(session("sess-writefail"));
    writeSessionMock.mockRejectedValueOnce(new Error("disk full"));

    const res = await POST(postRequest({ id: "sess-writefail" }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "write_failed",
    });
    // The write failed before the run could be kicked off.
    expect(generateAllIllustrationsMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Stateful: error surfacing + idempotency (shared module-level jobs Map)
// ===========================================================================

describe("POST→GET — failed run is surfaced via the in-memory job", () => {
  it("records the error so a later GET returns status:error + the message", async () => {
    const id = "sess-failrun";
    readSessionMock.mockResolvedValue(session(id));
    // The pipeline rejects; the route's .catch must swallow it (no unhandled
    // rejection) and stash the message on the in-memory job.
    generateAllIllustrationsMock.mockRejectedValue(
      new Error("scene page-7 failed"),
    );

    const postRes = await POST(postRequest({ id }));
    expect(postRes.status).toBe(200);

    // Let the rejected promise's .catch run (microtask flush).
    await Promise.resolve();
    await Promise.resolve();

    readdirMock.mockResolvedValue(["reference.png"]);
    const getRes = await GET(getRequest(id));
    const body = await getRes.json();

    expect(body.status).toBe("error");
    expect(body.error).toBe("scene page-7 failed");
    // Progress still reports whatever made it to disk.
    expect(body.done).toBe(1);
  });
});

describe("POST→POST — idempotency guard while a run is in flight", () => {
  it("does not start a second run when one is already generating", async () => {
    const id = "sess-idem";
    readSessionMock.mockResolvedValue(session(id));
    // The run hangs (never resolves), so the job stays "generating".
    generateAllIllustrationsMock.mockReturnValue(neverResolves());

    const first = await POST(postRequest({ id }));
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      ok: true,
      status: "generating",
    });
    expect(generateAllIllustrationsMock).toHaveBeenCalledTimes(1);

    // Second POST while still generating: still 200, but NO second pipeline run
    // and NO second write (the guard returns before writeSession).
    const writeCallsBefore = writeSessionMock.mock.calls.length;
    const second = await POST(postRequest({ id }));
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      ok: true,
      status: "generating",
      total: TOTAL,
    });
    expect(generateAllIllustrationsMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls.length).toBe(writeCallsBefore);
  });

  it("does not start two runs when two POSTs interleave across the write (TOCTOU)", async () => {
    const id = "sess-race";
    readSessionMock.mockResolvedValue(session(id));
    generateAllIllustrationsMock.mockReturnValue(neverResolves());

    // Force the race window: the FIRST writeSession call hangs, parking the
    // claimant at `await writeSession` — exactly where a non-atomic guard would
    // let a second POST slip past. The synchronous claim must make the second
    // POST see the in-flight job and no-op (one run, one write), not pass too.
    let releaseWrite!: () => void;
    writeSessionMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseWrite = () => resolve();
      }),
    );

    // Fire both WITHOUT awaiting so they interleave on the microtask queue.
    const p1 = POST(postRequest({ id }));
    const p2 = POST(postRequest({ id }));

    // Let microtasks settle: both reach the guard, one claims + parks at the
    // hanging write, the other returns early.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    releaseWrite();
    const [res1, res2] = await Promise.all([p1, p2]);
    await Promise.resolve(); // flush the claimant's post-write continuation

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // The crux: exactly ONE pipeline run and ONE write, regardless of interleave.
    // (Pre-fix this is 2 — the second POST passed the guard before the claim.)
    expect(generateAllIllustrationsMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
  });
});
