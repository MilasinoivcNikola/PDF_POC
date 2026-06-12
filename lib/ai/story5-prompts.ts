// Slot prompt builders for Story 5's minimal Premium imagery (Craft Area 2,
// feature 23). Story 5 ("A Letter to [PET_NAME]") is the inverse/companion of
// Story 2 — the owner's second-person letter TO the pet who died. Its Premium
// imagery shape is IDENTICAL to Story 2's (reference cover + photo-free belief
// wash), NOT Story 4's (both reference-anchored). So this module re-keys Story 2's
// builders to Story 5's slot ids — no new prompt logic, no new likeness risk:
//
//   - `note-cover`  — a soft pet portrait / silhouette ("looking back", single
//     subject, lots of white space). Uses the uploaded photo as a reference for
//     consistency, so it reuses Story 2's `buildCoverPortraitPrompt` (which itself
//     reuses `buildReferencePrompt`'s style + "maintain the pet's exact appearance"
//     consistency clause).
//   - `note-page-5` — the belief-frame wash. ABSTRACT and PHOTO-FREE: no pet
//     figure, so there is no consistency concern and no reference image is passed.
//     Reuses Story 2's `buildBeliefWashPrompt`, keyed by `toggles.beliefFrame`.
//
// Everything here is PURE (no IO, no network, no SDK) so the prompt strings can be
// unit-tested directly from a session — mirroring lib/ai/prompts.ts (Story 1),
// lib/ai/story2-prompts.ts (Story 2), and lib/ai/story4-prompts.ts (Story 4).
//
// The two slot ids are owned by the registry (lib/story/story-5.ts ⇒
// NOTE_SCENE_PAGE_IDS) and consumed by the letter PDF template; we import the slot
// type rather than re-declare it so the prompt set can never drift from the slots
// the template renders. The import direction is one-way (this lib/ai module imports
// the slot type from master-text.ts, never the reverse) so the registry/catalog
// public graph stays engine-free.

import type { Story5Session } from "@/lib/session/types";
import type { Story5PageId } from "@/lib/story/master-text";
import {
  buildCoverPortraitPrompt,
  buildBeliefWashPrompt,
  type Story2SlotPrompt,
} from "@/lib/ai/story2-prompts";

/**
 * One Story-5 image to generate: the prompt string plus whether the uploaded pet
 * photo is passed as a reference. The cover portrait references the photo (pet
 * consistency); the belief wash does not (it has no pet figure). Same shape as
 * `Story2SlotPrompt` so the orchestrator's per-slot dispatch is identical — we
 * re-export Story 2's type rather than declare a structurally-identical twin.
 */
export type Story5SlotPrompt = Story2SlotPrompt;

/**
 * Build the prompt (and the reference flag) for every Story-5 illustrated slot,
 * keyed by slot id. Pure. The cover portrait references the photo (via
 * `buildCoverPortraitPrompt`); the belief wash does not (via `buildBeliefWashPrompt`,
 * keyed by the session's belief frame). The pet description mirrors the Story-2
 * orchestrator (`breedColor species`). Only the two Premium slots are produced
 * (`note-cover`, `note-page-5`) — the registry's `illustrationSlots` is the
 * authoritative list and the orchestrator iterates it, looking each id up here.
 */
export function buildStory5SlotPrompts(
  session: Story5Session,
): Partial<Record<Story5PageId, Story5SlotPrompt>> {
  const style = session.pet.illustrationStyle;
  const petDescription = `${session.pet.breedColor} ${session.pet.species}`.trim();
  return {
    "note-cover": {
      prompt: buildCoverPortraitPrompt(petDescription, style),
      useReference: true,
    },
    "note-page-5": {
      prompt: buildBeliefWashPrompt(session.toggles.beliefFrame, style),
      useReference: false,
    },
  };
}
