import { describe, it, expect, afterEach, afterAll } from "vitest";
import { join } from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { extensionToMime, imageToDataUrl } from "./client";

// Pure-ish IO helpers for Craft Area 2. `getOpenAI` (which constructs the real
// SDK client) and `photoToFile` (which produces an SDK `Uploadable`) are left to
// the mocked generate.test.ts / manual qa — the unit-testable surface here is the
// extension→MIME mapping and the base64 data-URL encoding, neither of which
// touches the network.

// ---------------------------------------------------------------------------
// extensionToMime — extension → image MIME subtype
// ---------------------------------------------------------------------------

describe("extensionToMime", () => {
  it("normalizes jpg to jpeg", () => {
    expect(extensionToMime("jpg")).toBe("jpeg");
  });

  it("passes png through unchanged", () => {
    expect(extensionToMime("png")).toBe("png");
  });

  it("passes webp through unchanged", () => {
    expect(extensionToMime("webp")).toBe("webp");
  });

  it("is case-insensitive — uppercase JPG still maps to jpeg", () => {
    expect(extensionToMime("JPG")).toBe("jpeg");
    expect(extensionToMime("PNG")).toBe("png");
  });
});

// ---------------------------------------------------------------------------
// imageToDataUrl — read a file, base64-encode it into a data: URL
//
// Each test writes a tiny fixture into a throwaway temp dir and removes the whole
// dir afterward, so the repo's ./uploads and working tree are never touched.
// ---------------------------------------------------------------------------

describe("imageToDataUrl", () => {
  const createdDirs: string[] = [];

  async function writeFixture(name: string, bytes: Buffer): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "qk-img-"));
    createdDirs.push(dir);
    const filePath = join(dir, name);
    await writeFile(filePath, bytes);
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

  it("produces a data:image/jpeg URL for a .jpg file", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const filePath = await writeFixture("photo.jpg", bytes);

    const url = await imageToDataUrl(filePath);

    // jpg is normalized to jpeg in the MIME, not the extension.
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("uses the png MIME for a .png file", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const filePath = await writeFixture("photo.png", bytes);

    const url = await imageToDataUrl(filePath);

    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("uses the webp MIME for a .webp file", async () => {
    const bytes = Buffer.from([0x52, 0x49, 0x46, 0x46]);
    const filePath = await writeFixture("photo.webp", bytes);

    const url = await imageToDataUrl(filePath);

    expect(url.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("round-trips the original bytes through the base64 payload", async () => {
    // A few arbitrary bytes including non-ASCII so a bad encoding would show.
    const bytes = Buffer.from([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff, 0x42]);
    const filePath = await writeFixture("photo.png", bytes);

    const url = await imageToDataUrl(filePath);
    const base64 = url.slice("data:image/png;base64,".length);
    const decoded = Buffer.from(base64, "base64");

    expect(decoded.equals(bytes)).toBe(true);
  });
});
