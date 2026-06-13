// Per-story wizard configuration — the ordered steps a product's wizard renders.
// This is the `wizardSteps` slot the registry interface (lib/story/registry.ts)
// reserved for this feature: it maps a `storyType` to its step count (for the
// "Step NN of NN" counter), mirroring how the registry maps a story to its
// `resolve` / `illustrationSlots` / `pdfFilename`.
//
// Pure data only — no IO, no React, no story logic, and (deliberately) no import
// of the server-only slot/render modules, so this stays import-safe from the
// client wizard chrome (StepShell / ProgressBar). The generation-progress
// checklist slots + labels live in components/wizard/illustrationLabels.ts (also
// client-safe). The required-field gate + draft→session bridge live in
// lib/session/draft.ts. This config carries only the step ordering they key
// against.

import type { StoryType } from "@/lib/session/types";

/** A wizard step's route segment + 1-based number, for the chrome counter. */
export interface WizardStep {
  /** Route segment under /create (e.g. "upload", "owner"). */
  id: string;
  /** 1-based step number, drives the "Step NN of NN" counter. */
  step: number;
}

/** The per-story wizard configuration the registry exposes. */
export interface WizardConfig {
  /** The ordered steps the wizard walks for this product. */
  steps: readonly WizardStep[];
  /** Total step count — drives the "Step NN of NN" counter. */
  total: number;
}

/**
 * Story 1's six steps (unchanged): upload → pet → child → memories → style →
 * generate.
 */
const STORY_1_STEPS: readonly WizardStep[] = [
  { id: "upload", step: 1 },
  { id: "pet", step: 2 },
  { id: "child", step: 3 },
  { id: "memories", step: 4 },
  { id: "style", step: 5 },
  { id: "generate", step: 6 },
];

/**
 * Story 2's six steps: upload → pet → owner → letter → tone → generate.
 */
const STORY_2_STEPS: readonly WizardStep[] = [
  { id: "upload", step: 1 },
  { id: "pet", step: 2 },
  { id: "owner", step: 3 },
  { id: "letter", step: 4 },
  { id: "tone", step: 5 },
  { id: "generate", step: 6 },
];

/**
 * Story 4's six steps: upload → pet → owner → letter → tone → generate. The same
 * shape as Story 2 (the celebration twin); the wizard UI (PR 22) reads its own
 * field set per step, but the step ordering + count is identical.
 */
const STORY_4_STEPS: readonly WizardStep[] = [
  { id: "upload", step: 1 },
  { id: "pet", step: 2 },
  { id: "owner", step: 3 },
  { id: "letter", step: 4 },
  { id: "tone", step: 5 },
  { id: "generate", step: 6 },
];

/**
 * Story 5's six steps: upload → pet → owner → letter → tone → generate. The same
 * shape as Story 2 (the inverse/companion); the wizard UI (PR 24) reads its own
 * field set per step, but the step ordering + count is identical.
 */
const STORY_5_STEPS: readonly WizardStep[] = [
  { id: "upload", step: 1 },
  { id: "pet", step: 2 },
  { id: "owner", step: 3 },
  { id: "letter", step: 4 },
  { id: "tone", step: 5 },
  { id: "generate", step: 6 },
];

/**
 * Story 6's five steps: upload → pet → tribute → tone → generate. The living
 * tribute is a NARRATIVE book (like Story 1, it keeps the pet's pronoun + the
 * illustration-style choice), but it has no child and no separate memories/style
 * steps: the `tribute` step collects the living-tribute fields (age/stage, still
 * loves, the ordinary rituals, the owner message) and the `tone` step collects the
 * transition-frame + other-pets toggles. The wizard UI (PR 26) reads its own field
 * set per step; this config carries only the ordering + count.
 */
const STORY_6_STEPS: readonly WizardStep[] = [
  { id: "upload", step: 1 },
  { id: "pet", step: 2 },
  { id: "tribute", step: 3 },
  { id: "tone", step: 4 },
  { id: "generate", step: 5 },
];

const WIZARD_CONFIG: Record<StoryType, WizardConfig> = {
  "story-1": { steps: STORY_1_STEPS, total: STORY_1_STEPS.length },
  "story-2": { steps: STORY_2_STEPS, total: STORY_2_STEPS.length },
  "story-4": { steps: STORY_4_STEPS, total: STORY_4_STEPS.length },
  "story-5": { steps: STORY_5_STEPS, total: STORY_5_STEPS.length },
  "story-6": { steps: STORY_6_STEPS, total: STORY_6_STEPS.length },
};

/** The wizard configuration for a product (default Story 1 for a missing type). */
export function getWizardConfig(storyType: StoryType): WizardConfig {
  return WIZARD_CONFIG[storyType];
}
