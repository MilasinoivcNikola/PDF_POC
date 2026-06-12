import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { biscuitSession, story4SessionWith } from "@/lib/story/story4/fixtures";
import { murphySession } from "@/lib/story/story2/fixtures";
import { otisSession } from "@/lib/story/fixtures";
import type { StorySession } from "@/lib/session/types";

// The orchestrator entry points (`generateAllIllustrations`,
// `regenerateSceneIllustration`) are typed against `StorySession` — that is what a
// session read off disk (`readSession`) is in the production routes; the
// `storyType: "story-4"` discriminant drives the dispatch and the orchestrator
// narrows to `Story4Session` internally (`session as unknown as Story4Session`),
// exactly as features 14/17 set up. So a Story-4 fixture reaches these functions AS
// a `StorySession`, just as it does in production. These helpers cast once at that
// boundary (the two types are not structurally assignable) so the test mirrors the
// real call site without scattering casts.
function biscuitAsSession(): StorySession {
  return biscuitSession() as unknown as StorySession;
}
function story4As(
  overrides: Parameters<typeof story4SessionWith>[0],
): StorySession {
  return story4SessionWith(overrides) as unknown as StorySession;
}

// Story-4 imagery orchestration tests for feature 21. ALL with the OpenAI SDK
// mocked (no network, no credits). The load-bearing DIVERGENCE from Story 2: BOTH
// Story-4 slots are reference-anchored (the pet appears in the cover portrait AND
// the page-4 daily-joy scene), so BOTH route through images.edit (the photo as a
// reference) — images.generate is NEVER called (Story 2's figure-free belief wash
// used images.generate; Story 4 has no figure-free slot). Surfaces under test:
//   1. generateAllIllustrations dispatching to the Story-4 path — its slot list
//      comes from the registry per `storyType` (the two Premium slots), the
//      manifest shape, and the per-slot API method (both → images.edit, with the
//      photo reference; generate never called).
//   2. The default Low quality reaching both Story-4 image calls + an explicit
//      override (feature-13 regression-guard style).
//   3. Story-1 (14) and Story-2 (2) generation are unaffected.
//   4. manifestToImageMap admitting Story-4 slots while still excluding the
//      Story-1 "reference" anchor and the writing-only "back-cover".
//   5. regenerateStory4Slot via regenerateSceneIllustration — always images.edit
//      (both slots reference-anchored), and a non-slot page rejected.
//
// The orchestrator does real file IO under ./generated/[session-id]. Mirroring
// generate.story2.test.ts, we run it against a THROWAWAY temp dir by spying
// process.cwd() — so only the OpenAI SDK is mocked, the fs path is exercised for
// real, and the repo trees are never touched (the temp dir is removed afterward).

// ---------------------------------------------------------------------------
// Mock: OpenAI client (both images.edit and images.generate) + the SDK's toFile
// ---------------------------------------------------------------------------

const editMock = vi.fn();
const generateMock = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  getOpenAI: () => ({ images: { edit: editMock, generate: generateMock } }),
  photoToFile: vi.fn(async () => "FAKE_UPLOADABLE"),
}));

// generateSceneIllustration does `const { toFile } = await import("openai")`.
vi.mock("openai", () => ({
  default: class {},
  toFile: vi.fn(async (buffer: Buffer, name: string) => ({ __file: name, bytes: buffer })),
}));

import {
  generateAllIllustrations,
  regenerateSceneIllustration,
  manifestToImageMap,
  IMAGE_MODEL,
} from "./generate";
import { SCENE_PAGE_IDS } from "./prompts";
import { TALK_SCENE_PAGE_IDS } from "@/lib/story/story-4";
import { LETTER_SCENE_PAGE_IDS } from "@/lib/story/story-2";

/** A short fake PNG payload the mocked API "returns" for every generation. */
const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

/** Make both image methods resolve to a fresh fake image each call. */
function mockBothReturnImage(): void {
  editMock.mockResolvedValue({ data: [{ b64_json: FAKE_PNG.toString("base64") }] });
  generateMock.mockResolvedValue({ data: [{ b64_json: FAKE_PNG.toString("base64") }] });
}

// ---------------------------------------------------------------------------
// Temp-cwd harness — the orchestrator writes under <tmp>/generated/[id]
// ---------------------------------------------------------------------------

const createdDirs: string[] = [];
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

/**
 * Create a throwaway working dir, point process.cwd() at it, seed the session's
 * pet photo under <tmp>/uploads, and return the temp root.
 */
async function withTempCwd(session: StorySession): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "qk-s4-"));
  createdDirs.push(root);
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(root);
  const photoPath = join(root, session.pet.photo);
  await mkdir(join(photoPath, ".."), { recursive: true });
  await writeFile(photoPath, Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]));
  return root;
}

