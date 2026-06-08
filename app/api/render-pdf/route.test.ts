import { describe, it, expect, vi, beforeEach } from "vitest";

import type { StorySession } from "@/lib/session/types";

// The /api/render-pdf boundary: validate the id (it gates a disk read), 404 a
// missing session, then stream the rendered bytes with the right headers
// (application/pdf, attachment + the template's filename, Content-Length). The
// heavy deps are mocked so NO Chrome launches and NO disk is read here:
//   - @/lib/session/disk → a stubbed readSession
//   - @/lib/pdf/render    → a stubbed renderStoryPdf + the REAL storyPdfFilename
//     contract (we stub it to a fixed name and assert the header carries it)
//   - @/lib/ai/generate   → a stubbed manifestToImageMap (no PNG reads)
// isSafeSessionId stays real — it is the pure path guard under test.

const readSessionMock = vi.fn();
const renderStoryPdfMock = vi.fn();
const storyPdfFilenameMock = vi.fn();
const manifestToImageMapMock = vi.fn();

vi.mock("@/lib/session/disk", () => ({
  readSession: (id: string) => readSessionMock(id),
}));

vi.mock("@/lib/pdf/render", () => ({
  renderStoryPdf: (session: StorySession, images: unknown) =>
    renderStoryPdfMock(session, images),
  storyPdfFilename: (petName: string) => storyPdfFilenameMock(petName),
}));

vi.mock("@/lib/ai/generate", () => ({
  manifestToImageMap: (manifest: unknown) => manifestToImageMapMock(manifest),
}));

const { POST } = await import("./route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/render-pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function readySession(id = "session-id-abc123"): StorySession {
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
    images: [],
  };
}

beforeEach(() => {
  readSessionMock.mockReset();
  renderStoryPdfMock.mockReset();
  storyPdfFilenameMock.mockReset();
  manifestToImageMapMock.mockReset();
  manifestToImageMapMock.mockResolvedValue({});
  storyPdfFilenameMock.mockReturnValue("Saying-Goodbye-to-Otis.pdf");
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("POST /api/render-pdf — validation", () => {
  it("rejects an unparseable body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/render-pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing id with 400 invalid_session_id", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id with 400 and never reads disk", async () => {
    const res = await POST(jsonRequest({ id: "../../../tmp/evil" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(readSessionMock).not.toHaveBeenCalled();
    expect(renderStoryPdfMock).not.toHaveBeenCalled();
  });

  it("404s a missing session", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await POST(jsonRequest({ id: "missing-id" }));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
    expect(renderStoryPdfMock).not.toHaveBeenCalled();
  });

  it("accepts { sessionId } as an alias for { id }", async () => {
    readSessionMock.mockResolvedValue(readySession("alias-id"));
    renderStoryPdfMock.mockResolvedValue(Buffer.from("%PDF-1.4 alias"));
    const res = await POST(jsonRequest({ sessionId: "alias-id" }));
    expect(res.status).toBe(200);
    expect(readSessionMock).toHaveBeenCalledWith("alias-id");
  });
});

// ---------------------------------------------------------------------------
// Happy path — streams the PDF with the right headers
// ---------------------------------------------------------------------------

describe("POST /api/render-pdf — streaming", () => {
  it("streams the rendered bytes as a named attachment", async () => {
    const pdfBytes = Buffer.from("%PDF-1.4 hello world body");
    readSessionMock.mockResolvedValue(readySession());
    renderStoryPdfMock.mockResolvedValue(pdfBytes);

    const res = await POST(jsonRequest({ id: "session-id-abc123" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Saying-Goodbye-to-Otis.pdf"',
    );
    expect(res.headers.get("Content-Length")).toBe(String(pdfBytes.length));

    // The filename was derived from the pet's name via the template helper.
    expect(storyPdfFilenameMock).toHaveBeenCalledWith("Otis");

    // The body is exactly the rendered bytes.
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.equals(pdfBytes)).toBe(true);
  });

  it("builds the image map from the session manifest before rendering", async () => {
    const session = readySession();
    session.images = [
      {
        page: "cover",
        path: "/abs/cover.png",
        promptHash: "p",
        referenceHash: "r",
      },
    ];
    readSessionMock.mockResolvedValue(session);
    manifestToImageMapMock.mockResolvedValue({ cover: "data:image/png;base64,AAA" });
    renderStoryPdfMock.mockResolvedValue(Buffer.from("%PDF"));

    await POST(jsonRequest({ id: "session-id-abc123" }));

    expect(manifestToImageMapMock).toHaveBeenCalledWith(session.images);
    // renderStoryPdf gets the session + the resolved image map.
    expect(renderStoryPdfMock).toHaveBeenCalledWith(session, {
      cover: "data:image/png;base64,AAA",
    });
  });
});

// ---------------------------------------------------------------------------
// Render failure
// ---------------------------------------------------------------------------

describe("POST /api/render-pdf — render failure", () => {
  it("returns 500 render_failed when the renderer throws", async () => {
    readSessionMock.mockResolvedValue(readySession());
    renderStoryPdfMock.mockRejectedValue(new Error("chrome crashed"));
    const res = await POST(jsonRequest({ id: "session-id-abc123" }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "render_failed",
    });
  });
});
