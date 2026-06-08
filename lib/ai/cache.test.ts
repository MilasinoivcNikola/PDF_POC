import { describe, it, expect, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { hashPrompt, hashReferenceSet, findCachedImage } from "./cache";
import type { GeneratedImage } from "@/lib/session/types";

// hashPrompt / hashReferenceSet are PURE crypto digests over in-memory data —
// asserted directly, no mocks. findCachedImage only touches the filesystem to
// confirm a previously-saved file still exists; we use throwaway temp files for
// that (matching client.test.ts's temp-dir pattern) rather than mocking fs, so
// the repo's ./generated tree is never touched.

// ---------------------------------------------------------------------------
// hashPrompt — stable digest of a prompt string
// ---------------------------------------------------------------------------

describe("hashPrompt", () => {
  it("is stable — the same prompt always hashes to the same value", () => {
    const prompt = "Children's-book scene of the same pet: Otis at the door.";
    expect(hashPrompt(prompt)).toBe(hashPrompt(prompt));
  });

  it("returns a sha256 hex digest (64 hex chars)", () => {
    expect(hashPrompt("anything")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when the prompt changes (even by one character)", () => {
    expect(hashPrompt("a watercolor scene")).not.toBe(
      hashPrompt("a watercolor scene."),
    );
  });

  it("distinguishes prompts that differ only by style phrasing", () => {
    expect(hashPrompt("soft watercolor style")).not.toBe(
      hashPrompt("soft pencil-sketch style"),
    );
  });
});

// ---------------------------------------------------------------------------
// hashReferenceSet — ordered, length-prefixed digest of reference bytes
// ---------------------------------------------------------------------------

describe("hashReferenceSet", () => {
  const photo = Buffer.from([0x01, 0x02, 0x03]);
  const reference = Buffer.from([0x10, 0x20, 0x30, 0x40]);
  const scene = Buffer.from([0xff, 0xfe]);

  it("is stable — the same ordered set always hashes the same", () => {
    const a = hashReferenceSet([photo, reference]);
    const b = hashReferenceSet([photo, reference]);
    expect(a).toBe(b);
  });

  it("is order-sensitive — reordering the buffers changes the hash", () => {
    // Approach B accumulates prior scenes, so [photo, reference] and the same
    // two reversed MUST hash apart.
    expect(hashReferenceSet([photo, reference])).not.toBe(
      hashReferenceSet([reference, photo]),
    );
  });

  it("changes when a reference is added (Approach A vs B reference set)", () => {
    expect(hashReferenceSet([photo, reference])).not.toBe(
      hashReferenceSet([photo, reference, scene]),
    );
  });

  it("returns a sha256 hex digest (64 hex chars)", () => {
    expect(hashReferenceSet([photo])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("yields a stable digest for an empty reference set", () => {
    expect(hashReferenceSet([])).toBe(hashReferenceSet([]));
    expect(hashReferenceSet([])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is collision-safe across re-segmentation (length-prefixing)", () => {
    // Without length-prefixing, [ab][c] and [a][bc] would concatenate to the
    // same byte stream and collide. The per-buffer length prefix prevents this.
    const ab = Buffer.from([0xaa, 0xbb]);
    const c = Buffer.from([0xcc]);
    const a = Buffer.from([0xaa]);
    const bc = Buffer.from([0xbb, 0xcc]);

    expect(hashReferenceSet([ab, c])).not.toBe(hashReferenceSet([a, bc]));
  });

  it("distinguishes same-total-length sets split differently", () => {
    // Another re-segmentation guard: three single bytes vs one three-byte buffer.
    const split = [Buffer.from([1]), Buffer.from([2]), Buffer.from([3])];
    const joined = [Buffer.from([1, 2, 3])];
    expect(hashReferenceSet(split)).not.toBe(hashReferenceSet(joined));
  });
});

// ---------------------------------------------------------------------------
// findCachedImage — hit only on page + both hashes + file present on disk
// ---------------------------------------------------------------------------

describe("findCachedImage", () => {
  const createdDirs: string[] = [];

  /** Write a real PNG-ish file into a throwaway dir; return its absolute path. */
  async function writeFixture(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "qk-cache-"));
    createdDirs.push(dir);
    const filePath = join(dir, "page.png");
    await writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    return filePath;
  }

  afterEach(async () => {
    await Promise.all(
      createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  afterAll(async () => {
    await Promise.all(
      createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("returns the manifest entry when page + both hashes match and the file exists", async () => {
    const path = await writeFixture();
    const entry: GeneratedImage = {
      page: "page-4",
      path,
      promptHash: "ph",
      referenceHash: "rh",
    };

    const hit = await findCachedImage([entry], "page-4", "ph", "rh");
    expect(hit).toBe(entry);
  });

  it("misses (null) when the page slot does not match", async () => {
    const path = await writeFixture();
    const entry: GeneratedImage = { page: "page-4", path, promptHash: "ph", referenceHash: "rh" };
    expect(await findCachedImage([entry], "page-5", "ph", "rh")).toBeNull();
  });

  it("misses (null) when the prompt hash differs (prompt changed)", async () => {
    const path = await writeFixture();
    const entry: GeneratedImage = { page: "page-4", path, promptHash: "ph", referenceHash: "rh" };
    expect(await findCachedImage([entry], "page-4", "DIFFERENT", "rh")).toBeNull();
  });

  it("misses (null) when the reference hash differs (reference set changed)", async () => {
    const path = await writeFixture();
    const entry: GeneratedImage = { page: "page-4", path, promptHash: "ph", referenceHash: "rh" };
    expect(await findCachedImage([entry], "page-4", "ph", "DIFFERENT")).toBeNull();
  });

  it("treats a missing on-disk file as a miss even when hashes match (stale manifest)", async () => {
    // Manifest points at a file that was never written / was deleted: must miss
    // and trigger regeneration, not return a hit to a nonexistent path.
    const entry: GeneratedImage = {
      page: "page-4",
      path: join(tmpdir(), "qk-cache-does-not-exist", "page.png"),
      promptHash: "ph",
      referenceHash: "rh",
    };
    expect(await findCachedImage([entry], "page-4", "ph", "rh")).toBeNull();
  });

  it("returns null for an empty manifest", async () => {
    expect(await findCachedImage([], "cover", "ph", "rh")).toBeNull();
  });
});