beforeEach(() => {
  editMock.mockReset();
  generateMock.mockReset();
});

afterEach(async () => {
  cwdSpy?.mockRestore();
  cwdSpy = undefined;
  vi.clearAllMocks();
  await Promise.all(
    createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

afterAll(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

// ---------------------------------------------------------------------------
// generateAllIllustrations — Story-4 dispatch: slot list from the registry
// ---------------------------------------------------------------------------

describe("generateAllIllustrations — Story-4 dispatch", () => {
  it("generates exactly the registry's 2 Story-4 slots, each with path + both hashes", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    // The slot list is sourced from the registry, NOT a hardcoded constant.
    expect(TALK_SCENE_PAGE_IDS).toEqual(["talk-cover", "talk-page-4"]);
    expect(manifest).toHaveLength(TALK_SCENE_PAGE_IDS.length);

    const pages = manifest.map((m) => m.page).sort();
    expect(pages).toEqual([...TALK_SCENE_PAGE_IDS].sort());

    for (const entry of manifest) {
      expect(entry.path, entry.page).toBeTruthy();
      expect(entry.promptHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.referenceHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
    }
    // No Story-1 "reference" anchor slot in a Story-4 manifest.
    expect(pages).not.toContain("reference");
  });

  it("calls images.edit exactly twice and images.generate NEVER (both slots reference-anchored)", async () => {
    // THE headline divergence from Story 2 (whose wash used images.generate):
    // every Story-4 slot anchors on the photo, so both route through images.edit.
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock).toHaveBeenCalledTimes(2); // cover + page-4 scene
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("BOTH slots pass the photo as a reference via images.edit", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock).toHaveBeenCalledTimes(2);
    for (const call of editMock.mock.calls) {
      const args = call[0];
      expect(args.model).toBe(IMAGE_MODEL);
      expect(args.size).toBe("1024x1024");
      expect(args.n).toBe(1);
      // Exactly one reference (the uploaded photo) per slot.
      expect(Array.isArray(args.image)).toBe(true);
      expect(args.image).toHaveLength(1);
    }
  });

  it("writes each slot into ./generated/[session-id]/ and the files exist", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    const root = await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    const base = join(root, "generated", session.id);
    for (const entry of manifest) {
      expect(entry.path.startsWith(base), entry.path).toBe(true);
    }
    await expect(readFile(join(base, "talk-cover.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "talk-page-4.png"))).resolves.toBeTruthy();
  });

  it("re-run with the persisted manifest is a pure cache hit (no new calls)", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);
    expect(editMock).toHaveBeenCalledTimes(2);

    editMock.mockClear();
    generateMock.mockClear();
    const warm: StorySession = { ...session, images: manifest };
    const reManifest = await generateAllIllustrations(warm);

    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(reManifest).toHaveLength(manifest.length);
  });

  it("the page-4 art is path-independent: a living vs memorial session shares the cache (no re-spend)", async () => {
    // The memorial toggle changes only the letter TEXT, not the art — so a memorial
    // session with the living session's manifest must hit the cache for page-4.
    mockBothReturnImage();
    const living = story4As({ toggles: { livingOrMemorial: "living" } });
    await withTempCwd(living);

    const manifest = await generateAllIllustrations(living);
    expect(editMock).toHaveBeenCalledTimes(2);

    editMock.mockClear();
    const memorialWarm = {
      ...story4As({ toggles: { livingOrMemorial: "memorial" } }),
      id: living.id,
      images: manifest,
    };
    await generateAllIllustrations(memorialWarm);

    // Both prompts are byte-identical to the living run's, so both cache-hit: 0 calls.
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("rejects an unsafe Story-4 session id before any generation", async () => {
    mockBothReturnImage();
    const session: StorySession = { ...biscuitAsSession(), id: "../../etc/evil" };
    await withTempCwd(biscuitAsSession());
    await expect(generateAllIllustrations(session)).rejects.toThrow(/unsafe session id/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Story-4 quality default (feature 13 style) — both images default to "low"
// ---------------------------------------------------------------------------

describe("Story-4 image quality default", () => {
  it("defaults BOTH Story-4 image calls to low quality", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock.mock.calls[0][0].quality).toBe("low");
    expect(editMock.mock.calls[1][0].quality).toBe("low");
  });

  it("honors an explicit sceneQuality override (proves low is a default, not a hardcode)", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { sceneQuality: "medium" });

    expect(editMock.mock.calls[0][0].quality).toBe("medium");
    expect(editMock.mock.calls[1][0].quality).toBe("medium");
    expect(generateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Story-1 / Story-2 unaffected by the Story-4 dispatch
// ---------------------------------------------------------------------------

describe("Story-1 and Story-2 generation are unaffected by the Story-4 dispatch", () => {
  it("a Story-1 session still produces reference + 13 scenes via images.edit only", async () => {
    mockBothReturnImage();
    const session = otisSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    // reference + 13 scenes = 14; slot set unchanged.
    expect(manifest).toHaveLength(SCENE_PAGE_IDS.length + 1);
    expect(manifest[0].page).toBe("reference");
    expect(manifest.slice(1).map((m) => m.page).sort()).toEqual(
      [...SCENE_PAGE_IDS].sort(),
    );
    // The prompt-only path is never used for Story 1.
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock).toHaveBeenCalledTimes(SCENE_PAGE_IDS.length + 1);
  });

  it("a Story-2 session still produces 2 slots (cover via edit, wash via generate)", async () => {
    mockBothReturnImage();
    const session = murphySession() as unknown as StorySession;
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    expect(manifest).toHaveLength(LETTER_SCENE_PAGE_IDS.length);
    expect(manifest.map((m) => m.page).sort()).toEqual(
      [...LETTER_SCENE_PAGE_IDS].sort(),
    );
    // Story 2 keeps its figure-free wash on images.generate — exactly one each.
    expect(editMock).toHaveBeenCalledTimes(1); // cover
    expect(generateMock).toHaveBeenCalledTimes(1); // belief wash
  });
});

// ---------------------------------------------------------------------------
// manifestToImageMap — admits Story-4 slots, excludes reference + back-cover
// ---------------------------------------------------------------------------

describe("manifestToImageMap — Story-4 slots", () => {
  async function seedFile(root: string, name: string, bytes: Buffer): Promise<string> {
    const dir = join(root, "generated", "test-biscuit");
    await mkdir(dir, { recursive: true });
    const p = join(dir, name);
    await writeFile(p, bytes);
    return p;
  }

  it("maps talk-cover and talk-page-4 to data URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s4map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "talk-cover.png", Buffer.from([1, 2, 3]));
    const scenePath = await seedFile(root, "talk-page-4.png", Buffer.from([4, 5, 6]));

    const map = await manifestToImageMap([
      { page: "talk-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "talk-page-4", path: scenePath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["talk-cover"]).toBe(
      `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`,
    );
    expect(map["talk-page-4"]).toBe(
      `data:image/png;base64,${Buffer.from([4, 5, 6]).toString("base64")}`,
    );
  });

  it("still excludes the Story-1 reference anchor and the writing-only back-cover", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s4map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "talk-cover.png", Buffer.from([1]));
    const refPath = await seedFile(root, "reference.png", Buffer.from([9]));
    const backPath = await seedFile(root, "back-cover.png", Buffer.from([7]));

    const map = await manifestToImageMap([
      { page: "talk-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "reference", path: refPath, promptHash: "p", referenceHash: "r" },
      { page: "back-cover", path: backPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["talk-cover"]).toBeTruthy();
    expect(map).not.toHaveProperty("reference");
    expect(map).not.toHaveProperty("back-cover");
  });
});

// ---------------------------------------------------------------------------
// regenerateSceneIllustration — Story-4 single-slot repaint
// ---------------------------------------------------------------------------

describe("regenerateSceneIllustration — Story-4 slots", () => {
  it("regenerates the cover via images.edit (passes the photo reference)", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    const entry = await regenerateSceneIllustration(session, "talk-cover");

    expect(entry.page).toBe("talk-cover");
    // Bypasses the cache: always re-calls images.edit with one reference.
    expect(editMock).toHaveBeenCalledTimes(1);
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock.mock.calls[0][0].image).toHaveLength(1);
    expect(editMock.mock.calls[0][0].quality).toBe("low");
  });

  it("regenerates the page-4 scene via images.edit too (reference-anchored, never generate)", async () => {
    // Story 2's belief wash regenerated via images.generate; Story 4's page-4 is
    // the real pet, so it regenerates via images.edit with the photo reference.
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    const entry = await regenerateSceneIllustration(session, "talk-page-4");

    expect(entry.page).toBe("talk-page-4");
    expect(editMock).toHaveBeenCalledTimes(1);
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock.mock.calls[0][0].image).toHaveLength(1);
    expect(editMock.mock.calls[0][0].quality).toBe("low");
  });

  it("rejects a non-illustrated Story-4 page (e.g. talk-page-2)", async () => {
    mockBothReturnImage();
    const session = biscuitAsSession();
    await withTempCwd(session);

    await expect(
      regenerateSceneIllustration(session, "talk-page-2"),
    ).rejects.toThrow(/not an illustrated scene/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});
