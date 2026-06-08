// localStorage persistence for the in-progress wizard `StoryDraft`, plus the pure
// id/factory helpers. SSR-safe: every localStorage call guards `typeof window`,
// so these are a no-op during server render and only touch storage in the browser.
//
// This module is import-safe from client components (the wizard provider imports
// `loadDraft`/`saveDraft`/`newDraft` here). The server-only disk helpers that need
// Node `fs`/`path` live in ./disk so the `node:` imports never reach a client
// bundle (webpack statically analyzes even dynamic imports, so they cannot live
// alongside client-imported code).

import type { StoryDraft } from "@/lib/session/types";

// ---------------------------------------------------------------------------
// IDs and factories (pure — usable on client or server)
// ---------------------------------------------------------------------------

/** A new session id. Uses the platform crypto UUID, available in browser + Node. */
export function createSessionId(): string {
  return crypto.randomUUID();
}

/**
 * A fresh empty draft with the spec's default toggles
 * (`illustrationStyle: "watercolor"`, `beliefFrame: "rainbow-bridge"`). Input
 * groups start empty/partial; the wizard fills them in step by step.
 */
export function newDraft(): StoryDraft {
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

// ---------------------------------------------------------------------------
// localStorage (browser) — SSR-safe wizard-draft persistence
// ---------------------------------------------------------------------------

/** The localStorage key the wizard draft is stored under. */
export const DRAFT_STORAGE_KEY = "quietly-kept:draft";

/**
 * Read the saved draft from localStorage. Returns `null` on the server (no
 * `window`), when nothing is saved, or when the stored JSON is unparseable.
 */
export function loadDraft(): StoryDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoryDraft;
  } catch {
    return null;
  }
}

/** Persist the draft to localStorage. No-op on the server. */
export function saveDraft(draft: StoryDraft): void {
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
