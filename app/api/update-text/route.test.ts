import { describe, it, expect, vi, beforeEach } from "vitest";

import type { StorySession } from "@/lib/session/types";
import { otisSession } from "@/lib/story/fixtures";

// The /api/update-text boundary (preview-text-edit, Option A): validate
// { id, field, value } (the field must be a known editable field), reject a
// blanked required field BEFORE any read/write, 404 a missing session, then write
// the cleaned value, re-resolve the story, persist, and return the re-resolved
// `pages`. Only the disk layer is mocked — resolveStory / setSessionField stay
// real so the happy path proves a true re-merge.
//   - @/lib/session/disk → stubbed readSession / writeSession
// isSafeSessionId + the editable-fields helpers stay real (the guards under test).

const readSessionMock = vi.fn();
const writeSessionMock = vi.fn();

vi.mock("@/lib/session/disk", () => ({
  readSession: (id: string) => readSessionMock(id),
  writeSession: (session: StorySession) => writeSessionMock(session),
}));

const { POST } = await import("./route");

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/update-text", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function readySession(id = "session-id-abc123"): StorySession {
  return { ...otisSession(), id };
}

beforeEach(() => {
  readSessionMock.mockReset();
  writeSessionMock.mockReset();
  writeSessionMock.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("POST /api/update-text — validation", () => {
  it("rejects an unparseable body with 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/update-text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown / out-of-scope field with 400 invalid_request", async () => {
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "species", value: "cat" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing value with 400 invalid_request", async () => {
    const res = await POST(jsonRequest({ id: "session-id-abc123", field: "petName" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id with 400 and never touches disk", async () => {
    const res = await POST(
      jsonRequest({ id: "../../../tmp/evil", field: "petName", value: "x" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a blanked required field with 400 field_required, before any read", async () => {
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "petName", value: "   " }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "field_required" });
    expect(readSessionMock).not.toHaveBeenCalled();
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("404s a missing session", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ id: "missing", field: "petName", value: "Biscuit" }),
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "session_not_found",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path — persist the cleaned value and return the re-resolved book
// ---------------------------------------------------------------------------

describe("POST /api/update-text — happy path", () => {
  it("writes the cleaned value, re-resolves, and returns the new pages + names", async () => {
    readSessionMock.mockResolvedValue(readySession());

    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "petName", value: "  Biscuit  " }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      field: string;
      pages: { id: string; body: string[]; title?: string }[];
      petName: string;
      childName: string;
    };
    expect(body.ok).toBe(true);
    expect(body.field).toBe("petName");
    expect(body.petName).toBe("Biscuit");
    expect(body.childName).toBe("Emma");

    // The re-resolved book reflects the new name (cover title) and no token survived.
    const cover = body.pages.find((p) => p.id === "cover");
    expect(cover?.title).toBe("Saying Goodbye to Biscuit");
    const allText = body.pages.flatMap((p) => p.body).join(" ");
    expect(allText).not.toMatch(/\{[a-zA-Z]+\}/);

    // Persisted the cleaned value.
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    const written = writeSessionMock.mock.calls[0][0] as StorySession;
    expect(written.pet.name).toBe("Biscuit");
  });

  it("clears parentDedication when blanked (optional field, not required)", async () => {
    const seeded = readySession();
    seeded.memories = { ...seeded.memories, parentDedication: "We miss you." };
    readSessionMock.mockResolvedValue(seeded);

    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "parentDedication", value: "  " }),
    );

    expect(res.status).toBe(200);
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    const written = writeSessionMock.mock.calls[0][0] as StorySession;
    expect(written.memories.parentDedication).toBe("");
  });

  it("returns 500 write_failed when persistence throws (after a clean resolve)", async () => {
    readSessionMock.mockResolvedValue(readySession());
    writeSessionMock.mockRejectedValue(new Error("disk full"));
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "petName", value: "Biscuit" }),
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "write_failed" });
  });
});
