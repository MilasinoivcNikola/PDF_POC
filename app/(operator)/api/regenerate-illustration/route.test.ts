import { describe, it, expect, vi, beforeEach } from "vitest";

import type { GeneratedImage, StorySession } from "@/lib/session/types";

// The /api/regenerate-illustration boundary: validate { id, page } (the page
// must be a real illustrated scene), 404 a missing session, then re-paint ONE
// page, splice its manifest entry, persist the session, and return the new image
// as a data URL — leaving every other page untouched. All IO is mocked so no API
// call, no disk write, and no file read happen here:
//   - @/lib/ai/generate    → a stubbed regenerateSceneIllustration
//   - @/lib/session/disk    → stubbed readSession / writeSession
//   - node:fs               → a stubbed readFile for the data-URL encode
// isSafeSessionId + SCENE_PAGE_IDS stay real (the actual guards under test).

const regenerateMock = vi.fn();
const readSessionMock = vi.fn();
const writeSessionMock = vi.fn();
const readFileMock = vi.fn();

// The locked mixed production policy the route threads into the repaint so a
// hero page comes back at its production tier. Mirrors lib/ai/generate's constant;
// kept literal here to keep the mock self-contained (vitest's strict mock access
// requires every consumed export be present on the mock).
const PRODUCTION_QUALITY = {
  sceneQuality: "medium",
  heroSceneQuality: "high",
  referenceQuality: "low",
} as const;

vi.mock("@/lib/ai/generate", () => ({
  regenerateSceneIllustration: (
    session: StorySession,
    page: string,
    options?: unknown,
  ) => regenerateMock(session, page, options),
  PRODUCTION_QUALITY,
}));

vi.mock("@/lib/session/disk", () => ({
  readSession: (id: string) => readSessionMock(id),
  writeSession: (session: StorySession) => writeSessionMock(session),
}));

vi.mock("node:fs", () => ({
  promises: { readFile: (p: string) => readFileMock(p) },
}));

const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/regenerate-illustration", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function manifest(): GeneratedImage[] {
  return [
    { page: "reference", path: "/abs/reference.png", promptHash: "r0", referenceHash: "h0" },
    { page: "cover", path: "/abs/cover.png", promptHash: "p0", referenceHash: "h0" },
    { page: "page-5", path: "/abs/page-5.png", promptHash: "p5", referenceHash: "h0" },
  ];
}

function readySession(id = "session-id-abc123"): StorySession {
  return {
    id,
    createdAt: "2026-06-08T09:00:00.000Z",
    status: "ready",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "rescue mutt",
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
    images: manifest(),
  };
}

beforeEach(() => {
  regenerateMock.mockReset();
  readSessionMock.mockReset();
  writeSessionMock.mockReset();
  readFileMock.mockReset();
  writeSessionMock.mockResolvedValue(undefined);
  readFileMock.mockResolvedValue(Buffer.from("PNGBYTES"));
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("POST /api/regenerate-illustration — validation", () => {
  it("rejects an unparseable body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/regenerate-illustration", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing page with 400 invalid_request", async () => {
    const res = await POST(jsonRequest({ id: "session-id-abc123" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(regenerateMock).not.toHaveBeenCalled();
  });

  it("rejects a non-scene page (back-cover) with 400 invalid_request", async () => {
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", page: "back-cover" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(regenerateMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id with 400 and never touches disk", async () => {
    const res = await POST(
      jsonRequest({ id: "../../../tmp/evil", page: "page-5" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(readSessionMock).not.toHaveBeenCalled();
    expect(regenerateMock).not.toHaveBeenCalled();
  });

  it("404s a missing session", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await POST(jsonRequest({ id: "missing", page: "page-5" }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
    expect(regenerateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path — only the targeted page changes
// ---------------------------------------------------------------------------

describe("POST /api/regenerate-illustration — happy path", () => {
  it("repaints one page, splices the manifest, persists, returns a data URL", async () => {
    readSessionMock.mockResolvedValue(readySession());
    const newEntry: GeneratedImage = {
      page: "page-5",
      path: "/abs/page-5.png",
      promptHash: "p5-new",
      referenceHash: "h0",
    };
    regenerateMock.mockResolvedValue(newEntry);

    const res = await POST(jsonRequest({ id: "session-id-abc123", page: "page-5" }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; page: string; image: string };
    expect(body.ok).toBe(true);
    expect(body.page).toBe("page-5");
    expect(body.image).toBe(
      `data:image/png;base64,${Buffer.from("PNGBYTES").toString("base64")}`,
    );

    // Exactly one paid regen call, for this page — at the locked mixed production
    // tier (so a repainted hero comes back HIGH, not the engine's LOW dev default).
    expect(regenerateMock).toHaveBeenCalledTimes(1);
    expect(regenerateMock).toHaveBeenCalledWith(
      expect.anything(),
      "page-5",
      PRODUCTION_QUALITY,
    );

    // The persisted manifest replaced ONLY page-5; reference + cover untouched.
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    const written = writeSessionMock.mock.calls[0][0] as StorySession;
    const page5 = written.images.filter((i) => i.page === "page-5");
    expect(page5).toHaveLength(1);
    expect(page5[0].promptHash).toBe("p5-new");
    expect(written.images.find((i) => i.page === "reference")?.promptHash).toBe("r0");
    expect(written.images.find((i) => i.page === "cover")?.promptHash).toBe("p0");
    // No duplicate page entries crept in.
    expect(written.images).toHaveLength(3);
  });

  it("returns 500 regenerate_failed when generation throws", async () => {
    readSessionMock.mockResolvedValue(readySession());
    regenerateMock.mockRejectedValue(new Error("429 rate limited"));
    const res = await POST(jsonRequest({ id: "session-id-abc123", page: "page-5" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("regenerate_failed");
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});
