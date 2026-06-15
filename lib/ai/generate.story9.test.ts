import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { biscuitSession9, story9SessionWith } from "@/lib/story/story9/fixtures";
import { otisSession } from "@/lib/story/fixtures";
import type { StorySession } from "@/lib/session/types";

// Story-9 imagery orchestration tests (the wiring fix). ALL with the OpenAI SDK
// mocked (no network, no credits). Story 9's imagery shape is STORY 6'S SHAPE — a
// locked reference illustration + 7 reference-anchored brief-driven scenes
// (baby-cover + baby-page-2..baby-page-7), ALL via images.edit — NOT the letters'
// 2-image shape, and with NO figure-free wash. So per book: 8 images.edit calls and
// ZERO images.generate calls. Surfaces under test:
//   1. generateAllIllustrations dispatching to the Story-9 path — the slot list from
//      the registry (7 baby-* slots), the reference anchor (reference.png), the
//      manifest shape (8 entries), and that all 8 go through images.edit.
//   2. images.generate is NEVER called for Story 9 (no wash); the written filenames
//      are baby-*.png, not the Story-1 fallback's page-*.png (the assertion the old
//      wiring would fail).
//   3. The default Low quality reaching every Story-9 image call + an explicit override.
//   4. Story-1 (14) generation is unaffected (the regression guard).
//   5. manifestToImageMap admitting the 7 baby-* slots while still excluding the
//      "reference" anchor and the writing-only "baby-back-cover".
//   6. regenerateStory9Slot via regenerateSceneIllustration — via images.edit, reusing
//      the on-disk reference — and a non-slot page rejected.
//
// Mirrors generate.story6.test.ts: only the OpenAI SDK is mocked; the fs path is
// exercised for real against a THROWAWAY temp dir by spying process.cwd().

function biscuit9AsSession(): StorySession {
  return biscuitSession9() as unknown as StorySession;
}
function story9As(
  overrides: Parameters<typeof story9SessionWith>[0],
): StorySession {
  return story9SessionWith(overrides) as unknown as StorySession;
}

// ---------------------------------------------------------------------------
// Mock: OpenAI client (both images.edit and images.generate) + the SDK's toFile
// ---------------------------------------------------------------------------

const editMock = vi.fn();
const generateMock = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  getOpenAI: () => ({ images: { edit: editMock, generate: generateMock } }),
  photoToFile: vi.fn(async () => "FAKE_UPLOADABLE"),
}));

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
import { STORY_9_SCENE_PAGE_IDS } from "@/lib/story/story-9";

const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

function mockBothReturnImage(): void {
  editMock.mockResolvedValue({ data: [{ b64_json: FAKE_PNG.toString("base64") }] });
  generateMock.mockResolvedValue({ data: [{ b64_json: FAKE_PNG.toString("base64") }] });
}

// ---------------------------------------------------------------------------
// Temp-cwd harness — the orchestrator writes under <tmp>/generated/[id]
// ---------------------------------------------------------------------------

const createdDirs: string[] = [];
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

async function withTempCwd(session: StorySession): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "qk-s9-"));
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
// generateAllIllustrations — Story-9 dispatch: reference + 7 scenes (8 images)
// ---------------------------------------------------------------------------

