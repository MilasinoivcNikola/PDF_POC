"use client";

// Client-side pet-photo downscale, run inside the wizard uploader after the
// existing validation and before the POST to /api/upload. A 2400×1600 phone
// photo is far more than gpt-image-2 needs to anchor the pet, and the photo is
// re-sent as a reference on every illustration call (1 reference + 13 scenes),
// so shrinking it once here cuts input-image tokens, cost, and upload size for
// every downstream call. Zero new dependencies: it uses the browser's native
// <canvas> via createImageBitmap (no `sharp`, no library).
//
// Determinism matters: the AI cache (lib/ai/cache.ts → hashReferenceSet) keys on
// the photo bytes, so the same input + params must yield the same output bytes.
// The target dimensions are computed by integer math (targetDimensions, the pure
// testable seam below), the JPEG quality is fixed, and no time/random input is
// used — so re-running an identical book stays a cache hit after the one
// expected key shift (smaller bytes → new hash → one miss → regenerate once).
//
// targetDimensions is the unit-test seam (pure long-edge → target-size math),
// mirroring how lib/ai/client.ts keeps extensionToMime testable apart from the
// IO in imageToDataUrl. The canvas/ImageBitmap work below is the un-pure part.

/** Cap the longest edge at this many pixels. */
export const MAX_EDGE = 1024;
/** Fixed JPEG quality for the re-encode (kept constant for determinism). */
export const JPEG_QUALITY = 0.85;

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Compute the target dimensions for a downscale that caps the longest edge at
 * `maxEdge` while preserving aspect ratio exactly. Pure integer math, no DOM —
 * this is the unit-test seam.
 *
 * - Never upscales: if the longest edge is already ≤ maxEdge, the dimensions are
 *   returned unchanged so an already-small photo is not re-encoded.
 * - The non-longest edge is scaled by the same integer-rounded factor and floored
 *   to at least 1px, so a panorama can't collapse to a 0px edge.
 */
export function targetDimensions(
  source: Dimensions,
  maxEdge: number = MAX_EDGE,
): Dimensions {
  const { width, height } = source;
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Downscale a user-selected image File so its longest edge is ≤ MAX_EDGE,
 * preserving aspect ratio, and return a JPEG File to upload. If the image is
 * already within the cap, the original File is returned untouched (no re-encode,
 * no quality loss). Throws on a decode/encode failure so the caller can fall
 * back to uploading the original.
 *
 * Re-encodes to JPEG: photos don't need PNG/WebP transparency here, and a fixed
 * encoder + quality keeps the output deterministic for the cache hash.
 */
export async function downscaleImage(
  file: File,
  maxEdge: number = MAX_EDGE,
): Promise<File> {
  // createImageBitmap honors EXIF orientation by default (imageOrientation:
  // "from-image"), so the canvas path does not visibly rotate phone photos.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const target = targetDimensions(
      { width: bitmap.width, height: bitmap.height },
      maxEdge,
    );

    // Already within the cap (after orientation): keep the original bytes.
    if (target.width === bitmap.width && target.height === bitmap.height) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas_unsupported");
    }
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) {
      throw new Error("encode_failed");
    }

    return new File([blob], downscaledName(file.name), { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

/**
 * Derive the re-encoded file's name: swap any extension for `.jpg` (we always
 * emit JPEG), keeping the original stem for a recognizable preview label.
 */
export function downscaledName(name: string): string {
  const stem = name.replace(/\.[^./\\]+$/, "");
  return `${stem || "photo"}.jpg`;
}
