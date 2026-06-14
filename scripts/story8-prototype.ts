// THROWAWAY prototype CLI for Story 8 (feature 30 — the PR-0 go/no-go gate).
//
// This script answers ONE question: does the test pet stay on-model across the 10
// dynamic Backyard-Mystery action poses under Approach B? It is the gate the
// master template demands ("prototype the 10-slot set FIRST and look at it"). It
// generates a locked reference + the 10 slots, accumulating each accepted scene
// as a reference for the next (Approach B), and emits a contact sheet so likeness
// can be judged at a glance.
//
// THE SCRIPT IS THROWAWAY (deleted on a NO-GO; superseded by the real orchestrator
// on a GO), but the BeLOOP LOGIC it exercises carries forward into PR-A. On reuse
// vs fork: `lib/ai/generate.ts`'s `referencesForScene` / `generateAndSaveScene` are
// module-private AND coupled to a real `StorySession` + the per-session image cache
// — neither of which a session-less, cache-less one-shot prototype has. So this
// script REPLICATES the small B-loop (the accumulation + the 16-ref cap) inline and
// REUSES the genuinely shared, already-exported engine primitives
// (`generateReferenceIllustration`, `generateSceneIllustration`,
// `MAX_REFERENCE_IMAGES`). PR-A promotes the accumulation into the shared
// orchestrator (a `generateStory8Illustrations` that wraps `referencesForScene`).
//
// The prompts come from the REAL builder, `lib/ai/story8-prompts.ts`, which carries
// forward verbatim into PR-A.
//
// Run it (DO NOT run in routine builds — it calls the paid OpenAI API; this is the
// PM's manual gate step):
//   npm run proto:story8                       # uses the default test photo
//   npm run proto:story8 uploads/<dir>/photo.jpg
//
// Cost: 11 images (1 reference + 10 slots), all Low except the climax leap at
// Medium → roughly $0.08–$0.15 per run. Re-run only to compare prompt tweaks.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

import {
  generateReferenceIllustration,
  generateSceneIllustration,
  MAX_REFERENCE_IMAGES,
  type Quality,
} from "@/lib/ai/generate";
import {
  buildStory8PrototypePrompts,
  ADVENTURE_PROTOTYPE_SLOT_IDS,
  type AdventurePrototypeSlot,
} from "@/lib/ai/story8-prompts";
import type { IllustrationStyle } from "@/lib/session/types";

// ---------------------------------------------------------------------------
// Prototype config (a fixed test pet — this is a one-off gate, not a product)
// ---------------------------------------------------------------------------

/** A checked-in test photo to default to when no path is given on argv. */
const DEFAULT_PHOTO = "uploads/feat21-talk-otis/photo.jpg";

/** The pet description woven into every prompt (a fixed value for the gate run). */
const PET_DESCRIPTION = "scruffy brown terrier dog";

/** The illustration style for the prototype (the house default). */
const STYLE: IllustrationStyle = "watercolor";

/** Where the prototype writes its PNGs + contact sheet. */
const OUTPUT_DIR = path.join(process.cwd(), "generated", "story8-proto");

/**
 * Per-tier cost estimate (USD per 1024x1024 image), from the plan's quality tiers.
 * Used only for the running-total log — not a billing source of truth.
 */
const TIER_COST: Record<Quality, number> = {
  low: 0.006,
  medium: 0.053,
  high: 0.21,
};

/**
 * The RISK order in which the 10 slots are generated (NOT book order): calm /
 * establishing scenes first to build a strong on-model reference bank, then the
 * escalating action, then the climax leap LAST (highest drift risk) — when the
 * most accepted references are available to anchor it. The contact sheet still
 * renders in BOOK order (ADVENTURE_PROTOTYPE_SLOT_IDS) for inspection.
 */
const RISK_ORDER: AdventurePrototypeSlot[] = [
  // calm / establishing
  "adventure-cover",
  "adventure-ordinary",
  "adventure-special",
  "adventure-celebration",
  // escalating action
  "adventure-call",
  "adventure-clue",
  "adventure-deeper",
  "adventure-discovery",
  "adventure-wobble",
  // the money shot, last
  "adventure-climax",
];

