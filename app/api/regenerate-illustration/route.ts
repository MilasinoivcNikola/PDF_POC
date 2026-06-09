// POST /api/regenerate-illustration — re-paint a SINGLE page's illustration
// (feature 10's "regenerate an illustration" control). Body: `{ id, page }`.
//
// Reuses feature 07's `regenerateSceneIllustration`, which re-calls the API for
// just this one page (re-using the reference illustration already on disk), saves
// the new PNG over the old one, and returns the updated manifest entry. We splice
// that entry into the session's manifest, persist the session, and return the new
// image as a self-contained `data:image/png;base64,…` URL so the preview can swap
// it in place — every OTHER page is untouched, and feature 07's cache keeps the
// rest of the book from being re-billed.
//
// House JSON shape; the id is traversal-guarded and the page must be a real
// illustrated scene (`SCENE_PAGE_IDS`) before any work happens.

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";

import { readSession, writeSession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import { regenerateSceneIllustration } from "@/lib/ai/generate";
import { getStory } from "@/lib/story/registry";
import type { PageId } from "@/lib/story/master-text";
import type { GeneratedImage, StorySession } from "@/lib/session/types";

// The illustrated scene slots across every registered product, sourced through
// the registry rather than importing a Story-1 list directly. This is a
// structural allowlist (reject arbitrary page strings before any disk access),
// applied BEFORE the session — and therefore its storyType — is read. It is the
// UNION of all products' slots because the storyType isn't known yet; the precise
// per-story gate ("is this page a slot of THIS session's product?") is enforced
// inside `regenerateSceneIllustration` after the read. For a Story-1 page the set
// still contains every Story-1 slot, so Story-1 validation behavior is unchanged.
const SCENE_SLOTS: readonly PageId[] = [
  ...getStory("story-1").illustrationSlots,
  ...getStory("story-2").illustrationSlots,
];

/** Read `{ id, page }` from the request body, with the page narrowed to a scene. */
function readArgs(body: unknown): { id: string; page: PageId } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const id = record.id ?? record.sessionId;
  const page = record.page;
  if (typeof id !== "string" || typeof page !== "string") {
    return null;
  }
  if (!(SCENE_SLOTS as readonly string[]).includes(page)) {
    return null;
  }
  return { id, page: page as PageId };
}

/** Replace (or append) the manifest entry for one page, leaving the rest as-is. */
function spliceManifest(
  images: readonly GeneratedImage[],
  entry: GeneratedImage,
): GeneratedImage[] {
  const next = images.filter((image) => image.page !== entry.page);
  next.push(entry);
  return next;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const args = readArgs(body);
  if (!args || !isSafeSessionId(args.id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }

  const session = await readSession(args.id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  let entry: GeneratedImage;
  try {
    entry = await regenerateSceneIllustration(session, args.page);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Illustration regeneration failed.";
    console.error(`Regenerate failed for ${args.id}/${args.page}:`, error);
    return NextResponse.json(
      { ok: false, error: "regenerate_failed", detail: message },
      { status: 500 },
    );
  }

  // Persist the updated manifest so the next preview/download picks up the new
  // image; only this page's entry changes.
  const updated: StorySession = {
    ...session,
    images: spliceManifest(session.images, entry),
  };
  try {
    await writeSession(updated);
  } catch {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  // Return the fresh image as a data URL so the client swaps it in immediately,
  // matching how the preview consumes manifestToImageMap.
  const bytes = await fs.readFile(entry.path);
  const image = `data:image/png;base64,${bytes.toString("base64")}`;

  return NextResponse.json({ ok: true, page: args.page, image });
}
