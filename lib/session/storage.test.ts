import { describe, it, expect, afterEach, afterAll, beforeEach } from "vitest";
import { join } from "node:path";
import { rm } from "node:fs/promises";

import {
  createSessionId,
  newDraft,
  loadDraft,
  saveDraft,
  clearDraft,
  writeSession,
  readSession,
  DRAFT_STORAGE_KEY,
} from "./storage";
import type { StorySession } from "./types";

// ---------------------------------------------------------------------------
// IDs and the newDraft() factory (pure)
// ---------------------------------------------------------------------------

describe("createSessionId", () => {
  it("returns a fresh, unique id each call", () => {
    const a = createSessionId();
    const b = createSessionId();
    expect(a).toBeTypeOf("string");
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

describe("newDraft", () => {
  it("applies the spec's default toggles and lifecycle", () => {
    const draft = newDraft();
    expect(draft.pet.illustrationStyle).toBe("watercolor");
    expect(draft.toggles.beliefFrame).toBe("rainbow-bridge");
    expect(draft.status).toBe("draft");
  });

  it("populates id and createdAt", () => {
    const draft = newDraft();
    expect(draft.id).toBeTypeOf("string");
    expect(draft.id.length).toBeGreaterThan(0);
    // createdAt is a parseable ISO timestamp.
    expect(draft.createdAt).toBeTypeOf("string");
    expect(Number.isNaN(Date.parse(draft.createdAt))).toBe(false);
  });

  it("starts the input groups empty/partial", () => {
    const draft = newDraft();
    expect(draft.child).toEqual({});
    expect(draft.memories).toEqual({});
    // pet/toggles carry only their defaults, nothing else.
    expect(draft.pet).toEqual({ illustrationStyle: "watercolor" });
    expect(draft.toggles).toEqual({ beliefFrame: "rainbow-bridge" });
  });

  it("produces a distinct id on each call", () => {
    expect(newDraft().id).not.toBe(newDraft().id);
  });
});

// ---------------------------------------------------------------------------
// localStorage helpers — exercised with a stubbed window in the node env.
//
// The project's Vitest environment is `node`, so there is no real `window`.
// Rather than only asserting the SSR no-op path, we stub a minimal
// `globalThis.window.localStorage` to actually round-trip a draft (the spec's
// "round-trip a draft" requirement), then restore the global so the node env is
// left exactly as we found it.
// ---------------------------------------------------------------------------

function makeLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("localStorage helpers — SSR no-op (no window)", () => {
  it("loadDraft returns null on the server", () => {
    expect(typeof window).toBe("undefined");
    expect(loadDraft()).toBeNull();
  });

  it("saveDraft and clearDraft are safe no-ops on the server", () => {
    expect(() => saveDraft(newDraft())).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
  });
});

describe("localStorage helpers — round-trip with a stubbed window", () => {
  const stubbedWindow = {
    localStorage: makeLocalStorageStub(),
  } as unknown as Window & typeof globalThis;

  beforeEach(() => {
    (globalThis as { window?: unknown }).window = stubbedWindow;
    stubbedWindow.localStorage.clear();
  });

  afterEach(() => {
    // Restore the node env — remove the stubbed global entirely.
    delete (globalThis as { window?: unknown }).window;
  });

  it("saveDraft then loadDraft returns a deep-equal draft", () => {
    const draft = newDraft();
    draft.pet.name = "Otis";
    draft.child.name = "Emma";

    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
  });

  it("writes under the documented storage key", () => {
    const draft = newDraft();
    saveDraft(draft);
    const raw = stubbedWindow.localStorage.getItem(DRAFT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(draft);
  });

  it("loadDraft returns null when nothing is saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("loadDraft returns null on unparseable JSON", () => {
    stubbedWindow.localStorage.setItem(DRAFT_STORAGE_KEY, "{not json");
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft removes the saved draft", () => {
    saveDraft(newDraft());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Disk round-trip — writes/reads ./sessions/[id].json under process.cwd().
//
// Each test uses a fresh random id and tracks it for cleanup, so we only ever
// delete files this suite created — never any pre-existing session JSON.
// ---------------------------------------------------------------------------

function completeSession(id: string): StorySession {
  return {
    id,
    createdAt: "2026-06-07T12:00:00.000Z",
    status: "ready",
    pet: {
      name: "Otis",
      species: "dog",
      breedColor: "rescue mutt with floppy ears",
      pronoun: "he",
      illustrationStyle: "watercolor",
      photo: "uploads/otis.jpg",
    },
    child: { name: "Emma", ageBracket: "6-8" },
    memories: {
      favoriteActivity: "chasing tennis balls in the backyard",
      sleepingSpot: "at the foot of the bed",
      favoriteMemory: "the day Otis followed Emma to the lake",
      parentDedication: "For our sweet boy.",
    },
    toggles: {
      deathType: "natural",
      beliefFrame: "rainbow-bridge",
      otherPetsInHome: "no",
    },
    images: [
      {
        page: "cover",
        path: "generated/abc/cover.png",
        promptHash: "p-hash",
        referenceHash: "r-hash",
      },
    ],
    pdfPath: "output/Saying-Goodbye-to-Otis.pdf",
  };
}

describe("disk session round-trip", () => {
  const createdIds: string[] = [];

  function freshId(): string {
    const id = createSessionId();
    createdIds.push(id);
    return id;
  }

  afterAll(async () => {
    // Remove only the session files this suite created, keyed off our own ids.
    await Promise.all(
      createdIds.map((id) =>
        rm(join(process.cwd(), "sessions", `${id}.json`), { force: true }),
      ),
    );
  });

  it("writeSession then readSession returns a deep-equal session", async () => {
    const session = completeSession(freshId());
    await writeSession(session);
    const read = await readSession(session.id);
    expect(read).toEqual(session);
  });

  it("readSession returns null for a missing id (does not throw)", async () => {
    // A never-written id — not added to createdIds, so nothing to clean up.
    const missing = createSessionId();
    await expect(readSession(missing)).resolves.toBeNull();
  });
});
