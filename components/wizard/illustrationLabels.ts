// Human-friendly labels for the generation progress checklist (feature 09).
//
// The progress UI must be HONEST about what the pipeline actually produces — the
// `reference` portrait plus the 13 SCENE_PAGE_IDS (cover + page-1…page-12) = 14
// images. The prototype's `generating.html` hand-picked a list of 12 and labelled
// them in a warm, plain voice ("Otis at the front door", "Otis and Emma
// together"); we mirror that voice here but key it to the real slot ids so the
// count and the checklist never drift from reality.
//
// Pure (no IO, no React) so it's trivially unit-testable. The pet name is
// interpolated; a couple of slots reference the child by description rather than
// name to stay close to the prototype copy without needing the child name here.

import { SCENE_PAGE_IDS } from "@/lib/ai/prompts";
import type { PageId } from "@/lib/story/master-text";

/** A slot in the checklist: "reference" + every illustrated page id. */
export type IllustrationSlot = "reference" | PageId;

/** The full ordered set of slots the pipeline generates (reference first). */
export const ILLUSTRATION_SLOTS: readonly IllustrationSlot[] = [
  "reference",
  ...SCENE_PAGE_IDS,
];

/**
 * Labels keyed by slot, in the warm, specific voice of
 * `prototypes/generating.html`, with the pet name woven in. The scene
 * descriptions echo each page's brief in the master template (front door, the
 * bond, favorite activity, sleeping spot, the gentle rest, the comforting place,
 * things to remember, the closing). `Partial` because only the illustrated slots
 * in ILLUSTRATION_SLOTS need a label — `back-cover` (a writing page) never
 * appears in the checklist; an unmapped slot falls back to a plain phrasing.
 */
function labelsFor(name: string): Partial<Record<IllustrationSlot, string>> {
  return {
    reference: `Reference portrait — ${name} as they were`,
    cover: "Cover illustration",
    "page-1": `A portrait of ${name}`,
    "page-2": `${name} at the front door`,
    "page-3": `${name} and your child together`,
    "page-4": `${name} doing what they loved`,
    "page-5": `${name} in their favorite resting place`,
    "page-6": "The day to remember",
    "page-7": `${name} resting peacefully`,
    "page-8": `Your child, holding ${name}'s collar`,
    "page-9": "A comforting place",
    "page-10": "Love stays",
    "page-11": "Things to remember — three small scenes",
    "page-12": "The final page — always, always loved",
  };
}

/** Resolve a slot's human-friendly checklist label for a given pet name. */
export function illustrationLabel(slot: IllustrationSlot, petName: string): string {
  const name = petName.trim() || "your pet";
  return labelsFor(name)[slot] ?? `Illustration for ${slot}`;
}
