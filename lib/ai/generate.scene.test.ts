import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { otisSession } from "@/lib/story/fixtures";
import type { StorySession } from "@/lib/session/types";

// Scene-pipeline tests for feature 07. Three surfaces under test, ALL with the
// OpenAI SDK mocked (no network, no credits):
//   1. generateSceneIllustration — the reference-cap guard (≤16) + b64 decode.
//   2. generateAllIllustrations — the orchestrator's manifest shape + caching.
//   3. manifestToImageMap — manifest → PageImageMap (data URLs, "reference" dropped).
//
// The orchestrator does real file IO (mkdir/writeFile/readFile) under
// ./generated/[session-id]. Following client.test.ts's convention, we run it
// against a THROWAWAY temp dir by spying process.cwd() — so only the OpenAI SDK
// is mocked, the fs path is exercised for real, and the repo's ./generated and
// ./uploads trees are never touched (the whole temp dir is removed afterward).

// ---------------------------------------------------------------------------
// Mock: OpenAI client + the SDK's toFile (used inside generateSceneIllustration)
// ---------------------------------------------------------------------------

const editMock = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  getOpenAI: () => ({ images: { edit: editMock } }),
  // photoToFile is used by generateReferenceIllustration; stub it so it does not
  // read the (temp) photo through the real SDK path.
  photoToFile: vi.fn(async () => "FAKE_UPLOADABLE"),
}));

// generateSceneIllustration does `const { toFile } = await import("openai")`.
vi.mock("openai", () => ({
  default: class {},
  toFile: vi.fn(async (buffer: Buffer, name: string) => ({ __file: name, bytes: buffer })),
}));

import {
  generateSceneIllustration,
  generateAllIllustrations,
  regenerateSceneIllustration,
  manifestToImageMap,
  MAX_REFERENCE_IMAGES,
  IMAGE_MODEL,
} from "./generate";
import { SCENE_PAGE_IDS } from "./prompts";

/** A short fake PNG payload the mocked API "returns" for every generation. */
const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

/** Make images.edit resolve to a fresh fake image each call. */
function mockEditReturnsImage(): void {
  editMock.mockResolvedValue({
    data: [{ b64_json: FAKE_PNG.toString("base64") }],
  });
}

// ---------------------------------------------------------------------------
// Temp-cwd harness — the orchestrator writes under <tmp>/generated/[id]
// ---------------------------------------------------------------------------

const createdDirs: string[] = [];
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

/**
 * Create a throwaway working dir, point process.cwd() at it, seed the session's
 * pet photo under <tmp>/uploads, and return the temp root. The orchestrator then
 * reads/writes entirely inside this dir.
 */
async function withTempCwd(session: StorySession): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "qk-gen-"));
  createdDirs.push(root);
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(root);
  // Seed the uploaded photo at <root>/<session.pet.photo> (the fixture's path is
  // "uploads/otis-by-the-window.jpg").
  const photoPath = join(root, session.pet.photo);
  await mkdir(join(photoPath, ".."), { recursive: true });
  await writeFile(photoPath, Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]));
  return root;
}

