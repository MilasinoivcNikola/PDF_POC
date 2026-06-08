// Illustration caching keyed by hash(prompt + reference-image set).
//
// The cost rule (coding-standards: "cache by hash(prompt + reference images);
// regenerating one page must re-call the API for that page only") and feature
// 10's "regenerate this illustration" both rest on this. The GeneratedImage
// manifest (feature 02) already carries `promptHash` + `referenceHash`, so a
// cache hit is a pure lookup: same prompt hash + same reference hash + a file
// still on disk ⇒ skip the paid API call and reuse the saved PNG.
//
// The hashing helpers are PURE (a synchronous crypto digest over in-memory
// strings/buffers, no IO) so they unit-test without mocks and produce a stable
// key for the same inputs. Only `findCachedImage` touches the filesystem (to
// confirm the previously-saved file still exists).

import { createHash } from "node:crypto";
import type { GeneratedImage } from "@/lib/session/types";

/** Hash of a scene/reference prompt string (cache key part 1). */
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}

/**
 * Hash of the ordered set of reference-image bytes (cache key part 2). Order is
 * significant — Approach B accumulates prior scenes, so [photo, reference] and
 * [photo, reference, page-2] are different reference sets and must hash apart.
 * A length-prefix per buffer prevents boundary ambiguity between adjacent
 * images. An empty set (Approach C with no photo, never reached in practice)
 * still yields a stable digest.
 */
export function hashReferenceSet(references: readonly Buffer[]): string {
  const hash = createHash("sha256");
  for (const ref of references) {
    // Length-prefix so concatenation is unambiguous (no two different sets can
    // collide by re-segmenting the same byte stream).
    hash.update(`${ref.length}:`);
    hash.update(ref);
  }
  return hash.digest("hex");
}

/**
 * Look up a previously-generated image in the session manifest. A hit requires
 * the same page slot, the same prompt hash AND the same reference hash, and the
 * file still present on disk — so a stale manifest entry whose file was deleted
 * correctly misses and triggers regeneration. Returns the manifest entry on a
 * hit, or `null` to signal "must generate".
 */
export async function findCachedImage(
  manifest: readonly GeneratedImage[],
  page: string,
  promptHash: string,
  referenceHash: string,
): Promise<GeneratedImage | null> {
  const entry = manifest.find(
    (image) =>
      image.page === page &&
      image.promptHash === promptHash &&
      image.referenceHash === referenceHash,
  );
  if (!entry) {
    return null;
  }
  const fs = await import("node:fs/promises");
  try {
    await fs.access(entry.path);
  } catch {
    // Manifest entry is stale — the file was removed. Treat as a miss.
    return null;
  }
  return entry;
}
