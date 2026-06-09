import { describe, it, expect } from "vitest";

import type { Dimensions } from "./downscaleImage";
import {
  JPEG_QUALITY,
  MAX_EDGE,
  downscaledName,
  targetDimensions,
} from "./downscaleImage";

// downscaleImage.ts splits the pure long-edge → target-size math (targetDimensions)
// and the filename derivation (downscaledName) from the un-pure canvas/ImageBitmap
// path (downscaleImage itself, which needs createImageBitmap / <canvas>.toBlob —
// browser APIs absent in the node Vitest env). We unit-test only the pure seams
// here, mirroring how lib/ai/client.ts unit-tests `extensionToMime` while leaving
// the IO in `imageToDataUrl` to a browser/manual check. The actual decode/encode/
// EXIF behavior of downscaleImage is verified in the qa (browser) step.

// ---------------------------------------------------------------------------
// constants — the determinism guard (same input + params → same bytes)
// ---------------------------------------------------------------------------

describe("downscale constants", () => {
  it("caps the longest edge at 1024px", () => {
    expect(MAX_EDGE).toBe(1024);
  });

  it("pins a fixed JPEG quality so the re-encode is deterministic", () => {
    expect(JPEG_QUALITY).toBe(0.85);
  });
});

// ---------------------------------------------------------------------------
// targetDimensions — the core integer dimension math
// ---------------------------------------------------------------------------

describe("targetDimensions", () => {
  it("passes a small landscape image through unchanged (no upscale)", () => {
    expect(targetDimensions({ width: 800, height: 600 })).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("passes the exact-1024 boundary through unchanged (≤ cap, not <)", () => {
    expect(targetDimensions({ width: 1024, height: 768 })).toEqual({
      width: 1024,
      height: 768,
    });
    // square exactly on the cap, both edges equal to maxEdge
    expect(targetDimensions({ width: 1024, height: 1024 })).toEqual({
      width: 1024,
      height: 1024,
    });
  });

  it("caps the long (width) edge of a landscape image and scales height", () => {
    // 1600 * (1024/2400) = 682.66… → Math.round → 683
    expect(targetDimensions({ width: 2400, height: 1600 })).toEqual({
      width: 1024,
      height: 683,
    });
  });

  it("caps the long (height) edge of a portrait image and scales width", () => {
    // mirror of the landscape case: 1600 * (1024/2400) = 683
    expect(targetDimensions({ width: 1600, height: 2400 })).toEqual({
      width: 683,
      height: 1024,
    });
  });

  it("caps a square image to maxEdge × maxEdge", () => {
    expect(targetDimensions({ width: 2048, height: 2048 })).toEqual({
      width: 1024,
      height: 1024,
    });
  });

  it("preserves the aspect ratio within rounding tolerance", () => {
    const ratios: Dimensions[] = [
      { width: 2400, height: 1600 }, // 3:2
      { width: 4000, height: 3000 }, // 4:3
      { width: 3000, height: 1500 }, // 2:1
    ];
    for (const source of ratios) {
      const out = targetDimensions(source);
      const sourceRatio = source.width / source.height;
      const outRatio = out.width / out.height;
      // integer rounding can nudge the ratio slightly; stay well inside 1%.
      expect(Math.abs(outRatio - sourceRatio)).toBeLessThan(sourceRatio * 0.01);
    }
  });

  it("never lets the output longest edge exceed the cap", () => {
    const oversized: Dimensions[] = [
      { width: 2400, height: 1600 },
      { width: 1600, height: 2400 },
      { width: 2048, height: 2048 },
      { width: 4032, height: 3024 }, // a typical phone photo
      { width: 5000, height: 2 },
    ];
    for (const source of oversized) {
      const out = targetDimensions(source);
      expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(MAX_EDGE);
    }
  });

  it("floors the short edge to ≥ 1px for an extreme panorama (never 0)", () => {
    // 2 * (1024/5000) = 0.4096 → Math.round → 0, must be floored to 1.
    expect(targetDimensions({ width: 5000, height: 2 })).toEqual({
      width: 1024,
      height: 1,
    });
  });

  it("honors a custom maxEdge argument", () => {
    // small image still passes through unchanged under a smaller cap…
    expect(targetDimensions({ width: 400, height: 300 }, 512)).toEqual({
      width: 400,
      height: 300,
    });
    // …and a large one caps to the custom edge: 2000 * (512/3000) = 341.33 → 341.
    expect(targetDimensions({ width: 3000, height: 2000 }, 512)).toEqual({
      width: 512,
      height: 341,
    });
  });
});

// ---------------------------------------------------------------------------
// downscaledName — always emit a `.jpg` name
// ---------------------------------------------------------------------------

describe("downscaledName", () => {
  it("swaps a single extension for .jpg", () => {
    expect(downscaledName("otis-by-the-window.png")).toBe(
      "otis-by-the-window.jpg",
    );
  });

  it("swaps only the final extension when the name has multiple dots", () => {
    expect(downscaledName("my.cat.photo.jpeg")).toBe("my.cat.photo.jpg");
  });

  it("appends .jpg to an extensionless name", () => {
    expect(downscaledName("photo")).toBe("photo.jpg");
  });

  it("falls back to `photo` when the stem strips to empty", () => {
    // ".jpg" → stem "" → `|| "photo"` fallback.
    expect(downscaledName(".jpg")).toBe("photo.jpg");
  });

  it("normalizes an already-.jpg name (idempotent)", () => {
    expect(downscaledName("snap.jpg")).toBe("snap.jpg");
  });
});
