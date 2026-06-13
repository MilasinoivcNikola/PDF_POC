import { describe, it, expect, vi, beforeEach } from "vitest";
import { join } from "node:path";
import { access } from "node:fs/promises";

import { isSafeSessionId } from "@/lib/ai/paths";
import type {
  StorySession,
  Story2Session,
  Story4Session,
  Story5Session,
  Story6Session,
} from "@/lib/session/types";

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
  writeSession: (
    session:
      | StorySession
      | Story2Session
      | Story4Session
      | Story5Session
      | Story6Session,
  ) => writeSessionMock(session),
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

/** A complete, valid finalized Story-2 session payload. */
function validStory2Session(id = "story2-id-xyz789"): Story2Session {
  return {
    id,
    createdAt: "2026-06-09T09:00:00.000Z",
    status: "generating",
    storyType: "story-2",
    pet: {
      name: "Murphy",
      species: "dog",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/sess/murphy.jpg",
    },
    owner: { names: "Sarah", relationship: "single" },
    memories: {
      quirks: "the way you tilted your head when I said your name",
      favoriteRitual: "our walk before coffee, every morning",
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

/** A complete, valid finalized Story-4 session payload. */
function validStory4Session(id = "story4-id-talk789"): Story4Session {
  return {
    id,
    createdAt: "2026-06-12T09:00:00.000Z",
    status: "generating",
    storyType: "story-4",
    pet: {
      name: "Biscuit",
      species: "dog",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/sess/biscuit.jpg",
    },
    owner: { names: "Sarah", relationship: "single" },
    memories: {
      quirks: "the way I lose my mind when you pick up the leash",
      favoriteRitual: "our walk before coffee, every single morning",
      favoriteSpots: "the spot by the back door",
      favoriteActivity: "stealing one sock and running a victory lap",
    },
    toggles: {
      livingOrMemorial: "living",
      giftFor: "self",
      deathType: "peaceful",
      beliefFrame: "rainbow-bridge",
    },
    images: [],
  };
}

/** A complete, valid finalized Story-5 session payload. */
function validStory5Session(id = "story5-id-note101"): Story5Session {
  return {
    id,
    createdAt: "2026-06-12T09:00:00.000Z",
    status: "generating",
    storyType: "story-5",
    pet: {
      name: "Murphy",
      species: "dog",
      breedColor: "rescue mutt with the lopsided grin",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/sess/murphy.jpg",
    },
    owner: { names: "Sarah", relationship: "single" },
    memories: {
      // quirks is optional-with-fallback for Story 5 — present here but the route
      // does not validate it.
      quirks: "",
      favoriteRitual: "our walk before coffee, every morning",
      favoriteSpots: "the spot by the back door",
    },
    toggles: {
      deathType: "peaceful",
      beliefFrame: "rainbow-bridge",
    },
    images: [],
  };
}

/** A complete, valid finalized Story-6 session payload (the living tribute). */
function validStory6Session(id = "story6-id-tribute202"): Story6Session {
  return {
    id,
    createdAt: "2026-06-13T09:00:00.000Z",
    status: "generating",
    storyType: "story-6",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "a grey-muzzled rescue mutt with soft brown eyes",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/sess/otis.jpg",
    },
    owner: { names: "Sarah", relationship: "single" },
    memories: {
      ageOrStage: "thirteen years young",
      // quirks / stillLoves / favoriteSpots / sleepingSpot are optional-with-
      // fallback for Story 6 — present here as "" but the route does not validate
      // them.
      quirks: "",
      stillLoves: "",
      favoriteActivity: "the slow morning walk we still take",
      favoriteRitual: "the coffee I drink with my hand on your back",
      sleepingSpot: "",
      favoriteSpots: "",
    },
    toggles: {
      transitionFrame: "still-here",
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

// ---------------------------------------------------------------------------
// Story 2 — per-storyType validation branches (disk write still mocked)
// ---------------------------------------------------------------------------
//
// The route branches on body.storyType: a "story-2" body validates the Story-2
// required set (pet name, species, photo, owner names, quirks, favoriteRitual,
// favoriteSpots) and writes a Story2Session. The id traversal guard is shared.

describe("POST /api/session — Story 2 validation", () => {
  it("rejects a missing pet name with 400 missing_pet_name", async () => {
    const body = validStory2Session();
    body.pet.name = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_pet_name",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing species with 400 missing_species", async () => {
    const body = validStory2Session();
    body.pet.species = "" as Story2Session["pet"]["species"];
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_species",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing photo with 400 missing_photo", async () => {
    const body = validStory2Session();
    body.pet.photo = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing owner names with 400 missing_owner_names", async () => {
    const body = validStory2Session();
    body.owner.names = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_owner_names",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing quirks with 400 missing_quirks", async () => {
    const body = validStory2Session();
    body.memories.quirks = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_quirks",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite ritual with 400 missing_favorite_ritual", async () => {
    const body = validStory2Session();
    body.memories.favoriteRitual = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_ritual",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing favorite spots with 400 missing_favorite_spots", async () => {
    const body = validStory2Session();
    body.memories.favoriteSpots = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_spots",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id for a Story-2 body (shared guard) and writes nothing", async () => {
    const malicious = "../../../tmp/evil-story2";
    expect(isSafeSessionId(malicious)).toBe(false);
    const res = await POST(
      jsonRequest({ ...validStory2Session(), id: malicious }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/session — Story 2 happy path", () => {
  it("writes the Story-2 session and returns { ok:true, id }", async () => {
    const body = validStory2Session("good-story2-id");
    const res = await POST(jsonRequest(body));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "good-story2-id",
    });

    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls[0][0]).toMatchObject({
      id: "good-story2-id",
      storyType: "story-2",
      pet: { name: "Murphy", species: "dog", photo: "uploads/sess/murphy.jpg" },
      owner: { names: "Sarah", relationship: "single" },
      memories: { quirks: expect.any(String) },
    });
  });
});

// ---------------------------------------------------------------------------
// Story 4 — per-storyType validation branches (disk write still mocked)
// ---------------------------------------------------------------------------
//
// A "story-4" body validates the Story-4 required set (pet name, species, photo,
// owner names, quirks, favoriteRitual, favoriteSpots, AND favoriteActivity — the
// Story-1 reuse that distinguishes it from Story 2) and writes a Story4Session.
// The id traversal guard is shared. Note: a Story-4 body that omitted
// favoriteActivity but is otherwise complete must still be rejected — proving the
// route ran validateStory4, not validateStory2 (which would have accepted it).

describe("POST /api/session — Story 4 validation", () => {
  it("rejects a missing pet name with 400 missing_pet_name", async () => {
    const body = validStory4Session();
    body.pet.name = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_pet_name",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing species with 400 missing_species", async () => {
    const body = validStory4Session();
    body.pet.species = "" as Story4Session["pet"]["species"];
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_species",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing photo with 400 missing_photo", async () => {
    const body = validStory4Session();
    body.pet.photo = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing owner names with 400 missing_owner_names", async () => {
    const body = validStory4Session();
    body.owner.names = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_owner_names",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing quirks with 400 missing_quirks", async () => {
    const body = validStory4Session();
    body.memories.quirks = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_quirks",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite ritual with 400 missing_favorite_ritual", async () => {
    const body = validStory4Session();
    body.memories.favoriteRitual = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_ritual",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing favorite spots with 400 missing_favorite_spots", async () => {
    const body = validStory4Session();
    body.memories.favoriteSpots = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_spots",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite activity with 400 missing_favorite_activity (the Story-4-only required field)", async () => {
    // favoriteActivity is required for Story 4 but NOT for Story 2 — rejecting it
    // proves the route dispatched to validateStory4 on the storyType discriminant.
    const body = validStory4Session();
    body.memories.favoriteActivity = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_activity",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal id for a Story-4 body (shared guard) and writes nothing", async () => {
    const malicious = "../../../tmp/evil-story4";
    expect(isSafeSessionId(malicious)).toBe(false);
    const res = await POST(
      jsonRequest({ ...validStory4Session(), id: malicious }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/session — Story 4 happy path", () => {
  it("writes the Story-4 session and returns { ok:true, id }", async () => {
    const body = validStory4Session("good-story4-id");
    const res = await POST(jsonRequest(body));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "good-story4-id",
    });

    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls[0][0]).toMatchObject({
      id: "good-story4-id",
      storyType: "story-4",
      pet: { name: "Biscuit", species: "dog", photo: "uploads/sess/biscuit.jpg" },
      owner: { names: "Sarah", relationship: "single" },
      memories: {
        quirks: expect.any(String),
        favoriteActivity: expect.any(String),
      },
      toggles: { livingOrMemorial: "living" },
    });
  });
});

// ---------------------------------------------------------------------------
// Story 5 — per-storyType validation branches (disk write still mocked)
// ---------------------------------------------------------------------------
//
// A "story-5" body validates the Story-5 required set (pet name, species, photo,
// owner names, favoriteRitual, favoriteSpots) and writes a Story5Session. Crucially
// `quirks` is OPTIONAL for Story 5 (it has a variant fallback), so a body with a
// blank quirks but every required field present must be ACCEPTED — proving the route
// ran validateStory5, not validateStory2/4 (which would have rejected it). The id
// traversal guard is shared.

describe("POST /api/session — Story 5 validation", () => {
  it("rejects a missing pet name with 400 missing_pet_name", async () => {
    const body = validStory5Session();
    body.pet.name = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_pet_name",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing species with 400 missing_species", async () => {
    const body = validStory5Session();
    body.pet.species = "" as Story5Session["pet"]["species"];
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_species",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing photo with 400 missing_photo", async () => {
    const body = validStory5Session();
    body.pet.photo = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing owner names with 400 missing_owner_names", async () => {
    const body = validStory5Session();
    body.owner.names = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_owner_names",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite ritual with 400 missing_favorite_ritual", async () => {
    const body = validStory5Session();
    body.memories.favoriteRitual = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_ritual",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing favorite spots with 400 missing_favorite_spots", async () => {
    const body = validStory5Session();
    body.memories.favoriteSpots = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_spots",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("ACCEPTS a body with a blank quirks (optional-with-fallback — proves validateStory5 ran, not validateStory2)", async () => {
    // A Story-2/4 body with blank quirks would be rejected (missing_quirks); a
    // Story-5 body must be accepted, since quirks is optional here.
    const body = validStory5Session("blank-quirks-ok");
    body.memories.quirks = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "blank-quirks-ok",
    });
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a path-traversal id for a Story-5 body (shared guard) and writes nothing", async () => {
    const malicious = "../../../tmp/evil-story5";
    expect(isSafeSessionId(malicious)).toBe(false);
    const res = await POST(
      jsonRequest({ ...validStory5Session(), id: malicious }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/session — Story 5 happy path", () => {
  it("writes the Story-5 session and returns { ok:true, id }", async () => {
    const body = validStory5Session("good-story5-id");
    const res = await POST(jsonRequest(body));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "good-story5-id",
    });

    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls[0][0]).toMatchObject({
      id: "good-story5-id",
      storyType: "story-5",
      pet: { name: "Murphy", species: "dog", photo: "uploads/sess/murphy.jpg" },
      owner: { names: "Sarah", relationship: "single" },
      memories: {
        favoriteRitual: expect.any(String),
        favoriteSpots: expect.any(String),
      },
      toggles: { deathType: "peaceful", beliefFrame: "rainbow-bridge" },
    });
  });
});

// A "story-6" body validates the Story-6 required set (pet name, species, photo,
// breedColor, owner names, ageOrStage, favoriteRitual, favoriteActivity) and writes
// a Story6Session. It is the FIRST narrative storefront book, so it keeps the Story-1
// pet group (pronoun + style). Crucially `quirks` is OPTIONAL for Story 6 (variant
// fallback), so a body with a blank quirks but every required field present must be
// ACCEPTED — proving the route ran validateStory6, not validateStory2/4 (which would
// have rejected it). The id traversal guard is shared.

describe("POST /api/session — Story 6 validation", () => {
  it("rejects a missing pet name with 400 missing_pet_name", async () => {
    const body = validStory6Session();
    body.pet.name = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_pet_name",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing species with 400 missing_species", async () => {
    const body = validStory6Session();
    body.pet.species = "" as Story6Session["pet"]["species"];
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_species",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing photo with 400 missing_photo", async () => {
    const body = validStory6Session();
    body.pet.photo = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_photo",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing breed color with 400 missing_breed_color (narrative placeholder)", async () => {
    const body = validStory6Session();
    body.pet.breedColor = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_breed_color",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects missing owner names with 400 missing_owner_names", async () => {
    const body = validStory6Session();
    body.owner.names = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_owner_names",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing ageOrStage with 400 missing_age_or_stage", async () => {
    const body = validStory6Session();
    body.memories.ageOrStage = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_age_or_stage",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite ritual with 400 missing_favorite_ritual", async () => {
    const body = validStory6Session();
    body.memories.favoriteRitual = "";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_ritual",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a missing favorite activity with 400 missing_favorite_activity", async () => {
    const body = validStory6Session();
    body.memories.favoriteActivity = "  ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "missing_favorite_activity",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });

  it("ACCEPTS a body with a blank quirks (optional-with-fallback — proves validateStory6 ran, not validateStory2)", async () => {
    const body = validStory6Session("blank-quirks-ok6");
    body.memories.quirks = "   ";
    const res = await POST(jsonRequest(body));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "blank-quirks-ok6",
    });
    expect(writeSessionMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a path-traversal id for a Story-6 body (shared guard) and writes nothing", async () => {
    const malicious = "../../../tmp/evil-story6";
    expect(isSafeSessionId(malicious)).toBe(false);
    const res = await POST(
      jsonRequest({ ...validStory6Session(), id: malicious }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "invalid_session_id",
    });
    expect(writeSessionMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/session — Story 6 happy path", () => {
  it("writes the Story-6 session and returns { ok:true, id }", async () => {
    const body = validStory6Session("good-story6-id");
    const res = await POST(jsonRequest(body));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "good-story6-id",
    });

    expect(writeSessionMock).toHaveBeenCalledTimes(1);
    expect(writeSessionMock.mock.calls[0][0]).toMatchObject({
      id: "good-story6-id",
      storyType: "story-6",
      // Keeps the Story-1 pet group: pronoun + illustrationStyle present.
      pet: {
        name: "Otis",
        species: "dog",
        photo: "uploads/sess/otis.jpg",
        pronoun: "he",
        illustrationStyle: "watercolor",
      },
      owner: { names: "Sarah", relationship: "single" },
      memories: {
        ageOrStage: expect.any(String),
        favoriteRitual: expect.any(String),
        favoriteActivity: expect.any(String),
      },
      toggles: { transitionFrame: "still-here", otherPetsInHome: "no" },
    });
  });
});
