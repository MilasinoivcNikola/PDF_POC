import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { murphySession5, story5SessionWith } from "@/lib/story/story5/fixtures";
import { murphySession } from "@/lib/story/story2/fixtures";
import { biscuitSession } from "@/lib/story/story4/fixtures";
import { otisSession } from "@/lib/story/fixtures";
import type { StorySession } from "@/lib/session/types";

// The orchestrator entry points (`generateAllIllustrations`,
// `regenerateSceneIllustration`) are typed against `StorySession` — that is what a
// session read off disk (`readSession`) is in the production routes; the
// `storyType: "story-5"` discriminant drives the dispatch and the orchestrator
// narrows to `Story5Session` internally (`session as unknown as Story5Session`),
// exactly as features 14/17 set up. So a Story-5 fixture reaches these functions AS
// a `StorySession`, just as it does in production. These helpers cast once at that
// boundary (the two types are not structurally assignable) so the test mirrors the
// real call site without scattering casts.
function murphy5AsSession(): StorySession {
  return murphySession5() as unknown as StorySession;
}
function story5As(
  overrides: Parameters<typeof story5SessionWith>[0],
): StorySession {
  return story5SessionWith(overrides) as unknown as StorySession;
}

// Story-5 imagery orchestration tests for feature 23. ALL with the OpenAI SDK
// mocked (no network, no credits). Story 5's imagery shape is IDENTICAL to Story
// 2's (NOT Story 4's): the cover portrait references the photo (images.edit) and
// the Page-5 belief wash is figure-free (images.generate) — so exactly one edit
// call + one generate call per book. Surfaces under test:
//   1. generateAllIllustrations dispatching to the Story-5 path — its slot list
//      comes from the registry per `storyType` (the two Premium slots), the
//      manifest shape, and the per-slot API method (cover → edit, wash → generate).
//   2. The default Low quality reaching both Story-5 image calls + an explicit
//      override (feature-13 regression-guard style).
//   3. Story-1 (14), Story-2 (2) and Story-4 (2) generation are unaffected.
//   4. manifestToImageMap admitting Story-5 slots while still excluding the
//      Story-1 "reference" anchor and the writing-only "back-cover".
//   5. regenerateStory5Slot via regenerateSceneIllustration — cover via edit, wash
//      via generate — and a non-slot page rejected.
//
// The orchestrator does real file IO under ./generated/[session-id]. Mirroring
// generate.story2/4.test.ts, we run it against a THROWAWAY temp dir by spying
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
import { NOTE_SCENE_PAGE_IDS } from "@/lib/story/story-5";
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
  const root = await mkdtemp(join(tmpdir(), "qk-s5-"));
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
// generateAllIllustrations — Story-5 dispatch: slot list from the registry
// ---------------------------------------------------------------------------