/** Tier per slot: Low everywhere, Medium only on the climax leap (tier-bump test). */
function tierForSlot(slot: AdventurePrototypeSlot): Quality {
  return slot === "adventure-climax" ? "medium" : "low";
}

/** A short human-readable beat label for the contact-sheet grid. */
const BEAT_LABEL: Record<AdventurePrototypeSlot, string> = {
  "adventure-cover": "Hero shot (cover / reference anchor)",
  "adventure-ordinary": "The ordinary day",
  "adventure-special": "The superpower hinted",
  "adventure-call": "The call to adventure",
  "adventure-clue": "First clue (first motion test)",
  "adventure-deeper": "The expedition",
  "adventure-discovery": "The discovery",
  "adventure-wobble": "The wobble",
  "adventure-climax": "Save the day (the money shot)",
  "adventure-celebration": "The celebration",
};

// ---------------------------------------------------------------------------
// The Approach-B run
// ---------------------------------------------------------------------------

interface Generated {
  slot: AdventurePrototypeSlot;
  file: string; // basename under OUTPUT_DIR
  tier: Quality;
}

/**
 * Resolve the test photo path from argv (or the checked-in default), generate the
 * locked reference + the 10 slots under Approach B in risk order, write every PNG
 * to OUTPUT_DIR, and emit the contact sheet. Returns the list of generated images
 * for the caller to summarize.
 */
