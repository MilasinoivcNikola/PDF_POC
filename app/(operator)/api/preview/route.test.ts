import { describe, it, expect, vi, beforeEach } from "vitest";

import type { StorySession } from "@/lib/session/types";
import { otisSession } from "@/lib/story/fixtures";
import { murphySession } from "@/lib/story/story2/fixtures";

// The GET /api/preview boundary: validate the id (traversal-guarded), 404 a
// missing session, then resolve the story (per storyType, via the registry) and
// return { pages, images, petName, childName, fields }. Only the IO is mocked —
// the registry / resolveStory / resolveStory2 / editable-fields stay REAL so the
// per-story field extraction + the childName branch are genuinely exercised:
//   - @/lib/session/disk → a stubbed readSession
//   - @/lib/ai/generate  → a stubbed manifestToImageMap (no PNG reads)
// isSafeSessionId stays real — the pure path guard under test.

const readSessionMock = vi.fn();
const manifestToImageMapMock = vi.fn();

vi.mock("@/lib/session/disk", () => ({
  readSession: (id: string) => readSessionMock(id),
}));

vi.mock("@/lib/ai/generate", () => ({
  manifestToImageMap: (manifest: unknown) => manifestToImageMapMock(manifest),
}));

const { GET } = await import("./route");

function previewRequest(id?: string): Request {
  const url = id === undefined
    ? "http://localhost/api/preview"
    : `http://localhost/api/preview?id=${encodeURIComponent(id)}`;
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  readSessionMock.mockReset();
  manifestToImageMapMock.mockReset();
  manifestToImageMapMock.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("GET /api/preview — validation", () => {
  it("rejects a missing id with 400 invalid_session_id, no disk read", async () => {
    const res = await GET(previewRequest());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id with 400 and never reads disk", async () => {
    const res = await GET(previewRequest("../../../tmp/evil"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("404s a missing session", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await GET(previewRequest("missing-id"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
  });
});

// ---------------------------------------------------------------------------
// Story 1 — the existing branch still returns childName + the 7 Story-1 fields
// ---------------------------------------------------------------------------

describe("GET /api/preview — Story 1 branch", () => {
  it("returns resolved pages, the child name, and the 7 Story-1 editable fields", async () => {
    readSessionMock.mockResolvedValue({ ...otisSession(), id: "session-id-abc123" });

    const res = await GET(previewRequest("session-id-abc123"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      ok: boolean;
      storyType: string;
      petName: string;
      childName: string;
      pages: { id: string }[];
      fields: Record<string, string>;
    };
    expect(body.ok).toBe(true);
    expect(body.storyType).toBe("story-1");
    expect(body.petName).toBe("Otis");
    expect(body.childName).toBe("Emma");

    // The resolved book is present (a Story-1 cover among the pages).
    expect(body.pages.some((p) => p.id === "cover")).toBe(true);

    // Exactly the 7 Story-1 editable fields, pre-filled from the session.
    expect(Object.keys(body.fields).sort()).toEqual(
      [
        "breedColor",
        "childName",
        "favoriteActivity",
        "favoriteMemory",
        "parentDedication",
        "petName",
        "sleepingSpot",
      ].sort(),
    );
    expect(body.fields.petName).toBe("Otis");
    expect(body.fields.childName).toBe("Emma");
  });
});

// ---------------------------------------------------------------------------
// Story 2 — the new branch: no `.child`, the 5 Story-2 fields
// ---------------------------------------------------------------------------

describe("GET /api/preview — Story 2 branch", () => {
  it("returns ok, storyType story-2, empty childName, and the 5 Story-2 fields", async () => {
    readSessionMock.mockResolvedValue(murphySession() as unknown as StorySession);

    const res = await GET(previewRequest("session-id-abc123"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      ok: boolean;
      storyType: string;
      petName: string;
      childName: string;
      pages: { id: string }[];
      fields: Record<string, string>;
    };
    expect(body.ok).toBe(true);
    expect(body.storyType).toBe("story-2");
    expect(body.petName).toBe("Murphy");
    // Story 2 has no child group — the route returns "" without reading `.child`.
    expect(body.childName).toBe("");

    // The resolved letter is present (the letter cover among the pages).
    expect(body.pages.some((p) => p.id === "letter-cover")).toBe(true);

    // Exactly the 5 Story-2 editable fields, pre-filled from the session.
    expect(Object.keys(body.fields).sort()).toEqual(
      ["favoriteRitual", "favoriteSpots", "ownerNames", "petName", "quirks"].sort(),
    );
    expect(body.fields.petName).toBe("Murphy");
    expect(body.fields.ownerNames).toBe("Sarah");
    expect(body.fields.quirks).toBe(murphySession().memories.quirks);
  });
});
