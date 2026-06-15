// THROWAWAY run script for the Story-1 HIGH-fidelity sample set (feature
// "story1-high-sample-preview", deliverables 1-3).
//
// This script answers ONE need: generate the Story-1 book ONCE at the HIGH image
// tier (1 reference + 13 scenes) from the real boy-and-boxer photo, then render the
// full-book preview PDF — so the storefront's hero title can ship HIGH on-page
// samples + a downloadable preview WITHOUT ever paying for the run again. The PNGs
// + manifest land under ./generated/story1-high/ and the PDF under ./output/
// (both gitignored); deliverable 3 (sips downscale → public/samples/) is done
// separately, outside this script.
//
// THE SCRIPT IS THROWAWAY (it is the cost step, run once, then deletable — like
// scripts/story8-prototype.ts). It REUSES the real engine entry points verbatim
// (`generateAllIllustrations`, `manifestToImageMap`, `renderStoryPdf`) — the same
// path the app uses — so the rendered output is print-faithful and nothing here
// forks engine behavior.
//
// Cost: PAID. 14 HIGH images = 1 reference + 13 scenes ≈ ~$3 (see the feature
// spec's cost table). Approach A (the default), concurrency left at the default 3
// (do NOT raise it — this run is speed-irrelevant and the conservative cap protects
// pet consistency). Quality is NOT in the cache key, so the FRESH session id
// `story1-high` with an empty ./generated/story1-high/ is what guarantees 14 cache
// MISSES rather than silently re-serving cached Low PNGs.
//
// Run it (DO NOT run in routine builds — it calls the paid OpenAI API; this is the
// PM's manual one-time step):
//   npm run proto:story1-high

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import {
  generateAllIllustrations,
  manifestToImageMap,
} from "@/lib/ai/generate";
import { renderStoryPdf } from "@/lib/pdf/render";
import { storyPdfFilename } from "@/lib/pdf/filename";
import type { StorySession } from "@/lib/session/types";

/** The checked-in Story-1 fixture driving the HIGH run. */
const FIXTURE = path.join(process.cwd(), "fixtures", "story1-high.json");

/** Where the rendered preview PDF lands (gitignored working copy). */
const OUTPUT_DIR = path.join(process.cwd(), "output");

async function run(): Promise<void> {
  const log = (line: string) => console.log(line);

  // Load the fixture as a finalized Story-1 session.
  const session = JSON.parse(await readFile(FIXTURE, "utf8")) as StorySession;
  log(`Loaded fixture ${FIXTURE} (session id=${session.id}).`);
  log(
    "Generating 14 HIGH images (1 reference + 13 scenes), Approach A, concurrency 3…",
  );
  log("This is the PAID step and may take several minutes — be patient.");

  // 1. Generate every illustration at HIGH (both the reference + the scenes). The
  //    fresh session id + empty ./generated/story1-high/ → 14 cache MISSES.
  const manifest = await generateAllIllustrations(session, {
    sceneQuality: "high",
    referenceQuality: "high",
  });
  log(`Manifest produced: ${manifest.length} entries.`);
  for (const entry of manifest) {
    log(`  ${entry.page}  →  ${path.relative(process.cwd(), entry.path)}`);
  }

  // 2. Persist the manifest onto the session and render the preview PDF via the
  //    same app render path.
  session.images = [...manifest];
  const map = await manifestToImageMap(manifest);
  log(`Rendering preview PDF (${Object.keys(map).length} illustrated pages)…`);
  const pdf = await renderStoryPdf(session, map);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const pdfName = storyPdfFilename(session.pet.name);
  const pdfPath = path.join(OUTPUT_DIR, pdfName);
  await writeFile(pdfPath, pdf);

  log("");
  log(`Done. PDF written to ${path.relative(process.cwd(), pdfPath)} (${pdf.length} bytes).`);
  log(`PNGs + manifest under ./generated/${session.id}/.`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`story1-high-run failed: ${message}`);
    process.exit(1);
  }
}

void main();