beforeEach(() => {
  editMock.mockReset();
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
// generateSceneIllustration — reference cap (≤16) and decode (no fs needed)
// ---------------------------------------------------------------------------

describe("generateSceneIllustration — reference cap", () => {
  function refs(n: number): Buffer[] {
    return Array.from({ length: n }, (_, i) => Buffer.from([i & 0xff]));
  }

  it("rejects an empty reference set", async () => {
    mockEditReturnsImage();
    await expect(generateSceneIllustration([], "prompt")).rejects.toThrow(
      /at least one reference image/i,
    );
    expect(editMock).not.toHaveBeenCalled();
  });

  it("accepts exactly MAX_REFERENCE_IMAGES (16) references", async () => {
    mockEditReturnsImage();
    expect(MAX_REFERENCE_IMAGES).toBe(16);
    const result = await generateSceneIllustration(refs(16), "prompt");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(editMock).toHaveBeenCalledTimes(1);
  });

  it("rejects 17 references (one over the cap) without calling the API", async () => {
    mockEditReturnsImage();
    await expect(generateSceneIllustration(refs(17), "prompt")).rejects.toThrow(
      /too many reference images/i,
    );
    expect(editMock).not.toHaveBeenCalled();
  });

  it("forwards the model, size, n, prompt, and default medium quality", async () => {
    mockEditReturnsImage();
    await generateSceneIllustration(refs(2), "a scene prompt");

    expect(editMock).toHaveBeenCalledTimes(1);
    const args = editMock.mock.calls[0][0];
    expect(args.model).toBe(IMAGE_MODEL);
    expect(args.size).toBe("1024x1024");
    expect(args.n).toBe(1);
    expect(args.prompt).toBe("a scene prompt");
    // Scenes default to "medium" (the real-book tier), unlike the reference's "low".
    expect(args.quality).toBe("medium");
    // One Uploadable per reference buffer was built.
    expect(Array.isArray(args.image)).toBe(true);
    expect(args.image).toHaveLength(2);
  });

  it("decodes the response b64_json into the original bytes", async () => {
    const original = Buffer.from([0x10, 0x20, 0x30, 0xfe, 0xff]);
    editMock.mockResolvedValue({ data: [{ b64_json: original.toString("base64") }] });

    const result = await generateSceneIllustration([Buffer.from([1])], "p");
    expect(result.equals(original)).toBe(true);
  });

  it("throws a readable error when the response carries no image data", async () => {
    editMock.mockResolvedValue({ data: [{}] });
    await expect(
      generateSceneIllustration([Buffer.from([1])], "p"),
    ).rejects.toThrow(/no image data/i);
  });
});

// ---------------------------------------------------------------------------
// generateAllIllustrations — manifest shape (OpenAI mocked, real temp fs)
// ---------------------------------------------------------------------------

describe("generateAllIllustrations — manifest shape", () => {
  /** Filter the recorded images.edit calls down to the scene calls (array image). */
  function sceneCalls(): { image: unknown[]; quality: string; prompt: string }[] {
    return editMock.mock.calls
      .map((c) => c[0])
      .filter((args) => Array.isArray(args.image));
  }

  it("returns reference + one entry per scene page, each with path + both hashes", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    // reference + 13 scene pages = 14 manifest entries.
    expect(manifest).toHaveLength(SCENE_PAGE_IDS.length + 1);

    const pages = manifest.map((m) => m.page);
    expect(pages[0]).toBe("reference");
    expect(pages.slice(1).sort()).toEqual([...SCENE_PAGE_IDS].sort());

    for (const entry of manifest) {
      expect(entry.path, entry.page).toBeTruthy();
      expect(entry.promptHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.referenceHash, entry.page).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("calls the API once per produced image (reference + 13 scenes) on a cold run", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    await generateAllIllustrations(session);

    // 1 reference generation + 13 scene generations.
    expect(editMock).toHaveBeenCalledTimes(SCENE_PAGE_IDS.length + 1);
  });

  it("writes each image into ./generated/[session-id]/ and the files exist", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    const root = await withTempCwd(session);

    const manifest = await generateAllIllustrations(session);

    const base = join(root, "generated", session.id);
    for (const entry of manifest) {
      expect(entry.path.startsWith(base), entry.path).toBe(true);
    }
    // reference.png + cover.png … page-12.png were written.
    await expect(readFile(join(base, "reference.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "cover.png"))).resolves.toBeTruthy();
    await expect(readFile(join(base, "page-12.png"))).resolves.toBeTruthy();
  });

  it("Approach C uses photo-only references (one Uploadable per scene call)", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { approach: "C" });

    const calls = sceneCalls();
    expect(calls).toHaveLength(SCENE_PAGE_IDS.length);
    for (const args of calls) {
      expect(args.image).toHaveLength(1); // photo only
    }
  });

  it("Approach A passes [photo, reference] (two refs) to each scene call", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { approach: "A" });

    const calls = sceneCalls();
    expect(calls).toHaveLength(SCENE_PAGE_IDS.length);
    for (const args of calls) {
      expect(args.image).toHaveLength(2); // photo + reference
    }
  });

  it("Approach B accumulates references and never exceeds the 16-image cap", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { approach: "B" });

    const calls = sceneCalls();
    expect(calls).toHaveLength(SCENE_PAGE_IDS.length);
    // First scene: photo + reference + 0 prior = 2. Later scenes grow, capped at 16.
    expect(calls[0].image).toHaveLength(2);
    for (const args of calls) {
      expect(args.image.length).toBeLessThanOrEqual(MAX_REFERENCE_IMAGES);
    }
    // By the last scene, prior scenes have accumulated beyond the base two.
    expect(calls[calls.length - 1].image.length).toBeGreaterThan(2);
  });

  it("skips the API for pages already cached (idempotent re-run)", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    // Cold run produces the full manifest and writes all PNGs.
    const manifest = await generateAllIllustrations(session);
    expect(editMock).toHaveBeenCalledTimes(SCENE_PAGE_IDS.length + 1);

    // Re-run with the produced manifest persisted onto the session: every page is
    // a cache hit (same prompt + reference hash + file on disk) ⇒ no new calls.
    editMock.mockClear();
    const warmSession: StorySession = { ...session, images: manifest };
    const reManifest = await generateAllIllustrations(warmSession);

    expect(editMock).not.toHaveBeenCalled();
    expect(reManifest).toHaveLength(manifest.length);
  });

  it("rejects an unsafe session id before any generation", async () => {
    mockEditReturnsImage();
    const session: StorySession = { ...otisSession(), id: "../../etc/evil" };
    await withTempCwd(otisSession());
    await expect(generateAllIllustrations(session)).rejects.toThrow(/unsafe session id/i);
    expect(editMock).not.toHaveBeenCalled();
  });

  it("rejects a photo path that escapes ./uploads", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);
    session.pet = { ...session.pet, photo: "../../../etc/passwd" };
    await expect(generateAllIllustrations(session)).rejects.toThrow(/outside .*uploads/i);
    expect(editMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Scene quality default (feature 13) — the production path defaults to "low"
// ---------------------------------------------------------------------------

// Regression guard so the scene tier can't silently drift back to "medium".
// The quality argument is asserted where it actually reaches the OpenAI image
// call: images.edit's `quality`, on the scene calls (array `image`). All OpenAI
// calls are mocked — no network, no credits.

describe("scene quality default — feature 13", () => {
  /** The quality values seen on the scene-path images.edit calls (array image). */
  function sceneQualities(): string[] {
    return editMock.mock.calls
      .map((c) => c[0])
      .filter((args) => Array.isArray(args.image))
      .map((args) => args.quality);
  }

  it("generateAllIllustrations defaults every scene call to low quality", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    // No sceneQuality option ⇒ the production default must reach the API as "low".
    await generateAllIllustrations(session);

    const qualities = sceneQualities();
    expect(qualities).toHaveLength(SCENE_PAGE_IDS.length);
    for (const quality of qualities) {
      expect(quality).toBe("low");
    }
  });

  it("honors an explicit sceneQuality override (proves low is a default, not a hardcode)", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    await generateAllIllustrations(session, { sceneQuality: "medium" });

    const qualities = sceneQualities();
    expect(qualities).toHaveLength(SCENE_PAGE_IDS.length);
    for (const quality of qualities) {
      expect(quality).toBe("medium");
    }
  });

  it("regenerateSceneIllustration defaults the single-page repaint to low quality", async () => {
    mockEditReturnsImage();
    const session = otisSession();
    await withTempCwd(session);

    // Seed the reference + scenes on the temp disk so regenerate can read the
    // reference illustration and the photo back.
    const manifest = await generateAllIllustrations(session);
    editMock.mockClear();

    // No sceneQuality option ⇒ the repaint defaults to "low" so it matches the book.
    await regenerateSceneIllustration({ ...session, images: manifest }, "page-4");

    // Exactly one scene call (the repainted page) at "low".
    const qualities = sceneQualities();
    expect(qualities).toEqual(["low"]);
  });
});