async function run(): Promise<Generated[]> {
  const photoArg = process.argv[2];
  const photoRel = photoArg ?? DEFAULT_PHOTO;
  const photoPath = path.resolve(process.cwd(), photoRel);

  if (!existsSync(photoPath)) {
    throw new Error(
      photoArg
        ? `test photo not found: ${photoPath}`
        : `default test photo not found: ${photoPath}\n` +
          `usage: npm run proto:story8 <path/to/photo.jpg>`,
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Build all 10 prompts up front (pure). Keyed by slot for the risk-order loop.
  const promptList = buildStory8PrototypePrompts(PET_DESCRIPTION, STYLE);
  const promptBySlot = new Map(promptList.map((p) => [p.slot, p]));

  let runningCost = 0;
  const log = (line: string) => console.log(line);

  // 1. Locked reference illustration (the consistency anchor) at Low. NEVER dropped
  //    from the reference set thereafter.
  log("Generating locked reference illustration (low)…");
  const referenceBytes = await generateReferenceIllustration(
    photoPath,
    PET_DESCRIPTION,
    STYLE,
    "low",
  );
  await writeFile(path.join(OUTPUT_DIR, "reference.png"), referenceBytes);
  runningCost += TIER_COST.low;
  log(`  reference.png  tier=low  running total=$${runningCost.toFixed(3)}`);

  // The two anchors that stay in the reference set for EVERY scene.
  const photoBytes = await readFile(photoPath);

  // 2. Run the 10 slots under Approach B, sequentially, in RISK order. Each accepted
  //    scene is appended to `priorScenes` and becomes a reference for the next
  //    generation (the accumulation `referencesForScene` does in the engine). The
  //    16-ref cap is enforced inline — a 10-slot book never approaches it.
  const priorScenes: Buffer[] = [];
  const generated: Generated[] = [];

  for (const slot of RISK_ORDER) {
    const slotPrompt = promptBySlot.get(slot);
    if (!slotPrompt) {
      throw new Error(`No prompt built for slot: ${slot}`);
    }
    const tier = tierForSlot(slot);

    // Approach B reference set: [photo, reference, ...most-recent prior scenes],
    // trimmed to the 16-image ceiling (newest prior scenes kept). This mirrors
    // generate.ts's private `referencesForScene` for approach "B".
    const base = [photoBytes, referenceBytes];
    const room = MAX_REFERENCE_IMAGES - base.length;
    const recent = priorScenes.slice(Math.max(0, priorScenes.length - room));
    const references = [...base, ...recent];

    log(
      `Generating ${slot}  tier=${tier}  refs=${references.length}` +
        ` (photo + reference + ${recent.length} prior scene(s))…`,
    );
    const bytes = await generateSceneIllustration(references, slotPrompt.prompt, tier);

    const file = `${slot}.png`;
    await writeFile(path.join(OUTPUT_DIR, file), bytes);
    priorScenes.push(bytes); // accepted → anchors the next generation

    runningCost += TIER_COST[tier];
    log(`  ${file}  tier=${tier}  running total=$${runningCost.toFixed(3)}`);
    generated.push({ slot, file, tier });
  }

  // 3. Contact sheet, in BOOK order (cover … celebration) for inspection.
  await writeContactSheet(generated, photoRel);
  log("");
  log(`Done. ${generated.length} slots + 1 reference generated.`);
  log(`Total estimated cost: $${runningCost.toFixed(3)}`);
  log(`Open: ${path.join(OUTPUT_DIR, "contact-sheet.html")}`);

  return generated;
}

/**
 * Emit `contact-sheet.html` into OUTPUT_DIR: the original photo + the locked
 * reference + all 10 slots in a labelled grid, ordered in BOOK order so the book
 * reads top-to-bottom while the eye checks likeness against the photo/reference.
 * Each cell is labelled with slot id, beat, and the tier it was generated at.
 * Images are referenced by relative filename (the sheet lives beside them).
 */
async function writeContactSheet(
  generated: Generated[],
  photoRel: string,
): Promise<void> {
  const bySlot = new Map(generated.map((g) => [g.slot, g]));

  const cell = (
    label: string,
    sub: string,
    src: string,
    tier?: Quality,
  ): string => `
      <figure class="cell">
        <img src="${src}" alt="${label}" loading="lazy" />
        <figcaption>
          <strong>${label}</strong>
          <span>${sub}</span>
          ${tier ? `<span class="tier tier-${tier}">${tier}</span>` : ""}
        </figcaption>
      </figure>`;

  // The anchors: original photo + locked reference, side by side at the top.
  const anchorCells =
    cell("Original photo", photoRel, path.resolve(process.cwd(), photoRel)) +
    cell("Locked reference", "Approach-B anchor (never dropped)", "reference.png");

  // The 10 slots, in BOOK order.
  const slotCells = ADVENTURE_PROTOTYPE_SLOT_IDS.map((slot, i) => {
    const g = bySlot.get(slot);
    if (!g) {
      return cell(slot, `#${i + 1} — MISSING`, "");
    }
    return cell(slot, `#${i + 1} — ${BEAT_LABEL[slot]}`, g.file, g.tier);
  }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Story 8 prototype — Backyard Mystery contact sheet</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem;
           background: #f7f4ef; color: #2a2622; }
    h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
    p.note { margin: 0 0 1.5rem; color: #6b645c; max-width: 60ch; }
    section { margin-bottom: 2.5rem; }
    h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .04em;
         color: #8a8178; border-bottom: 1px solid #ddd6cc; padding-bottom: .4rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 1.25rem; }
    .cell { margin: 0; background: #fff; border: 1px solid #e6e0d6; border-radius: 8px;
            overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
    .cell img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
                background: #efe9df; }
    figcaption { padding: .6rem .75rem; display: flex; flex-direction: column; gap: .15rem; }
    figcaption strong { font-size: .9rem; }
    figcaption span { font-size: .78rem; color: #6b645c; }
    .tier { align-self: flex-start; margin-top: .25rem; font-size: .7rem;
            text-transform: uppercase; letter-spacing: .05em; padding: .1rem .4rem;
            border-radius: 4px; }
    .tier-low { background: #e3efe1; color: #2f6e3a; }
    .tier-medium { background: #fbeed2; color: #8a6212; }
    .tier-high { background: #f6dada; color: #9a2b2b; }
  </style>
</head>
<body>
  <h1>Story 8 prototype — The Backyard Mystery</h1>
  <p class="note">The go/no-go gate. Judge likeness across all 10 slots against the
    original photo and the locked reference — especially the leap (climax), the
    expedition, the discovery, and the wobble, not just the calm scenes. Generation
    ran in risk order (calm first, climax last); the grid below is in book order.</p>

  <section>
    <h2>Anchors</h2>
    <div class="grid">${anchorCells}</div>
  </section>

  <section>
    <h2>The 10 slots (book order)</h2>
    <div class="grid">${slotCells}</div>
  </section>
</body>
</html>`;

  await writeFile(path.join(OUTPUT_DIR, "contact-sheet.html"), html, "utf8");
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`story8-prototype failed: ${message}`);
    process.exit(1);
  }
}

void main();
