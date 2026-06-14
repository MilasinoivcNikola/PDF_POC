// Disk persistence for a finalized `StorySession`, round-tripped to
// ./sessions/[id].json. SERVER-SIDE ONLY — it imports Node `fs`/`path`, so it must
// never be imported (even transitively) by a client component. The pure id/factory
// and localStorage helpers live in ./storage, which IS client-safe; this module is
// kept separate so webpack's static analysis never pulls `node:` schemes into a
// client bundle.

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  StorySession,
  Story2Session,
  Story4Session,
  Story5Session,
  Story6Session,
  Story7Session,
  Story8Session,
} from "@/lib/session/types";

/**
 * Any product's finalized session. The disk layer is product-agnostic — it
 * round-trips whichever shape it's handed as id-keyed JSON. Readers narrow on
 * `storyType` (`?? "story-1"`) after reading.
 */
export type AnySession =
  | StorySession
  | Story2Session
  | Story4Session
  | Story5Session
  | Story6Session
  | Story7Session
  | Story8Session;

/** Absolute path to ./sessions/[id].json for a given session id. */
function sessionFilePath(id: string): string {
  return path.join(process.cwd(), "sessions", `${id}.json`);
}

/**
 * Write a finalized session (either product) to ./sessions/[id].json (creating the
 * directory if needed). Server-side only.
 */
export async function writeSession(session: AnySession): Promise<void> {
  const filePath = sessionFilePath(session.id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf8");
}

/**
 * Read a finalized session from ./sessions/[id].json. Returns `null` if the file
 * doesn't exist. Returns the Story-1 type for back-compat (the existing callers
 * default on `storyType`); a Story-2 session is structurally a superset on the
 * fields those callers touch (pet/id/status) plus `storyType: "story-2"`, so they
 * branch via the registry. Server-side only.
 */
export async function readSession(id: string): Promise<StorySession | null> {
  const filePath = sessionFilePath(id);
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
