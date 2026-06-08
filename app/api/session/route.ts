// POST /api/session — persist a finalized StorySession to ./sessions/[id].json so
// the generation pipeline (features 07/09) can pick it up by id. The wizard
// assembles the draft into a complete session client-side (draftToSession), then
// POSTs it here.
//
// Validation happens at the boundary even though the app is local-only: the id
// must be a safe single path segment (it becomes the filename), and the seven
// required fields (pet name, child name, photo, plus the four personal free-text
// fields — breedColor, favoriteActivity, sleepingSpot, favoriteMemory — that the
// master text merges as live placeholders) must be present, mirroring the
// client-side `missingRequiredFields` gate. Anything else is trusted to have been
// defaulted by the assembler.

import { NextResponse } from "next/server";
import { writeSession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import type { StorySession } from "@/lib/session/types";

/** Whether a value is a non-empty trimmed string. */
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "invalid_session" },
      { status: 400 },
    );
  }

  const session = body as Partial<StorySession>;

  if (!nonEmpty(session.id) || !isSafeSessionId(session.id.trim())) {
    return NextResponse.json(
      { ok: false, error: "invalid_session_id" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.pet?.name)) {
    return NextResponse.json(
      { ok: false, error: "missing_pet_name" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.child?.name)) {
    return NextResponse.json(
      { ok: false, error: "missing_child_name" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.pet?.photo)) {
    return NextResponse.json(
      { ok: false, error: "missing_photo" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.pet?.breedColor)) {
    return NextResponse.json(
      { ok: false, error: "missing_breed_color" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.memories?.favoriteActivity)) {
    return NextResponse.json(
      { ok: false, error: "missing_favorite_activity" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.memories?.sleepingSpot)) {
    return NextResponse.json(
      { ok: false, error: "missing_sleeping_spot" },
      { status: 400 },
    );
  }

  if (!nonEmpty(session.memories?.favoriteMemory)) {
    return NextResponse.json(
      { ok: false, error: "missing_favorite_memory" },
      { status: 400 },
    );
  }

  try {
    await writeSession(session as StorySession);
  } catch {
    return NextResponse.json(
      { ok: false, error: "write_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: session.id });
}
