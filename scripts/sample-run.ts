// THROWAWAY run script for the storefront sample sets (feature
// "story-samples-00-photos-and-harness", deliverable 3) — the story-agnostic
// generalization of scripts/story1-high-run.ts.
//
// This script answers ONE need: generate ANY title's example book ONCE at the
// locked mixed PRODUCTION_QUALITY tier (HIGH cover/hero, MEDIUM interiors, LOW
// reference — exactly what the batch worker ships, so the samples cannot drift
// from what a paying customer receives) from a checked-in fixture, then render
// the full-res working PDF — so the per-story PRs (02-09) only need to add a tiny
// fixture + run it + wire the catalog. The PNGs + manifest land under
// ./generated/<fixture-id>/ and the working PDF under ./output/ (both gitignored);
// the COMMITTED slim web assets (downscaled JPGs + slim preview.pdf) are produced
// separately by scripts/sample-capture.ts.
//
// THE SCRIPT IS THROWAWAY (it is the cost step, run once per title, then deletable
// — like scripts/story1-high-run.ts / scripts/story8-prototype.ts). It REUSES the
// real engine entry points verbatim (`generateAllIllustrations` with the SAME
// `PRODUCTION_QUALITY` constant the worker passes, `manifestToImageMap`,
// `renderStoryPdf`) — the same path the app uses — so the rendered output is
// print-faithful and nothing here forks engine behavior.
//
// Cost: PAID. ≈ $1 per book under the mixed tier (the worker's per-book COGS).
// generateAllIllustrations self-selects Approach A/B/C per title and resolves each
// page's tier via PRODUCTION_QUALITY. Quality is NOT in the image cache key, so a
// FRESH fixture id with an empty ./generated/<id>/ is what guarantees cache MISSES
// rather than silently re-serving stale Low PNGs.
//
// Run it (DO NOT run in routine builds — it calls the paid OpenAI API; this is the
// PM's manual per-story step):
//   npm run proto:sample fixtures/<story>-sample.json

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import {
  generateAllIllustrations,
  manifestToImageMap,
  PRODUCTION_QUALITY,
} from "@/lib/ai/generate";
import { renderStoryPdf } from "@/lib/pdf/render";
import type { StorySession } from "@/lib/session/types";

/** Where the rendered full-res working PDF lands (gitignored working copy). */
const OUTPUT_DIR = path.join(process.cwd(), "output");

async function run(): Promise<void> {
  const log = (line: string) => console.log(line);

  // Resolve the fixture path from argv (cwd-relative or absolute).
  const fixtureArg = process.argv[2];
  if (!fixtureArg) {
    throw new Error(
      "usage: npm run proto:sample <path/to/fixture.json>\n" +
        "  (e.g. npm run proto:sample fixtures/story2-sample.json)",
    );
  }
  const fixturePath = path.resolve(process.cwd(), fixtureArg);

  // Load the fixture as a finalized story session.
  const session = JSON.parse(await readFile(fixturePath, "utf8")) as StorySession;
  log(`Loaded fixture ${path.relative(process.cwd(), fixturePath)} (session id=${session.id}, storyType=${session.storyType ?? "story-1"}).`);
  log("Generating every illustration at the locked mixed PRODUCTION_QUALITY tier");
  log("(HIGH cover/hero, MEDIUM interiors, LOW reference) — same as the worker.");
  log("This is the PAID step (≈ $1/book) and may take several minutes — be patient.");

  // 1. Generate every illustration at PRODUCTION_QUALITY (the SAME constant the
  //    batch worker passes). The fresh fixture id + empty ./generated/<id>/ →
  //    all cache MISSES. The engine self-selects Approach A/B/C per storyType.
  const manifest = await generateAllIllustrations(session, PRODUCTION_QUALITY);
  log(`Manifest produced: ${manifest.length} entries.`);
  for (const entry of manifest) {
    log(`  ${entry.page}  →  ${path.relative(process.cwd(), entry.path)}`);
  }

  // 2. Persist the manifest onto the session and render the full-res working PDF
  //    via the same app render path. (The slim, COMMITTED preview.pdf is rendered
  //    from the downscaled web JPGs by scripts/sample-capture.ts — not here.)
  //
  //    NOTE: this working PDF only shows art for pages that `manifestToImageMap`'s
  //    allow-list covers. If a storyType isn't yet wired into the engine's dispatch
  //    + that allow-list (`lib/ai/generate.ts`), its pages render as placeholders
  //    here — verify the title generates its OWN slots before trusting this PDF.
  session.images = [...manifest];

  // Persist the session-with-manifest beside the PNGs so the capture step
  // (scripts/sample-capture.ts) can re-render the slim preview PDF without the
  // fixture path (it only takes --id). ./generated/<id>/ is gitignored.
  const sessionJsonPath = path.join(process.cwd(), "generated", session.id, "session.json");
  await mkdir(path.dirname(sessionJsonPath), { recursive: true });
  await writeFile(sessionJsonPath, JSON.stringify(session, null, 2));

  const map = await manifestToImageMap(manifest);
  log(`Rendering full-res working PDF (${Object.keys(map).length} illustrated pages)…`);
  const pdf = await renderStoryPdf(session, map);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const pdfPath = path.join(OUTPUT_DIR, `${session.id}.pdf`);
  await writeFile(pdfPath, pdf);

  log("");
  log(`Done. Working PDF written to ${path.relative(process.cwd(), pdfPath)} (${pdf.length} bytes).`);
  log(`PNGs + manifest under ./generated/${session.id}/.`);
  log(`Next: capture the committed web assets (scripts/sample-capture.ts):`);
  log(`  tsx --tsconfig scripts/tsconfig.json scripts/sample-capture.ts --id ${session.id} --out <productId>`);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`sample-run failed: ${message}`);
    process.exit(1);
  }
}

void main();