describe("generateAllIllustrations — Story-5 dispatch", () => {
  it("generates exactly the registry's 2 Story-5 slots, each with path + both hashes", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    // The slot list is sourced from the registry, NOT a hardcoded constant.
    expect(NOTE_SCENE_PAGE_IDS).toEqual(["note-cover", "note-page-5"]);
    expect(manifest).toHaveLength(NOTE_SCENE_PAGE_IDS.length);

    const pages = manifest.map((m) => m.page).sort();
    expect(pages).toEqual([...NOTE_SCENE_PAGE_IDS].sort());

    for (const entry of manifest) {
      expect(entry.path, entry.page).toBeTruthy();
      expect(entry.promptHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.referenceHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
    }
    // No Story-1 "reference" anchor slot in a Story-5 manifest.
    expect(pages).not.toContain("reference");
  });

  it("calls images.edit once (cover) and images.generate once (figure-free wash)", async () => {
    // Story 5 == Story 2's imagery shape: the cover anchors on the photo
    // (images.edit), the belief wash has no figure (images.generate). NOT Story 4's
    // both-reference-anchored shape.
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock).toHaveBeenCalledTimes(1); // cover portrait
    expect(generateMock).toHaveBeenCalledTimes(1); // belief wash
  });

  it("the cover passes the photo as a reference via images.edit; the wash passes none via images.generate", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    // Cover: images.edit, exactly one reference image (the uploaded photo).
    const editArgs = editMock.mock.calls[0][0];
    expect(editArgs.model).toBe(IMAGE_MODEL);
    expect(editArgs.size).toBe("1024x1024");
    expect(editArgs.n).toBe(1);
    expect(Array.isArray(editArgs.image)).toBe(true);
    expect(editArgs.image).toHaveLength(1);

    // Wash: images.generate, prompt-only — NO `image` field at all.
    const genArgs = generateMock.mock.calls[0][0];
    expect(genArgs.model).toBe(IMAGE_MODEL);
    expect(genArgs.size).toBe("1024x1024");
    expect(genArgs.n).toBe(1);
    expect(genArgs).not.toHaveProperty("image");
  });

  it("writes each slot into ./generated/[session-id]/ and the files exist", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    const root = await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    const base = join(root, "generated", session.id);
    for (const entry of manifest) {
      expect(entry.path.startsWith(base), entry.path).toBe(true);
    }
    await expect(readFile(join(base, "note-cover.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "note-page-5.png"))).resolves.toBeTruthy();
  });

  it("re-run with the persisted manifest is a pure cache hit (no new calls)", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
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

  it("rejects an unsafe Story-5 session id before any generation", async () => {
    mockBothReturnImage();
    const session: StorySession = { ...murphy5AsSession(), id: "../../etc/evil" };
    await withTempCwd(murphy5AsSession());
    await expect(generateAllIllustrations(session)).rejects.toThrow(/unsafe session id/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Story-5 quality default (feature 13 style) — both images default to "low"
// ---------------------------------------------------------------------------

describe("Story-5 image quality default", () => {
  it("defaults BOTH Story-5 image calls to low quality", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    expect(editMock.mock.calls[0][0].quality).toBe("low");
    expect(generateMock.mock.calls[0][0].quality).toBe("low");
  });

  it("honors an explicit sceneQuality override (proves low is a default, not a hardcode)", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { sceneQuality: "medium" });

    expect(editMock.mock.calls[0][0].quality).toBe("medium");
    expect(generateMock.mock.calls[0][0].quality).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// Story-1 / Story-2 / Story-4 unaffected by the Story-5 dispatch
// ---------------------------------------------------------------------------

describe("Story-1 / Story-2 / Story-4 generation are unaffected by the Story-5 dispatch", () => {
  it("a Story-1 session still produces reference + 13 scenes (14) via images.edit only", async () => {
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
    expect(editMock).toHaveBeenCalledTimes(1); // cover
    expect(generateMock).toHaveBeenCalledTimes(1); // belief wash
  });

  it("a Story-4 session still produces 2 slots, BOTH via images.edit (never generate)", async () => {
    mockBothReturnImage();
    const session = biscuitSession() as unknown as StorySession;
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    expect(manifest).toHaveLength(TALK_SCENE_PAGE_IDS.length);
    expect(manifest.map((m) => m.page).sort()).toEqual(
      [...TALK_SCENE_PAGE_IDS].sort(),
    );
    // Story 4's both-reference-anchored shape — never the figure-free path.
    expect(editMock).toHaveBeenCalledTimes(2);
    expect(generateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// manifestToImageMap — admits Story-5 slots, excludes reference + back-cover
// ---------------------------------------------------------------------------

describe("manifestToImageMap — Story-5 slots", () => {
  async function seedFile(root: string, name: string, bytes: Buffer): Promise<string> {
    const dir = join(root, "generated", "test-murphy-5");
    await mkdir(dir, { recursive: true });
    const p = join(dir, name);
    await writeFile(p, bytes);
    return p;
  }

  it("maps note-cover and note-page-5 to data URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s5map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "note-cover.png", Buffer.from([1, 2, 3]));
    const washPath = await seedFile(root, "note-page-5.png", Buffer.from([4, 5, 6]));

    const map = await manifestToImageMap([
      { page: "note-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "note-page-5", path: washPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["note-cover"]).toBe(
      `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`,
    );
    expect(map["note-page-5"]).toBe(
      `data:image/png;base64,${Buffer.from([4, 5, 6]).toString("base64")}`,
    );
  });

  it("still excludes the Story-1 reference anchor and the writing-only back-cover", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-s5map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "note-cover.png", Buffer.from([1]));
    const refPath = await seedFile(root, "reference.png", Buffer.from([9]));
    const backPath = await seedFile(root, "back-cover.png", Buffer.from([7]));

    const map = await manifestToImageMap([
      { page: "note-cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "reference", path: refPath, promptHash: "p", referenceHash: "r" },
      { page: "back-cover", path: backPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map["note-cover"]).toBeTruthy();
    expect(map).not.toHaveProperty("reference");
    expect(map).not.toHaveProperty("back-cover");
  });
});

// ---------------------------------------------------------------------------
// regenerateSceneIllustration — Story-5 single-slot repaint
// ---------------------------------------------------------------------------

describe("regenerateSceneIllustration — Story-5 slots", () => {
  it("regenerates the cover via images.edit (passes the photo reference)", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    const entry = await regenerateSceneIllustration(session, "note-cover");

    expect(entry.page).toBe("note-cover");
    // Bypasses the cache: always re-calls images.edit with one reference.
    expect(editMock).toHaveBeenCalledTimes(1);
    expect(generateMock).not.toHaveBeenCalled();
    expect(editMock.mock.calls[0][0].image).toHaveLength(1);
    expect(editMock.mock.calls[0][0].quality).toBe("low");
  });

  it("regenerates the belief wash via images.generate (figure-free, never edit)", async () => {
    // The headline contrast with Story 4: Story 5's Page-5 wash is photo-free, so
    // it regenerates via images.generate with no reference.
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    const entry = await regenerateSceneIllustration(session, "note-page-5");

    expect(entry.page).toBe("note-page-5");
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock.mock.calls[0][0]).not.toHaveProperty("image");
    expect(generateMock.mock.calls[0][0].quality).toBe("low");
  });

  it("the wash regenerate branches on the session's beliefFrame (secular → leash/bed prompt)", async () => {
    mockBothReturnImage();
    const session = story5As({ toggles: { beliefFrame: "secular" } });
    await withTempCwd(session);

    await regenerateSceneIllustration(session, "note-page-5");

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(generateMock.mock.calls[0][0].prompt.toLowerCase()).toMatch(/leash|bed/);
  });

  it("rejects a non-illustrated Story-5 page (e.g. note-page-2)", async () => {
    mockBothReturnImage();
    const session = murphy5AsSession();
    await withTempCwd(session);

    await expect(
      regenerateSceneIllustration(session, "note-page-2"),
    ).rejects.toThrow(/not an illustrated scene/i);
    expect(editMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });
});
