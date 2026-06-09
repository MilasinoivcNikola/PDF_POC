import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { murphySession, story2SessionWith } from "@/lib/story/story2/fixtures";
import { otisSession } from "@/lib/story/fixtures";
import type { StorySession } from "@/lib/session/types";

// The orchestrator entry points (`generateAllIllustrations`,
// `regenerateSceneIllustration`) are typed against `StorySession` — that is what a
// session read off disk (`readSession`) is in the production routes; the
// `storyType: "story-2"` discriminant drives the dispatch and the orchestrator
// narrows to `Story2Session` internally (`session as unknown as Story2Session`),
// exactly as feature 14's registry boundary set up. So a Story-2 fixture reaches
// these functions AS a `StorySession`, just as it does in production. These
// helpers cast once at that boundary (the two types are not structurally
// assignable) so the test mirrors the real call site without scattering casts.
function murphyAsSession(): StorySession {
  return murphySession() as unknown as StorySession;
}
function story2As(
  overrides: Parameters<typeof story2SessionWith>[0],
): StorySession {
  return story2SessionWith(overrides) as unknown as StorySession;
}

// Story-2 imagery orchestration tests for feature 17. ALL with the OpenAI SDK
// mocked (no network, no credits). Surfaces under test:
//   1. generateAllIllustrations dispatching to the Story-2 path — its slot list
//      comes from the registry per `storyType` (the two Premium slots), the
//      manifest shape, and the per-slot API method (cover → images.edit with the
//      photo reference; belief wash → prompt-only images.generate).
//   2. The default Low quality reaching both Story-2 image calls + an explicit
//      override (feature-13 regression-guard style).
//   3. Story-1 generation is unaffected (its slot list still resolves to
//      SCENE_PAGE_IDS — a light shape check, not the full Story-1 suite).
//   4. manifestToImageMap admitting Story-2 slots while still excluding the
//      Story-1 "reference" anchor and the writing-only "back-cover".
//   5. regenerateStory2Slot via regenerateSceneIllustration — right method per
//      `useReference`, and a non-slot page rejected.
//
// The orchestrator does real file IO under ./generated/[session-id]. Mirroring
// generate.scene.test.ts, we run it against a THROWAWAY temp dir by spying
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
  const root = await mkdtemp(join(tmpdir(), "qk-s2-"));
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
// generateAllIllustrations — Story-2 dispatch: slot list from the registry
// ---------------------------------------------------------------------------

