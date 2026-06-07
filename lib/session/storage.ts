// Persistence for a Story-1 order. Two clearly separated halves live here:
//
//   1. localStorage helpers — the in-progress wizard `StoryDraft`. SSR-safe
//      (every call guards `typeof window`) so they're a no-op during server
//      render and only touch storage in the browser.
//
//   2. Disk helpers — the finalized `StorySession` round-tripped to
//      ./sessions/[id].json. SERVER-SIDE ONLY. The Node `fs` import is dynamic
//      (inside each function), never a top-level static import, so a client
//      component that imports the localStorage helpers from this module never
//      pulls `fs` into its bundle.

import type { StoryDraft, StorySession } from "@/lib/session/types";

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

// ---------------------------------------------------------------------------
// Disk (server only) — finalized session round-trip to ./sessions/[id].json
// ---------------------------------------------------------------------------

/** Absolute path to ./sessions/[id].json for a given session id. */
async function sessionFilePath(id: string): Promise<string> {
  const path = await import("node:path");
  return path.join(process.cwd(), "sessions", `${id}.json`);
}

/**
 * Write a finalized session to ./sessions/[id].json (creating the directory if
 * needed). Server-side only — the `fs` import is dynamic so this never lands in
 * a client bundle.
 */
export async function writeSession(session: StorySession): Promise<void> {
  const fs = await import("node:fs/promises");
  const filePath = await sessionFilePath(session.id);
  const path = await import("node:path");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
}

/**
 * Read a finalized session from ./sessions/[id].json. Returns `null` if the file
 * doesn't exist. Server-side only.
 */
export async function readSession(id: string): Promise<StorySession | null> {
  const fs = await import("node:fs/promises");
  const filePath = await sessionFilePath(id);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as StorySession;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}
