// The Story-2 product ("A Letter from [PET_NAME]") as a `StoryDefinition` for the
// registry (lib/story/registry). The sibling of lib/story/story-1.ts: a thin
// wrapper around this product's own functions — `resolveStory2` (story2/variants.ts,
// feature 15) and `letterPdfFilename` (pdf/render.ts) — with no logic added here.
//
// The `StoryDefinition` interface is typed against `StorySession` so the existing
// render/preview routes (feature 14) compile unchanged. The registry is the
// documented seam where the `storyType` discriminant has ALREADY routed by product,
// so `getStory("story-2")` is only ever reached with a `Story2Session`. We narrow
// to `Story2Session` at that boundary (a guarded cast), exactly as feature 14 set up
// (`session.storyType ?? "story-1"` + the `Partial<Record>` registry). Feature 19
// (the Story-2 preview + download) tightens the route session typing end to end.

import type { StorySession, Story2Session } from "@/lib/session/types";
import type { PageId } from "@/lib/story/master-text";
import type { ResolvedStory } from "@/lib/story/merge";
import type { StoryDefinition } from "@/lib/story/registry";
import { resolveStory2 } from "@/lib/story/story2/variants";
import { letterPdfFilename } from "@/lib/pdf/render";
import { getWizardConfig } from "@/lib/story/wizard-config";

/**
 * The Story-2 illustrated page slots, in book order. The letter is text-first
 * (Basic tier has no imagery); the Premium tier (feature 17) illustrates the
 * cover (a pet portrait / silhouette) and the belief-frame page ("watercolor wash
 * on belief-frame page" — Page 5). Feature 17 owns the actual prompt builders and
 * may relocate this list to a `story2/prompts.ts`; until then the registry reads
 * it from here, mirroring how Story 1 reads `SCENE_PAGE_IDS` from its own module.
 */
export const LETTER_SCENE_PAGE_IDS: readonly PageId[] = [
  "letter-cover",
  "letter-page-5",
];

/**
 * The Story-2 product definition. `resolve` wraps `resolveStory2`;
 * `illustrationSlots` is `LETTER_SCENE_PAGE_IDS`; `pdfFilename` builds the
 * production-checklist name `Letter-from-[PET_NAME].pdf`. The session is narrowed
 * to `Story2Session` here — see the module header for why this is sound.
 */
export const story2Definition: StoryDefinition = {
  resolve(session: StorySession): ResolvedStory {
    return resolveStory2(session as unknown as Story2Session);
  },
  illustrationSlots: LETTER_SCENE_PAGE_IDS,
  pdfFilename(session: StorySession): string {
    return letterPdfFilename(session.pet.name);
  },
  wizard: getWizardConfig("story-2"),
};
