// localStorage persistence for the in-progress wizard `StoryDraft`, plus the pure
// id/factory helpers. SSR-safe: every localStorage call guards `typeof window`,
// so these are a no-op during server render and only touch storage in the browser.
//
// This module is import-safe from client components (the wizard provider imports
// `loadDraft`/`saveDraft`/`newDraft` here). The server-only disk helpers that need
// Node `fs`/`path` live in ./disk so the `node:` imports never reach a client
// bundle (webpack statically analyzes even dynamic imports, so they cannot live
// alongside client-imported code).

import type {
  StoryDraft,
  Story2Draft,
  StoryType,
  WizardDraft,
} from "@/lib/session/types";

// ---------------------------------------------------------------------------
// IDs and factories (pure — usable on client or server)
// ---------------------------------------------------------------------------

/** A new session id. Uses the platform crypto UUID, available in browser + Node. */
export function createSessionId(): string {
  return crypto.randomUUID();
}

/**
 * A fresh empty Story-1 draft with the spec's default toggles
 * (`illustrationStyle: "watercolor"`, `beliefFrame: "rainbow-bridge"`). Input
 * groups start empty/partial; the wizard fills them in step by step.
 *
 * `storyType` is intentionally omitted on the Story-1 shape so the field stays
 * zero-migration (legacy drafts had no `storyType`; readers default to Story 1).
 */
function newStory1Draft(): StoryDraft {
  return {
    id: createSessionId(),
    createdAt: new Date().toISOString(),
    status: "draft",
    pet: { illustrationStyle: "watercolor" },
    child: {},
    memories: {},
    toggles: { beliefFrame: "rainbow-bridge" },
  };
}

/**
 * A fresh empty Story-2 draft. Discriminated by the literal `storyType:
 * "story-2"`; carries the same `pet` defaults (`species: "dog"`,
 * `illustrationStyle: "watercolor"`) and the default belief frame
 * (`rainbow-bridge`), but with the letter's groups (`owner`/`memories:
 * LetterMemories`/`Story2Toggles`) instead of Story 1's. `species` is pre-seeded
 * (unlike Story 1, where it isn't required) because it IS a Story-2 required field
 * and the pet step's radio shows "dog" selected by default — pre-seeding keeps the
 * draft consistent with what the user sees if they never touch the radio.
 */
function newStory2Draft(): Story2Draft {
  return {
    id: createSessionId(),
    createdAt: new Date().toISOString(),
    status: "draft",
    storyType: "story-2",
    pet: { species: "dog", illustrationStyle: "watercolor" },
    owner: {},
    memories: {},
    toggles: { beliefFrame: "rainbow-bridge" },
  };
}

/**
 * A fresh empty draft for the given product (default Story 1). The landing page's
 * story picker seeds the correct shape so the wizard provider hydrates the right
 * product on first load.
 *
 * Overloaded so a known literal narrows the return: `newDraft()` /
 * `newDraft("story-1")` → `StoryDraft`, `newDraft("story-2")` → `Story2Draft`, a
 * dynamic `StoryType` → the `WizardDraft` union.
 */
export function newDraft(storyType?: "story-1"): StoryDraft;
export function newDraft(storyType: "story-2"): Story2Draft;
export function newDraft(storyType: StoryType): WizardDraft;
export function newDraft(storyType: StoryType = "story-1"): WizardDraft {
  return storyType === "story-2" ? newStory2Draft() : newStory1Draft();
}

// ---------------------------------------------------------------------------
// localStorage (browser) — SSR-safe wizard-draft persistence
// ---------------------------------------------------------------------------

/** The localStorage key the wizard draft is stored under. */
export const DRAFT_STORAGE_KEY = "quietly-kept:draft";

/**
 * Read the saved draft from localStorage. Returns `null` on the server (no
 * `window`), when nothing is saved, or when the stored JSON is unparseable.
 *
 * Returns the `WizardDraft` union — either product's saved draft round-trips
 * cleanly; the caller branches on `storyType` (a missing one is Story 1).
 */
export function loadDraft(): WizardDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as WizardDraft;
  } catch {
    return null;
  }
}

/** Persist the draft to localStorage. No-op on the server. */
export function saveDraft(draft: WizardDraft): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

/** Remove the saved draft from localStorage. No-op on the server. */
export function clearDraft(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}