describe("generateAllIllustrations — Story-2 dispatch", () => {
  it("generates exactly the registry's 2 Story-2 slots, each with path + both hashes", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    // The slot list is sourced from the registry, NOT a hardcoded constant.
    expect(LETTER_SCENE_PAGE_IDS).toEqual(["letter-cover", "letter-page-5"]);
    expect(manifest).toHaveLength(LETTER_SCENE_PAGE_IDS.length);

    const pages = manifest.map((m) => m.page).sort();
    expect(pages).toEqual([...LETTER_SCENE_PAGE_IDS].sort());

    for (const entry of manifest) {
      expect(entry.path, entry.page).toBeTruthy();
      expect(entry.promptHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.referenceHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
    }
    // No Story-1 "reference" anchor slot in a Story-2 manifest.
    expect(pages).not.toContain("reference");
  });

  it("calls the API exactly twice on a cold run (one per slot)", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock).toHaveBeenCalledTimes(1); // the cover (reference)
    expect(generateMock).toHaveBeenCalledTimes(1); // the belief wash (prompt-only)
  });

  it("the cover passes the photo as a reference via images.edit", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock).toHaveBeenCalledTimes(1);
    const args = editMock.mock.calls[0][0];
    expect(args.model).toBe(IMAGE_MODEL);
    expect(args.size).toBe("1024x1024");
    expect(args.n).toBe(1);
    // Exactly one reference (the uploaded photo) is passed to the cover.
    expect(Array.isArray(args.image)).toBe(true);
    expect(args.image).toHaveLength(1);
  });

  it("the belief wash passes NO reference via prompt-only images.generate", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(generateMock).toHaveBeenCalledTimes(1);
    const args = generateMock.mock.calls[0][0];
    expect(args.model).toBe(IMAGE_MODEL);
    expect(args.size).toBe("1024x1024");
    expect(args.n).toBe(1);
    // No reference image at all — images.generate takes no `image`.
    expect(args.image).toBeUndefined();
  });

  it("writes each slot into ./generated/[session-id]/ and the files exist", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    const root = await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    const base = join(root, "generated", session.id);
    for (const entry of manifest) {
      expect(entry.path.startsWith(base), entry.path).toBe(true);
    }
    await expect(readFile(join(base, "letter-cover.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "letter-page-5.png"))).resolves.toBeTruthy();
  });

  it("re-run with the persisted manifest is a pure cache hit (no new calls)", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);
    expect(editMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledTimes(1);

    editMock.mockClear();
    generateMock.mockClear();
    const warm: StorySession = { ...session, images: manifest };
    const reManifest = await generateAllIllustrations(warm);

    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(reManifest).toHaveLength(manifest.length);
  });

  it("rejects an unsafe Story-2 session id before any generation", async () => {
    mockBothReturnImage();
    const session: StorySession = { ...murphyAsSession(), id: "../../etc/evil" };
    await withTempCwd(murphyAsSession());
    await expect(generateAllIllustrations(session)).rejects.toThrow(/unsafe session id/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Story-2 quality default (feature 13 style) — both images default to "low"
// ---------------------------------------------------------------------------

describe("Story-2 image quality default", () => {
  it("defaults BOTH Story-2 image calls to low quality", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock.mock.calls[0][0].quality).toBe("low"); // cover
    expect(generateMock.mock.calls[0][0].quality).toBe("low"); // belief wash
  });

  it("honors an explicit sceneQuality override (proves low is a default, not a hardcode)", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { sceneQuality: "medium" });

    expect(editMock.mock.calls[0][0].quality).toBe("medium");
    expect(generateMock.mock.calls[0][0].quality).toBe("medium");
  });

  it("the secular belief frame routes through the same prompt-only path at low", async () => {
    mockBothReturnImage();
    const session = story2As({ toggles: { beliefFrame: "secular" } });
    await withTempCwd(session);

    await generateAllIllustrations(session);

    // Still exactly one prompt-only call for the wash, at the low default.
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(generateMock.mock.calls[0][0].quality).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// Story-1 unaffected — its slot list still resolves to SCENE_PAGE_IDS
// ---------------------------------------------------------------------------

describe("Story-1 generation is unaffected by the Story-2 dispatch", () => {
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
});

// ---------------------------------------------------------------------------
// manifestToImageMap — admits Story-2 slots, excludes reference + back-cover
// ---------------------------------------------------------------------------

describe("manifestToImageMap — Story-2 slots", () => {
  async function seedFile(root: string, name: string, bytes: Buffer): Promise<string> {
    const dir = join(root, "generated", "test-murphy");
    await mkdir(dir, { recursive: true });
    const p = join(dir, name);
    await writeFile(p, bytes);
    return p;
  }

  it("maps letter-cover and letter-page-5 to data URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s2map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "letter-cover.png", Buffer.from([1, 2, 3]));
    const washPath = await seedFile(root, "letter-page-5.png", Buffer.from([4, 5, 6]));

    const map = await manifestToImageMap([
      { page: "letter-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "letter-page-5", path: washPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["letter-cover"]).toBe(
      `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`,
    );
    expect(map["letter-page-5"]).toBe(
      `data:image/png;base64,${Buffer.from([4, 5, 6]).toString("base64")}`,
    );
  });

  it("still excludes the Story-1 reference anchor and the writing-only back-cover", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s2map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "letter-cover.png", Buffer.from([1]));
    const refPath = await seedFile(root, "reference.png", Buffer.from([9]));
    const backPath = await seedFile(root, "back-cover.png", Buffer.from([7]));

    const map = await manifestToImageMap([
      { page: "letter-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "reference", path: refPath, promptHash: "p", referenceHash: "r" },
      { page: "back-cover", path: backPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["letter-cover"]).toBeTruthy();
    expect(map).not.toHaveProperty("reference");
    expect(map).not.toHaveProperty("back-cover");
  });
});

// ---------------------------------------------------------------------------
// regenerateSceneIllustration — Story-2 single-slot repaint
// ---------------------------------------------------------------------------

describe("regenerateSceneIllustration — Story-2 slots", () => {
  it("regenerates the cover via images.edit (passes the photo reference)", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    const entry = await regenerateSceneIllustration(session, "letter-cover");

    expect(entry.page).toBe("letter-cover");
    // Bypasses the cache: the cover always re-calls images.edit with one reference.
    expect(editMock).toHaveBeenCalledTimes(1);
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock.mock.calls[0][0].image).toHaveLength(1);
    expect(editMock.mock.calls[0][0].quality).toBe("low");
  });

  it("regenerates the belief wash via prompt-only images.generate (no reference)", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    const entry = await regenerateSceneIllustration(session, "letter-page-5");

    expect(entry.page).toBe("letter-page-5");
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock.mock.calls[0][0].image).toBeUndefined();
    expect(generateMock.mock.calls[0][0].quality).toBe("low");
  });

  it("rejects a non-illustrated Story-2 page (e.g. letter-page-2)", async () => {
    mockBothReturnImage();
    const session = murphyAsSession();
    await withTempCwd(session);

    await expect(
      regenerateSceneIllustration(session, "letter-page-2"),
    ).rejects.toThrow(/not an illustrated scene/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});
