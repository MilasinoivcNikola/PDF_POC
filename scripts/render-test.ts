// Milestone-1 CLI: render a Story-1 PDF from a JSON `StorySession` fixture with
// zero AI dependency, and write it to ./output/. This is the script that proves
// the whole craft-area-1 chain end to end:
//
//   fixtures/otis.json → JSON.parse → renderStoryPdf (resolve → HTML → Chrome)
//   → ./output/Saying-Goodbye-to-Otis.pdf
//
// Image slots are left empty: `renderStoryPdf` is called with an empty
// `PageImageMap`, so feature 04's template fills every illustration slot with its
// inline placeholder SVG. The pipeline therefore runs before feature 07 generates
// any real images. (Feature 07 will pass a populated map here instead.)
//
// Run it with the `render:test` npm script (tsx executes the TypeScript directly):
//   npm run render:test fixtures/otis.json

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderStoryPdf, storyPdfFilename } from "@/lib/pdf/render";
import type { StorySession } from "@/lib/session/types";

const OUTPUT_DIR = path.join(process.cwd(), "output");

/**
 * Read the fixture path from argv, render the PDF, and write it to ./output/.
 * Returns the absolute path written so the caller can print it. Any bad input
 * (missing arg, unreadable/invalid JSON) throws — `main` maps that to a clear
 * message and a non-zero exit.
 */
async function run(): Promise<string> {
  const inputArg = process.argv[2];
  if (!inputArg) {
    throw new Error(
      "usage: npm run render:test <session.json>  (e.g. fixtures/otis.json)",
    );
  }

  const inputPath = path.resolve(process.cwd(), inputArg);

  const { readFile } = await import("node:fs/promises");
  let raw: string;
  try {
    raw = await readFile(inputPath, "utf8");
  } catch {
    throw new Error(`could not read session file: ${inputPath}`);
  }

  let session: StorySession;
  try {
    session = JSON.parse(raw) as StorySession;
  } catch {
    throw new Error(`session file is not valid JSON: ${inputPath}`);
  }

  // Empty image map → every slot uses the template's inline placeholder SVG, so
  // the render needs no generated illustrations (feature 07).
  const pdf = await renderStoryPdf(session, {});

  const filename = storyPdfFilename(session.pet?.name ?? "");
  const outputPath = path.join(OUTPUT_DIR, filename);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(outputPath, pdf);

  return outputPath;
}

async function main(): Promise<void> {
  try {
    const outputPath = await run();
    console.log(`PDF written to ${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`render-test failed: ${message}`);
    process.exit(1);
  }
}

void main();