// ---------------------------------------------------------------------------
// manifestToImageMap — manifest → PageImageMap (real temp files)
// ---------------------------------------------------------------------------

describe("manifestToImageMap", () => {
  async function seedFile(root: string, name: string, bytes: Buffer): Promise<string> {
    const dir = join(root, "generated", "test-otis");
    await mkdir(dir, { recursive: true });
    const p = join(dir, name);
    await writeFile(p, bytes);
    return p;
  }

  it("maps each scene page to a data:image/png URL and drops the reference", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "cover.png", Buffer.from([1, 2, 3]));
    const page4Path = await seedFile(root, "page-4.png", Buffer.from([4, 5, 6]));
    const refPath = await seedFile(root, "reference.png", Buffer.from([9, 9, 9]));

    const map = await manifestToImageMap([
      { page: "reference", path: refPath, promptHash: "p", referenceHash: "r" },
      { page: "cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "page-4", path: page4Path, promptHash: "p", referenceHash: "r" },
    ]);

    // The "reference" slot is the anchor, not a book page — excluded.
    expect(map).not.toHaveProperty("reference");
    expect(map.cover).toBe(`data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`);
    expect(map["page-4"]).toBe(`data:image/png;base64,${Buffer.from([4, 5, 6]).toString("base64")}`);
  });

  it("skips entries whose file is missing on disk (page falls back to placeholder)", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-map-"));
    createdDirs.push(root);

    const coverPath = await seedFile(root, "cover.png", Buffer.from([1, 2, 3]));
    const missingPath = join(root, "generated", "test-otis", "page-4.png"); // not written

    const map = await manifestToImageMap([
      { page: "cover", path: coverPath, promptHash: "p", referenceHash: "r" },
      { page: "page-4", path: missingPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map.cover).toBeTruthy();
    expect(map["page-4"]).toBeUndefined();
  });

  it("ignores manifest entries that are not illustrated scene pages", async () => {
    const root = await mkdtemp(join(tmpdir(), "qk-map-"));
    createdDirs.push(root);

    const backPath = await seedFile(root, "back-cover.png", Buffer.from([7, 7, 7]));

    const map = await manifestToImageMap([
      { page: "back-cover", path: backPath, promptHash: "p", referenceHash: "r" },
    ]);

    expect(map).not.toHaveProperty("back-cover");
    expect(Object.keys(map)).toHaveLength(0);
  });
});
