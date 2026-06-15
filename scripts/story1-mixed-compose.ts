// THROWAWAY: compose a MIXED-tier preview PDF from already-cached PNGs ($0, no API).
//
// Picks the HIGH cover + closing (page-12) and MEDIUM interiors (page-1..page-11)
// from the tier-comparison runs already on disk (./generated/story1-{high,medium}/)
// and renders one PDF so the PM can judge the "HIGH bookends + MEDIUM interiors"
// strategy. No generation — just re-renders existing images through the real PDF path.

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";

import { manifestToImageMap } from "@/lib/ai/generate";
import { renderStoryPdf } from "@/lib/pdf/render";
import { storyPdfFilename } from "@/lib/pdf/filename";
import { SCENE_PAGE_IDS } from "@/lib/story/scenes";
import type { StorySession } from "@/lib/session/types";
import type { GeneratedImage } from "@/lib/session/types";

const FIXTURE = path.join(process.cwd(), "fixtures", "story1-high.json");
const OUTPUT_DIR = path.join(process.cwd(), "output");

/** The "bookends" that get HIGH; everything else gets MEDIUM. */
const HIGH_PAGES = new Set<string>(["cover", "page-12"]);

async function main(): Promise<void> {
  const session = JSON.parse(await readFile(FIXTURE, "utf8")) as StorySession;

  const manifest: GeneratedImage[] = [];
  for (const page of SCENE_PAGE_IDS) {
    const tier = HIGH_PAGES.has(page) ? "high" : "medium";
    const p = path.join(process.cwd(), "generated", `story1-${tier}`, `${page}.png`);
    await access(p); // fail loudly if a cached PNG is missing
    manifest.push({ page, path: p, promptHash: "", referenceHash: "" });
    console.log(`  ${page}  ←  story1-${tier}`);
  }

  session.images = [...manifest];
  const map = await manifestToImageMap(manifest);
  const pdf = await renderStoryPdf(session, map);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const base = storyPdfFilename(session.pet.name).replace(/\.pdf$/i, "");
  const out = path.join(OUTPUT_DIR, `${base}-MIXED.pdf`);
  await writeFile(out, pdf);
  console.log(`\nDone → ${path.relative(process.cwd(), out)} (${pdf.length} bytes).`);
}

main().catch((e) => {
  console.error(`story1-mixed-compose failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
