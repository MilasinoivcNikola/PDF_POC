// THROWAWAY tier-comparison script (decision support, not a shippable feature).
//
// Goal: render the SAME Story-1 book (the Bo-the-boxer `story1-high.json` fixture —
// same pet, same photo, same merged text, same prompts) at MEDIUM and LOW so the PM
// can lay all three tiers (HIGH already in ./output/) side by side and lock the tier
// we use for all PDF generation going forward.
//
// It reuses the real engine entry points verbatim (`generateAllIllustrations`,
// `manifestToImageMap`, `renderStoryPdf`) — the same path the app + the HIGH run
// used — so each PDF is print-faithful and only the quality tier differs.
//
// Quality is NOT in the image cache key, so each tier runs under its OWN session id
// (`story1-<tier>` → ./generated/story1-<tier>/), guaranteeing fresh cache MISSES
// rather than re-serving the HIGH PNGs. Each tier writes a tier-suffixed PDF
// (Saying-Goodbye-to-Bo-MEDIUM.pdf / -LOW.pdf) so nothing overwrites the HIGH copy.
//
// Cost: PAID, but cheap — a full Story-1 book (1 reference + 13 scenes) is ~$0.70 at
// MEDIUM and ~$0.07-0.08 at LOW; both tiers together well under $1. Approach A,
// concurrency left at the default 3.
//
// Run (DO NOT run in routine builds — it calls the paid OpenAI API):
//   npx tsx --env-file-if-exists=.env.local --tsconfig scripts/tsconfig.json \
//     scripts/story1-tier-compare.ts [medium] [low]
//   (no args → both medium and low)

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import {
  generateAllIllustrations,
  manifestToImageMap,
  type Quality,
} from "@/lib/ai/generate";
import { renderStoryPdf } from "@/lib/pdf/render";
import { storyPdfFilename } from "@/lib/pdf/filename";
import type { StorySession } from "@/lib/session/types";

/** The checked-in Story-1 fixture (the same one the HIGH run used). */
const FIXTURE = path.join(process.cwd(), "fixtures", "story1-high.json");

/** Where the rendered preview PDFs land (gitignored working copy). */
const OUTPUT_DIR = path.join(process.cwd(), "output");

async function runTier(tier: Quality): Promise<void> {
  const log = (line: string) => console.log(`[${tier}] ${line}`);

  // Same fixture, fresh per-tier session id → fresh ./generated/story1-<tier>/ →
  // 14 cache MISSES at this tier (quality is not part of the cache key).
  const session = JSON.parse(await readFile(FIXTURE, "utf8")) as StorySession;
  session.id = `story1-${tier}`;
  log(`Session id=${session.id}. Generating 14 ${tier} images (1 ref + 13 scenes), Approach A, concurrency 3…`);
  log("This is the PAID step and may take a few minutes — be patient.");

  const manifest = await generateAllIllustrations(session, {
    sceneQuality: tier,
    referenceQuality: tier,
  });
  log(`Manifest produced: ${manifest.length} entries.`);

  session.images = [...manifest];
  const map = await manifestToImageMap(manifest);
  log(`Rendering preview PDF (${Object.keys(map).length} illustrated pages)…`);
  const pdf = await renderStoryPdf(session, map);

  await mkdir(OUTPUT_DIR, { recursive: true });
  // Tier-suffix the filename so MEDIUM / LOW never overwrite each other or HIGH.
  const base = storyPdfFilename(session.pet.name).replace(/\.pdf$/i, "");
  const pdfPath = path.join(OUTPUT_DIR, `${base}-${tier.toUpperCase()}.pdf`);
  await writeFile(pdfPath, pdf);
  log(`Done → ${path.relative(process.cwd(), pdfPath)} (${pdf.length} bytes); PNGs under ./generated/${session.id}/.`);
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const tiers = (requested.length ? requested : ["medium", "low"]) as Quality[];
  try {
    for (const tier of tiers) {
      await runTier(tier);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`story1-tier-compare failed: ${message}`);
    process.exit(1);
  }
}

void main();
