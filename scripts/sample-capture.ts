// THROWAWAY capture script for the storefront sample sets (feature
// "story-samples-00-photos-and-harness", deliverable 4) — the piece that produces
// the COMMITTED web assets from a completed scripts/sample-run.ts run.
//
// This is also what makes the committed preview.pdf SLIM: it downscales the
// full-res PNGs to web JPGs first, then renders the preview PDF from THOSE
// (~2-4 MB), instead of embedding the multi-MB PNGs (Story 1's existing 31 MB PDF
// was rendered from full-res and is left as-is).
//
// What it does, given `--id <fixture-id>` (reads ./generated/<id>/ + the manifest
// persisted there by sample-run.ts) and `--out <productId>` (the
// public/samples/<productId>/ target dir):
//   1. For each ILLUSTRATED manifest entry, `sips`-downscale the PNG → a web JPG
//      (~1000px long edge, quality ~80) named by SLOT id (<slotId>.jpg). No new
//      npm dependency — macOS-native `sips`, exactly as Story 1's capture did.
//   2. Build a PageImageMap from the DOWNSCALED web JPGs and render a slim web-res
//      preview.pdf via the same renderStoryPdf the app uses.
//   3. Copy the web JPGs + preview.pdf into public/samples/<productId>/.
//
// THE SCRIPT IS THROWAWAY (run once per title after sample-run.ts, then deletable
// — like scripts/story1-high-run.ts / scripts/story8-prototype.ts). It REUSES the
// real renderStoryPdf + manifestToImageMap's slot allow-list so the committed
// preview matches the app's layout exactly. It is $0 (no API calls — pure
// downscale + render of already-generated images).
//
// Run it (after a paid `npm run proto:sample fixtures/<story>-sample.json`):
//   tsx --tsconfig scripts/tsconfig.json scripts/sample-capture.ts \
//     --id <fixture-id> --out <productId>

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { renderStoryPdf } from "@/lib/pdf/render";
import { getStory } from "@/lib/story/registry";
import type { PageImageMap } from "@/lib/pdf/template";
import type { PageId } from "@/lib/story/master-text";
import type { GeneratedImage, StorySession, StoryType } from "@/lib/session/types";

/** Long-edge cap (px) + JPEG quality for the downscaled web gallery JPGs. */
const WEB_LONG_EDGE = 1000;
const WEB_JPEG_QUALITY = 80;

/** All StoryTypes whose illustration slots are eligible for the web map. */
const STORY_TYPES: readonly StoryType[] = [
  "story-1",
  "story-2",
  "story-4",
  "story-5",
  "story-6",
  "story-7",
  "story-8",
  "story-9",
];

/** Parse `--id <x> --out <y>` from argv. */
function parseArgs(): { id: string; out: string } {
  const argv = process.argv.slice(2);
  let id: string | undefined;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--id") id = argv[(i += 1)];
    else if (argv[i] === "--out") out = argv[(i += 1)];
  }
  if (!id || !out) {
    throw new Error(
      "usage: tsx --tsconfig scripts/tsconfig.json scripts/sample-capture.ts " +
        "--id <fixture-id> --out <productId>",
    );
  }
  return { id, out };
}

/**
 * The set of illustration slot ids that map into the rendered book — the union of
 * every product's `illustrationSlots` (mirrors manifestToImageMap's allow-list, so
 * the anchor `reference` and writing-only back-covers are excluded), plus Story 8's
 * two reuse pages, which carry a manifest entry but are not generation slots.
 */
function illustratedSlotIds(): Set<string> {
  const slots = new Set<string>(["adventure-home", "adventure-closing"]);
  for (const storyType of STORY_TYPES) {
    for (const slot of getStory(storyType).illustrationSlots) {
      slots.add(slot);
    }
  }
  return slots;
}

/** Downscale a PNG → web JPG with macOS `sips` (no new npm dependency). */
function sipsToWebJpg(srcPng: string, destJpg: string): void {
  execFileSync("sips", [
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    String(WEB_JPEG_QUALITY),
    "-Z",
    String(WEB_LONG_EDGE),
    srcPng,
    "--out",
    destJpg,
  ]);
}

async function run(): Promise<void> {
  const log = (line: string) => console.log(line);
  const { id, out } = parseArgs();

  const genDir = path.join(process.cwd(), "generated", id);
  const sessionJsonPath = path.join(genDir, "session.json");
  if (!existsSync(sessionJsonPath)) {
    throw new Error(
      `No completed run for id "${id}" — ${path.relative(process.cwd(), sessionJsonPath)} ` +
        `not found. Run \`npm run proto:sample fixtures/<story>-sample.json\` first.`,
    );
  }

  const session = JSON.parse(await readFile(sessionJsonPath, "utf8")) as StorySession;
  const manifest = (session.images ?? []) as GeneratedImage[];
  const allow = illustratedSlotIds();
  const illustrated = manifest.filter((entry) => allow.has(entry.page));
  log(`Loaded run "${id}" (storyType=${session.storyType ?? "story-1"}, ${illustrated.length} illustrated slots).`);

  const outDir = path.join(process.cwd(), "public", "samples", out);
  await mkdir(outDir, { recursive: true });

  // 1. Downscale each illustrated PNG → web JPG named by slot id, into outDir.
  //    Build the web PageImageMap from those downscaled JPGs (inlined as data
  //    URLs, the form the renderer needs — render.ts makes no asset requests).
  const webMap: PageImageMap = {};
  for (const entry of illustrated) {
    const destJpg = path.join(outDir, `${entry.page}.jpg`);
    sipsToWebJpg(entry.path, destJpg);
    const bytes = await readFile(destJpg);
    webMap[entry.page as PageId] = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    log(`  ${entry.page}  →  ${path.relative(process.cwd(), destJpg)} (${bytes.length} bytes)`);
  }

  // 2. Render the SLIM preview PDF from the DOWNSCALED web JPGs (not full-res).
  log(`Rendering slim preview PDF from ${Object.keys(webMap).length} web JPGs…`);
  const pdf = await renderStoryPdf(session, webMap);
  const pdfPath = path.join(outDir, "preview.pdf");
  await writeFile(pdfPath, pdf);

  // 3. Downscale the ORIGINAL input photo → source-photo.jpg, the storefront's
  //    "the photo we started from" proof (surfaced via Product.sourcePhoto?).
  //    The reference lives at session.pet.photo (a path under ./uploads).
  const srcPhoto = session.pet.photo;
  const srcPhotoPath = path.isAbsolute(srcPhoto)
    ? srcPhoto
    : path.join(process.cwd(), srcPhoto);
  if (existsSync(srcPhotoPath)) {
    const sourceJpg = path.join(outDir, "source-photo.jpg");
    sipsToWebJpg(srcPhotoPath, sourceJpg);
    const bytes = await readFile(sourceJpg);
    log(`  source photo  →  ${path.relative(process.cwd(), sourceJpg)} (${bytes.length} bytes)`);
  } else {
    log(`  (skipped source photo — ${srcPhoto} not found on disk)`);
  }

  log("");
  log(`Done. Committed assets under public/samples/${out}/:`);
  log(`  ${illustrated.length} web JPGs + preview.pdf (${pdf.length} bytes) + source-photo.jpg.`);
  log(`Next: wire \`sampleImages\` + \`previewPdf\` + \`sourcePhoto\` for this product in lib/catalog/products.ts.`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`sample-capture failed: ${message}`);
    process.exit(1);
  }
}

void main();