describe("generateAllIllustrations — Story-9 dispatch", () => {
  it("generates a reference anchor + the registry's 7 baby slots (8 images)", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    expect(STORY_9_SCENE_PAGE_IDS).toHaveLength(7);
    // reference + 7 scenes = 8 (Story 6's shape, NOT the letters' total = slots).
    expect(manifest).toHaveLength(STORY_9_SCENE_PAGE_IDS.length + 1);
    expect(manifest[0].page).toBe("reference");
    expect(manifest.slice(1).map((m) => m.page).sort()).toEqual(
      [...STORY_9_SCENE_PAGE_IDS].sort(),
    );

    for (const entry of manifest) {
      expect(entry.path, entry.page).toBeTruthy();
      expect(entry.promptHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.referenceHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("calls images.edit 8 times and images.generate NEVER (no figure-free wash)", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock).toHaveBeenCalledTimes(STORY_9_SCENE_PAGE_IDS.length + 1); // 8
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("writes baby-*.png filenames, NOT the Story-1 fallback's page-*.png", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    const root = await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    // Every scene file is a baby-* slot — the Story-1 fallback would have written
    // page-1..page-12.png on the wrong (Saying-Goodbye) prompts.
    const sceneNames = manifest.slice(1).map((m) => m.page);
    expect(sceneNames.every((p) => p.startsWith("baby-"))).toBe(true);
    expect(sceneNames.some((p) => /^page-\d+$/.test(p))).toBe(false);

    const base = join(root, "generated", session.id);
    await expect(readFile(join(base, "baby-cover.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "baby-page-7.png"))).resolves.toBeTruthy();
  });

  it("the reference anchors on the photo; each scene anchors on [photo, reference]", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    // First call is the reference illustration (single photo, images.edit).
    const referenceCall = editMock.mock.calls[0][0];
    expect(referenceCall.model).toBe(IMAGE_MODEL);
    expect(referenceCall.size).toBe("1024x1024");
    expect(referenceCall.n).toBe(1);

    // The 7 scene calls each pass two reference images (photo + reference illustration).
    const sceneCalls = editMock.mock.calls.slice(1);
    expect(sceneCalls).toHaveLength(7);
    for (const [args] of sceneCalls) {
      expect(Array.isArray(args.image)).toBe(true);
      expect(args.image).toHaveLength(2);
    }
  });

  it("writes the reference + each scene into ./generated/[session-id]/", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    const root = await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    const base = join(root, "generated", session.id);
    for (const entry of manifest) {
      expect(entry.path.startsWith(base), entry.path).toBe(true);
    }
    await expect(readFile(join(base, "reference.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "baby-cover.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "baby-page-2.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "baby-page-7.png"))).resolves.toBeTruthy();
  });

  it("re-run with the persisted manifest is a pure cache hit (no new calls)", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);
    expect(editMock).toHaveBeenCalledTimes(8);

    editMock.mockClear();
    generateMock.mockClear();
    const warm: StorySession = { ...session, images: manifest };
    const reManifest = await generateAllIllustrations(warm);

    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(reManifest).toHaveLength(manifest.length);
  });

  it("rejects an unsafe Story-9 session id before any generation", async () => {
    mockBothReturnImage();
    const session: StorySession = { ...biscuit9AsSession(), id: "../../etc/evil" };
    await withTempCwd(biscuit9AsSession());
    await expect(generateAllIllustrations(session)).rejects.toThrow(/unsafe session id/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Story-9 quality default — every image defaults to "low"
// ---------------------------------------------------------------------------

describe("Story-9 image quality default", () => {
  it("defaults every Story-9 image call to low quality", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    for (const [args] of editMock.mock.calls) {
      expect(args.quality).toBe("low");
    }
  });

  it("honors an explicit sceneQuality override (proves low is a default, not a hardcode)", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { sceneQuality: "medium" });

    // Scenes (calls 1..7) are medium; the reference stays low (referenceQuality default).
    const sceneCalls = editMock.mock.calls.slice(1);
    for (const [args] of sceneCalls) {
      expect(args.quality).toBe("medium");
    }
  });
});

// ---------------------------------------------------------------------------
// Story-1 unaffected by the Story-9 dispatch (the regression guard)
// ---------------------------------------------------------------------------

describe("Story-1 generation is unaffected by the Story-9 dispatch", () => {
  it("a Story-1 session still produces reference + 13 scenes (14) via images.edit only", async () => {
    mockBothReturnImage();
    const session = otisSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    expect(manifest).toHaveLength(SCENE_PAGE_IDS.length + 1);
    expect(manifest[0].page).toBe("reference");
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock).toHaveBeenCalledTimes(SCENE_PAGE_IDS.length + 1);
  });
});

// ---------------------------------------------------------------------------
// manifestToImageMap — admits the 7 baby-* slots, excludes reference + back-cover
// ---------------------------------------------------------------------------

describe("manifestToImageMap — Story-9 slots", () => {
  async function seedFile(root: string, name: string, bytes: Buffer): Promise<string> {
    const dir = join(root, "generated", "test-biscuit-9");
    await mkdir(dir, { recursive: true });
    const p = join(dir, name);
    await writeFile(p, bytes);
    return p;
  }

  it("maps all 7 baby-* page slots to data URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s9map-"));
    createdDirs.push(root);

    const manifest = [];
    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      const p = await seedFile(root, `${slot}.png`, Buffer.from([1, 2, 3]));
      manifest.push({ page: slot, path: p, promptHash: "p", referenceHash: "r" });
    }

    const map = await manifestToImageMap(manifest);
    for (const slot of STORY_9_SCENE_PAGE_IDS) {
      expect(map[slot], slot).toBe(
        `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`,
      );
    }
  });

  it("excludes the reference anchor and the writing-only baby-back-cover", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s9map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "baby-cover.png", Buffer.from([1]));
    const refPath = await seedFile(root, "reference.png", Buffer.from([9]));
    const backPath = await seedFile(root, "baby-back-cover.png", Buffer.from([7]));

    const map = await manifestToImageMap([
      { page: "baby-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "reference", path: refPath, promptHash: "p", referenceHash: "r" },
      { page: "baby-back-cover", path: backPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["baby-cover"]).toBeTruthy();
    expect(map).not.toHaveProperty("reference");
    expect(map).not.toHaveProperty("baby-back-cover");
  });
});

// ---------------------------------------------------------------------------
// regenerateSceneIllustration — Story-9 single-slot repaint
// ---------------------------------------------------------------------------

describe("regenerateSceneIllustration — Story-9 slots", () => {
  /** Seed a reference.png on disk so the single-slot repaint can reuse it. */
  async function seedReference(root: string, id: string): Promise<string> {
    const dir = join(root, "generated", id);
    await mkdir(dir, { recursive: true });
    const p = join(dir, "reference.png");
    await writeFile(p, FAKE_PNG);
    return p;
  }

  it("regenerates a scene via images.edit, reusing the on-disk reference", async () => {
    mockBothReturnImage();
    const session = biscuit9AsSession();
    const root = await withTempCwd(session);
    const refPath = await seedReference(root, session.id);
    session.images = [{ page: "reference", path: refPath, promptHash: "p", referenceHash: "r" }];

    const entry = await regenerateSceneIllustration(session, "baby-page-3");

    expect(entry.page).toBe("baby-page-3");
    // Reference-anchored: images.edit with two refs (photo + reference), never generate.
    expect(editMock).toHaveBeenCalledTimes(1);
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock.mock.calls[0][0].image).toHaveLength(2);
    expect(editMock.mock.calls[0][0].quality).toBe("low");
  });

  it("rejects a non-illustrated Story-9 page (the back-cover)", async () => {
    mockBothReturnImage();
    const session = story9As({});
    await withTempCwd(session);

    await expect(
      regenerateSceneIllustration(session, "baby-back-cover"),
    ).rejects.toThrow(/not an illustrated scene/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});
