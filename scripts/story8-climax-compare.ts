// THROWAWAY climax tier-comparison script (decision support, not a shippable feature).
//
// Goal: render Story 8's highest-drift slot — `adventure-climax`, the 3/4 side leap —
// ONCE at LOW and ONCE at MEDIUM from an IDENTICAL Approach-B reference set, so the PM
// can judge whether Low holds the corgi on-model on the money shot. The climax slot is
// currently pinned to Medium by `STORY8_MEDIUM_SLOT` (lib/ai/generate.ts), a special
// case that was never compared against Low. This produces the evidence for that verdict.
// (The engine constant is NOT touched here — its removal/keep is the post-verdict task.)
//
// Approach B is sequential and accumulates each accepted scene as a reference for the
// next. Like `scripts/story8-prototype.ts`, this REPLICATES the small B-loop (the
// accumulation + the 16-ref cap) inline because `generate.ts`'s `referencesForScene` /
// `generateAndSaveScene` are module-private AND coupled to a real `StorySession` + the
// per-session image cache. It REUSES only the genuinely shared, exported engine
// primitives (`generateReferenceIllustration`, `generateSceneIllustration`,
// `MAX_REFERENCE_IMAGES`, `type Quality`) and the REAL session-driven prompt builder
// (`buildStory8SlotPrompts`).
//
// The crux: 9 non-climax slots (+ the locked reference) are generated at LOW first to
// build the SAME reference BANK the production run would have at the climax. The climax
// reference set is then built ONCE and used for BOTH the Low and the Medium render — so
// the ONLY variable between the two climax PNGs is the quality tier.
//
// Pet: the committed Story-8 corgi fixture (`fixtures/sample-story8-dog.json`) — the same
// pet as the catalog sample, deliberately, so the comparison is against a known-good
// Medium reference.
//
// Cost: PAID. 12 images total (1 reference + 9 bank scenes + 2 climax renders), all LOW
// except the one MEDIUM climax → roughly $0.11 per run. Approach B is sequential — no
// concurrency.
//
// Run (DO NOT run in routine builds — it calls the paid OpenAI API; this is the PM's
// manual gate step):
//   npm run proto:story8-climax

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

import {
  generateReferenceIllustration,
  generateSceneIllustration,
  MAX_REFERENCE_IMAGES,
  type Quality,
} from "@/lib/ai/generate";
import { buildStory8SlotPrompts } from "@/lib/ai/story8-prompts";
import type { Story8PageId } from "@/lib/story/master-text";
import type { Story8Session } from "@/lib/session/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** The committed Story-8 corgi fixture (the same pet the catalog sample uses). */
const FIXTURE = path.join(process.cwd(), "fixtures", "sample-story8-dog.json");

/** Where the comparison writes its PNGs + side-by-side sheet. */
const OUTPUT_DIR = path.join(process.cwd(), "generated", "story8-climax-compare");

/** The climax slot under test. */
const CLIMAX: Story8PageId = "adventure-climax";

/**
 * The 9 non-climax slots, in the prototype's RISK order (calm/establishing first to
 * build a strong on-model bank, then escalating action) — i.e. the engine's
 * `STORY8_GENERATION_ORDER` MINUS the trailing `adventure-climax`. Generated at LOW,
 * accumulating each accepted scene, exactly as the prototype/engine B-loop does. These
 * 9 + the locked reference are the shared reference BANK the climax draws from.
 */
const BANK_ORDER: Story8PageId[] = [
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
];

/**
 * Per-tier cost estimate (USD per 1024x1024 image), from the plan's quality tiers.
 * Used only for the running-total log — not a billing source of truth.
 */
