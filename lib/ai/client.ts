// OpenAI client setup for Craft Area 2 (AI illustration).
//
// Auth: OPENAI_API_KEY is read from the environment (.env.local in dev). The
// official `openai` SDK reads `process.env.OPENAI_API_KEY` itself when no
// `apiKey` is passed, but we surface a clear error here rather than letting the
// SDK throw deep in a request so the failure mode during a generation run is
// readable. The key is never logged or returned anywhere.
//
// API-surface note (verified against openai@6.42.0 TypeScript types,
// node_modules/openai/resources/images.d.ts):
//   - Reference-image generation goes through `images.edit`, NOT
//     `images.generate`. `edit` accepts `image: Uploadable | Array<Uploadable>`
//     ("up to 16 images" for gpt-image-2). The plan's sketch
//     (`images.generate({ reference_images })`) predates the current API — there
//     is no `reference_images` param on either method in this SDK.
//   - `Uploadable` is `File | Response | FsReadStream | BunFile`; `toFile(...)`
//     turns a Buffer into a `File`. That is how we pass a local photo as a
//     reference (see lib/ai/generate.ts), so callers building the API request
//     use `photoToFile`, not the data-URL helper below.
//
// `imageToDataUrl` is kept as a pure, testable helper (base64 data URL with the
// correct MIME) per the feature spec: it is handy for previewing an image in the
// browser and is the unit-test seam for the extension→MIME mapping.

import OpenAI, { toFile } from "openai";
import type { Uploadable } from "openai";

/** Lazily-constructed singleton so importing this module has no side effects. */
let cached: OpenAI | null = null;

/**
 * The shared OpenAI client. Throws a readable error if the key is missing so a
 * generation run fails clearly instead of inside the SDK. The key itself is read
 * from `process.env.OPENAI_API_KEY` and never logged.
 */
export function getOpenAI(): OpenAI {
  if (cached) {
    return cached;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local (see .env.local.example).",
    );
  }
  cached = new OpenAI({ apiKey });
  return cached;
}

/**
 * Map a file extension to its image MIME subtype (`jpg`/`jpeg` → `jpeg`, `png`,
 * `webp`). An unknown or empty extension (e.g. an extensionless path) falls back
 * to `png` so the helper never emits a malformed `image/` subtype when feature 07
 * passes paths beyond the upload allowlist.
 */
export function extensionToMime(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") {
    return "jpeg";
  }
  if (ext === "png" || ext === "webp") {
    return ext;
  }
  return "png";
}

/**
 * Read a local image file and return it as a base64 `data:` URL with the correct
 * MIME type (`jpg` is normalized to `jpeg`). Pure-ish IO helper — no network, no
 * SDK — kept testable on a tiny fixture. Used for in-browser preview; the actual
 * API call uses `photoToFile` (the SDK wants an `Uploadable`, not a data URL).
 */
export async function imageToDataUrl(filePath: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = extensionToMime(ext);
  return `data:image/${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Read a local image file and wrap it as an SDK `Uploadable` (a `File`), the form
 * `images.edit({ image })` expects for reference images. The MIME type is derived
 * from the extension (jpg → jpeg) so the API receives a valid content type.
 */
export async function photoToFile(filePath: string): Promise<Uploadable> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const buffer = await fs.readFile(filePath);
  const name = path.basename(filePath);
  const mime = extensionToMime(path.extname(filePath).slice(1));
  return toFile(buffer, name, { type: `image/${mime}` });
}
