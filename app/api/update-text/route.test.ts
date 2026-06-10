import { describe, it, expect, vi, beforeEach } from "vitest";

import type { StorySession } from "@/lib/session/types";
import { otisSession } from "@/lib/story/fixtures";
import { murphySession, story2SessionWith } from "@/lib/story/story2/fixtures";

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

  it("rejects an unknown / out-of-scope field with 400 invalid_request (after the read — the allowlist is per-story)", async () => {
    // The editable-field allowlist is per-story, so the route must read the
    // session (for its storyType) before it can validate the field. A valid
    // session is needed for the field to reach the allowlist check at all.
    readSessionMock.mockResolvedValue(readySession());
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "species", value: "cat" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    // Read happened (to know the product); nothing was written for a bad field.
    expect(readSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing value with 400 invalid_request, before any read", async () => {
    // A non-string `value` fails arg parsing, which is pre-read.
    const res = await POST(jsonRequest({ id: "session-id-abc123", field: "petName" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id with 400 and never touches disk", async () => {
    // The traversal guard (isSafeSessionId) still runs BEFORE any read — unchanged.
    const res = await POST(
      jsonRequest({ id: "../../../tmp/evil", field: "petName", value: "x" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a blanked required field with 400 field_required, after the read but with no write", async () => {
    // Required-blank detection is per-story too (which fields are required depends
    // on the product), so it runs after the read — but still before any write.
    readSessionMock.mockResolvedValue(readySession());
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "petName", value: "   " }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "field_required" });
    expect(readSessionMock).toHaveBeenCalledTimes(1);
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

// ---------------------------------------------------------------------------
// Story 2 — the per-story allowlist routes via the registry (resolveStory2)
// ---------------------------------------------------------------------------

describe("POST /api/update-text — Story 2 branch", () => {
  function murphy(id = "session-id-abc123"): StorySession {
    return { ...murphySession(), id } as unknown as StorySession;
  }

  it("edits a Story-2 field (ownerNames), re-resolves the letter, persists, returns pages + petName, childName undefined", async () => {
    readSessionMock.mockResolvedValue(murphy());

    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "ownerNames", value: "  Sarah and David  " }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      field: string;
      pages: { id: string; body: string[] }[];
      petName: string;
      childName?: string;
    };
    expect(body.ok).toBe(true);
    expect(body.field).toBe("ownerNames");
    expect(body.petName).toBe("Murphy");
    // Story 2 has no child — the route returns undefined (dropped from JSON).
    expect(body.childName).toBeUndefined();

    // The re-resolved letter is present (the letter cover among the pages) and
    // carries the cleaned new owner name, with no surviving placeholder.
    expect(body.pages.some((p) => p.id === "letter-cover")).toBe(true);
    const allText = body.pages.flatMap((p) => p.body).join(" ");
    expect(allText).toContain("Sarah and David");
    expect(allText).not.toMatch(/\{[a-zA-Z]+\}/);

    // Persisted the cleaned value into the owner group.
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    const written = writeSessionMock.mock.calls[0][0] as unknown as ReturnType<typeof murphySession>;
    expect(written.owner.names).toBe("Sarah and David");
  });

  it("rejects a Story-1-only field (childName) on a Story-2 session with invalid_request, no write", async () => {
    readSessionMock.mockResolvedValue(murphy());
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "childName", value: "Noah" }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    // Read happened (to learn the product), but nothing was written.
    expect(readSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a blanked required Story-2 field (quirks → '') with field_required, no write", async () => {
    readSessionMock.mockResolvedValue(murphy());
    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "quirks", value: "   " }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "field_required" });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("returns 422 story_incomplete and never writes when the edit re-resolves to a MergeError", async () => {
    // A stored letter whose non-editable required `{species}` is blank: editing a
    // valid editable field still re-resolves the WHOLE letter, which throws
    // MergeError. The story_incomplete guard must reject WITHOUT writing — a bad
    // edit can never corrupt the saved letter (mirrors feature 02).
    const broken = story2SessionWith({ pet: { species: "" as never } });
    readSessionMock.mockResolvedValue({ ...broken, id: "session-id-abc123" } as unknown as StorySession);

    const res = await POST(
      jsonRequest({ id: "session-id-abc123", field: "favoriteSpots", value: "the back step" }),
    );
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "story_incomplete" });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("404s a missing Story-2 session (id traversal guard already covered above)", async () => {
    readSessionMock.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ id: "missing", field: "ownerNames", value: "Sarah" }),
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "session_not_found" });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});