const TIER_COST: Record<Quality, number> = {
  low: 0.006,
  medium: 0.053,
  high: 0.21,
};

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const log = (line: string) => console.log(line);

  // Load the committed corgi fixture directly (like story1-tier-compare).
  const session = JSON.parse(await readFile(FIXTURE, "utf8")) as Story8Session;
  session.id = "story8-climax-compare"; // fixed id → ./generated/story8-climax-compare/

  // Pet description matches generate.ts:1334 — `${breedColor} ${species}`.trim().
  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();
  const style = session.pet.illustrationStyle;

  // Resolve + assert the photo path under cwd (fixture's pet.photo).
  const photoPath = path.resolve(process.cwd(), session.pet.photo);
  if (!existsSync(photoPath)) {
    throw new Error(`fixture pet photo not found: ${photoPath}`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Build all slot prompts via the REAL session-driven builder (no overrides).
  const promptBySlot = buildStory8SlotPrompts(session);

  let runningCost = 0;

  // 1. Locked reference illustration (the consistency anchor) at LOW. Never dropped.
  log(`Pet: ${petDescription}`);
  log("Generating locked reference illustration (low)…");
  const referenceBytes = await generateReferenceIllustration(
    photoPath,
    petDescription,
    style,
    "low",
  );
  await writeFile(path.join(OUTPUT_DIR, "reference.png"), referenceBytes);
  runningCost += TIER_COST.low;
  log(`  reference.png  tier=low  running total=$${runningCost.toFixed(3)}`);

  const photoBytes = await readFile(photoPath);

  // 2. Build the reference BANK: the 9 non-climax slots at LOW in risk order,
  //    accumulating each accepted scene (Approach B), mirroring generate.ts's private
  //    `referencesForScene("B", …)`. Save each so the sheet can show the bank.
  const priorScenes: Buffer[] = [];
  for (const slot of BANK_ORDER) {
    const slotPrompt = promptBySlot[slot];
    if (!slotPrompt) {
      throw new Error(`No prompt built for slot: ${slot}`);
    }

    // Approach-B reference set: [photo, reference, ...most-recent priors], trimmed to
    // the 16-image ceiling (newest priors kept).
    const references = climaxReferenceSet(photoBytes, referenceBytes, priorScenes);

    log(
      `Generating ${slot}  tier=low  refs=${references.length}` +
        ` (photo + reference + ${references.length - 2} prior scene(s))…`,
    );
    const bytes = await generateSceneIllustration(references, slotPrompt.prompt, "low");
    await writeFile(path.join(OUTPUT_DIR, `${slot}.png`), bytes);
    priorScenes.push(bytes); // accepted → anchors the next generation
    runningCost += TIER_COST.low;
    log(`  ${slot}.png  tier=low  running total=$${runningCost.toFixed(3)}`);
  }

  // 3. The crux: build the climax reference set ONCE (photo + reference + most-recent
  //    priors, trimmed to the cap), then render the SAME prompt from that IDENTICAL
  //    array at LOW and at MEDIUM. The only variable between the two PNGs is the tier.
  const climaxPrompt = promptBySlot[CLIMAX];
  if (!climaxPrompt) {
    throw new Error(`No prompt built for slot: ${CLIMAX}`);
  }
  const climaxReferences = climaxReferenceSet(photoBytes, referenceBytes, priorScenes);

  for (const tier of ["low", "medium"] as const) {
    log(
      `Generating ${CLIMAX} (${tier.toUpperCase()})  refs=${climaxReferences.length}` +
        ` (photo + reference + ${climaxReferences.length - 2} prior scene(s))…`,
    );
    const bytes = await generateSceneIllustration(
      climaxReferences,
      climaxPrompt.prompt,
      tier,
    );
    const file = `${CLIMAX}-${tier.toUpperCase()}.png`;
    await writeFile(path.join(OUTPUT_DIR, file), bytes);
    runningCost += TIER_COST[tier];
    log(`  ${file}  tier=${tier}  running total=$${runningCost.toFixed(3)}`);
  }

  // 4. The side-by-side comparison sheet.
  await writeCompareSheet(session.pet.photo, petDescription);

  const sheetPath = path.join(OUTPUT_DIR, "compare.html");
  log("");
  log(`Done. Total estimated cost: $${runningCost.toFixed(3)}`);
  log(`Open: ${sheetPath}`);
}

/**
 * Build the Approach-B reference set for a generation: [photo, reference, ...most-recent
 * prior scenes], trimmed to MAX_REFERENCE_IMAGES (newest priors kept). Mirrors
 * generate.ts's private `referencesForScene("B", …)`.
 */
function climaxReferenceSet(
  photoBytes: Buffer,
  referenceBytes: Buffer,
  priorScenes: readonly Buffer[],
): Buffer[] {
  const base = [photoBytes, referenceBytes];
  const room = MAX_REFERENCE_IMAGES - base.length;
  const recent = priorScenes.slice(Math.max(0, priorScenes.length - room));
  return [...base, ...recent];
}

/**
 * Emit `compare.html` into OUTPUT_DIR: the original photo + the locked reference on top,
 * then the LOW vs MEDIUM climax side by side with tier badges, and the 9 bank scenes
 * below for context. The PM opens this to judge likeness on the leap. Reuses the
 * prototype's contact-sheet CSS + `cell()` helper, kept minimal.
 */
async function writeCompareSheet(
  photoRel: string,
  petDescription: string,
): Promise<void> {
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

  const anchorCells =
    cell("Original photo", petDescription, path.resolve(process.cwd(), photoRel)) +
    cell("Locked reference", "Approach-B anchor (never dropped)", "reference.png");

  const climaxCells =
    cell(
      "adventure-climax — LOW",
      "Same references, LOW tier",
      `${CLIMAX}-LOW.png`,
      "low",
    ) +
    cell(
      "adventure-climax — MEDIUM",
      "Same references, MEDIUM tier",
      `${CLIMAX}-MEDIUM.png`,
      "medium",
    );

  const bankCells = BANK_ORDER.map((slot) =>
    cell(slot, "bank scene (low)", `${slot}.png`, "low"),
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Story 8 climax — Low vs Medium tier comparison</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem;
           background: #f7f4ef; color: #2a2622; }
    h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
    p.note { margin: 0 0 1.5rem; color: #6b645c; max-width: 64ch; }
    section { margin-bottom: 2.5rem; }
    h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .04em;
         color: #8a8178; border-bottom: 1px solid #ddd6cc; padding-bottom: .4rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 1.25rem; }
    .grid.duo { grid-template-columns: repeat(2, minmax(320px, 1fr)); }
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
  <h1>Story 8 climax — Low vs Medium tier</h1>
  <p class="note">The deferred experiment: does LOW hold the corgi on-model on the
    highest-drift pose (the 3/4 side leap)? The two climax renders below come from the
    SAME Approach-B reference set (photo + locked reference + 9 accumulated bank scenes) —
    the ONLY variable between them is the quality tier. If LOW holds, the
    <code>STORY8_MEDIUM_SLOT</code> floor can be dropped. The 9 bank scenes (all LOW) are
    shown at the bottom for context.</p>

  <section>
    <h2>Anchors</h2>
    <div class="grid">${anchorCells}</div>
  </section>

  <section>
    <h2>The climax — Low vs Medium (the verdict)</h2>
    <div class="grid duo">${climaxCells}</div>
  </section>

  <section>
    <h2>The reference bank (9 low scenes)</h2>
    <div class="grid">${bankCells}</div>
  </section>
</body>
</html>`;

  await writeFile(path.join(OUTPUT_DIR, "compare.html"), html, "utf8");
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`story8-climax-compare failed: ${message}`);
    process.exit(1);
  }
}

void main();
